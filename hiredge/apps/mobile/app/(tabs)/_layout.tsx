import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform } from 'react-native';

function TabIcon({ name, focusedName, focused, color }: { name: any; focusedName: any; focused: boolean; color: string }) {
  return (
    <View style={{
      alignItems: 'center',
      justifyContent: 'center',
      width: 44,
      height: 32,
      borderRadius: 16,
      backgroundColor: focused ? '#F0EEFF' : 'transparent',
    }}>
      <Ionicons name={focused ? focusedName : name} size={22} color={color} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6C5CE7',
        tabBarInactiveTintColor: '#9B9FAD',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          borderRadius: 28,
          marginHorizontal: 16,
          marginBottom: Platform.OS === 'ios' ? 24 : 12,
          height: 68,
          position: 'absolute',
          shadowColor: '#6C5CE7',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
          elevation: 12,
          paddingHorizontal: 4,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingTop: 8,
          paddingBottom: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home-outline" focusedName="home" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Offres',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="briefcase-outline" focusedName="briefcase" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="edge"
        options={{
          title: 'EDGE',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="sparkles-outline" focusedName="sparkles" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="squad"
        options={{
          title: 'Escouade',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="people-outline" focusedName="people" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="person-outline" focusedName="person" focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
