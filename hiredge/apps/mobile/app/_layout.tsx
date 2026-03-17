import { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth.store';
import { ErrorBoundary } from 'react-error-boundary';
import { I18nProvider } from '../lib/i18n';
import { ThemeProvider, useThemeColors } from '../lib/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#FAFAFF' }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#0F172A', marginBottom: 8 }}>Oups !</Text>
      <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 20 }}>
        Une erreur inattendue s'est produite.
      </Text>
      <TouchableOpacity
        onPress={resetErrorBoundary}
        style={{ backgroundColor: '#4F46E5', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 }}
      >
        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Réessayer</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function RootLayout() {
  const loadSession = useAuthStore((s) => s.loadSession);

  useEffect(() => {
    loadSession();
  }, []);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <ThemeProvider>
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="job/[id]" />
              <Stack.Screen name="interview/index" />
              <Stack.Screen name="interview/[id]" />
              <Stack.Screen name="applications" />
              <Stack.Screen name="application/[id]" />
              <Stack.Screen name="scouts" />
              <Stack.Screen name="scout/[id]" />
              <Stack.Screen name="edit-profile" />
              <Stack.Screen name="settings" />
              <Stack.Screen name="notifications" />
            </Stack>
          </ThemeProvider>
        </I18nProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
