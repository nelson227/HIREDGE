import { View, Text, ScrollView, TouchableOpacity, TextInput, FlatList, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';

export default function SquadScreen() {
  const queryClient = useQueryClient();

  const { data: mySquad, isLoading, refetch } = useQuery({
    queryKey: ['mySquad'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/squads/mine');
        return data.data;
      } catch {
        return null;
      }
    },
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' }}>
        <Text style={{ color: '#ADB5BD' }}>Chargement...</Text>
      </View>
    );
  }

  if (!mySquad) {
    return <NoSquadView onJoined={() => refetch()} />;
  }

  return <SquadDetailView squad={mySquad} />;
}

// ─── No Squad: Join or Create ───
function NoSquadView({ onJoined }: { onJoined: () => void }) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const queryClient = useQueryClient();

  const { data: available } = useQuery({
    queryKey: ['availableSquads'],
    queryFn: async () => {
      const { data } = await api.get('/squads/available');
      return data.data;
    },
  });

  const joinMutation = useMutation({
    mutationFn: async (squadId: string) => {
      await api.post(`/squads/${squadId}/join`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mySquad'] });
      onJoined();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/squads', { name, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mySquad'] });
      onJoined();
    },
  });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F8F9FA' }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{
        backgroundColor: '#6C5CE7', paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20,
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
      }}>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>🤝 Escouade</Text>
        <Text style={{ color: '#A29BFE', fontSize: 14, marginTop: 4 }}>
          Rejoins un groupe de 5-8 personnes pour vous entraider
        </Text>
      </View>

      {/* Create Squad */}
      <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
        {!showCreate ? (
          <TouchableOpacity
            onPress={() => setShowCreate(true)}
            style={{
              backgroundColor: '#6C5CE7', borderRadius: 12, padding: 16,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Créer une escouade</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E9ECEF' }}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Nom de l'escouade"
              placeholderTextColor="#ADB5BD"
              style={{ borderWidth: 1, borderColor: '#E9ECEF', borderRadius: 8, padding: 12, fontSize: 15, color: '#2D3436', marginBottom: 10 }}
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Description (optionnel)"
              placeholderTextColor="#ADB5BD"
              multiline
              style={{ borderWidth: 1, borderColor: '#E9ECEF', borderRadius: 8, padding: 12, fontSize: 15, color: '#2D3436', height: 80, textAlignVertical: 'top', marginBottom: 12 }}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => setShowCreate(false)}
                style={{ flex: 1, borderWidth: 1, borderColor: '#DEE2E6', borderRadius: 8, padding: 12, alignItems: 'center' }}
              >
                <Text style={{ color: '#495057', fontWeight: '600' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => createMutation.mutate()}
                disabled={!name.trim() || createMutation.isPending}
                style={{
                  flex: 1, backgroundColor: name.trim() ? '#6C5CE7' : '#CED4DA', borderRadius: 8, padding: 12, alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>
                  {createMutation.isPending ? 'Création...' : 'Créer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Available Squads */}
      <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#2D3436', marginBottom: 12 }}>
          Escouades disponibles
        </Text>
        {available?.length > 0 ? (
          available.map((squad: any) => (
            <View key={squad.id} style={{
              backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8,
              borderWidth: 1, borderColor: '#E9ECEF',
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#2D3436' }}>{squad.name}</Text>
                  {squad.description && (
                    <Text style={{ color: '#868E96', marginTop: 2, fontSize: 13 }} numberOfLines={2}>
                      {squad.description}
                    </Text>
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                    <Ionicons name="people" size={14} color="#6C5CE7" />
                    <Text style={{ fontSize: 13, color: '#6C5CE7' }}>
                      {squad._count?.members ?? 0}/8 membres
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => joinMutation.mutate(squad.id)}
                  disabled={joinMutation.isPending}
                  style={{
                    backgroundColor: '#6C5CE7', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Rejoindre</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <Text style={{ color: '#ADB5BD', textAlign: 'center', paddingVertical: 20 }}>
            Aucune escouade disponible pour le moment
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

// ─── Squad Detail: Members + Chat ───
function SquadDetailView({ squad }: { squad: any }) {
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<'chat' | 'membres'>('chat');
  const queryClient = useQueryClient();

  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ['squadMessages', squad.id],
    queryFn: async () => {
      const { data } = await api.get(`/squads/${squad.id}/messages?limit=50`);
      return data.data?.items ?? [];
    },
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      await api.post(`/squads/${squad.id}/messages`, { content });
    },
    onSuccess: () => refetchMessages(),
  });

  const handleSend = () => {
    const text = message.trim();
    if (!text || sendMutation.isPending) return;
    setMessage('');
    sendMutation.mutate(text);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#6C5CE7', paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20,
      }}>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>{squad.name}</Text>
        <Text style={{ color: '#A29BFE', fontSize: 13, marginTop: 2 }}>
          {squad.members?.length ?? 0} membres
        </Text>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#E9ECEF' }}>
        {(['chat', 'membres'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={{
              flex: 1, paddingVertical: 12, alignItems: 'center',
              borderBottomWidth: 2, borderColor: tab === t ? '#6C5CE7' : 'transparent',
            }}
          >
            <Text style={{ fontWeight: '600', color: tab === t ? '#6C5CE7' : '#ADB5BD' }}>
              {t === 'chat' ? '💬 Chat' : '👥 Membres'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'chat' ? (
        <View style={{ flex: 1 }}>
          <FlatList
            data={messages ?? []}
            keyExtractor={(item: any) => item.id}
            contentContainerStyle={{ padding: 16, flexGrow: 1 }}
            inverted={false}
            renderItem={({ item }: { item: any }) => (
              <View style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#6C5CE7' }}>
                  {item.user?.fullName ?? 'Membre'}
                </Text>
                <View style={{
                  backgroundColor: '#fff', borderRadius: 12, borderTopLeftRadius: 4,
                  padding: 10, marginTop: 2, borderWidth: 1, borderColor: '#E9ECEF',
                }}>
                  <Text style={{ color: '#2D3436', fontSize: 14 }}>{item.content}</Text>
                </View>
                <Text style={{ fontSize: 10, color: '#CED4DA', marginTop: 2 }}>
                  {new Date(item.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#ADB5BD' }}>Commence la conversation ! 🎉</Text>
              </View>
            }
          />
          {/* Input */}
          <View style={{
            flexDirection: 'row', alignItems: 'flex-end', padding: 12, backgroundColor: '#fff',
            borderTopWidth: 1, borderColor: '#E9ECEF', gap: 8,
          }}>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Message à l'escouade..."
              placeholderTextColor="#ADB5BD"
              multiline
              style={{
                flex: 1, backgroundColor: '#F1F3F5', borderRadius: 20, paddingHorizontal: 16,
                paddingVertical: 10, fontSize: 15, maxHeight: 80, color: '#2D3436',
              }}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!message.trim() || sendMutation.isPending}
              style={{
                width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center',
                backgroundColor: message.trim() ? '#6C5CE7' : '#E9ECEF',
              }}
            >
              <Ionicons name="send" size={18} color={message.trim() ? '#fff' : '#ADB5BD'} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {squad.members?.map((member: any) => (
            <View key={member.id} style={{
              backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
              flexDirection: 'row', alignItems: 'center', gap: 12,
              borderWidth: 1, borderColor: '#E9ECEF',
            }}>
              <View style={{
                width: 44, height: 44, borderRadius: 22, backgroundColor: '#F0EEFF',
                justifyContent: 'center', alignItems: 'center',
              }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#6C5CE7' }}>
                  {(member.user?.fullName ?? '?')[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#2D3436' }}>
                  {member.user?.fullName ?? 'Membre'}
                </Text>
                <Text style={{ fontSize: 12, color: '#868E96', marginTop: 2 }}>
                  {member.role === 'LEADER' ? '👑 Leader' : '✅ Membre actif'}
                </Text>
              </View>
              <View style={{
                backgroundColor: member.status === 'ACTIVE' ? '#00B89415' : '#FFA50015',
                paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
              }}>
                <Text style={{
                  fontSize: 11, fontWeight: '600',
                  color: member.status === 'ACTIVE' ? '#00B894' : '#FFA500',
                }}>
                  {member.status === 'ACTIVE' ? 'Actif' : 'En attente'}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
