import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Text,
} from 'react-native';
import { api } from '../../services/api';
import { HeroBanner } from '../../components/HeroBanner';
import { HorizontalRail } from '../../components/HorizontalRail';
import { TVTopNav, NavRoute } from '../../components/TVTopNav';
import { Colors, Typography, Spacing } from '../../theme/tokens';
import { HomeFeedResponseDto, HeroItemDto, HomeRailItemDto } from '@anivora/types';
import { useAuth } from '../../context/AuthContext';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { isAuthenticated } = useAuth();
  const [feed, setFeed] = useState<HomeFeedResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [focusedNav, setFocusedNav] = useState<NavRoute | null>(null);

  const fetchFeed = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getHomeFeed();
      setFeed(data);
      if (data.hero && data.hero.length > 0 && data.hero[0]) {
        setFocusedId(data.hero[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load home feed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed, isAuthenticated]);

  const handleHeroPress = (item: HeroItemDto) => {
    navigation.navigate('ContentDetail', { slugOrId: item.slug || item.id });
  };

  const handleItemPress = (item: HomeRailItemDto) => {
    if (item.episodeId) {
      navigation.navigate('Player', {
        episodeId: item.episodeId,
        title: item.title,
        episodeNumber: item.episodeNumber,
      });
    } else {
      navigation.navigate('ContentDetail', { slugOrId: item.slug || item.id });
    }
  };

  const handleNav = (route: NavRoute) => {
    if (route === 'Home') return;
    navigation.navigate(route);
  };

  return (
    <View style={styles.root}>
      <TVTopNav
        currentRoute="Home"
        onNavigate={handleNav}
        focusedRoute={focusedNav}
        onFocusRoute={(r) => {
          setFocusedNav(r);
          setFocusedId(null);
        }}
      />

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.accentPrimary} />
          <Text style={styles.loadingText}>Loading ANIVORA...</Text>
        </View>
      ) : error || !feed ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorTitle}>Koneksi Terputus</Text>
          <Text style={styles.errorMessage}>{error || 'Gagal memuat katalog'}</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          removeClippedSubviews={true}
        >
          {feed.hero && feed.hero.length > 0 && feed.hero[0] ? (
            <HeroBanner
              item={feed.hero[0]}
              onWatchPress={handleHeroPress}
              isFocused={focusedId === feed.hero[0].id}
            />
          ) : null}

          {/* Continue Watching Section if available */}
          {feed.continueWatching && feed.continueWatching.length > 0 ? (
            <HorizontalRail
              key="sec_continue_watching"
              section={{
                id: 'sec_continue_watching',
                title: 'Lanjutkan Menonton',
                type: 'EPISODE_RAIL',
                items: feed.continueWatching.map((item) => ({
                  id: item.contentId,
                  slug: item.slug,
                  title: `${item.title} Ep ${item.episodeNumber}`,
                  episodeId: item.episodeId,
                  episodeNumber: item.episodeNumber,
                  posterUrl: item.posterUrl,
                  progressPercentage: item.progressPercentage,
                })),
              }}
              onItemPress={handleItemPress}
              focusedItemId={focusedId || undefined}
              onItemFocus={(item) => {
                setFocusedNav(null);
                setFocusedId(item.id || item.episodeId || null);
              }}
            />
          ) : null}

          {feed.sections?.map((section: any) => (
            <HorizontalRail
              key={section.id}
              section={section}
              onItemPress={handleItemPress}
              focusedItemId={focusedId || undefined}
              onItemFocus={(item) => {
                setFocusedNav(null);
                setFocusedId(item.id || item.episodeId || null);
              }}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.backgroundPrimary,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  centerContainer: {
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
    ...Typography.h2,
    color: Colors.error,
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});

