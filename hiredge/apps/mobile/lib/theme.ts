// HIREDGE Design System — Indigo primary matching reference Next.js app
// oklch(0.55 0.22 270) ≈ #4F46E5 indigo-600

export const colors = {
  // Primary palette (indigo)
  primary: '#4F46E5',
  primaryForeground: '#FFFFFF',
  primaryLight: 'rgba(79, 70, 229, 0.10)',
  primaryMedium: 'rgba(79, 70, 229, 0.20)',

  // Semantic colors
  success: '#22C55E',
  successLight: 'rgba(34, 197, 94, 0.10)',
  successForeground: '#FFFFFF',
  warning: '#F59E0B',
  warningLight: 'rgba(245, 158, 11, 0.10)',
  warningForeground: '#422006',
  destructive: '#EF4444',
  destructiveLight: 'rgba(239, 68, 68, 0.10)',
  destructiveForeground: '#FFFFFF',

  // Chart colors
  chart1: '#4F46E5',
  chart2: '#22C55E',
  chart3: '#0EA5E9',
  chart4: '#F59E0B',
  chart5: '#EC4899',

  // Neutral palette (light mode — slate scale)
  background: '#FAFAFF',
  foreground: '#0F172A',
  card: '#FFFFFF',
  cardForeground: '#0F172A',
  muted: '#F1F5F9',
  mutedForeground: '#64748B',
  secondary: '#F1F5F9',
  secondaryForeground: '#1E293B',
  accent: '#F1F5F9',
  accentForeground: '#1E293B',
  border: '#E2E8F0',
  input: '#E2E8F0',

  // Sidebar (drawer)
  sidebar: '#FAFAFF',
  sidebarForeground: '#0F172A',
  sidebarPrimary: '#4F46E5',
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
  sm: 6,
  md: 8,
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
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;
