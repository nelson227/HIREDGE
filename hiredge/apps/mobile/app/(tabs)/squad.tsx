import { View, Text, ScrollView, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import api, { squadApi } from '../../lib/api';
import { colors } from '../../lib/theme';

function getMemberName(m: any): string {
  const profile = m.user?.candidateProfile;
  if (profile?.firstName || profile?.lastName) {
    return `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim();
  }
  return m.user?.email?.split('@')[0] ?? 'Membre';
}

export default function SquadScreen() {
  const { data: mySquad, isLoading, refetch } = useQuery({
    queryKey: ['mySquad'],
    queryFn: async () => {
      try { const { data } = await squadApi.getMySquad(); return data.data; } catch { return null; }
    },
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <Text style={{ color: colors.mutedForeground }}>Chargement...</Text>
      </View>
    );
  }

  if (!mySquad) return <NoSquadView onJoined={() => refetch()} />;
  return <SquadDetailView squad={mySquad} />;
}

// ─── No Squad ────────────────────────────────────────────────────────────────
function NoSquadView({ onJoined }: { onJoined: () => void }) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const queryClient = useQueryClient();

  const { data: available } = useQuery({
    queryKey: ['availableSquads'],
    queryFn: async () => { const { data } = await squadApi.getAvailable(); return data.data; },
  });

  const joinMut = useMutation({
    mutationFn: async (id: string) => { await squadApi.joinById(id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mySquad'] }); onJoined(); },
  });

  const createMut = useMutation({
    mutationFn: async () => { await squadApi.create({ name, description }); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mySquad'] }); onJoined(); },
  });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: colors.foreground }}>Escouade</Text>
        <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 4 }}>
          Rejoins un groupe de 5-8 personnes pour vous entraider
        </Text>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        {/* Create form or button */}
        {!showCreate ? (
          <TouchableOpacity
            onPress={() => setShowCreate(true)}
            style={{
              backgroundColor: colors.primary, borderRadius: 12, padding: 14,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24,
            }}
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Créer une escouade</Text>
          </TouchableOpacity>
        ) : (
          <View style={{
            backgroundColor: colors.card, borderRadius: 12, padding: 16,
            borderWidth: 1, borderColor: colors.border, marginBottom: 24,
          }}>
            <TextInput
              value={name} onChangeText={setName}
              placeholder="Nom de l'escouade"
              placeholderTextColor={colors.mutedForeground}
              style={{
                borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12,
                fontSize: 14, color: colors.foreground, marginBottom: 10,
              }}
            />
            <TextInput
              value={description} onChangeText={setDescription}
              placeholder="Description (optionnel)"
              placeholderTextColor={colors.mutedForeground}
              multiline
              style={{
                borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12,
                fontSize: 14, color: colors.foreground, height: 72, textAlignVertical: 'top', marginBottom: 12,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setShowCreate(false)}
                style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, alignItems: 'center' }}
              >
                <Text style={{ color: colors.mutedForeground, fontWeight: '600', fontSize: 14 }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => createMut.mutate()}
                disabled={!name.trim() || createMut.isPending}
                style={{
                  flex: 1, backgroundColor: name.trim() ? colors.primary : colors.border,
                  borderRadius: 12, padding: 12, alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                  {createMut.isPending ? 'Création...' : 'Créer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Available squads */}
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.mutedForeground, marginBottom: 12 }}>
          Escouades disponibles
        </Text>

        {available?.length > 0 ? (
          <View style={{
            backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
          }}>
            {available.map((sq: any, i: number) => (
              <View key={sq.id} style={{
                padding: 16, borderBottomWidth: i < available.length - 1 ? 1 : 0, borderColor: colors.border,
                flexDirection: 'row', alignItems: 'center', gap: 12,
              }}>
                <View style={{
                  width: 40, height: 40, borderRadius: 12,
                  backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center',
                }}>
                  <Ionicons name="people" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>{sq.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>
                    {sq._count?.members ?? 0}/8 membres
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => joinMut.mutate(sq.id)}
                  disabled={joinMut.isPending}
                  style={{
                    backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Rejoindre</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={{
            backgroundColor: colors.card, borderRadius: 12, padding: 40,
            borderWidth: 1, borderColor: colors.border, alignItems: 'center',
          }}>
            <View style={{
              width: 48, height: 48, borderRadius: 12, backgroundColor: colors.muted,
              justifyContent: 'center', alignItems: 'center', marginBottom: 10,
            }}>
              <Ionicons name="people-outline" size={22} color={colors.mutedForeground} />
            </View>
            <Text style={{ color: colors.mutedForeground, fontSize: 13, textAlign: 'center' }}>
              Aucune escouade disponible
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ─── Squad Detail ────────────────────────────────────────────────────────────
function SquadDetailView({ squad }: { squad: any }) {
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<'chat' | 'membres'>('chat');

  const { data: messages, refetch } = useQuery({
    queryKey: ['squadMessages', squad.id],
    queryFn: async () => {
      const { data } = await squadApi.getMessages(squad.id);
      return data.data?.items ?? [];
    },
    refetchInterval: 5000,
  });

  const sendMut = useMutation({
    mutationFn: async (content: string) => { await squadApi.sendMessage(squad.id, content); },
    onSuccess: () => refetch(),
  });

  const handleSend = () => {
    const t = message.trim();
    if (!t || sendMut.isPending) return;
    setMessage('');
    sendMut.mutate(t);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingTop: 56, paddingBottom: 12, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center',
          }}>
            <Ionicons name="people" size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}>{squad.name}</Text>
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{squad.members?.length ?? 0} membres</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={{
        flexDirection: 'row', marginHorizontal: 16, backgroundColor: colors.muted,
        borderRadius: 12, padding: 3, marginBottom: 6,
      }}>
        {(['chat', 'membres'] as const).map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={{
              flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10,
              backgroundColor: tab === t ? colors.card : 'transparent',
            }}
          >
            <Text style={{ fontWeight: '700', fontSize: 13, color: tab === t ? colors.foreground : colors.mutedForeground }}>
              {t === 'chat' ? 'Chat' : 'Membres'}
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
            renderItem={({ item }: { item: any }) => (
              <View style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <View style={{
                    width: 32, height: 32, borderRadius: 8,
                    backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center',
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>
                      {getMemberName(item)[0].toUpperCase()}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.foreground }}>
                    {getMemberName(item)}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.border }}>
                    {new Date(item.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={{
                    backgroundColor: colors.muted, borderRadius: 16, borderTopLeftRadius: 4,
                  padding: 12, marginLeft: 40,
                }}>
                  <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 19 }}>{item.content}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 }}>
                <View style={{
                  width: 48, height: 48, borderRadius: 12, backgroundColor: colors.muted,
                  justifyContent: 'center', alignItems: 'center', marginBottom: 10,
                }}>
                  <Ionicons name="chatbubbles-outline" size={22} color={colors.mutedForeground} />
                </View>
                <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>Commence la conversation !</Text>
              </View>
            }
          />
          {/* Input */}
          <View style={{
            flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 8,
            backgroundColor: colors.card, borderTopWidth: 1, borderColor: colors.border,
          }}>
            <TextInput
              value={message} onChangeText={setMessage}
              placeholder="Message..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              style={{
                flex: 1, backgroundColor: colors.muted, borderRadius: 20,
                paddingHorizontal: 16, paddingVertical: 10, fontSize: 14,
                maxHeight: 80, color: colors.foreground,
              }}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!message.trim() || sendMut.isPending}
              style={{
                width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center',
                backgroundColor: message.trim() ? colors.primary : colors.muted,
              }}
            >
              <Ionicons name="send" size={17} color={message.trim() ? '#fff' : colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={{
            backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
          }}>
            {squad.members?.map((m: any, i: number) => (
              <View key={m.id} style={{
                flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
                borderBottomWidth: i < (squad.members?.length ?? 1) - 1 ? 1 : 0, borderColor: colors.border,
              }}>
                <View style={{
                  width: 40, height: 40, borderRadius: 12,
                  backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center',
                }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.primary }}>
                    {getMemberName(m)[0].toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>{getMemberName(m)}</Text>
                  <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 1 }}>
                    {m.role === 'CHAMPION' ? '👑 Champion' : 'Membre'}
                  </Text>
                </View>
                <View style={{
                  backgroundColor: m.status === 'ACTIVE' ? 'rgba(34,197,94,0.10)' : 'rgba(245,158,11,0.10)',
                  paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
                }}>
                  <Text style={{
                    fontSize: 11, fontWeight: '600',
                    color: m.status === 'ACTIVE' ? colors.success : colors.warning,
                  }}>
                    {m.status === 'ACTIVE' ? 'Actif' : 'En attente'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
