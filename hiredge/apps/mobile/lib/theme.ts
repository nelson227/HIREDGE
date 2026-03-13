// HIREDGE Design System — Based on deep indigo/blue primary with modern look
// Translated from oklch CSS variables to hex/rgba for React Native

export const colors = {
  // Primary palette
  primary: '#6C3FD9',
  primaryForeground: '#FFFFFF',
  primaryLight: 'rgba(108, 63, 217, 0.10)',
  primaryMedium: 'rgba(108, 63, 217, 0.20)',

  // Semantic colors
  success: '#22C55E',
  successLight: 'rgba(34, 197, 94, 0.10)',
  warning: '#EAB308',
  warningLight: 'rgba(234, 179, 8, 0.10)',
  destructive: '#EF4444',
  destructiveLight: 'rgba(239, 68, 68, 0.10)',

  // Chart colors
  chart1: '#6C3FD9',
  chart2: '#22C55E',
  chart3: '#0EA5E9',
  chart4: '#EAB308',
  chart5: '#D946EF',

  // Neutral palette (light mode)
  background: '#FAFAFB',
  foreground: '#0F172A',
  card: '#FFFFFF',
  cardForeground: '#0F172A',
  muted: '#F1F5F9',
  mutedForeground: '#64748B',
  border: '#E2E8F0',
  input: '#E2E8F0',

  // Sidebar (drawer)
  sidebar: '#FAFAFB',
  sidebarForeground: '#0F172A',
  sidebarPrimary: '#6C3FD9',
  sidebarAccent: '#F1F5F9',
  sidebarBorder: '#E2E8F0',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
} as const;

export const radius = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#6C3FD9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;
