import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
} from 'react-native';
import { TVFocusableCard } from './TVFocusableCard';
import { Colors, Radius, Typography, Spacing } from '../theme/tokens';
import { HomeRailItemDto } from '@anivora/types';

interface PosterCardProps {
  item: HomeRailItemDto;
  onPress: (item: HomeRailItemDto) => void;
  onFocus?: (item: HomeRailItemDto) => void;
  isFocused?: boolean;
}

export const PosterCard: React.FC<PosterCardProps> = ({
  item,
  onPress,
  onFocus,
  isFocused = false,
}) => {
  return (
    <TVFocusableCard
      onPress={() => onPress(item)}
      onFocus={() => onFocus && onFocus(item)}
      isFocused={isFocused}
      style={styles.cardContainer}
    >
      <View style={styles.posterWrapper}>
        {item.posterUrl ? (
          <Image
            source={{ uri: item.posterUrl }}
            style={styles.posterImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>NO IMAGE</Text>
          </View>
        )}
        
        {item.episodeNumber ? (
          <View style={styles.episodeTag}>
            <Text style={styles.episodeTagText}>EP {item.episodeNumber}</Text>
          </View>
        ) : null}

        {item.type ? (
          <View style={styles.typeTag}>
            <Text style={styles.typeTagText}>{item.type}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        {item.status ? (
          <Text style={styles.status} numberOfLines={1}>
            {item.status}
          </Text>
        ) : null}
      </View>
    </TVFocusableCard>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: 170,
    marginRight: Spacing.md,
    backgroundColor: Colors.backgroundSecondary,
  },
  posterWrapper: {
    width: 170,
    height: 240,
    borderRadius: Radius.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.backgroundElevated,
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundSurface,
  },
  placeholderText: {
    ...Typography.caption,
    color: Colors.textDisabled,
  },
  episodeTag: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.accentPrimary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  episodeTagText: {
    ...Typography.caption,
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  typeTag: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: 'rgba(8, 9, 13, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  typeTagText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 10,
  },
  infoContainer: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: 4,
  },
  title: {
    ...Typography.secondary,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  status: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
