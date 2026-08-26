import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Radius, Typography, Spacing } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';

export type NavRoute = 'Home' | 'Search' | 'Favorites' | 'History' | 'Auth';

interface TVTopNavProps {
  currentRoute: NavRoute;
  onNavigate: (route: NavRoute) => void;
  focusedRoute?: NavRoute | null;
  onFocusRoute?: (route: NavRoute) => void;
}

export const TVTopNav: React.FC<TVTopNavProps> = ({
  currentRoute,
  onNavigate,
  focusedRoute,
  onFocusRoute,
}) => {
  const { user, isAuthenticated } = useAuth();

  const navItems: { route: NavRoute; label: string }[] = [
    { route: 'Home', label: 'Beranda' },
    { route: 'Search', label: 'Pencarian' },
    { route: 'Favorites', label: 'Favorit' },
    { route: 'History', label: 'Riwayat' },
    { route: 'Auth', label: isAuthenticated && user ? user.username : 'Masuk / Akun' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <Text style={styles.brandText}>
          ANI<Text style={styles.brandAccent}>VORA</Text>
        </Text>
      </View>

      <View style={styles.navRow}>
        {navItems.map((item) => {
          const isActive = currentRoute === item.route;
          const isFocused = focusedRoute === item.route;

          return (
            <TouchableOpacity
              key={item.route}
              activeOpacity={0.8}
              onFocus={() => onFocusRoute?.(item.route)}
              onPress={() => onNavigate(item.route)}
              style={[
                styles.navItem,
                isActive && styles.navItemActive,
                isFocused && styles.navItemFocused,
              ]}
            >
              <Text
                style={[
                  styles.navLabel,
                  isActive && styles.navLabelActive,
                  isFocused && styles.navLabelFocused,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.md,
    backgroundColor: 'rgba(8, 9, 13, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 2,
  },
  brandAccent: {
    color: Colors.accentPrimary,
  },
  navRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
  },
  navItem: {
    paddingHorizontal: Spacing.md + 4,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  navItemActive: {
    backgroundColor: Colors.backgroundElevated,
  },
  navItemFocused: {
    borderColor: Colors.accentPrimary,
    backgroundColor: Colors.backgroundSurface,
    transform: [{ scale: 1.05 }],
  },
  navLabel: {
    ...Typography.body,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  navLabelActive: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  navLabelFocused: {
    color: '#FFF',
  },
});
