import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';
import { colors, shadows, radius, fontSize } from '../../lib/theme';

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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={{
        paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20,
        backgroundColor: colors.background,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: colors.mutedForeground, fontSize: fontSize.sm }}>Bonjour 👋</Text>
            <Text style={{ color: colors.foreground, fontSize: fontSize['2xl'], fontWeight: '700', marginTop: 4 }}>
              Prêt à décrocher le job ?
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/notifications')}
            style={{
              width: 44, height: 44, borderRadius: radius.lg,
              backgroundColor: colors.muted, justifyContent: 'center', alignItems: 'center',
              position: 'relative',
            }}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.foreground} />
            {notifications?.unread > 0 && (
              <View style={{
                position: 'absolute', top: -2, right: -2, backgroundColor: colors.destructive,
                borderRadius: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center',
                borderWidth: 2, borderColor: colors.background,
              }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{notifications.unread}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* AI Insights Card */}
      <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
        <View style={{
          borderRadius: radius.xl, padding: 20,
          backgroundColor: colors.primaryLight,
          borderWidth: 1, borderColor: colors.primaryMedium,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{
              width: 48, height: 48, borderRadius: radius.xl,
              backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
            }}>
              <Ionicons name="sparkles" size={24} color={colors.primaryForeground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', color: colors.foreground, fontSize: fontSize.base, marginBottom: 4 }}>
                EDGE Insights
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: fontSize.sm, lineHeight: 20 }}>
                Découvre tes recommandations personnalisées et les offres qui matchent ton profil.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/edge')}
            style={{
              marginTop: 16, backgroundColor: colors.primary, borderRadius: radius.lg,
              paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
            }}
          >
            <Ionicons name="chatbubble-ellipses" size={18} color={colors.primaryForeground} />
            <Text style={{ color: colors.primaryForeground, fontWeight: '600', fontSize: fontSize.sm }}>
              Parler à EDGE
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Grid 2x2 */}
      <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <StatCard
            title="Candidatures"
            value={stats?.total ?? 0}
            color={colors.primary}
            bgColor={colors.primaryLight}
            icon="paper-plane"
          />
          <StatCard
            title="Entretiens"
            value={stats?.byStatus?.INTERVIEW_SCHEDULED ?? 0}
            color={colors.success}
            bgColor={colors.successLight}
            icon="calendar"
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
          <StatCard
            title="Taux réponse"
            value={`${stats?.responseRate ?? 0}%`}
            color={colors.warning}
            bgColor={colors.warningLight}
            icon="trending-up"
          />
          <StatCard
            title="En attente"
            value={stats?.byStatus?.PENDING ?? 0}
            color={colors.chart5}
            bgColor={'rgba(217, 70, 239, 0.10)'}
            icon="time"
          />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
        <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: colors.foreground, marginBottom: 14 }}>
          Actions rapides
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <QuickAction icon="search" label="Chercher" onPress={() => router.push('/(tabs)/jobs')} color={colors.primary} />
          <QuickAction icon="chatbubble-ellipses" label="EDGE" onPress={() => router.push('/(tabs)/edge')} color={colors.chart3} />
          <QuickAction icon="mic" label="Simulation" onPress={() => router.push('/interview')} color={colors.chart5} />
          <QuickAction icon="people" label="Escouade" onPress={() => router.push('/(tabs)/squad')} color={colors.warning} />
        </View>
      </View>

      {/* Recommended Jobs */}
      <View style={{ paddingHorizontal: 16, marginBottom: 32 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: colors.foreground }}>Recommandées pour toi</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/jobs')}>
            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: fontSize.sm }}>Voir tout</Text>
          </TouchableOpacity>
        </View>

        {recommended?.map((job: any) => (
          <TouchableOpacity
            key={job.id}
            onPress={() => router.push(`/job/${job.id}`)}
            style={{
              backgroundColor: colors.card, borderRadius: radius.xl, padding: 16, marginBottom: 10,
              borderWidth: 1, borderColor: colors.border, ...shadows.sm,
            }}
          >
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              {/* Company icon */}
              <View style={{
                width: 48, height: 48, borderRadius: radius.lg,
                backgroundColor: colors.muted, justifyContent: 'center', alignItems: 'center',
              }}>
                <Ionicons name="business" size={22} color={colors.mutedForeground} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ fontSize: fontSize.base, fontWeight: '600', color: colors.foreground }}>{job.title}</Text>
                    <Text style={{ color: colors.mutedForeground, marginTop: 2, fontSize: fontSize.sm }}>{job.company?.name}</Text>
                  </View>
                  {job.matchScore != null && (
                    <View style={{
                      paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full,
                      backgroundColor: job.matchScore >= 90 ? colors.successLight : job.matchScore >= 80 ? colors.primaryLight : colors.muted,
                    }}>
                      <Text style={{
                        fontSize: fontSize.xs, fontWeight: '700',
                        color: job.matchScore >= 90 ? colors.success : job.matchScore >= 80 ? colors.primary : colors.mutedForeground,
                      }}>
                        {job.matchScore}%
                      </Text>
                    </View>
                  )}
                </View>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {job.location && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="location-outline" size={12} color={colors.mutedForeground} />
                      <Text style={{ fontSize: fontSize.xs, color: colors.mutedForeground }}>{job.location}</Text>
                    </View>
                  )}
                  {job.remote && (
                    <View style={{
                      paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full,
                      backgroundColor: colors.successLight,
                    }}>
                      <Text style={{ fontSize: fontSize.xs, color: colors.success, fontWeight: '600' }}>Remote</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )) ?? (
          <View style={{
            backgroundColor: colors.card, borderRadius: radius.xl, padding: 32,
            borderWidth: 1, borderColor: colors.border, alignItems: 'center',
          }}>
            <Ionicons name="briefcase-outline" size={40} color={colors.border} />
            <Text style={{ color: colors.mutedForeground, textAlign: 'center', paddingTop: 12, fontSize: fontSize.sm }}>
              Complète ton profil pour recevoir des recommandations
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function StatCard({ title, value, color, bgColor, icon }: { title: string; value: number | string; color: string; bgColor: string; icon: string }) {
  return (
    <View style={{
      flex: 1, backgroundColor: colors.card, borderRadius: radius.xl, padding: 16,
      borderWidth: 1, borderColor: colors.border, ...shadows.sm,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{
          width: 40, height: 40, borderRadius: radius.lg,
          backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center',
        }}>
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
        <View>
          <Text style={{ fontSize: fontSize['2xl'], fontWeight: '700', color: colors.foreground }}>{value}</Text>
          <Text style={{ fontSize: fontSize.xs, color: colors.mutedForeground }}>{title}</Text>
        </View>
      </View>
    </View>
  );
}

function QuickAction({ icon, label, onPress, color }: { icon: string; label: string; onPress: () => void; color: string }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ flex: 1, alignItems: 'center', gap: 8 }}
    >
      <View style={{
        width: 56, height: 56, borderRadius: radius.xl,
        backgroundColor: color + '15',
        justifyContent: 'center', alignItems: 'center',
      }}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={{ fontSize: fontSize.xs, fontWeight: '600', color: colors.foreground }}>{label}</Text>
    </TouchableOpacity>
  );
}
