import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6C5CE7',
        tabBarInactiveTintColor: '#ADB5BD',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E9ECEF',
          paddingBottom: 8,
          paddingTop: 8,
          height: 65,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Offres',
          tabBarIcon: ({ color, size }) => <Ionicons name="briefcase" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="edge"
        options={{
          title: 'EDGE',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses" size={size + 4} color="#6C5CE7" />
          ),
          tabBarIconStyle: {
            backgroundColor: '#F0EEFF',
            borderRadius: 20,
            padding: 4,
          },
        }}
      />
      <Tabs.Screen
        name="squad"
        options={{
          title: 'Escouade',
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
