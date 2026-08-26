import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Colors, Radius, Typography, Spacing } from '../../theme/tokens';
import { DeviceCodeResponseDto } from '@anivora/types';

interface AuthScreenProps {
  navigation: any;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ navigation }) => {
  const { user, isAuthenticated, login, logout } = useAuth();
  const [deviceCodeData, setDeviceCodeData] = useState<DeviceCodeResponseDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [pollingStatus, setPollingStatus] = useState<string>('Membuat kode pairing...');
  const [isFocusedButton, setIsFocusedButton] = useState<'action' | 'back'>('action');
  
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startDeviceCodeFlow = useCallback(async () => {
    try {
      setLoading(true);
      setPollingStatus('Membuat kode aktivasi baru...');
      const codeRes = await api.requestDeviceCode();
      setDeviceCodeData(codeRes);
      setPollingStatus('Menunggu konfirmasi dari ponsel / browser...');
      startPolling(codeRes.deviceCode, codeRes.interval || 5);
    } catch (err: any) {
      setPollingStatus('Gagal membuat kode aktivasi. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }, []);

  const startPolling = (deviceCode: string, intervalSeconds: number) => {
    if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);

    pollingTimerRef.current = setInterval(async () => {
      try {
        const pollResult = await api.pollDeviceStatus(deviceCode);
        if (pollResult && pollResult.accessToken) {
          if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
          await login(pollResult.accessToken, pollResult.user);
          setPollingStatus('Login Berhasil!');
          setTimeout(() => {
            navigation.goBack();
          }, 1000);
        }
      } catch (err: any) {
        // Continue polling if pending authorization
        if (err.response?.status === 403 || err.response?.data?.error?.code === 'AUTHORIZATION_PENDING') {
          // Expected pending state
        } else if (err.response?.status === 400 || err.response?.data?.error?.code === 'INVALID_INPUT') {
          if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
          setPollingStatus('Kode kedaluwarsa. Silakan muat ulang kode.');
        }
      }
    }, intervalSeconds * 1000);
  };

  useEffect(() => {
    if (!isAuthenticated) {
      startDeviceCodeFlow();
    }
    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    };
  }, [isAuthenticated, startDeviceCodeFlow]);

  if (isAuthenticated && user) {
    return (
      <View style={styles.root}>
        <View style={styles.card}>
          <Text style={styles.badge}>TERHUBUNG</Text>
          <Text style={styles.title}>Akun ANIVORA TV</Text>
          <Text style={styles.subtitle}>
            Masuk sebagai: <Text style={styles.highlightText}>{user.username}</Text>
          </Text>
          {user.email ? (
            <Text style={styles.emailText}>{user.email}</Text>
          ) : null}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onFocus={() => setIsFocusedButton('action')}
              onPress={async () => {
                await logout();
                startDeviceCodeFlow();
              }}
              style={[
                styles.button,
                styles.logoutButton,
                isFocusedButton === 'action' && styles.buttonFocused,
              ]}
            >
              <Text style={styles.buttonText}>Keluar Akun</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onFocus={() => setIsFocusedButton('back')}
              onPress={() => navigation.goBack()}
              style={[
                styles.button,
                styles.secondaryButton,
                isFocusedButton === 'back' && styles.buttonFocused,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Kembali</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.badge}>TV PAIRING</Text>
        <Text style={styles.title}>Hubungkan Akun ANIVORA</Text>
        <Text style={styles.description}>
          Buka browser di HP/Laptop Anda lalu masukkan kode di bawah ini:
        </Text>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.accentPrimary} />
            <Text style={styles.statusText}>{pollingStatus}</Text>
          </View>
        ) : deviceCodeData ? (
          <View style={styles.codeContainer}>
            <Text style={styles.urlGuide}>
              Kunjungi: <Text style={styles.urlHighlight}>{deviceCodeData.verificationUrl}</Text>
            </Text>
            <View style={styles.pinBox}>
              <Text style={styles.pinCode}>{deviceCodeData.userCode}</Text>
            </View>
            <Text style={styles.statusText}>{pollingStatus}</Text>
          </View>
        ) : (
          <Text style={styles.errorText}>Tidak dapat memuat kode aktivasi.</Text>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onFocus={() => setIsFocusedButton('action')}
            onPress={startDeviceCodeFlow}
            style={[
              styles.button,
              styles.primaryButton,
              isFocusedButton === 'action' && styles.buttonFocused,
            ]}
          >
            <Text style={styles.buttonText}>Refresh Kode</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onFocus={() => setIsFocusedButton('back')}
            onPress={() => navigation.goBack()}
            style={[
              styles.button,
              styles.secondaryButton,
              isFocusedButton === 'back' && styles.buttonFocused,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Kembali</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.backgroundPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.screenPadding,
  },
  card: {
    width: 600,
    backgroundColor: Colors.backgroundElevated,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  badge: {
    ...Typography.caption,
    color: Colors.accentPrimary,
    backgroundColor: 'rgba(255, 61, 0, 0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.full,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h1,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  emailText: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
  },
  highlightText: {
    color: Colors.accentSecondary,
    fontWeight: '700',
  },
  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  codeContainer: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  urlGuide: {
    ...Typography.body,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  urlHighlight: {
    color: Colors.accentSecondary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  pinBox: {
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.accentPrimary,
    marginVertical: Spacing.sm,
  },
  pinCode: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 10,
  },
  statusText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  loadingBox: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
    marginVertical: Spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  button: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    minWidth: 160,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  primaryButton: {
    backgroundColor: Colors.accentPrimary,
  },
  logoutButton: {
    backgroundColor: Colors.error,
  },
  secondaryButton: {
    backgroundColor: Colors.backgroundSurface,
  },
  buttonFocused: {
    borderColor: '#FFF',
    transform: [{ scale: 1.05 }],
  },
  buttonText: {
    ...Typography.body,
    color: '#FFF',
    fontWeight: '700',
  },
  secondaryButtonText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
});
