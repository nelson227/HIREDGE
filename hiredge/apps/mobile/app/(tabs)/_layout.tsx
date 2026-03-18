import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform } from 'react-native';
import { useEffect } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { useThemeColors } from '../../lib/theme';
import { useTranslation } from '../../lib/i18n';

function TabIcon({ name, focusedName, focused, color, primaryColor }: { name: any; focusedName: any; focused: boolean; color: string; primaryColor: string }) {
  return (
    <View style={{
      alignItems: 'center',
      justifyContent: 'center',
      width: 48,
      height: 36,
      borderRadius: 12,
      backgroundColor: focused ? primaryColor + '15' : 'transparent',
    }}>
      <Ionicons name={focused ? focusedName : name} size={22} color={color} />
    </View>
  );
}

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const { t } = useTranslation();
  const { colors } = useThemeColors();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isLoading]);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 64,
          paddingHorizontal: 4,
          ...Platform.select({
            ios: {
              paddingBottom: 20,
              height: 84,
            },
            default: {},
          }),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingTop: 8,
          paddingBottom: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('navHome'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home-outline" focusedName="home" focused={focused} color={color} primaryColor={colors.primary} />
          ),
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: t('navJobs'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="briefcase-outline" focusedName="briefcase" focused={focused} color={color} primaryColor={colors.primary} />
          ),
        }}
      />
      <Tabs.Screen
        name="edge"
        options={{
          title: 'EDGE',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="sparkles-outline" focusedName="sparkles" focused={focused} color={color} primaryColor={colors.primary} />
          ),
        }}
      />
      <Tabs.Screen
        name="squad"
        options={{
          title: t('navSquad'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="people-outline" focusedName="people" focused={focused} color={color} primaryColor={colors.primary} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('navProfile'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="person-outline" focusedName="person" focused={focused} color={color} primaryColor={colors.primary} />
          ),
        }}
      />
    </Tabs>
  );
}
