import { View, Text, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';

export default function ScoutsScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data: conversations, refetch } = useQuery({
    queryKey: ['scoutConversations'],
    queryFn: async () => {
      const { data } = await api.get('/scouts/conversations');
      return data.data;
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#6C5CE7', paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20,
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>Éclaireurs</Text>
        </View>
        <Text style={{ color: '#A29BFE', fontSize: 13 }}>
          Discutez anonymement avec des employés d'entreprises qui vous intéressent
        </Text>
      </View>

      {/* Search Bar (future) */}

      {/* Conversations List */}
      <FlatList
        data={conversations ?? []}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C5CE7" />}
        renderItem={({ item }: { item: any }) => (
          <TouchableOpacity
            onPress={() => router.push(`/scout/${item.id}`)}
            style={{
              backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 8,
              borderWidth: 1, borderColor: '#E9ECEF', flexDirection: 'row', alignItems: 'center',
            }}
          >
            {/* Avatar anonyme */}
            <View style={{
              width: 44, height: 44, borderRadius: 22, backgroundColor: '#6C5CE715',
              justifyContent: 'center', alignItems: 'center', marginRight: 12,
            }}>
              <Ionicons name="telescope-outline" size={20} color="#6C5CE7" />
            </View>

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#2D3436' }}>
                  Éclaireur chez {item.scout?.company?.name ?? 'Entreprise'}
                </Text>
                {item.unreadCount > 0 && (
                  <View style={{
                    backgroundColor: '#6C5CE7', borderRadius: 10,
                    minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center',
                  }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{item.unreadCount}</Text>
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 12, color: '#868E96', marginTop: 2 }} numberOfLines={1}>
                {item.lastMessage ?? 'Démarrer la conversation'}
              </Text>
              {item.updatedAt && (
                <Text style={{ fontSize: 10, color: '#CED4DA', marginTop: 4 }}>
                  {formatRelativeTime(item.updatedAt)}
                </Text>
              )}
            </View>

            <Ionicons name="chevron-forward" size={16} color="#CED4DA" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Ionicons name="telescope-outline" size={52} color="#DEE2E6" />
            <Text style={{ color: '#ADB5BD', marginTop: 12, fontSize: 15, fontWeight: '600' }}>
              Aucun éclaireur contacté
            </Text>
            <Text style={{ color: '#CED4DA', marginTop: 4, fontSize: 13, textAlign: 'center', paddingHorizontal: 40 }}>
              Consultez une offre et demandez à EDGE de vous mettre en contact avec un éclaireur
            </Text>
          </View>
        }
      />
    </View>
  );
}

function formatRelativeTime(date: string): string {
  const n = Date.now() - new Date(date).getTime();
  const m = Math.floor(n / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `Il y a ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `Il y a ${d}j`;
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
