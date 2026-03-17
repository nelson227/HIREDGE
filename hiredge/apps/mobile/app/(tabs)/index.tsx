import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/auth.store';
import api, { jobsApi, notificationsApi, applicationsApi, interviewsApi, squadApi } from '../../lib/api';
import { useThemeColors } from '../../lib/theme';
import { useTranslation } from '../../lib/i18n';

export default function HomeScreen() {
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const { colors } = useThemeColors();
  const { t } = useTranslation();

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

  const { data: upcomingInterviews } = useQuery({
    queryKey: ['upcomingInterviews'],
    queryFn: async () => {
      try {
        const { data } = await interviewsApi.list();
        const all = data.data ?? [];
        return all.filter((i: any) => i.status === 'SCHEDULED' && i.scheduledAt && new Date(i.scheduledAt) > new Date()).slice(0, 3);
      } catch { return []; }
    },
  });

  const { data: squad } = useQuery({
    queryKey: ['mySquad'],
    queryFn: async () => {
      try {
        const { data } = await squadApi.getMySquad();
        return data.data;
      } catch { return null; }
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
  const firstName = user?.fullName?.split(' ')[0] ?? t('dashboardUser');
  const totalJobs = recommended?.length ?? 0;
  const recentSquadMessages = squad?.messages?.slice(0, 3) ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={{ padding: 16, paddingTop: 56 }}>
        {/* Welcome Section — personalized */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: '700', color: colors.foreground }}>
              {t('homeWelcome')}, {firstName} 👋
            </Text>
            <Text style={{ color: colors.mutedForeground, marginTop: 4, fontSize: 14 }}>
              {t('homeSummary')}
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

        {/* AI Insights Card — dynamic message like web */}
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
                {t('dashboardEdgeInsights')}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 13, lineHeight: 18 }}>
                {totalJobs > 0
                  ? `${t('dashboardEdgeFoundJobs').replace('{n}', String(totalJobs))} ${(upcomingInterviews?.length ?? 0) > 0 ? t('dashboardEdgeUpcoming').replace('{n}', String(upcomingInterviews!.length)) : t('dashboardEdgeContinueApply')}`
                  : total > 0
                  ? t('dashboardEdgeApplications').replace('{n}', String(total))
                  : t('dashboardEdgeNoJobs')}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Stats Grid — 2x2 like reference */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <StatCard icon="briefcase-outline" value={total} label={t('homeApplications')} color={colors.primary} colors={colors} />
          <StatCard icon="trending-up-outline" value={`${responseRate}%`} label={t('homeResponseRate')} color={colors.success} colors={colors} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
          <StatCard icon="calendar-outline" value={interviews} label={t('homeInterviews')} color={colors.warning} colors={colors} />
          <StatCard icon="chatbubble-outline" value={pending} label={t('homePending')} color={colors.chart5} colors={colors} />
        </View>

        {/* Upcoming Interviews */}
        {(upcomingInterviews?.length ?? 0) > 0 && (
          <View style={{
            backgroundColor: colors.card, borderRadius: 12,
            borderWidth: 1, borderColor: colors.border, marginBottom: 16,
          }}>
            <View style={{ padding: 16, paddingBottom: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>{t('dashboardUpcoming')}</Text>
            </View>
            {upcomingInterviews!.map((interview: any, i: number) => (
              <View key={interview.id} style={{
                flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16,
                borderTopWidth: 1, borderColor: colors.border,
              }}>
                <View style={{
                  width: 40, height: 40, borderRadius: 12,
                  backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center',
                }}>
                  <Ionicons name="calendar" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>
                    {t('dashboardInterviewLabel')} {interview.type === 'TECHNICAL' ? t('dashboardInterviewTechnical').toLowerCase() : interview.type === 'HR' ? t('dashboardInterviewHR') : ''}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                    {interview.application?.job?.company?.name || interview.application?.job?.title || t('dashboardCompany')}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600', marginTop: 2 }}>
                    {formatEventDate(interview.scheduledAt, t)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

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
              {t('homeRecommended')}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/jobs')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{t('dashboardViewAll')}</Text>
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
                {t('dashboardCompleteProfile')}
              </Text>
            </View>
          )}
        </View>

        {/* Squad Activity */}
        {squad && (
          <View style={{
            backgroundColor: colors.card, borderRadius: 12,
            borderWidth: 1, borderColor: colors.border, marginBottom: 16,
          }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              padding: 16, paddingBottom: 12,
            }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>{t('dashboardSquadActivity')}</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/squad')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{t('dashboardViewSquad')}</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            {recentSquadMessages.length > 0 ? (
              recentSquadMessages.map((msg: any) => (
                <View key={msg.id} style={{
                  flexDirection: 'row', gap: 10, padding: 14, borderTopWidth: 1, borderColor: colors.border,
                }}>
                  <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                      {(msg.sender?.candidateProfile?.firstName ?? '?')[0]}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>
                      {msg.sender?.candidateProfile?.firstName ?? t('dashboardMember')}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground }} numberOfLines={1}>{msg.content}</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={{ padding: 20, alignItems: 'center', borderTopWidth: 1, borderColor: colors.border }}>
                <Ionicons name="people-outline" size={24} color={colors.mutedForeground} />
                <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 6 }}>{t('dashboardNoActivity')}</Text>
              </View>
            )}
          </View>
        )}

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
              {t('homeAskEdge')}
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
              {t('navJobs')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

function StatCard({ icon, value, label, color, colors }: { icon: string; value: number | string; label: string; color: string; colors: any }) {
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

function formatEventDate(dateStr: string | undefined, t: (key: string) => string): string {
  if (!dateStr) return t('dashboardDateNotDefined');
  const date = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() === now.toDateString()) return `${t('dashboardToday')}, ${time}`;
  if (date.toDateString() === tomorrow.toDateString()) return `${t('dashboardTomorrow')}, ${time}`;
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) + `, ${time}`;
}
