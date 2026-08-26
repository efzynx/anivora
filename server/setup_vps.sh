#!/bin/bash
set -e

echo "========================================="
echo "   Anivora Backend Auto Setup Script     "
echo "========================================="

# 1. Install dependencies
echo "[1/5] Memeriksa dependensi (Git, Go)..."
sudo apt-get update
if ! command -v git &> /dev/null; then
    sudo apt-get install -y git
fi

if ! command -v go &> /dev/null; then
    echo "Go belum terinstall. Menginstall Go..."
    ARCH=$(uname -m)
    case $ARCH in
        x86_64) GO_ARCH="amd64" ;;
        aarch64|arm64) GO_ARCH="arm64" ;;
        armv7l|armv6l) GO_ARCH="armv6l" ;;
        *) echo "Arsitektur tidak didukung"; exit 1 ;;
    esac
    wget https://go.dev/dl/go1.22.0.linux-${GO_ARCH}.tar.gz
    sudo rm -rf /usr/local/go && sudo tar -C /usr/local -xzf go1.22.0.linux-${GO_ARCH}.tar.gz
    export PATH=$PATH:/usr/local/go/bin
    echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.profile
    rm go1.22.0.linux-${GO_ARCH}.tar.gz
fi

# 2. Setup Repository
echo "[2/5] Menyiapkan repositori..."
DIR="/opt/anivora"
if [ ! -d "$DIR" ]; then
    sudo mkdir -p $DIR
    sudo chown $USER:$USER $DIR
    git clone https://github.com/efzynx/anivora.git $DIR
else
    cd $DIR
    git pull origin main
fi

cd $DIR/server

# 3. Build Binary
echo "[3/5] Membangun (Build) Anivora Backend..."
export PATH=$PATH:/usr/local/go/bin
go build -o anivora-server ./cmd/server

# 4. Setup .env
echo "[4/5] Membuat file konfigurasi (.env)..."
cat <<EOF > .env
PORT=3000
ENV=production
EOF

# 5. Create Systemd Service
echo "[5/5] Membuat Systemd Service agar berjalan di latar belakang..."
sudo bash -c "cat <<EOF > /etc/systemd/system/anivora.service
[Unit]
Description=Anivora Backend Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$DIR/server
ExecStart=$DIR/server/anivora-server
Restart=always
RestartSec=3
Environment=\"PATH=/usr/local/go/bin:/usr/bin:/bin\"

[Install]
WantedBy=multi-user.target
EOF"

sudo systemctl daemon-reload
sudo systemctl enable anivora
sudo systemctl restart anivora

echo "========================================="
echo "✅ Setup Selesai! Server berjalan di port 3000."
echo "Untuk mengecek log server, jalankan:"
echo "sudo journalctl -u anivora -f"
echo "========================================="

echo ""
read -p "Apakah Anda ingin menginstall Cloudflare Tunnel sekarang? (y/n): " INSTALL_CF
if [[ "$INSTALL_CF" == "y" || "$INSTALL_CF" == "Y" ]]; then
    if ! command -v cloudflared &> /dev/null; then
        echo "Menginstall cloudflared..."
        curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
        sudo dpkg -i cloudflared.deb
        rm cloudflared.deb
    fi
    echo ""
    echo "Silakan buat tunnel di Dashboard Cloudflare Zero Trust, lalu salin token-nya."
    read -p "Masukkan Cloudflare Tunnel Token Anda: " CF_TOKEN
    sudo cloudflared service install $CF_TOKEN
    echo "✅ Cloudflare Tunnel telah diinstall dan berjalan sebagai service!"
fi
