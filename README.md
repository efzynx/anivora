# ANIVORA

> **The simplest, lightweight, and backend-driven Anime & Donghua streaming platform for Android TV.**

ANIVORA adalah platform agregasi dan streaming anime & donghua yang dirancang dengan filosofi **TV-First**, **Backend-Driven**, dan **Legacy Compatible** (mendukung perangkat Android TV Box lawas seperti Amlogic S905/S912, Android 6.0/API 23, arsitektur 32-bit ARMv7 & 64-bit ARM64).

---

## 🏛️ Monorepo Architecture Overview

ANIVORA menggunakan arsitektur monorepo berbasis **pnpm workspace** dengan pemisahan domain yang ketat:

```text
anivora/
├── apps/
│   ├── api/                     # NestJS REST API Server (/api/v1)
│   ├── worker/                  # Background Worker & Ingestion Engine (BullMQ + Redis)
│   └── tv/                      # Android TV Client (React Native + D-Pad Focus Engine)
├── packages/
│   ├── database/                # Canonical Prisma ORM Schema & PostgreSQL Client
│   └── types/                   # Shared TypeScript Interfaces, Envelopes & DTOs
├── infrastructure/
│   └── docker/                  # Docker Compose (PostgreSQL 15 + pg_trgm, Redis 7)
└── docs/                        # Technical Architecture, PRD, API Contracts, & Schemas
```

---

## 🚀 Quick Start Guide

Untuk panduan lengkap langkah demi langkah mulai dari persiapan environment hingga troubleshooting, silakan baca dokumentasi detail di:

👉 **[RUNNING_GUIDE.md](./RUNNING_GUIDE.md)**

### Perintah Cepat:

```bash
# 1. Clone & install dependencies
pnpm install

# 2. Setup Environment Variables
cp .env.example .env

# 3. Jalankan Database (Postgres) & Cache (Redis)
pnpm docker:up

# 4. Generate & Push Prisma Schema
pnpm db:push
pnpm db:seed

# 5. Build semua workspace package
pnpm build

# 6. Jalankan Server API, Worker, dan TV Preview UI
# Terminal 1 (REST API Server):
pnpm dev:api

# Terminal 2 (Background Ingestion Worker):
pnpm dev:worker

# Terminal 3 (Interactive Android TV Web Emulator & Remote Simulator):
pnpm dev:tv
```

Buka **`http://localhost:5173`** di browser untuk melihat UI/UX 10-foot Android TV lengkap dengan simulasi Remote D-Pad.

---

## 📦 Workspace Packages & Apps

| Package / App | Path | Deskripsi |
|---|---|---|
| `@anivora/api` | `apps/api` | REST API Server berbasis NestJS, modular endpoints, JWT Auth, dan Playback Resolver. |
| `@anivora/worker` | `apps/worker` | Background Ingestion Engine berbasis BullMQ & Cheerio untuk sinkronisasi provider multi-source. |
| `@anivora/tv` | `apps/tv` | Frontend client TV native dengan D-Pad remote focus engine dan ExoPlayer fallback. |
| `@anivora/database` | `packages/database` | Schema PostgreSQL 15, Prisma client, query search trigram (`pg_trgm`). |
| `@anivora/types` | `packages/types` | Kontrak tipe TypeScript bersama (API Envelopes, Domain DTOs, Provider Configs). |

---

## 🔄 Release & CI/CD Pipeline

ANIVORA dilengkapi dengan pipeline otomatis GitHub Actions untuk Continuous Integration dan Automated APK Release:

- **CI Pipeline (`.github/workflows/ci.yml`)**: Otomatis menjalankan linting, typechecking, dan build di setiap commit/PR pada branch `main` dan `dev`.
- **Release APK Pipeline (`.github/workflows/release-apk.yml`)**: Otomatis melakukan kompilasi signed Release APK Android TV (`armeabi-v7a`, `arm64-v8a`, `universal`), menghitung SHA-256 checksums, dan menerbitkannya ke **GitHub Releases** saat tag rilis dibuat (contoh: `v1.0.0`).

### Cara Rilis Versi Baru (Version Bumping):

```bash
# 1. Naikkan versi monorepo (patch / minor / major)
./scripts/bump-version.sh patch

# 2. Commit dan push tag ke GitHub
git add .
git commit -m "chore(release): bump version to v1.0.1"
git tag v1.0.1
git push origin main --tags
```

---

## ⚙️ Development Commands

```bash
# Build seluruh workspace
pnpm build

# Typecheck seluruh package
pnpm typecheck

# Database management
pnpm db:generate    # Regenerate Prisma Client
pnpm db:push        # Push schema perubahan ke database
pnpm db:seed        # Jalankan database seed
pnpm db:studio      # Buka Prisma Studio GUI (http://localhost:5555)

# Docker management
pnpm docker:up      # Nyalakan Postgres & Redis
pnpm docker:down    # Hentikan Postgres & Redis
pnpm docker:logs    # Lihat log database/redis
```

---

## 📄 License & Compliance

ANIVORA dirancang untuk sumber konten yang mengizinkan automated access publik. ANIVORA **tidak** mengimplementasikan peretasan DRM, pencurian session token, maupun bypass access control.
