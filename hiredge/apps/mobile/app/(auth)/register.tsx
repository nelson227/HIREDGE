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
            width: 48, height: 48, borderRadius: 12, backgroundColor: colors.primary,
            justifyContent: 'center', alignItems: 'center', marginBottom: 16,
          }}>
            <Ionicons name="sparkles" size={24} color={colors.primaryForeground} />
          </View>
          <Text style={{ fontSize: 24, fontWeight: '700', color: colors.foreground }}>Créer un compte</Text>
          <Text style={{ fontSize: 14, color: colors.mutedForeground, marginTop: 4 }}>
            Commence ta recherche avec HIREDGE
          </Text>
        </View>

        {/* Form */}
        <View style={{ gap: 14, marginBottom: 20 }}>
          {/* Email */}
          <View>
            <Text style={{ fontSize: 13, fontWeight: '500', color: colors.foreground, marginBottom: 6 }}>Email</Text>
            <TextInput
              value={email} onChangeText={setEmail}
              placeholder="ton@email.com" placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none" keyboardType="email-address" autoComplete="email"
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
                value={password} onChangeText={setPassword}
                placeholder="Min. 8 caractères" placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPw}
                style={{ flex: 1, fontSize: 14, color: colors.foreground }}
              />
              <TouchableOpacity onPress={() => setShowPw(!showPw)}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View>
            <Text style={{ fontSize: 13, fontWeight: '500', color: colors.foreground, marginBottom: 6 }}>Confirmer</Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
              borderRadius: 8, backgroundColor: colors.card, paddingHorizontal: 14, height: 44,
            }}>
              <TextInput
                value={confirmPassword} onChangeText={setConfirmPassword}
                placeholder="Retape ton mot de passe" placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPw}
                style={{ flex: 1, fontSize: 14, color: colors.foreground }}
              />
            </View>
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          onPress={handleRegister}
          disabled={loading}
          style={{
            backgroundColor: loading ? colors.primaryMedium : colors.primary,
            height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
            flexDirection: 'row', gap: 8,
          }}
        >
          {loading && <Ionicons name="sync" size={16} color={colors.primaryForeground} />}
          <Text style={{ color: colors.primaryForeground, fontSize: 15, fontWeight: '600' }}>
            {loading ? 'Création...' : 'Créer mon compte'}
          </Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 24 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          <Text style={{ marginHorizontal: 12, color: colors.mutedForeground, fontSize: 12 }}>Ou continuer avec</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        </View>

        {/* Social buttons */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity style={{
            flex: 1, height: 44, borderRadius: 8, borderWidth: 1, borderColor: colors.border,
            backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <Ionicons name="logo-google" size={18} color={colors.foreground} />
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '500' }}>Google</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{
            flex: 1, height: 44, borderRadius: 8, borderWidth: 1, borderColor: colors.border,
            backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <Ionicons name="logo-linkedin" size={18} color={colors.foreground} />
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '500' }}>LinkedIn</Text>
          </TouchableOpacity>
        </View>

        {/* Login link */}
        <View style={{ alignItems: 'center', marginTop: 28 }}>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                Déjà un compte ?{' '}
                <Text style={{ fontWeight: '600', color: colors.primary }}>Se connecter</Text>
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
