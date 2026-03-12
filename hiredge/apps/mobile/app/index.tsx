import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores/auth.store';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#6C5CE7' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return isAuthenticated ? <Redirect href="/(tabs)" /> : <Redirect href="/(auth)/login" />;
}
