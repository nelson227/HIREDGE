import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/auth.store';
import { colors } from '../../lib/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
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
      const msg = err.code === 'ECONNABORTED'
        ? 'Le serveur met du temps à répondre. Réessaie dans quelques secondes.'
        : err.response?.data?.error?.message ?? err.message ?? 'Impossible de se connecter';
      Alert.alert('Erreur', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        {/* Brand */}
        <View style={{ alignItems: 'center', marginBottom: 36 }}>
          <View style={{
            width: 48, height: 48, borderRadius: 12, backgroundColor: colors.primary,
            justifyContent: 'center', alignItems: 'center', marginBottom: 16,
          }}>
            <Ionicons name="sparkles" size={24} color={colors.primaryForeground} />
          </View>
          <Text style={{ fontSize: 24, fontWeight: '700', color: colors.foreground }}>Bon retour</Text>
          <Text style={{ fontSize: 14, color: colors.mutedForeground, marginTop: 4 }}>
            Connecte-toi à ton compte HIREDGE
          </Text>
        </View>

        {/* Form */}
        <View style={{ gap: 16, marginBottom: 20 }}>
          {/* Email */}
          <View>
            <Text style={{ fontSize: 13, fontWeight: '500', color: colors.foreground, marginBottom: 6 }}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="ton@email.com"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              style={{
                borderWidth: 1, borderColor: colors.border, borderRadius: 8,
                backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 12,
                fontSize: 14, color: colors.foreground, height: 44,
              }}
            />
          </View>

          {/* Password */}
          <View>
            <Text style={{ fontSize: 13, fontWeight: '500', color: colors.foreground, marginBottom: 6 }}>Mot de passe</Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
              borderRadius: 8, backgroundColor: colors.card, paddingHorizontal: 14, height: 44,
            }}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPw}
                autoComplete="password"
                style={{ flex: 1, fontSize: 14, color: colors.foreground }}
              />
              <TouchableOpacity onPress={() => setShowPw(!showPw)}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          style={{
            backgroundColor: loading ? colors.primaryMedium : colors.primary,
            height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
            flexDirection: 'row', gap: 8,
          }}
        >
          {loading && <Ionicons name="sync" size={16} color={colors.primaryForeground} />}
          <Text style={{ color: colors.primaryForeground, fontSize: 15, fontWeight: '600' }}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </Text>
        </TouchableOpacity>

        {/* Register link */}
        <View style={{ alignItems: 'center', marginTop: 28 }}>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                Pas encore de compte ?{' '}
                <Text style={{ fontWeight: '600', color: colors.primary }}>S'inscrire</Text>
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
