import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Colors, Radius, Typography, Spacing } from '../../theme/tokens';
import { ContentDetailDto, EpisodeDto } from '@anivora/types';

interface ContentDetailScreenProps {
  route?: any;
  navigation?: any;
}

export const ContentDetailScreen: React.FC<ContentDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const slugOrId = route?.params?.slugOrId || '';
  const { isAuthenticated } = useAuth();
  const [content, setContent] = useState<ContentDetailDto | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [focusedSection, setFocusedSection] = useState<'watch' | 'favorite' | 'episode'>('watch');
  const [focusedEpisodeId, setFocusedEpisodeId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const detail = await api.getContentDetail(slugOrId);
      setContent(detail);
      setIsFavorite(!!detail.isFavorite);

      const eps = await api.getEpisodes(slugOrId, 1, 100);
      setEpisodes(eps.data);
      if (eps.data && eps.data.length > 0 && eps.data[0]) {
        setFocusedEpisodeId(eps.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load content detail:', err);
    } finally {
      setLoading(false);
    }
  }, [slugOrId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      navigation.navigate('Auth');
      return;
    }

    if (!content || favoriteLoading) return;

    try {
      setFavoriteLoading(true);
      if (isFavorite) {
        await api.removeFavorite(content.id);
        setIsFavorite(false);
      } else {
        await api.addFavorite(content.id);
        setIsFavorite(true);
      }
    } catch (err) {
      console.error('Toggle favorite failed:', err);
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handlePlayEpisode = (episode: EpisodeDto) => {
    navigation.navigate('Player', {
      episodeId: episode.id,
      title: `${content?.title || ''} - Episode ${episode.episodeNumber}`,
      episodeNumber: episode.episodeNumber,
    });
  };

  if (loading || !content) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.accentPrimary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {content.backdropUrl ? (
        <Image
          source={{ uri: content.backdropUrl }}
          style={styles.backdrop}
          resizeMode="cover"
        />
      ) : null}
      <View style={styles.overlay} />

      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.headerRow}>
          {content.posterUrl ? (
            <Image
              source={{ uri: content.posterUrl }}
              style={styles.poster}
              resizeMode="cover"
            />
          ) : null}

          <View style={styles.metaColumn}>
            <Text style={styles.title}>{content.title}</Text>
            {content.nativeTitle ? (
              <Text style={styles.nativeTitle}>{content.nativeTitle}</Text>
            ) : null}

            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{content.type}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{content.status}</Text>
              </View>
              {content.releaseYear ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{content.releaseYear}</Text>
                </View>
              ) : null}
              {content.rating ? (
                <View style={[styles.badge, styles.ratingBadge]}>
                  <Text style={styles.ratingText}>★ {content.rating.toFixed(1)}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.genreRow}>
              {content.genres.map((g) => (
                <Text key={g.id} style={styles.genreTag}>
                  {g.name}
                </Text>
              ))}
            </View>

            {content.synopsis ? (
              <Text style={styles.synopsis} numberOfLines={5}>
                {content.synopsis}
              </Text>
            ) : null}

            {/* TV Actions: Play First/Last Watched & Favorite Toggle */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onFocus={() => setFocusedSection('watch')}
                onPress={() => {
                  if (episodes.length > 0 && episodes[0]) {
                    handlePlayEpisode(episodes[0]);
                  }
                }}
                style={[
                  styles.primaryActionButton,
                  focusedSection === 'watch' && styles.actionButtonFocused,
                ]}
              >
                <Text style={styles.primaryActionText}>
                  {content.lastWatchedEpisode
                    ? `▶ Lanjut Ep ${content.lastWatchedEpisode.episodeNumber}`
                    : '▶ Tonton Sekarang'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onFocus={() => setFocusedSection('favorite')}
                onPress={handleToggleFavorite}
                style={[
                  styles.secondaryActionButton,
                  isFavorite && styles.favoriteActiveButton,
                  focusedSection === 'favorite' && styles.actionButtonFocused,
                ]}
              >
                <Text
                  style={[
                    styles.secondaryActionText,
                    isFavorite && styles.favoriteActiveText,
                  ]}
                >
                  {isFavorite ? '★ Di Favorit' : '☆ Tambah Favorit'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.episodesSection}>
          <Text style={styles.sectionTitle}>
            Episodes ({episodes.length})
          </Text>

          <FlatList
            data={episodes}
            horizontal
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isFocused =
                focusedSection === 'episode' && focusedEpisodeId === item.id;
              return (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onFocus={() => {
                    setFocusedSection('episode');
                    setFocusedEpisodeId(item.id);
                  }}
                  onPress={() => handlePlayEpisode(item)}
                  style={[
                    styles.episodeCard,
                    isFocused && styles.episodeCardFocused,
                  ]}
                >
                  <Text style={styles.episodeNumber}>
                    EP {item.episodeNumber}
                  </Text>
                  {item.title ? (
                    <Text style={styles.episodeTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            }}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.episodeList}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            removeClippedSubviews={true}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.backgroundPrimary,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 9, 13, 0.82)',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: Colors.backgroundPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    padding: Spacing.screenPadding,
    paddingBottom: Spacing.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    gap: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  poster: {
    width: 220,
    height: 330,
    borderRadius: Radius.md,
    backgroundColor: Colors.backgroundElevated,
  },
  metaColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    ...Typography.h1,
    marginBottom: 4,
  },
  nativeTitle: {
    ...Typography.body,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  badge: {
    backgroundColor: Colors.backgroundElevated,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  badgeText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  ratingBadge: {
    backgroundColor: 'rgba(245, 185, 66, 0.15)',
  },
  ratingText: {
    ...Typography.caption,
    color: Colors.warning,
    fontWeight: '700',
  },
  genreRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  genreTag: {
    ...Typography.secondary,
    color: Colors.accentSecondary,
  },
  synopsis: {
    ...Typography.body,
    color: Colors.textSecondary,
    maxWidth: 800,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  primaryActionButton: {
    backgroundColor: Colors.accentPrimary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  secondaryActionButton: {
    backgroundColor: Colors.backgroundElevated,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  favoriteActiveButton: {
    backgroundColor: 'rgba(245, 185, 66, 0.2)',
  },
  actionButtonFocused: {
    borderColor: '#FFF',
    transform: [{ scale: 1.05 }],
  },
  primaryActionText: {
    ...Typography.body,
    color: '#FFF',
    fontWeight: '700',
  },
  secondaryActionText: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  favoriteActiveText: {
    color: Colors.warning,
    fontWeight: '700',
  },
  episodesSection: {
    marginTop: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h2,
    marginBottom: Spacing.md,
  },
  episodeList: {
    gap: Spacing.md,
  },
  episodeCard: {
    width: 140,
    height: 80,
    backgroundColor: Colors.backgroundElevated,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  episodeCardFocused: {
    borderColor: Colors.accentPrimary,
    transform: [{ scale: 1.06 }],
    backgroundColor: Colors.backgroundSurface,
  },
  episodeNumber: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  episodeTitle: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: 4,
  },
});

