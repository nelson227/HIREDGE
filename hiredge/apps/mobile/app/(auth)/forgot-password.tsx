import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../lib/theme';
import { authApi } from '../../lib/api';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { colors } = useThemeColors();

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre adresse email');
      return;
    }

    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch {
      Alert.alert('Erreur', 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 24 }}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>

        {sent ? (
          <View style={{ alignItems: 'center', gap: 16 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="mail-outline" size={32} color={colors.primary} />
            </View>
            <Text style={{ fontSize: 22, fontWeight: '700', color: colors.foreground, textAlign: 'center' }}>Email envoyé !</Text>
            <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: 'center', lineHeight: 22 }}>
              Si un compte existe avec l'adresse {email}, vous recevrez un lien de réinitialisation dans quelques minutes.
            </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={{ marginTop: 16 }}>
              <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 15 }}>Retour à la connexion</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={{ fontSize: 26, fontWeight: '700', color: colors.foreground, marginBottom: 8 }}>Mot de passe oublié ?</Text>
            <Text style={{ fontSize: 14, color: colors.mutedForeground, marginBottom: 28, lineHeight: 22 }}>
              Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </Text>

            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: colors.foreground, marginBottom: 6 }}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="vous@exemple.com"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={{
                  borderWidth: 1, borderColor: colors.border, borderRadius: 8,
                  backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 12,
                  fontSize: 14, color: colors.foreground, height: 44,
                }}
              />
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              style={{
                backgroundColor: loading ? colors.primaryMedium : colors.primary,
                height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ color: colors.primaryForeground, fontSize: 15, fontWeight: '600' }}>
                {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
