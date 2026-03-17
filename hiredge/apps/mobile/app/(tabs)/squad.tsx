import { View, Text, ScrollView, TouchableOpacity, TextInput, FlatList, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import api, { squadApi } from '../../lib/api';
import { colors } from '../../lib/theme';
import { useAuthStore } from '../../stores/auth.store';

const REACTIONS = ['👍', '❤️', '😂', '🔥', '🎉', '💪', '👏', '🚀'];

function getMemberName(m: any): string {
  const profile = m.user?.candidateProfile;
  if (profile?.firstName || profile?.lastName) {
    return `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim();
  }
  return m.user?.email?.split('@')[0] ?? 'Membre';
}

function getSenderName(msg: any): string {
  const profile = msg.sender?.candidateProfile ?? msg.user?.candidateProfile;
  if (profile?.firstName || profile?.lastName) {
    return `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim();
  }
  return msg.sender?.email?.split('@')[0] ?? msg.user?.email?.split('@')[0] ?? 'Membre';
}

export default function SquadScreen() {
  const { data: mySquad, isLoading, refetch } = useQuery({
    queryKey: ['mySquad'],
    queryFn: async () => {
      try { const { data } = await squadApi.getMySquad(); const squads = data.data; return Array.isArray(squads) ? squads[0] ?? null : squads ?? null; } catch { return null; }
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
  return <SquadDetailView squad={mySquad} onLeft={() => refetch()} />;
}

// ─── No Squad ────────────────────────────────────────────────────────────────
function NoSquadView({ onJoined }: { onJoined: () => void }) {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoinCode, setShowJoinCode] = useState(false);
  const [joinCode, setJoinCode] = useState('');
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

  const joinByCodeMut = useMutation({
    mutationFn: async () => { await squadApi.join(joinCode.trim()); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mySquad'] }); setShowJoinCode(false); onJoined(); },
    onError: () => Alert.alert('Erreur', 'Code invalide ou escouade pleine'),
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
        {/* Action buttons */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => setShowCreate(true)}
            style={{
              flex: 1, backgroundColor: colors.primary, borderRadius: 12, padding: 14,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Ionicons name="add-circle" size={18} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Créer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowJoinCode(true)}
            style={{
              flex: 1, borderRadius: 12, padding: 14,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
            }}
          >
            <Ionicons name="key-outline" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>Code</Text>
          </TouchableOpacity>
        </View>

        {/* Create form */}
        {showCreate && (
          <View style={{
            backgroundColor: colors.card, borderRadius: 12, padding: 16,
            borderWidth: 1, borderColor: colors.border, marginBottom: 20,
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
              <TouchableOpacity onPress={() => setShowCreate(false)} style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, alignItems: 'center' }}>
                <Text style={{ color: colors.mutedForeground, fontWeight: '600' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => createMut.mutate()}
                disabled={!name.trim() || createMut.isPending}
                style={{ flex: 1, backgroundColor: name.trim() ? colors.primary : colors.border, borderRadius: 12, padding: 12, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>{createMut.isPending ? 'Création...' : 'Créer'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Join by code modal */}
        {showJoinCode && (
          <View style={{
            backgroundColor: colors.card, borderRadius: 12, padding: 16,
            borderWidth: 1, borderColor: colors.border, marginBottom: 20,
          }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, marginBottom: 10 }}>Rejoindre avec un code</Text>
            <TextInput
              value={joinCode} onChangeText={setJoinCode}
              placeholder="Code d'invitation"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="characters"
              style={{
                borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12,
                fontSize: 16, color: colors.foreground, textAlign: 'center', letterSpacing: 3, marginBottom: 12,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowJoinCode(false)} style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, alignItems: 'center' }}>
                <Text style={{ color: colors.mutedForeground, fontWeight: '600' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => joinByCodeMut.mutate()}
                disabled={!joinCode.trim() || joinByCodeMut.isPending}
                style={{ flex: 1, backgroundColor: joinCode.trim() ? colors.primary : colors.border, borderRadius: 12, padding: 12, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>{joinByCodeMut.isPending ? '...' : 'Rejoindre'}</Text>
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
                  style={{ backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 }}
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
            <Ionicons name="people-outline" size={32} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, fontSize: 13, textAlign: 'center', marginTop: 10 }}>
              Aucune escouade disponible
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ─── Squad Detail ────────────────────────────────────────────────────────────
function SquadDetailView({ squad, onLeft }: { squad: any; onLeft: () => void }) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<'chat' | 'membres' | 'events'>('chat');
  const [replyTo, setReplyTo] = useState<any>(null);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [showInviteCode, setShowInviteCode] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const { data: messages, refetch } = useQuery({
    queryKey: ['squadMessages', squad.id],
    queryFn: async () => {
      const { data } = await squadApi.getMessages(squad.id);
      return data.data?.items ?? [];
    },
    refetchInterval: 5000,
  });

  const { data: events } = useQuery({
    queryKey: ['squadEvents', squad.id],
    queryFn: async () => {
      try { const { data } = await squadApi.getEvents(squad.id); return data.data ?? []; }
      catch { return []; }
    },
  });

  const sendMut = useMutation({
    mutationFn: async (content: string) => { await squadApi.sendMessage(squad.id, content, replyTo?.id); },
    onSuccess: () => { refetch(); setReplyTo(null); },
  });

  const reactionMut = useMutation({
    mutationFn: async ({ msgId, emoji }: { msgId: string; emoji: string }) => {
      await squadApi.toggleReaction(squad.id, msgId, emoji);
    },
    onSuccess: () => { refetch(); setShowReactions(null); },
  });

  const pinMut = useMutation({
    mutationFn: async (msgId: string) => { await squadApi.togglePin(squad.id, msgId); },
    onSuccess: () => refetch(),
  });

  const deleteMut = useMutation({
    mutationFn: async ({ msgId, mode }: { msgId: string; mode: 'FOR_ME' | 'FOR_ALL' }) => {
      await squadApi.deleteMessage(squad.id, msgId, mode);
    },
    onSuccess: () => refetch(),
  });

  const leaveMut = useMutation({
    mutationFn: async () => { await squadApi.leave(squad.id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mySquad'] }); onLeft(); },
  });

  const handleSend = () => {
    const t = message.trim();
    if (!t || sendMut.isPending) return;
    setMessage('');
    sendMut.mutate(t);
  };

  const handleMessageLongPress = (msg: any) => {
    const isOwn = msg.sender?.id === user?.id || msg.userId === user?.id;
    const buttons: any[] = [
      { text: 'Répondre', onPress: () => setReplyTo(msg) },
      { text: msg.pinned ? 'Désépingler' : 'Épingler', onPress: () => pinMut.mutate(msg.id) },
      { text: 'Réagir', onPress: () => setShowReactions(msg.id) },
    ];
    if (isOwn) {
      buttons.push({ text: 'Supprimer pour moi', onPress: () => deleteMut.mutate({ msgId: msg.id, mode: 'FOR_ME' }) });
      buttons.push({ text: 'Supprimer pour tous', style: 'destructive', onPress: () => deleteMut.mutate({ msgId: msg.id, mode: 'FOR_ALL' }) });
    }
    buttons.push({ text: 'Annuler', style: 'cancel' });
    Alert.alert('Message', msg.content?.substring(0, 60) + '...', buttons);
  };

  const handleLeave = () => {
    Alert.alert('Quitter', `Quitter l'escouade "${squad.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Quitter', style: 'destructive', onPress: () => leaveMut.mutate() },
    ]);
  };

  const handleCopyCode = async () => {
    if (squad.inviteCode) {
      await Clipboard.setStringAsync(squad.inviteCode);
      Alert.alert('Copié !', `Code : ${squad.inviteCode}`);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={{ paddingTop: 56, paddingBottom: 8, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <View style={{
              width: 40, height: 40, borderRadius: 12,
              backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center',
            }}>
              <Ionicons name="people" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.foreground }} numberOfLines={1}>{squad.name}</Text>
              <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{squad.members?.length ?? 0} membres</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity onPress={handleCopyCode} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="copy-outline" size={16} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLeave} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.08)', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="exit-outline" size={16} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={{
        flexDirection: 'row', marginHorizontal: 16, backgroundColor: colors.muted,
        borderRadius: 12, padding: 3, marginBottom: 6,
      }}>
        {(['chat', 'membres', 'events'] as const).map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={{
              flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10,
              backgroundColor: tab === t ? colors.card : 'transparent',
            }}
          >
            <Text style={{ fontWeight: '700', fontSize: 12, color: tab === t ? colors.foreground : colors.mutedForeground }}>
              {t === 'chat' ? 'Chat' : t === 'membres' ? 'Membres' : 'Événements'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'chat' ? (
        <View style={{ flex: 1 }}>
          <FlatList
            ref={flatListRef}
            data={messages ?? []}
            keyExtractor={(item: any) => item.id}
            contentContainerStyle={{ padding: 16, flexGrow: 1 }}
            renderItem={({ item }: { item: any }) => (
              <TouchableOpacity onLongPress={() => handleMessageLongPress(item)} activeOpacity={0.7} style={{ marginBottom: 12 }}>
                {/* Reply quote */}
                {item.replyTo && (
                  <View style={{ marginLeft: 40, marginBottom: 4, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: colors.primary }}>
                    <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600' }}>{getSenderName(item.replyTo)}</Text>
                    <Text style={{ fontSize: 11, color: colors.mutedForeground }} numberOfLines={1}>{item.replyTo.content}</Text>
                  </View>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <View style={{
                    width: 32, height: 32, borderRadius: 8,
                    backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center',
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>
                      {getSenderName(item)[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.foreground }}>{getSenderName(item)}</Text>
                      <Text style={{ fontSize: 10, color: colors.border }}>
                        {new Date(item.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      {item.pinned && <Ionicons name="pin" size={10} color={colors.warning} />}
                    </View>
                    <View style={{
                      backgroundColor: colors.muted, borderRadius: 16, borderTopLeftRadius: 4,
                      padding: 12,
                    }}>
                      <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 19 }}>{item.content}</Text>
                    </View>
                    {/* Reactions */}
                    {item.reactions?.length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {groupReactions(item.reactions).map((r: any) => (
                          <TouchableOpacity
                            key={r.emoji}
                            onPress={() => reactionMut.mutate({ msgId: item.id, emoji: r.emoji })}
                            style={{
                              flexDirection: 'row', alignItems: 'center', gap: 3,
                              backgroundColor: r.hasOwn ? colors.primaryLight : colors.muted,
                              paddingHorizontal: 6, paddingVertical: 3, borderRadius: 999,
                              borderWidth: r.hasOwn ? 1 : 0, borderColor: colors.primary,
                            }}
                          >
                            <Text style={{ fontSize: 12 }}>{r.emoji}</Text>
                            <Text style={{ fontSize: 10, fontWeight: '600', color: r.hasOwn ? colors.primary : colors.mutedForeground }}>{r.count}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 }}>
                <Ionicons name="chatbubbles-outline" size={32} color={colors.mutedForeground} />
                <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 10 }}>Commence la conversation !</Text>
              </View>
            }
          />

          {/* Reaction picker */}
          {showReactions && (
            <View style={{
              flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 10,
              backgroundColor: colors.card, borderTopWidth: 1, borderColor: colors.border,
            }}>
              {REACTIONS.map(emoji => (
                <TouchableOpacity key={emoji} onPress={() => reactionMut.mutate({ msgId: showReactions, emoji })} style={{ padding: 6 }}>
                  <Text style={{ fontSize: 22 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => setShowReactions(null)} style={{ padding: 6 }}>
                <Ionicons name="close" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          )}

          {/* Reply banner */}
          {replyTo && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8,
              backgroundColor: colors.primaryLight, borderTopWidth: 1, borderColor: colors.border,
            }}>
              <Ionicons name="arrow-undo" size={14} color={colors.primary} />
              <Text style={{ flex: 1, marginLeft: 8, fontSize: 12, color: colors.primary }} numberOfLines={1}>
                {getSenderName(replyTo)}: {replyTo.content}
              </Text>
              <TouchableOpacity onPress={() => setReplyTo(null)}>
                <Ionicons name="close" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}

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
      ) : tab === 'membres' ? (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {/* Invite code card */}
          {squad.inviteCode && (
            <TouchableOpacity onPress={handleCopyCode} style={{
              backgroundColor: colors.primaryLight, borderRadius: 12, padding: 14, marginBottom: 16,
              flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.primaryMedium,
            }}>
              <Ionicons name="key" size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Code d'invitation</Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary, letterSpacing: 2 }}>{squad.inviteCode}</Text>
              </View>
              <Ionicons name="copy-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          )}

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
                  width: 8, height: 8, borderRadius: 4,
                  backgroundColor: m.status === 'ONLINE' ? colors.success : colors.border,
                }} />
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {(events?.length ?? 0) > 0 ? events!.map((evt: any) => (
            <View key={evt.id} style={{
              backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 10,
              borderWidth: 1, borderColor: colors.border,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 10,
                  backgroundColor: evt.type === 'MEETING' ? '#6C5CE718' : evt.type === 'CALL' ? '#00B89418' : '#FDCB6E18',
                  justifyContent: 'center', alignItems: 'center',
                }}>
                  <Ionicons
                    name={evt.type === 'MEETING' ? 'people' : evt.type === 'CALL' ? 'call' : 'document-text'}
                    size={16}
                    color={evt.type === 'MEETING' ? colors.primary : evt.type === 'CALL' ? colors.success : colors.warning}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>{evt.title}</Text>
                  <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
                    {evt.scheduledAt ? new Date(evt.scheduledAt).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                  </Text>
                </View>
              </View>
              {evt.description && <Text style={{ fontSize: 12, color: colors.mutedForeground, lineHeight: 17 }}>{evt.description}</Text>}
            </View>
          )) : (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Ionicons name="calendar-outline" size={32} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 10 }}>Aucun événement</Text>
            </View>
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

// ─── Helpers ───
function groupReactions(reactions: any[]): { emoji: string; count: number; hasOwn: boolean }[] {
  const map = new Map<string, { count: number; hasOwn: boolean }>();
  reactions.forEach((r: any) => {
    const existing = map.get(r.emoji) ?? { count: 0, hasOwn: false };
    existing.count++;
    map.set(r.emoji, existing);
  });
  return Array.from(map.entries()).map(([emoji, data]) => ({ emoji, ...data }));
}
