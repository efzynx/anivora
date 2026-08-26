import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Colors, Radius, Typography, Spacing } from '../theme/tokens';
import { HeroItemDto } from '@anivora/types';

interface HeroBannerProps {
  item?: HeroItemDto;
  onWatchPress: (item: HeroItemDto) => void;
  isFocused?: boolean;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  item,
  onWatchPress,
  isFocused = false,
}) => {
  if (!item) return null;

  return (
    <View style={styles.container}>
      {item.backdropUrl ? (
        <Image
          source={{ uri: item.backdropUrl }}
          style={styles.backdrop}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.backdrop, styles.backdropFallback]} />
      )}
      <View style={styles.gradientOverlay} />

      <View style={styles.contentOverlay}>
        <View style={styles.badgeRow}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{item.type}</Text>
          </View>
          {item.rating ? (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>★ {item.rating.toFixed(1)}</Text>
            </View>
          ) : null}
          {item.genres?.slice(0, 3).map((genre: string) => (
            <View key={genre} style={styles.genreBadge}>
              <Text style={styles.genreText}>{genre}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>

        {item.synopsis ? (
          <Text style={styles.synopsis} numberOfLines={3}>
            {item.synopsis}
          </Text>
        ) : null}

        <View style={styles.actionsRow}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.playButton, isFocused && styles.playButtonFocused]}
            onPress={() => onWatchPress(item)}
          >
            <Text style={styles.playButtonText}>▶ Play Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 380,
    width: '100%',
    position: 'relative',
    marginBottom: Spacing.md,
  },
  backdrop: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  backdropFallback: {
    backgroundColor: Colors.backgroundElevated,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 9, 13, 0.65)',
  },
  contentOverlay: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.screenPadding,
    right: Spacing.screenPadding,
    maxWidth: 700,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  typeBadge: {
    backgroundColor: Colors.accentPrimary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  typeBadgeText: {
    ...Typography.caption,
    color: '#FFF',
    fontWeight: '700',
  },
  ratingBadge: {
    backgroundColor: Colors.backgroundElevated,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  ratingText: {
    ...Typography.caption,
    color: Colors.warning,
    fontWeight: '700',
  },
  genreBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  genreText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  title: {
    ...Typography.display,
    marginBottom: Spacing.sm,
  },
  synopsis: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  playButton: {
    backgroundColor: Colors.accentPrimary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  playButtonFocused: {
    borderColor: '#FFF',
    transform: [{ scale: 1.05 }],
  },
  playButtonText: {
    ...Typography.h3,
    color: '#FFF',
    fontWeight: '700',
  },
});
