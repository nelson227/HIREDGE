import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['applicationStats'],
    queryFn: async () => {
      const { data } = await api.get('/applications/stats');
      return data.data;
    },
  });

  const { data: recommended, refetch: refetchJobs } = useQuery({
    queryKey: ['recommendedJobs'],
    queryFn: async () => {
      const { data } = await api.get('/jobs/recommended?limit=5');
      return data.data;
    },
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifCount'],
    queryFn: async () => {
      const { data } = await api.get('/notifications/count');
      return data.data;
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchJobs()]);
    setRefreshing(false);
  }, []);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#F8F9FA' }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C5CE7" />}
    >
      {/* Header */}
      <View style={{
        backgroundColor: '#6C5CE7', paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20,
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: '#A29BFE', fontSize: 14 }}>Bonjour 👋</Text>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700', marginTop: 4 }}>
              Prêt à décrocher le job ?
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/notifications')}
            style={{ position: 'relative' }}
          >
            <Ionicons name="notifications-outline" size={24} color="#fff" />
            {notifications?.unread > 0 && (
              <View style={{
                position: 'absolute', top: -4, right: -4, backgroundColor: '#FF7675',
                borderRadius: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center',
              }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{notifications.unread}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginTop: -12, gap: 8 }}>
        <StatCard title="Candidatures" value={stats?.total ?? 0} color="#6C5CE7" icon="paper-plane" />
        <StatCard title="Entretiens" value={stats?.byStatus?.INTERVIEW_SCHEDULED ?? 0} color="#00CEC9" icon="calendar" />
        <StatCard title="Taux réponse" value={`${stats?.responseRate ?? 0}%`} color="#00B894" icon="trending-up" />
      </View>

      {/* Quick Actions */}
      <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#2D3436', marginBottom: 12 }}>
          Actions rapides
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <QuickAction icon="search" label="Chercher" onPress={() => router.push('/(tabs)/jobs')} color="#6C5CE7" />
          <QuickAction icon="chatbubble-ellipses" label="EDGE" onPress={() => router.push('/(tabs)/edge')} color="#00CEC9" />
          <QuickAction icon="mic" label="Simulation" onPress={() => router.push('/interview')} color="#FD79A8" />
          <QuickAction icon="people" label="Escouade" onPress={() => router.push('/(tabs)/squad')} color="#FDCB6E" />
        </View>
      </View>

      {/* Recommended Jobs */}
      <View style={{ paddingHorizontal: 16, marginTop: 24, marginBottom: 32 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#2D3436' }}>Recommandées pour toi</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/jobs')}>
            <Text style={{ color: '#6C5CE7', fontWeight: '600' }}>Voir tout</Text>
          </TouchableOpacity>
        </View>

        {recommended?.map((job: any) => (
          <TouchableOpacity
            key={job.id}
            onPress={() => router.push(`/job/${job.id}`)}
            style={{
              backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8,
              borderWidth: 1, borderColor: '#E9ECEF',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#2D3436' }}>{job.title}</Text>
                <Text style={{ color: '#868E96', marginTop: 2 }}>{job.company?.name}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                  <Text style={{ fontSize: 12, color: '#6C5CE7', backgroundColor: '#F0EEFF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                    {job.location}
                  </Text>
                  {job.remote && (
                    <Text style={{ fontSize: 12, color: '#00CEC9', backgroundColor: '#E8FAF9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                      Remote
                    </Text>
                  )}
                </View>
              </View>
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#6C5CE7' }}>{job.matchScore}%</Text>
                <Text style={{ fontSize: 10, color: '#868E96' }}>match</Text>
              </View>
            </View>
          </TouchableOpacity>
        )) ?? (
          <Text style={{ color: '#ADB5BD', textAlign: 'center', paddingVertical: 20 }}>
            Complète ton profil pour recevoir des recommandations
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

function StatCard({ title, value, color, icon }: { title: string; value: number | string; color: string; icon: string }) {
  return (
    <View style={{
      flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14,
      borderWidth: 1, borderColor: '#E9ECEF', alignItems: 'center',
    }}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={{ fontSize: 22, fontWeight: '700', color: '#2D3436', marginTop: 4 }}>{value}</Text>
      <Text style={{ fontSize: 11, color: '#868E96' }}>{title}</Text>
    </View>
  );
}

function QuickAction({ icon, label, onPress, color }: { icon: string; label: string; onPress: () => void; color: string }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ flex: 1, alignItems: 'center', gap: 6 }}
    >
      <View style={{
        width: 52, height: 52, borderRadius: 16, backgroundColor: color + '15',
        justifyContent: 'center', alignItems: 'center',
      }}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={{ fontSize: 12, fontWeight: '600', color: '#495057' }}>{label}</Text>
    </TouchableOpacity>
  );
}
