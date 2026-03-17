import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api, { jobsApi, notificationsApi, applicationsApi } from '../../lib/api';
import { colors } from '../../lib/theme';

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['applicationStats'],
    queryFn: async () => {
      const { data } = await applicationsApi.stats();
      return data.data;
    },
  });

  const { data: recommended, refetch: refetchJobs } = useQuery({
    queryKey: ['recommendedJobs'],
    queryFn: async () => {
      const { data } = await jobsApi.getRecommended(5);
      return data.data;
    },
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifCount'],
    queryFn: async () => {
      const { data } = await notificationsApi.count();
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
      <View style={{ padding: 16, paddingTop: 56 }}>
        {/* Welcome Section */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: '700', color: colors.foreground }}>
              Bonjour 👋
            </Text>
            <Text style={{ color: colors.mutedForeground, marginTop: 4, fontSize: 14 }}>
              Voici ce qui se passe dans ta recherche.
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/notifications')}
            style={{
              width: 40, height: 40, borderRadius: 12,
              backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center',
              borderWidth: 1, borderColor: colors.border,
            }}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.foreground} />
            {notifications?.unread > 0 && (
              <View style={{
                position: 'absolute', top: -4, right: -4, backgroundColor: colors.destructive,
                borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center',
                paddingHorizontal: 4, borderWidth: 2, borderColor: colors.background,
              }}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{notifications.unread}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* AI Insights Card — gradient-like */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/edge')}
          activeOpacity={0.85}
          style={{
            backgroundColor: colors.primaryLight, borderRadius: 12, padding: 16, marginBottom: 16,
            borderWidth: 1, borderColor: colors.primaryMedium,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{
              width: 56, height: 56, borderRadius: 16,
              backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
            }}>
              <Ionicons name="sparkles" size={28} color={colors.primaryForeground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', color: colors.foreground, fontSize: 15, marginBottom: 2 }}>
                EDGE Insights
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 13, lineHeight: 18 }}>
                Des recommandations personnalisées t'attendent. Discute avec EDGE pour en savoir plus.
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Stats Grid — 2x2 like reference */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <StatCard icon="briefcase-outline" value={total} label="Candidatures" color={colors.primary} />
          <StatCard icon="trending-up-outline" value={`${responseRate}%`} label="Réponses" color={colors.success} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
          <StatCard icon="calendar-outline" value={interviews} label="Entretiens" color={colors.warning} />
          <StatCard icon="chatbubble-outline" value={pending} label="En attente" color={colors.chart5} />
        </View>

        {/* Recent Job Matches */}
        <View style={{
          backgroundColor: colors.card, borderRadius: 12,
          borderWidth: 1, borderColor: colors.border, marginBottom: 16,
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            padding: 16, paddingBottom: 12,
          }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>
              Offres récentes
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/jobs')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>Voir tout</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Job list — divide-y */}
          {recommended && recommended.length > 0 ? (
            recommended.map((job: any, i: number) => (
              <TouchableOpacity
                key={job.id}
                onPress={() => router.push(`/job/${job.id}`)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
                  borderTopWidth: 1, borderColor: colors.border,
                }}
              >
                <View style={{
                  width: 48, height: 48, borderRadius: 12,
                  backgroundColor: colors.muted, justifyContent: 'center', alignItems: 'center',
                }}>
                  <Ionicons name="business-outline" size={24} color={colors.mutedForeground} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }} numberOfLines={1}>
                        {job.title}
                      </Text>
                      <Text style={{ fontSize: 13, color: colors.mutedForeground }}>{job.company?.name}</Text>
                    </View>
                    {job.matchScore != null && (
                      <View style={{
                        paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999,
                        backgroundColor: job.matchScore >= 90 ? colors.successLight : job.matchScore >= 80 ? colors.primaryLight : colors.muted,
                      }}>
                        <Text style={{
                          fontSize: 12, fontWeight: '600',
                          color: job.matchScore >= 90 ? colors.success : job.matchScore >= 80 ? colors.primary : colors.mutedForeground,
                        }}>
                          {job.matchScore}%
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 }}>
                    {job.location && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Ionicons name="location-outline" size={12} color={colors.mutedForeground} />
                        <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{job.location}</Text>
                      </View>
                    )}
                    {job.salary && <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{job.salary}</Text>}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={{ padding: 32, alignItems: 'center', borderTopWidth: 1, borderColor: colors.border }}>
              <View style={{
                width: 48, height: 48, borderRadius: 12, backgroundColor: colors.muted,
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

        {/* Quick actions row */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 32 }}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/edge')}
            style={{
              flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
              backgroundColor: colors.primary, borderRadius: 12, padding: 14, justifyContent: 'center',
            }}
          >
            <Ionicons name="sparkles" size={16} color={colors.primaryForeground} />
            <Text style={{ color: colors.primaryForeground, fontWeight: '600', fontSize: 14 }}>
              Parler à EDGE
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/jobs')}
            style={{
              flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
              backgroundColor: colors.card, borderRadius: 12, padding: 14, justifyContent: 'center',
              borderWidth: 1, borderColor: colors.border,
            }}
          >
            <Ionicons name="search" size={16} color={colors.foreground} />
            <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 14 }}>
              Offres
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

function StatCard({ icon, value, label, color }: { icon: string; value: number | string; label: string; color: string }) {
  return (
    <View style={{
      flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 16,
      borderWidth: 1, borderColor: colors.border,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{
          width: 40, height: 40, borderRadius: 12,
          backgroundColor: color + '18', justifyContent: 'center', alignItems: 'center',
        }}>
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
        <View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.foreground }}>{value}</Text>
          <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{label}</Text>
        </View>
      </View>
    </View>
  );
}
