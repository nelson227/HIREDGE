import { View, Text, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';

const STATUS_FILTERS = ['Tous', 'DRAFT', 'APPLIED', 'VIEWED', 'INTERVIEW_SCHEDULED', 'OFFERED', 'REJECTED'];
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  APPLIED: 'Envoyée',
  VIEWED: 'Consultée',
  INTERVIEW_SCHEDULED: 'Entretien',
  OFFERED: 'Offre reçue',
  REJECTED: 'Refusée',
  ACCEPTED: 'Acceptée',
};
const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#ADB5BD',
  APPLIED: '#6C5CE7',
  VIEWED: '#00CEC9',
  INTERVIEW_SCHEDULED: '#FDCB6E',
  OFFERED: '#00B894',
  REJECTED: '#FF7675',
  ACCEPTED: '#00B894',
};

export default function ApplicationsScreen() {
  const [filter, setFilter] = useState('Tous');
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ['applications', filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter !== 'Tous') params.set('status', filter);
      params.set('limit', '50');
      const { data } = await api.get(`/applications?${params}`);
      return data.data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['applicationStats'],
    queryFn: async () => {
      const { data } = await api.get('/applications/stats');
      return data.data;
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, []);

  const applications = data?.items ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#6C5CE7', paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20,
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>Mes candidatures</Text>
        </View>

        {/* Mini Stats */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <MiniStat label="Total" value={stats?.total ?? 0} />
          <MiniStat label="En cours" value={(stats?.byStatus?.APPLIED ?? 0) + (stats?.byStatus?.VIEWED ?? 0)} />
          <MiniStat label="Entretiens" value={stats?.byStatus?.INTERVIEW_SCHEDULED ?? 0} />
          <MiniStat label="Offres" value={stats?.byStatus?.OFFERED ?? 0} />
        </View>
      </View>

      {/* Filters */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={STATUS_FILTERS}
        keyExtractor={(item) => item}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12, gap: 6 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setFilter(item)}
            style={{
              paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
              backgroundColor: filter === item ? '#6C5CE7' : '#fff',
              borderWidth: 1, borderColor: filter === item ? '#6C5CE7' : '#E9ECEF',
            }}
          >
            <Text style={{
              fontSize: 12, fontWeight: '600',
              color: filter === item ? '#fff' : '#495057',
            }}>
              {item === 'Tous' ? 'Tous' : STATUS_LABELS[item] ?? item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Applications List */}
      <FlatList
        data={applications}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C5CE7" />}
        renderItem={({ item }: { item: any }) => (
          <TouchableOpacity
            onPress={() => router.push(`/application/${item.id}`)}
            style={{
              backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8,
              borderWidth: 1, borderColor: '#E9ECEF', borderLeftWidth: 4,
              borderLeftColor: STATUS_COLORS[item.status] ?? '#ADB5BD',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#2D3436' }} numberOfLines={1}>
                  {item.job?.title ?? 'Poste'}
                </Text>
                <Text style={{ fontSize: 13, color: '#868E96', marginTop: 2 }}>
                  {item.job?.company?.name ?? 'Entreprise'}
                </Text>
              </View>
              <View style={{
                backgroundColor: (STATUS_COLORS[item.status] ?? '#ADB5BD') + '15',
                paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
              }}>
                <Text style={{
                  fontSize: 11, fontWeight: '700',
                  color: STATUS_COLORS[item.status] ?? '#ADB5BD',
                }}>
                  {STATUS_LABELS[item.status] ?? item.status}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 11, color: '#CED4DA', marginTop: 8 }}>
              {formatDate(item.createdAt)}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Ionicons name="document-text-outline" size={48} color="#DEE2E6" />
            <Text style={{ color: '#ADB5BD', marginTop: 12, fontSize: 15 }}>Aucune candidature</Text>
          </View>
        }
      />
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={{
      flex: 1, backgroundColor: '#FFFFFF20', borderRadius: 10, paddingVertical: 8, alignItems: 'center',
    }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>{value}</Text>
      <Text style={{ fontSize: 10, color: '#A29BFE' }}>{label}</Text>
    </View>
  );
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}
