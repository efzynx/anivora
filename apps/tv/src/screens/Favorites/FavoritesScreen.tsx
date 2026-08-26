import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { PosterCard } from '../../components/PosterCard';
import { Colors, Radius, Typography, Spacing } from '../../theme/tokens';
import { ContentSummaryDto } from '@anivora/types';

interface FavoritesScreenProps {
  navigation: any;
}

export const FavoritesScreen: React.FC<FavoritesScreenProps> = ({ navigation }) => {
  const { isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState<ContentSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const fetchFavorites = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await api.getFavorites();
      setFavorites(data);
      if (data && data.length > 0 && data[0]) {
        setFocusedId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load favorites:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const handleItemPress = (item: ContentSummaryDto) => {
    navigation.navigate('ContentDetail', { slugOrId: item.slug || item.id });
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.title}>Daftar Favorit</Text>
        <Text style={styles.emptyText}>
          Anda belum login. Hubungkan akun Anda untuk menyimpan anime & donghua favorit.
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
        <Text style={styles.title}>Favorit Saya</Text>
        <Text style={styles.subtitle}>
          {favorites.length} Judul Tersimpan di Akun Anda
        </Text>
      </View>

      {favorites.length > 0 ? (
        <FlatList
          data={favorites}
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
      ) : (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>
            Belum ada anime atau donghua yang ditambahkan ke favorit.
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
  gridContent: {
    paddingBottom: Spacing.xxl,
  },
  gridItem: {
    marginBottom: Spacing.lg,
  },
});
