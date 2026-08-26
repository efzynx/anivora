import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Colors, Radius, Typography, Spacing } from '../../theme/tokens';
import { WatchHistoryItemDto } from '@anivora/types';

interface HistoryScreenProps {
  navigation: any;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ navigation }) => {
  const { isAuthenticated } = useAuth();
  const [history, setHistory] = useState<WatchHistoryItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await api.getWatchHistory();
      setHistory(data);
      if (data && data.length > 0 && data[0]) {
        setFocusedId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load watch history:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleResumeEpisode = (item: WatchHistoryItemDto) => {
    navigation.navigate('Player', {
      episodeId: item.episodeId,
      title: `${item.contentTitle} - Episode ${item.episodeNumber}`,
      episodeNumber: item.episodeNumber,
    });
  };

  const handleOpenDetail = (item: WatchHistoryItemDto) => {
    navigation.navigate('ContentDetail', { slugOrId: item.contentSlug || item.contentId });
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.title}>Riwayat Menonton</Text>
        <Text style={styles.emptyText}>
          Anda belum login. Masuk ke akun Anda untuk menyinkronkan riwayat tontonan di TV.
        </Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Auth')}
          style={styles.loginButton}
        >
          <Text style={styles.loginButtonText}>Masuk / Pair Device</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.accentPrimary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Riwayat Tontonan</Text>
        <Text style={styles.subtitle}>
          Lanjutkan anime & donghua yang baru saja Anda tonton
        </Text>
      </View>

      {history.length > 0 ? (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isFocused = focusedId === item.id;
            return (
              <TouchableOpacity
                activeOpacity={0.85}
                onFocus={() => setFocusedId(item.id)}
                onPress={() => handleResumeEpisode(item)}
                style={[
                  styles.historyCard,
                  isFocused && styles.historyCardFocused,
                ]}
              >
                {item.posterUrl ? (
                  <Image
                    source={{ uri: item.posterUrl }}
                    style={styles.poster}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.poster, styles.placeholderPoster]} />
                )}

                <View style={styles.contentMeta}>
                  <Text style={styles.contentTitle} numberOfLines={1}>
                    {item.contentTitle}
                  </Text>
                  <Text style={styles.episodeText}>
                    Episode {item.episodeNumber} {item.episodeTitle ? `• ${item.episodeTitle}` : ''}
                  </Text>
                  <Text style={styles.watchedDate}>
                    Ditonton pada: {new Date(item.watchedAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleOpenDetail(item)}
                  style={styles.detailButton}
                >
                  <Text style={styles.detailButtonText}>Detail</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.listContent}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          removeClippedSubviews={true}
        />
      ) : (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>
            Belum ada riwayat tontonan pada akun ini.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.backgroundPrimary,
    padding: Spacing.screenPadding,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.h1,
    marginBottom: 4,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: Colors.backgroundPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
    maxWidth: 500,
    marginBottom: Spacing.lg,
  },
  loginButton: {
    backgroundColor: Colors.accentPrimary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  loginButtonText: {
    ...Typography.body,
    color: '#FFF',
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  historyCardFocused: {
    borderColor: Colors.accentPrimary,
    backgroundColor: Colors.backgroundSurface,
    transform: [{ scale: 1.02 }],
  },
  poster: {
    width: 60,
    height: 90,
    borderRadius: Radius.sm,
    backgroundColor: Colors.backgroundSecondary,
  },
  placeholderPoster: {
    backgroundColor: Colors.backgroundSurface,
  },
  contentMeta: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  contentTitle: {
    ...Typography.h3,
    marginBottom: 4,
  },
  episodeText: {
    ...Typography.body,
    color: Colors.accentSecondary,
    marginBottom: 4,
  },
  watchedDate: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  detailButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.backgroundSurface,
    borderRadius: Radius.sm,
    marginLeft: Spacing.md,
  },
  detailButtonText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
