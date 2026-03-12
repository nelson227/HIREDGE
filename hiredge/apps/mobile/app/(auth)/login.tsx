import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuthStore } from '../../stores/auth.store';

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
      style={{ flex: 1, backgroundColor: '#fff' }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        {/* Logo & Header */}
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <Text style={{ fontSize: 36, fontWeight: '800', color: '#6C5CE7' }}>HIREDGE</Text>
          <Text style={{ fontSize: 16, color: '#868E96', marginTop: 8 }}>
            Ton avantage dans la recherche d'emploi
          </Text>
        </View>

        {/* Form */}
        <View style={{ gap: 16 }}>
          <View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#495057', marginBottom: 6 }}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="ton@email.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              style={{
                borderWidth: 1, borderColor: '#DEE2E6', borderRadius: 12,
                padding: 14, fontSize: 16, backgroundColor: '#F8F9FA',
              }}
            />
          </View>

          <View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#495057', marginBottom: 6 }}>Mot de passe</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoComplete="password"
              style={{
                borderWidth: 1, borderColor: '#DEE2E6', borderRadius: 12,
                padding: 14, fontSize: 16, backgroundColor: '#F8F9FA',
              }}
            />
          </View>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={{
              backgroundColor: loading ? '#A29BFE' : '#6C5CE7',
              padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Register link */}
        <View style={{ alignItems: 'center', marginTop: 24 }}>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text style={{ color: '#6C5CE7', fontSize: 14 }}>
                Pas encore de compte ? <Text style={{ fontWeight: '700' }}>S'inscrire</Text>
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
