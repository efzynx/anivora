import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Linking } from 'react-native';
import { api } from '../services/api';
import { Colors, Radius, Typography, Spacing } from '../theme/tokens';
import { AppVersionCheckResponseDto } from '@anivora/types';

export const CURRENT_APP_VERSION = '1.0.0';
export const CURRENT_APP_VERSION_CODE = 1;

interface UpdateDialogProps {
  visible: boolean;
  updateInfo: AppVersionCheckResponseDto | null;
  onDismiss: () => void;
}

export const UpdateDialog: React.FC<UpdateDialogProps> = ({ visible, updateInfo, onDismiss }) => {
  if (!visible || !updateInfo) return null;

  const handleDownload = () => {
    if (updateInfo.downloadUrl) {
      Linking.openURL(updateInfo.downloadUrl).catch((err) => {
        console.error('Failed to open download URL:', err);
      });
    }
  };

  return (
    <Modal transparent={true} visible={visible} animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.dialogCard}>
          <Text style={styles.title}>Update ANIVORA TV Tersedia</Text>
          <Text style={styles.versionTag}>
            Versi Terbaru: v{updateInfo.latestVersion} (Saat ini: v{CURRENT_APP_VERSION})
          </Text>

          {updateInfo.releaseNotes ? (
            <Text style={styles.notes}>{updateInfo.releaseNotes}</Text>
          ) : null}

          {updateInfo.isMandatory ? (
            <Text style={styles.mandatoryText}>
              * Pembaruan ini wajib untuk melanjutkan penggunaan aplikasi.
            </Text>
          ) : null}

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.8}
              onPress={handleDownload}
            >
              <Text style={styles.primaryButtonText}>Download & Pasang APK</Text>
            </TouchableOpacity>

            {!updateInfo.isMandatory && (
              <TouchableOpacity
                style={styles.secondaryButton}
                activeOpacity={0.8}
                onPress={onDismiss}
              >
                <Text style={styles.secondaryButtonText}>Nanti Saja</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const useAppUpdateChecker = () => {
  const [updateInfo, setUpdateInfo] = useState<AppVersionCheckResponseDto | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await api.checkAppUpdate({
          version: CURRENT_APP_VERSION,
          versionCode: CURRENT_APP_VERSION_CODE,
          abi: 'armeabi-v7a',
          sdk: 23,
          androidVersion: 6,
        });

        if (res && res.hasUpdate) {
          setUpdateInfo(res);
          setModalVisible(true);
        }
      } catch (err) {
        // Silently fail on network disconnect so TV user can still use cached content
        console.log('[UpdateChecker] Could not reach update service');
      }
    };

    check();
  }, []);

  return {
    updateInfo,
    modalVisible,
    dismissUpdate: () => setModalVisible(false),
  };
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  dialogCard: {
    width: 600,
    backgroundColor: Colors.backgroundElevated,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 2,
    borderColor: Colors.accentPrimary,
  },
  title: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  versionTag: {
    ...Typography.caption,
    color: Colors.accentSecondary,
    marginBottom: Spacing.md,
  },
  notes: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  mandatoryText: {
    ...Typography.caption,
    color: Colors.error,
    marginBottom: Spacing.md,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  primaryButton: {
    backgroundColor: Colors.accentPrimary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    ...Typography.h3,
    color: '#FFF',
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
});
