import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuthStore } from '../../stores/auth.store';
import { colors, spacing, radius, fontSize, shadows } from '../../lib/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Erreur', 'Remplis tous les champs');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Erreur', err.message ?? 'Impossible de se connecter');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.card }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing['2xl'] }}>
        {/* Logo & Header */}
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <Text style={{ fontSize: fontSize['3xl'] + 8, fontWeight: '800', color: colors.primary }}>HIREDGE</Text>
          <Text style={{ fontSize: fontSize.base + 1, color: colors.mutedForeground, marginTop: spacing.sm }}>
            Ton avantage dans la recherche d'emploi
          </Text>
        </View>

        {/* Form */}
        <View style={{ gap: spacing.lg }}>
          <View>
            <Text style={{ fontSize: fontSize.sm + 1, fontWeight: '600', color: colors.foreground, marginBottom: 6 }}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="ton@email.com"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              style={{
                borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg,
                padding: spacing.lg - 2, fontSize: fontSize.base + 1, backgroundColor: colors.muted,
                color: colors.foreground,
              }}
            />
          </View>

          <View>
            <Text style={{ fontSize: fontSize.sm + 1, fontWeight: '600', color: colors.foreground, marginBottom: 6 }}>Mot de passe</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              autoComplete="password"
              style={{
                borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg,
                padding: spacing.lg - 2, fontSize: fontSize.base + 1, backgroundColor: colors.muted,
                color: colors.foreground,
              }}
            />
          </View>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={{
              backgroundColor: loading ? colors.primaryMedium : colors.primary,
              padding: spacing.lg, borderRadius: radius.lg, alignItems: 'center', marginTop: spacing.sm,
              ...shadows.lg,
            }}
          >
            <Text style={{ color: colors.primaryForeground, fontSize: fontSize.base + 1, fontWeight: '700' }}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Register link */}
        <View style={{ alignItems: 'center', marginTop: spacing['2xl'] }}>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text style={{ color: colors.primary, fontSize: fontSize.sm + 1 }}>
                Pas encore de compte ? <Text style={{ fontWeight: '700' }}>S'inscrire</Text>
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
