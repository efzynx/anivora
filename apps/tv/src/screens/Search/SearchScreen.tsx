import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { api } from '../../services/api';
import { PosterCard } from '../../components/PosterCard';
import { Colors, Radius, Typography, Spacing } from '../../theme/tokens';
import { CatalogItemDto } from '@anivora/types';

interface SearchScreenProps {
  navigation: any;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({ navigation }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CatalogItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const handleSearch = useCallback(async (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      const data = await api.search(text.trim());
      setResults(data);
      if (data && data.length > 0 && data[0]) {
        setFocusedId(data[0].id);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleItemPress = (item: CatalogItemDto) => {
    navigation.navigate('ContentDetail', { slugOrId: item.slug || item.id });
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Cari Anime & Donghua</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Ketik judul anime / donghua..."
          placeholderTextColor={Colors.textDisabled}
          value={query}
          onChangeText={handleSearch}
          autoFocus={true}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.accentPrimary} />
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          numColumns={5}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.gridItem}>
              <PosterCard
                item={item}
                onPress={() => handleItemPress(item)}
                onFocus={() => setFocusedId(item.id)}
                isFocused={focusedId === item.id}
              />
            </View>
          )}
          contentContainerStyle={styles.gridContent}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          removeClippedSubviews={true}
        />
      ) : query.trim() ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Tidak ada hasil untuk "{query}"</Text>
        </View>
      ) : (
        <View style={styles.center}>
          <Text style={styles.hintText}>Gunakan remote untuk memasukkan kata kunci pencarian</Text>
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
    marginBottom: Spacing.md,
  },
  searchInput: {
    backgroundColor: Colors.backgroundElevated,
    ...Typography.body,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.accentPrimary,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.h3,
    color: Colors.textMuted,
  },
  hintText: {
    ...Typography.body,
    color: Colors.textDisabled,
  },
  gridContent: {
    paddingBottom: Spacing.xxl,
  },
  gridItem: {
    marginBottom: Spacing.lg,
  },
});
