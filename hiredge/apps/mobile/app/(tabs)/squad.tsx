import { View, Text, ScrollView, TouchableOpacity, TextInput, FlatList, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';
import { colors, spacing, radius, fontSize, shadows } from '../../lib/theme';

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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <Text style={{ color: colors.mutedForeground }}>Chargement...</Text>
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
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={{
        backgroundColor: colors.card, paddingTop: 60, paddingBottom: spacing['2xl'], paddingHorizontal: spacing.xl,
        borderBottomWidth: 1, borderColor: colors.border,
      }}>
        <Text style={{ color: colors.foreground, fontSize: fontSize['2xl'], fontWeight: '700' }}>🤝 Escouade</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: fontSize.sm + 1, marginTop: spacing.xs }}>
          Rejoins un groupe de 5-8 personnes pour vous entraider
        </Text>
      </View>

      {/* Create Squad */}
      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
        {!showCreate ? (
          <TouchableOpacity
            onPress={() => setShowCreate(true)}
            style={{
              backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
              ...shadows.lg,
            }}
          >
            <Ionicons name="add-circle" size={20} color={colors.primaryForeground} />
            <Text style={{ color: colors.primaryForeground, fontWeight: '600', fontSize: fontSize.base + 1 }}>Créer une escouade</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadows.sm }}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Nom de l'escouade"
              placeholderTextColor={colors.mutedForeground}
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: fontSize.base, color: colors.foreground, marginBottom: spacing.md }}
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Description (optionnel)"
              placeholderTextColor={colors.mutedForeground}
              multiline
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: fontSize.base, color: colors.foreground, height: 80, textAlignVertical: 'top', marginBottom: spacing.md }}
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity
                onPress={() => setShowCreate(false)}
                style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' }}
              >
                <Text style={{ color: colors.mutedForeground, fontWeight: '600' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => createMutation.mutate()}
                disabled={!name.trim() || createMutation.isPending}
                style={{
                  flex: 1, backgroundColor: name.trim() ? colors.primary : colors.border, borderRadius: radius.md, padding: spacing.md, alignItems: 'center',
                }}
              >
                <Text style={{ color: colors.primaryForeground, fontWeight: '600' }}>
                  {createMutation.isPending ? 'Création...' : 'Créer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Available Squads */}
      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing['2xl'] }}>
        <Text style={{ fontSize: fontSize.lg + 1, fontWeight: '700', color: colors.foreground, marginBottom: spacing.md }}>
          Escouades disponibles
        </Text>
        {available?.length > 0 ? (
          available.map((squad: any) => (
            <View key={squad.id} style={{
              backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.sm,
              borderWidth: 1, borderColor: colors.border, ...shadows.sm,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: fontSize.base + 1, fontWeight: '600', color: colors.foreground }}>{squad.name}</Text>
                  {squad.description && (
                    <Text style={{ color: colors.mutedForeground, marginTop: 2, fontSize: fontSize.sm }} numberOfLines={2}>
                      {squad.description}
                    </Text>
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm }}>
                    <Ionicons name="people" size={14} color={colors.primary} />
                    <Text style={{ fontSize: fontSize.sm, color: colors.primary, fontWeight: '500' }}>
                      {squad._count?.members ?? 0}/8 membres
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => joinMutation.mutate(squad.id)}
                  disabled={joinMutation.isPending}
                  style={{
                    backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md,
                  }}
                >
                  <Text style={{ color: colors.primaryForeground, fontWeight: '600', fontSize: fontSize.sm }}>Rejoindre</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: spacing['3xl'] }}>
            <View style={{ width: 56, height: 56, borderRadius: radius.xl, backgroundColor: colors.muted, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md }}>
              <Ionicons name="people-outline" size={24} color={colors.mutedForeground} />
            </View>
            <Text style={{ color: colors.mutedForeground, textAlign: 'center' }}>
              Aucune escouade disponible pour le moment
            </Text>
          </View>
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        backgroundColor: colors.card, paddingTop: 60, paddingBottom: spacing.lg, paddingHorizontal: spacing.xl,
        borderBottomWidth: 1, borderColor: colors.border,
      }}>
        <Text style={{ color: colors.foreground, fontSize: fontSize.xl, fontWeight: '700' }}>{squad.name}</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: fontSize.sm, marginTop: 2 }}>
          {squad.members?.length ?? 0} membres
        </Text>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderColor: colors.border }}>
        {(['chat', 'membres'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={{
              flex: 1, paddingVertical: spacing.md, alignItems: 'center',
              borderBottomWidth: 2, borderColor: tab === t ? colors.primary : 'transparent',
            }}
          >
            <Text style={{ fontWeight: '600', color: tab === t ? colors.primary : colors.mutedForeground }}>
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
            contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
            inverted={false}
            renderItem={({ item }: { item: any }) => (
              <View style={{ marginBottom: spacing.md }}>
                <Text style={{ fontSize: fontSize.xs + 1, fontWeight: '600', color: colors.primary }}>
                  {item.user?.fullName ?? 'Membre'}
                </Text>
                <View style={{
                  backgroundColor: colors.card, borderRadius: radius.xl, borderTopLeftRadius: radius.xs + 2,
                  padding: spacing.md, marginTop: 2, borderWidth: 1, borderColor: colors.border,
                }}>
                  <Text style={{ color: colors.foreground, fontSize: fontSize.sm + 1 }}>{item.content}</Text>
                </View>
                <Text style={{ fontSize: 10, color: colors.border, marginTop: 2 }}>
                  {new Date(item.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ width: 56, height: 56, borderRadius: radius.xl, backgroundColor: colors.muted, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md }}>
                  <Ionicons name="chatbubbles-outline" size={24} color={colors.mutedForeground} />
                </View>
                <Text style={{ color: colors.mutedForeground }}>Commence la conversation !</Text>
              </View>
            }
          />
          {/* Input */}
          <View style={{
            flexDirection: 'row', alignItems: 'flex-end', padding: spacing.md, backgroundColor: colors.card,
            borderTopWidth: 1, borderColor: colors.border, gap: spacing.sm,
          }}>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Message à l'escouade..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              style={{
                flex: 1, backgroundColor: colors.muted, borderRadius: radius.full, paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md, fontSize: fontSize.base, maxHeight: 80, color: colors.foreground,
              }}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!message.trim() || sendMutation.isPending}
              style={{
                width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center',
                backgroundColor: message.trim() ? colors.primary : colors.muted,
              }}
            >
              <Ionicons name="send" size={18} color={message.trim() ? colors.primaryForeground : colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          {squad.members?.map((member: any) => (
            <View key={member.id} style={{
              backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg - 2, marginBottom: spacing.sm,
              flexDirection: 'row', alignItems: 'center', gap: spacing.md,
              borderWidth: 1, borderColor: colors.border, ...shadows.sm,
            }}>
              <View style={{
                width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLight,
                justifyContent: 'center', alignItems: 'center',
              }}>
                <Text style={{ fontSize: fontSize.lg + 1, fontWeight: '700', color: colors.primary }}>
                  {(member.user?.fullName ?? '?')[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: fontSize.base, fontWeight: '600', color: colors.foreground }}>
                  {member.user?.fullName ?? 'Membre'}
                </Text>
                <Text style={{ fontSize: fontSize.xs + 1, color: colors.mutedForeground, marginTop: 2 }}>
                  {member.role === 'LEADER' ? '👑 Leader' : '✅ Membre actif'}
                </Text>
              </View>
              <View style={{
                backgroundColor: member.status === 'ACTIVE' ? colors.successLight : colors.warningLight,
                paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full,
              }}>
                <Text style={{
                  fontSize: fontSize.xs, fontWeight: '600',
                  color: member.status === 'ACTIVE' ? colors.success : colors.warning,
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
