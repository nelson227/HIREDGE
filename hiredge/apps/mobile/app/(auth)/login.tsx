import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/auth.store';
import { useThemeColors } from '../../lib/theme';
import { useTranslation } from '../../lib/i18n';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const login = useAuthStore((s) => s.login);
  const colors = useThemeColors();
  const { t } = useTranslation();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t('authError'), t('authFillAllFields'));
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (err: any) {
      const msg = err.code === 'ECONNABORTED'
        ? t('authServerSlow')
        : err.response?.data?.error?.message ?? err.message ?? t('authCannotLogin');
      Alert.alert(t('authError'), msg);
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
          <Text style={{ fontSize: 24, fontWeight: '700', color: colors.foreground }}>{t('authWelcomeBack')}</Text>
          <Text style={{ fontSize: 14, color: colors.mutedForeground, marginTop: 4 }}>
            {t('authLoginSubtitle')}
          </Text>
        </View>

        {/* Form */}
        <View style={{ gap: 16, marginBottom: 20 }}>
          {/* Email */}
          <View>
            <Text style={{ fontSize: 13, fontWeight: '500', color: colors.foreground, marginBottom: 6 }}>{t('authEmail')}</Text>
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
            <Text style={{ fontSize: 13, fontWeight: '500', color: colors.foreground, marginBottom: 6 }}>{t('authPassword')}</Text>
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

        {/* Forgot password link */}
        <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password' as any)} style={{ alignSelf: 'flex-end', marginTop: -4, marginBottom: 4 }}>
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '500' }}>Mot de passe oublié ?</Text>
        </TouchableOpacity>

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
            {loading ? t('authLoggingIn') : t('authLogin')}
          </Text>
        </TouchableOpacity>

        {/* Register link */}
        <View style={{ alignItems: 'center', marginTop: 28 }}>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                {t('authNoAccount')}{' '}
                <Text style={{ fontWeight: '600', color: colors.primary }}>{t('authRegister')}</Text>
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
