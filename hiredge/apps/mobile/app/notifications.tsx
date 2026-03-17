import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { notificationsApi } from '../lib/api';

export default function NotificationsScreen() {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await notificationsApi.list();
      return data.data;
    },
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      await notificationsApi.markAllRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifCount'] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await notificationsApi.markRead(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifCount'] });
    },
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#fff', paddingTop: 60, paddingBottom: 14, paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderBottomWidth: 1, borderColor: '#E9ECEF',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#2D3436" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#2D3436' }}>Notifications</Text>
        </View>
        <TouchableOpacity onPress={() => markAllMutation.mutate()}>
          <Text style={{ color: '#6C5CE7', fontWeight: '600', fontSize: 13 }}>Tout marquer lu</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications ?? []}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ paddingVertical: 8 }}
        renderItem={({ item }: { item: any }) => (
          <TouchableOpacity
            onPress={() => {
              if (!item.readAt) markReadMutation.mutate(item.id);
            }}
            style={{
              backgroundColor: item.readAt ? '#fff' : '#F0EEFF',
              paddingHorizontal: 16, paddingVertical: 14,
              borderBottomWidth: 1, borderColor: '#F1F3F5',
              flexDirection: 'row', gap: 12,
            }}
          >
            <View style={{
              width: 38, height: 38, borderRadius: 19,
              backgroundColor: getNotifColor(item.type) + '15',
              justifyContent: 'center', alignItems: 'center',
            }}>
              <Ionicons name={getNotifIcon(item.type)} size={18} color={getNotifColor(item.type)} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: item.readAt ? '400' : '600', color: '#2D3436' }}>
                {item.title}
              </Text>
              {item.body && (
                <Text style={{ color: '#868E96', fontSize: 13, marginTop: 2 }} numberOfLines={2}>
                  {item.body}
                </Text>
              )}
              <Text style={{ color: '#CED4DA', fontSize: 11, marginTop: 4 }}>
                {formatRelativeTime(item.createdAt)}
              </Text>
            </View>
            {!item.readAt && (
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#6C5CE7', marginTop: 6 }} />
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Ionicons name="notifications-off-outline" size={48} color="#DEE2E6" />
            <Text style={{ color: '#ADB5BD', marginTop: 12, fontSize: 15 }}>Aucune notification</Text>
          </View>
        }
      />
    </View>
  );
}

function getNotifIcon(type: string): string {
  switch (type) {
    case 'JOB_MATCH': return 'briefcase';
    case 'APPLICATION_UPDATE': return 'document-text';
    case 'INTERVIEW_REMINDER': return 'calendar';
    case 'SQUAD_MESSAGE': return 'people';
    case 'SCOUT_REPLY': return 'eye';
    case 'SYSTEM': return 'information-circle';
    default: return 'notifications';
  }
}

function getNotifColor(type: string): string {
  switch (type) {
    case 'JOB_MATCH': return '#6C5CE7';
    case 'APPLICATION_UPDATE': return '#00CEC9';
    case 'INTERVIEW_REMINDER': return '#FF7675';
    case 'SQUAD_MESSAGE': return '#FDCB6E';
    case 'SCOUT_REPLY': return '#00B894';
    default: return '#868E96';
  }
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR');
}
