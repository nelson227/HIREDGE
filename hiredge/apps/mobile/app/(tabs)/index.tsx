import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';
import { colors, shadows, radius, fontSize, spacing } from '../../lib/theme';

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

  const total = stats?.total ?? 0;
  const interviews = stats?.byStatus?.INTERVIEW_SCHEDULED ?? 0;
  const responseRate = stats?.responseRate ?? 0;
  const pending = stats?.byStatus?.PENDING ?? 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* ─── Top Bar ─── */}
      <View style={{
        paddingTop: 56, paddingBottom: 12, paddingHorizontal: 20,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
          }}>
            <Ionicons name="sparkles" size={20} color="#fff" />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground, letterSpacing: -0.5 }}>HIREDGE</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/notifications')}
          style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border }}
        >
          <Ionicons name="notifications-outline" size={20} color={colors.foreground} />
          {notifications?.unread > 0 && (
            <View style={{
              position: 'absolute', top: -3, right: -3, backgroundColor: colors.destructive,
              borderRadius: 8, width: 16, height: 16, justifyContent: 'center', alignItems: 'center',
              borderWidth: 2, borderColor: colors.background,
            }}>
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{notifications.unread}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        {/* ─── Welcome ─── */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: colors.foreground, letterSpacing: -0.5, lineHeight: 34 }}>
            Bonjour 👋
          </Text>
          <Text style={{ fontSize: 15, color: colors.mutedForeground, marginTop: 4 }}>
            Voici ton tableau de bord.
          </Text>
        </View>

        {/* ─── AI Insights Banner (gradient-like) ─── */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/edge')}
          activeOpacity={0.85}
          style={{
            borderRadius: 20, padding: 20, marginBottom: 24,
            backgroundColor: colors.primaryLight,
            borderWidth: 1.5, borderColor: colors.primaryMedium,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{
              width: 56, height: 56, borderRadius: 16,
              backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
            }}>
              <Ionicons name="sparkles" size={26} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: colors.foreground, fontSize: 16, marginBottom: 3 }}>
                EDGE Insights
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 13, lineHeight: 19 }}>
                Recommandations IA personnalisées
              </Text>
            </View>
            <View style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
            }}>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </View>
          </View>
        </TouchableOpacity>

        {/* ─── Stats : 4 colonnes horizontales ─── */}
        <View style={{
          backgroundColor: colors.card, borderRadius: 20, padding: 20,
          borderWidth: 1, borderColor: colors.border, marginBottom: 24,
        }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 }}>
            Vue d'ensemble
          </Text>

          <StatRow icon="paper-plane" label="Candidatures" value={total} color={colors.primary} />
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 14 }} />
          <StatRow icon="calendar-outline" label="Entretiens" value={interviews} color={colors.success} />
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 14 }} />
          <StatRow icon="trending-up-outline" label="Taux de réponse" value={`${responseRate}%`} color={colors.warning} />
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 14 }} />
          <StatRow icon="time-outline" label="En attente" value={pending} color={colors.chart5} />
        </View>

        {/* ─── Quick Actions Grid ─── */}
        <View style={{ marginBottom: 28 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 }}>
            Actions rapides
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <ActionCard icon="search" label="Offres" color={colors.primary} onPress={() => router.push('/(tabs)/jobs')} />
            <ActionCard icon="chatbubble-ellipses" label="EDGE" color={colors.chart3} onPress={() => router.push('/(tabs)/edge')} />
            <ActionCard icon="mic" label="Entretien" color={colors.chart5} onPress={() => router.push('/interview')} />
            <ActionCard icon="people" label="Squad" color={colors.warning} onPress={() => router.push('/(tabs)/squad')} />
          </View>
        </View>

        {/* ─── Recent Matches ─── */}
        <View style={{ marginBottom: 40 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Offres récentes
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/jobs')}>
              <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>Voir tout</Text>
            </TouchableOpacity>
          </View>

          <View style={{
            backgroundColor: colors.card, borderRadius: 20,
            borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
          }}>
            {recommended && recommended.length > 0 ? (
              recommended.map((job: any, i: number) => (
                <TouchableOpacity
                  key={job.id}
                  onPress={() => router.push(`/job/${job.id}`)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14,
                    borderBottomWidth: i < recommended.length - 1 ? 1 : 0,
                    borderColor: colors.border,
                  }}
                >
                  <View style={{
                    width: 48, height: 48, borderRadius: 14,
                    backgroundColor: colors.muted, justifyContent: 'center', alignItems: 'center',
                  }}>
                    <Ionicons name="business-outline" size={20} color={colors.mutedForeground} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }} numberOfLines={1}>
                      {job.title}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>
                      {job.company?.name}{job.location ? ` · ${job.location}` : ''}
                    </Text>
                  </View>
                  {job.matchScore != null && (
                    <View style={{
                      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
                      backgroundColor: job.matchScore >= 80 ? 'rgba(34, 197, 94, 0.10)' : colors.primaryLight,
                    }}>
                      <Text style={{
                        fontSize: 12, fontWeight: '700',
                        color: job.matchScore >= 80 ? colors.success : colors.primary,
                      }}>
                        {job.matchScore}%
                      </Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={16} color={colors.border} />
                </TouchableOpacity>
              ))
            ) : (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <View style={{
                  width: 56, height: 56, borderRadius: 16, backgroundColor: colors.muted,
                  justifyContent: 'center', alignItems: 'center', marginBottom: 12,
                }}>
                  <Ionicons name="briefcase-outline" size={24} color={colors.mutedForeground} />
                </View>
                <Text style={{ color: colors.mutedForeground, textAlign: 'center', fontSize: 13 }}>
                  Complète ton profil pour recevoir des recommandations
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

/* ─── Sub-components ─── */

function StatRow({ icon, label, value, color }: { icon: string; label: string; value: number | string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: color + '15', justifyContent: 'center', alignItems: 'center',
      }}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={{ flex: 1, fontSize: 14, color: colors.mutedForeground, marginLeft: 14, fontWeight: '500' }}>{label}</Text>
      <Text style={{ fontSize: 20, fontWeight: '800', color: colors.foreground }}>{value}</Text>
    </View>
  );
}

function ActionCard({ icon, label, color, onPress }: { icon: string; label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        flex: 1, backgroundColor: colors.card, borderRadius: 16,
        paddingVertical: 18, alignItems: 'center', gap: 8,
        borderWidth: 1, borderColor: colors.border,
      }}
    >
      <View style={{
        width: 44, height: 44, borderRadius: 14,
        backgroundColor: color + '12', justifyContent: 'center', alignItems: 'center',
      }}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.foreground }}>{label}</Text>
    </TouchableOpacity>
  );
}
