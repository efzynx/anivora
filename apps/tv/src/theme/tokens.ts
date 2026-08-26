/**
 * Design Tokens & Theme Constants for ANIVORA TV
 * Sourced directly from docs/DESIGN-ANIVORA.md
 */

export const Colors = {
  // Backgrounds
  backgroundPrimary: '#08090D',
  backgroundSecondary: '#101218',
  backgroundElevated: '#171A22',
  backgroundSurface: '#1D2029',
  
  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#B5B8C2',
  textMuted: '#777B87',
  textDisabled: '#4D505A',

  // Accent & Focus
  accentPrimary: '#7C5CFF',
  accentSecondary: '#9B7CFF',
  focusGlow: 'rgba(124, 92, 255, 0.45)',

  // Semantic
  success: '#35C98A',
  warning: '#F5B942',
  error: '#FF5C6C',
  info: '#5AA9FF',

  // Overlay & Borders
  borderSubtle: 'rgba(255, 255, 255, 0.08)',
  cardOverlay: 'rgba(8, 9, 13, 0.8)',
  skeletonBase: '#171A22',
  skeletonHighlight: '#232733',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  screenPadding: 48, // 10-foot TV overscan safety padding
};

export const Typography = {
  display: {
    fontSize: 48,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  h1: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  h3: {
    fontSize: 22,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  body: {
    fontSize: 18,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    lineHeight: 26,
  },
  secondary: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: Colors.textMuted,
  },
  caption: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textMuted,
  },
};

export const Radius = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 9999,
};
