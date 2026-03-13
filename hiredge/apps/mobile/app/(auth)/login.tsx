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
      Alert.alert('Erreur', err.message ?? 'Impossible de se connecter');
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
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <View style={{
            width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primaryLight,
            justifyContent: 'center', alignItems: 'center', marginBottom: 16,
          }}>
            <Ionicons name="sparkles" size={28} color={colors.primary} />
          </View>
          <Text style={{ fontSize: 28, fontWeight: '800', color: colors.foreground, letterSpacing: -0.5 }}>HIREDGE</Text>
          <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 4 }}>
            Ton avantage dans la recherche d'emploi
          </Text>
        </View>

        {/* Form Card */}
        <View style={{
          backgroundColor: colors.card, borderRadius: 20, padding: 20,
          borderWidth: 1, borderColor: colors.border,
        }}>
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground, marginBottom: 6 }}>Email</Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
              borderRadius: 12, backgroundColor: colors.muted, paddingHorizontal: 12,
            }}>
              <Ionicons name="mail-outline" size={16} color={colors.mutedForeground} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="ton@email.com"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                style={{ flex: 1, padding: 13, fontSize: 14, color: colors.foreground }}
              />
            </View>
          </View>

          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground, marginBottom: 6 }}>Mot de passe</Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
              borderRadius: 12, backgroundColor: colors.muted, paddingHorizontal: 12,
            }}>
              <Ionicons name="lock-closed-outline" size={16} color={colors.mutedForeground} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPw}
                autoComplete="password"
                style={{ flex: 1, padding: 13, fontSize: 14, color: colors.foreground }}
              />
              <TouchableOpacity onPress={() => setShowPw(!showPw)}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={{
              backgroundColor: loading ? colors.primaryMedium : colors.primary,
              padding: 14, borderRadius: 12, alignItems: 'center',
              flexDirection: 'row', justifyContent: 'center', gap: 8,
            }}
          >
            {loading && <Ionicons name="sync" size={16} color="#fff" />}
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Register link */}
        <View style={{ alignItems: 'center', marginTop: 28 }}>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                Pas encore de compte ?{' '}
                <Text style={{ fontWeight: '700', color: colors.primary }}>S'inscrire</Text>
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
