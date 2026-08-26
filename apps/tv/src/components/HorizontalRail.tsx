import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
} from 'react-native';
import { PosterCard } from './PosterCard';
import { Colors, Typography, Spacing } from '../theme/tokens';
import { HomeRailSectionDto, HomeRailItemDto } from '@anivora/types';

interface HorizontalRailProps {
  section: HomeRailSectionDto;
  onItemPress: (item: HomeRailItemDto) => void;
  focusedItemId?: string;
  onItemFocus?: (item: HomeRailItemDto) => void;
}

export const HorizontalRail: React.FC<HorizontalRailProps> = ({
  section,
  onItemPress,
  focusedItemId,
  onItemFocus,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>

      <FlatList
        data={section.items}
        horizontal
        keyExtractor={(item, index) => item.id || item.episodeId || `${section.id}_${index}`}
        renderItem={({ item }) => (
          <PosterCard
            item={item}
            onPress={onItemPress}
            onFocus={onItemFocus}
            isFocused={focusedItemId === (item.id || item.episodeId)}
          />
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        // Memory tuning for low-end Android TV hardware (Amlogic S905 / 1GB RAM)
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={3}
        removeClippedSubviews={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  header: {
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: Spacing.screenPadding,
  },
});
