import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { api } from '../../services/api';
import { Colors, Radius, Typography, Spacing } from '../../theme/tokens';
import { PlaybackResolveResponseDto, PlaybackStreamSourceDto } from '@anivora/types';

interface PlayerScreenProps {
  route?: any;
  navigation?: any;
}

export const PlayerScreen: React.FC<PlayerScreenProps> = ({
  route,
  navigation,
}) => {
  const episodeId = route?.params?.episodeId || '';
  const title = route?.params?.title || 'Player';
  const [playbackData, setPlaybackData] = useState<PlaybackResolveResponseDto | null>(null);
  const [currentSource, setCurrentSource] = useState<PlaybackStreamSourceDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [positionSeconds, setPositionSeconds] = useState(0);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resolveStream = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.resolvePlayback(episodeId);
      setPlaybackData(data);
      setCurrentSource(data.selectedSource);
      setPositionSeconds(data.resumePositionSeconds || 0);
    } catch (err: any) {
      setError(err.message || 'Semua playback server sedang tidak tersedia.');
    } finally {
      setLoading(false);
    }
  }, [episodeId]);

  useEffect(() => {
    resolveStream();
  }, [resolveStream]);

  // Periodic watch progress sync (15-30s debounce standard)
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setPositionSeconds((prev) => {
        const nextPos = prev + 15;
        api.syncProgress(episodeId, nextPos, 1440, false).catch(() => {});
        return nextPos;
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [isPlaying, episodeId]);

  // Handle stream fallback if current source fails
  const handleSourceError = useCallback(() => {
    if (playbackData && playbackData.backupSources && playbackData.backupSources.length > 0) {
      // Switch to first available backup source
      const nextSource = playbackData.backupSources[0];
      if (nextSource) {
        setCurrentSource(nextSource);
      }
      // Remove used backup from queue
      setPlaybackData({
        ...playbackData,
        backupSources: playbackData.backupSources.slice(1),
      });
    } else {
      setError('Playback source gagal dan tidak ada server cadangan.');
    }
  }, [playbackData]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
    resetControlsTimeout();
  };

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 4000);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accentPrimary} />
        <Text style={styles.loadingText}>Menghubungkan ke Playback Engine...</Text>
      </View>
    );
  }

  if (error || !currentSource) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Playback Gagal</Text>
        <Text style={styles.errorMessage}>{error || 'Sumber stream tidak ditemukan'}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={resolveStream}
        >
          <Text style={styles.retryButtonText}>Coba Lagi</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.retryButton, styles.backButton]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Video Player Canvas (Native ExoPlayer placeholder container) */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleSourceError}
        style={styles.videoCanvas}
      >
        <Text style={styles.videoInfo}>
          [ExoPlayer Hardware Acceleration: {currentSource.format} / {currentSource.codec} / {currentSource.quality}]
        </Text>
        <Text style={styles.streamUrl} numberOfLines={1}>
          Stream: {currentSource.streamUrl}
        </Text>
      </TouchableOpacity>

      {/* OSD Overlay Controls */}
      {showControls && (
        <View style={styles.osdOverlay}>
          <View style={styles.osdHeader}>
            <Text style={styles.osdTitle}>{title}</Text>
            <View style={styles.serverBadge}>
              <Text style={styles.serverBadgeText}>{currentSource.serverLabel}</Text>
            </View>
          </View>

          <View style={styles.osdCenter}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={togglePlayPause}
              style={styles.playPauseButton}
            >
              <Text style={styles.playPauseIcon}>
                {isPlaying ? '❚❚' : '▶'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.osdFooter}>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(100, (positionSeconds / 1440) * 100)}%` },
                ]}
              />
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>
                {Math.floor(positionSeconds / 60)}:
                {(positionSeconds % 60).toString().padStart(2, '0')} / 24:00
              </Text>
              <Text style={styles.timeText}>{currentSource.quality}</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoCanvas: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#050508',
  },
  videoInfo: {
    ...Typography.body,
    color: Colors.accentSecondary,
    marginBottom: Spacing.sm,
  },
  streamUrl: {
    ...Typography.caption,
    color: Colors.textDisabled,
    maxWidth: 600,
  },
  osdOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 9, 13, 0.65)',
    justifyContent: 'space-between',
    padding: Spacing.screenPadding,
  },
  osdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  osdTitle: {
    ...Typography.h2,
  },
  serverBadge: {
    backgroundColor: Colors.accentPrimary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  serverBadgeText: {
    ...Typography.caption,
    color: '#FFF',
    fontWeight: '700',
  },
  osdCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accentPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  playPauseIcon: {
    fontSize: 32,
    color: '#FFF',
  },
  osdFooter: {
    width: '100%',
  },
  progressBarBackground: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.accentPrimary,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  center: {
    flex: 1,
    backgroundColor: Colors.backgroundPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  errorTitle: {
    ...Typography.h1,
    color: Colors.error,
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    ...Typography.body,
    color: Colors.textMuted,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.accentPrimary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  retryButtonText: {
    ...Typography.h3,
    color: '#FFF',
  },
  backButton: {
    backgroundColor: Colors.backgroundElevated,
  },
  backButtonText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
});
