import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/auth.store';
import { colors } from '../../lib/theme';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
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
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        {/* Brand */}
        <View style={{ alignItems: 'center', marginBottom: 36 }}>
          <View style={{
            width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primaryLight,
            justifyContent: 'center', alignItems: 'center', marginBottom: 16,
          }}>
            <Ionicons name="sparkles" size={28} color={colors.primary} />
          </View>
          <Text style={{ fontSize: 28, fontWeight: '800', color: colors.foreground, letterSpacing: -0.5 }}>HIREDGE</Text>
          <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 4 }}>
            Crée ton compte en 30 secondes
          </Text>
        </View>

        {/* Form Card */}
        <View style={{
          backgroundColor: colors.card, borderRadius: 20, padding: 20,
          borderWidth: 1, borderColor: colors.border,
        }}>
          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground, marginBottom: 6 }}>Email</Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
              borderRadius: 12, backgroundColor: colors.muted, paddingHorizontal: 12,
            }}>
              <Ionicons name="mail-outline" size={16} color={colors.mutedForeground} />
              <TextInput
                value={email} onChangeText={setEmail}
                placeholder="ton@email.com" placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none" keyboardType="email-address" autoComplete="email"
                style={{ flex: 1, padding: 13, fontSize: 14, color: colors.foreground }}
              />
            </View>
          </View>

          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground, marginBottom: 6 }}>Mot de passe</Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
              borderRadius: 12, backgroundColor: colors.muted, paddingHorizontal: 12,
            }}>
              <Ionicons name="lock-closed-outline" size={16} color={colors.mutedForeground} />
              <TextInput
                value={password} onChangeText={setPassword}
                placeholder="Min. 8 caractères" placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPw}
                style={{ flex: 1, padding: 13, fontSize: 14, color: colors.foreground }}
              />
              <TouchableOpacity onPress={() => setShowPw(!showPw)}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ marginBottom: 18 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground, marginBottom: 6 }}>Confirmer</Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
              borderRadius: 12, backgroundColor: colors.muted, paddingHorizontal: 12,
            }}>
              <Ionicons name="lock-closed-outline" size={16} color={colors.mutedForeground} />
              <TextInput
                value={confirmPassword} onChangeText={setConfirmPassword}
                placeholder="Retape ton mot de passe" placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPw}
                style={{ flex: 1, padding: 13, fontSize: 14, color: colors.foreground }}
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading}
            style={{
              backgroundColor: loading ? colors.primaryMedium : colors.primary,
              padding: 14, borderRadius: 12, alignItems: 'center',
              flexDirection: 'row', justifyContent: 'center', gap: 8,
            }}
          >
            {loading && <Ionicons name="sync" size={16} color="#fff" />}
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
              {loading ? 'Création...' : 'Créer mon compte'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Login link */}
        <View style={{ alignItems: 'center', marginTop: 28 }}>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                Déjà un compte ?{' '}
                <Text style={{ fontWeight: '700', color: colors.primary }}>Se connecter</Text>
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
