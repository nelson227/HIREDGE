// HIREDGE Design System — Purple primary with dark mode support

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { storage } from './storage';

export type ThemeMode = 'light' | 'dark' | 'system';

const lightColors = {
  // Primary palette
  primary: '#6C5CE7',
  primaryForeground: '#FFFFFF',
  primaryLight: 'rgba(108, 92, 231, 0.10)',
  primaryMedium: 'rgba(108, 92, 231, 0.20)',

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
  chart1: '#6C5CE7',
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
  sidebarPrimary: '#6C5CE7',
  sidebarAccent: '#F1F5F9',
  sidebarBorder: '#E2E8F0',
} as const;

const darkColors = {
  primary: '#8B7CF7',
  primaryForeground: '#FFFFFF',
  primaryLight: 'rgba(139, 124, 247, 0.15)',
  primaryMedium: 'rgba(139, 124, 247, 0.25)',

  success: '#34D66D',
  successLight: 'rgba(52, 214, 109, 0.15)',
  successForeground: '#FFFFFF',
  warning: '#FBBF24',
  warningLight: 'rgba(251, 191, 36, 0.15)',
  warningForeground: '#FEF9C3',
  destructive: '#F87171',
  destructiveLight: 'rgba(248, 113, 113, 0.15)',
  destructiveForeground: '#FFFFFF',

  chart1: '#8B7CF7',
  chart2: '#34D66D',
  chart3: '#38BDF8',
  chart4: '#FBBF24',
  chart5: '#F472B6',

  background: '#0B0D14',
  foreground: '#E2E8F0',
  card: '#141726',
  cardForeground: '#E2E8F0',
  muted: '#1E2236',
  mutedForeground: '#94A3B8',
  secondary: '#1E2236',
  secondaryForeground: '#CBD5E1',
  accent: '#1E2236',
  accentForeground: '#CBD5E1',
  border: '#2A2F45',
  input: '#2A2F45',

  sidebar: '#0B0D14',
  sidebarForeground: '#E2E8F0',
  sidebarPrimary: '#8B7CF7',
  sidebarAccent: '#1E2236',
  sidebarBorder: '#2A2F45',
} as const;

// Keep backward compat: `colors` is light by default
export const colors = lightColors;

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: typeof lightColors | typeof darkColors;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  isDark: false,
  colors: lightColors,
  setMode: () => {},
});

const STORAGE_KEY = 'hiredge_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    storage.getItem(STORAGE_KEY).then((stored) => {
      if (stored && (stored === 'light' || stored === 'dark' || stored === 'system')) {
        setModeState(stored as ThemeMode);
      }
    });
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    storage.setItem(STORAGE_KEY, newMode);
  }, []);

  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
  const currentColors = isDark ? darkColors : lightColors;

  return React.createElement(
    ThemeContext.Provider,
    { value: { mode, isDark, colors: currentColors, setMode } },
    children
  );
}

export function useThemeColors() {
  return useContext(ThemeContext).colors;
}

export function useTheme() {
  return useContext(ThemeContext);
}

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
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;
