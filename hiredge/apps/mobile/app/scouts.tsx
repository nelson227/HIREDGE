import { View, Text, TouchableOpacity, FlatList, RefreshControl, TextInput, ScrollView, Modal, Alert } from 'react-native';
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { scoutsApi } from '../lib/api';
import { colors } from '../lib/theme';

export default function ScoutsScreen() {
  const [tab, setTab] = useState<'discover' | 'conversations'>('discover');
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [askModal, setAskModal] = useState<any>(null);
  const [question, setQuestion] = useState('');
  const queryClient = useQueryClient();

  const { data: scouts, refetch: refetchScouts } = useQuery({
    queryKey: ['scouts', companyFilter],
    queryFn: async () => {
      const { data } = await scoutsApi.list(companyFilter ?? undefined);
      return data.data ?? [];
    },
  });

  const { data: conversations, refetch: refetchConversations } = useQuery({
    queryKey: ['scoutConversations'],
    queryFn: async () => {
      const { data } = await scoutsApi.getConversations();
      return data.data ?? [];
    },
  });

  const askMut = useMutation({
    mutationFn: async ({ scoutId, q }: { scoutId: string; q: string }) => {
      const { data } = await scoutsApi.askQuestion(scoutId, q);
      return data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scoutConversations'] });
      setAskModal(null);
      setQuestion('');
      if (data?.conversationId) {
        router.push(`/scout/${data.conversationId}`);
      } else {
        setTab('conversations');
        refetchConversations();
      }
    },
    onError: () => Alert.alert('Erreur', 'Impossible d\'envoyer la question'),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchScouts(), refetchConversations()]);
    setRefreshing(false);
  }, []);

  // Unique company names from scouts
  const companies = [...new Set((scouts ?? []).map((s: any) => s.company?.name).filter(Boolean))];

  const filteredScouts = (scouts ?? []).filter((s: any) => {
    if (search) {
      const q = search.toLowerCase();
      const name = (s.company?.name ?? '').toLowerCase();
      const role = (s.role ?? '').toLowerCase();
      if (!name.includes(q) && !role.includes(q)) return false;
    }
    return true;
  });

  const unreadCount = (conversations ?? []).reduce((acc: number, c: any) => acc + (c.unreadCount ?? 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.foreground, flex: 1 }}>Éclaireurs</Text>
        </View>
        <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
          Discutez anonymement avec des employés d'entreprises
        </Text>
      </View>

      {/* Tabs */}
      <View style={{
        flexDirection: 'row', marginHorizontal: 16, backgroundColor: colors.muted,
        borderRadius: 12, padding: 3, marginBottom: 10,
      }}>
        <TouchableOpacity
          onPress={() => setTab('discover')}
          style={{
            flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10,
            backgroundColor: tab === 'discover' ? colors.card : 'transparent',
          }}
        >
          <Text style={{ fontWeight: '700', fontSize: 12, color: tab === 'discover' ? colors.foreground : colors.mutedForeground }}>
            Découvrir
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab('conversations')}
          style={{
            flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10,
            backgroundColor: tab === 'conversations' ? colors.card : 'transparent',
            flexDirection: 'row', justifyContent: 'center', gap: 4,
          }}
        >
          <Text style={{ fontWeight: '700', fontSize: 12, color: tab === 'conversations' ? colors.foreground : colors.mutedForeground }}>
            Messages
          </Text>
          {unreadCount > 0 && (
            <View style={{ backgroundColor: colors.primary, borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {tab === 'discover' ? (
        <View style={{ flex: 1 }}>
          {/* Search */}
          <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', backgroundColor: colors.muted,
              borderRadius: 12, paddingHorizontal: 12, gap: 8,
            }}>
              <Ionicons name="search" size={16} color={colors.mutedForeground} />
              <TextInput
                value={search} onChangeText={setSearch}
                placeholder="Rechercher entreprise ou rôle..."
                placeholderTextColor={colors.mutedForeground}
                style={{ flex: 1, paddingVertical: 10, fontSize: 13, color: colors.foreground }}
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Company filters */}
          {companies.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 6, marginBottom: 10 }}>
              <TouchableOpacity
                onPress={() => setCompanyFilter(null)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
                  backgroundColor: !companyFilter ? colors.primary : colors.muted,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: !companyFilter ? '#fff' : colors.mutedForeground }}>Toutes</Text>
              </TouchableOpacity>
              {companies.map((c: string) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCompanyFilter(companyFilter === c ? null : c)}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
                    backgroundColor: companyFilter === c ? colors.primary : colors.muted,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: companyFilter === c ? '#fff' : colors.mutedForeground }}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Scouts list */}
          <FlatList
            data={filteredScouts}
            keyExtractor={(item: any) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, flexGrow: 1 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            renderItem={({ item }: { item: any }) => (
              <View style={{
                backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 10,
                borderWidth: 1, borderColor: colors.border,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={{
                    width: 44, height: 44, borderRadius: 12,
                    backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center',
                  }}>
                    <Ionicons name="telescope" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>
                      {item.anonymousName ?? 'Éclaireur anonyme'}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 1 }}>
                      {item.role ?? 'Employé'} · {item.company?.name ?? 'Entreprise'}
                    </Text>
                  </View>
                </View>

                {/* Metrics */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                  {item.trustScore != null && (
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 4,
                      backgroundColor: item.trustScore >= 70 ? colors.successLight : colors.muted,
                      paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
                    }}>
                      <Ionicons name="shield-checkmark" size={12} color={item.trustScore >= 70 ? colors.success : colors.mutedForeground} />
                      <Text style={{ fontSize: 11, fontWeight: '600', color: item.trustScore >= 70 ? colors.success : colors.mutedForeground }}>
                        {item.trustScore}%
                      </Text>
                    </View>
                  )}
                  {item.averageRating != null && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.muted, borderRadius: 8 }}>
                      <Ionicons name="star" size={11} color="#F1C40F" />
                      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.foreground }}>{item.averageRating.toFixed(1)}</Text>
                    </View>
                  )}
                  {item.responseCount != null && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.muted, borderRadius: 8 }}>
                      <Ionicons name="chatbubble" size={10} color={colors.mutedForeground} />
                      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.mutedForeground }}>{item.responseCount} rép.</Text>
                    </View>
                  )}
                  {item.hiredAt && (
                    <View style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.muted, borderRadius: 8 }}>
                      <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
                        Depuis {formatRelativeShort(item.hiredAt)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Insights preview */}
                {(item.cultureInsight || item.processInsight || item.salaryInsight) && (
                  <View style={{ marginTop: 10, gap: 6 }}>
                    {item.cultureInsight && (
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                        <Ionicons name="people-outline" size={12} color={colors.primary} style={{ marginTop: 2 }} />
                        <Text style={{ fontSize: 11, color: colors.mutedForeground, flex: 1 }} numberOfLines={2}>{item.cultureInsight}</Text>
                      </View>
                    )}
                    {item.processInsight && (
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                        <Ionicons name="briefcase-outline" size={12} color={colors.primary} style={{ marginTop: 2 }} />
                        <Text style={{ fontSize: 11, color: colors.mutedForeground, flex: 1 }} numberOfLines={2}>{item.processInsight}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Ask button */}
                <TouchableOpacity
                  onPress={() => setAskModal(item)}
                  style={{
                    marginTop: 12, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10,
                    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
                  }}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={14} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Poser une question</Text>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingTop: 60 }}>
                <Ionicons name="telescope-outline" size={36} color={colors.mutedForeground} />
                <Text style={{ color: colors.mutedForeground, marginTop: 10, fontSize: 14, fontWeight: '600' }}>
                  Aucun éclaireur trouvé
                </Text>
                <Text style={{ color: colors.border, marginTop: 4, fontSize: 12, textAlign: 'center', paddingHorizontal: 40 }}>
                  {search ? 'Essaie un autre terme de recherche' : 'De nouveaux éclaireurs rejoignent régulièrement'}
                </Text>
              </View>
            }
          />
        </View>
      ) : (
        <FlatList
          data={conversations ?? []}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }: { item: any }) => (
            <TouchableOpacity
              onPress={() => router.push(`/scout/${item.id}`)}
              style={{
                backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 8,
                borderWidth: 1, borderColor: item.unreadCount > 0 ? colors.primaryMedium : colors.border,
                flexDirection: 'row', alignItems: 'center',
              }}
            >
              <View style={{
                width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primaryLight,
                justifyContent: 'center', alignItems: 'center', marginRight: 12,
              }}>
                <Ionicons name="telescope" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }} numberOfLines={1}>
                    Éclaireur · {item.scout?.company?.name ?? 'Entreprise'}
                  </Text>
                  {item.unreadCount > 0 && (
                    <View style={{ backgroundColor: colors.primary, borderRadius: 8, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{item.unreadCount}</Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }} numberOfLines={1}>
                  {item.lastMessage ?? 'Nouvelle conversation'}
                </Text>
                {item.updatedAt && (
                  <Text style={{ fontSize: 10, color: colors.border, marginTop: 3 }}>
                    {formatRelativeTime(item.updatedAt)}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={14} color={colors.border} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Ionicons name="chatbubbles-outline" size={36} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, marginTop: 10, fontSize: 14, fontWeight: '600' }}>
                Aucune conversation
              </Text>
              <TouchableOpacity onPress={() => setTab('discover')} style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 12 }}>Découvrir des éclaireurs</Text>
                <Ionicons name="arrow-forward" size={12} color={colors.primary} />
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Ask Question Modal */}
      <Modal visible={!!askModal} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>Poser une question</Text>
              <TouchableOpacity onPress={() => { setAskModal(null); setQuestion(''); }}>
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {askModal && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderColor: colors.border }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="telescope" size={16} color={colors.primary} />
                </View>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>{askModal.anonymousName ?? 'Éclaireur'}</Text>
                  <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{askModal.company?.name ?? ''}</Text>
                </View>
              </View>
            )}

            <TextInput
              value={question} onChangeText={setQuestion}
              placeholder="Ex: Comment se passe le processus de recrutement ?"
              placeholderTextColor={colors.mutedForeground}
              multiline
              style={{
                backgroundColor: colors.muted, borderRadius: 12, padding: 14,
                fontSize: 14, color: colors.foreground, minHeight: 80, textAlignVertical: 'top', marginBottom: 14,
              }}
            />

            <TouchableOpacity
              onPress={() => askModal && question.trim() && askMut.mutate({ scoutId: askModal.id, q: question.trim() })}
              disabled={!question.trim() || askMut.isPending}
              style={{
                backgroundColor: question.trim() ? colors.primary : colors.border,
                borderRadius: 12, padding: 14, alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                {askMut.isPending ? 'Envoi...' : 'Envoyer'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

function formatRelativeShort(date: string): string {
  const months = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24 * 30));
  if (months < 1) return 'récemment';
  if (months === 1) return '1 mois';
  return `${months} mois`;
}
