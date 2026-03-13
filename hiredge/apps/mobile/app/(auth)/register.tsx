import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuthStore } from '../../stores/auth.store';
import { colors, spacing, radius, fontSize, shadows } from '../../lib/theme';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);

  const handleRegister = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Erreur', 'Remplis tous les champs');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Erreur', 'Le mot de passe doit faire au moins 8 caractères');
      return;
    }

    setLoading(true);
    try {
      await register(email.trim(), password);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Erreur', err.message ?? 'Impossible de créer le compte');
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
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <Text style={{ fontSize: fontSize['3xl'] + 8, fontWeight: '800', color: colors.primary }}>HIREDGE</Text>
          <Text style={{ fontSize: fontSize.base + 1, color: colors.mutedForeground, marginTop: spacing.sm }}>
            Crée ton compte en 30 secondes
          </Text>
        </View>

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
              placeholder="Min. 8 caractères"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              style={{
                borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg,
                padding: spacing.lg - 2, fontSize: fontSize.base + 1, backgroundColor: colors.muted,
                color: colors.foreground,
              }}
            />
          </View>

          <View>
            <Text style={{ fontSize: fontSize.sm + 1, fontWeight: '600', color: colors.foreground, marginBottom: 6 }}>Confirmer</Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Retape ton mot de passe"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              style={{
                borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg,
                padding: spacing.lg - 2, fontSize: fontSize.base + 1, backgroundColor: colors.muted,
                color: colors.foreground,
              }}
            />
          </View>

          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading}
            style={{
              backgroundColor: loading ? colors.primaryMedium : colors.primary,
              padding: spacing.lg, borderRadius: radius.lg, alignItems: 'center', marginTop: spacing.sm,
              ...shadows.lg,
            }}
          >
            <Text style={{ color: colors.primaryForeground, fontSize: fontSize.base + 1, fontWeight: '700' }}>
              {loading ? 'Création...' : 'Créer mon compte'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ alignItems: 'center', marginTop: spacing['2xl'] }}>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={{ color: colors.primary, fontSize: fontSize.sm + 1 }}>
                Déjà un compte ? <Text style={{ fontWeight: '700' }}>Se connecter</Text>
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
