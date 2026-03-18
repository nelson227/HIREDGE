import { useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, ScrollView, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { applicationsApi } from '../../lib/api';
import { useThemeColors } from '../../lib/theme';
import { useTranslation } from '../../lib/i18n';
import { connectSocket, getSocket } from '../../lib/socket';
import { useEffect } from 'react';

// ─── Status config ───────────────────────────────────────────────

type KanbanStatus = 'draft' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected';

const STATUS_MAPPING: Record<string, KanbanStatus> = {
  DRAFT: 'draft',
  APPLIED: 'applied',
  VIEWED: 'screening',
  INTERVIEW_SCHEDULED: 'interview',
  OFFER_RECEIVED: 'offer',
  ACCEPTED: 'offer',
  REJECTED: 'rejected',
};

const STATUS_COLORS: Record<KanbanStatus, string> = {
  draft: '#ADB5BD',
  applied: '#6C5CE7',
  screening: '#00CEC9',
  interview: '#F39C12',
  offer: '#00B894',
  rejected: '#FF7675',
};

const STATUS_ICONS: Record<KanbanStatus, string> = {
  draft: 'document-outline',
  applied: 'paper-plane-outline',
  screening: 'eye-outline',
  interview: 'calendar-outline',
  offer: 'trophy-outline',
  rejected: 'close-circle-outline',
};

interface Application {
  id: string;
  company: string;
  role: string;
  date: string;
  nextStep?: string;
  status: KanbanStatus;
  jobId: string;
  location?: string;
  interviewDate?: string;
  coverLetterContent?: string | null;
  notes?: string | null;
}

const COLUMNS: { id: KanbanStatus; labelKey: string }[] = [
  { id: 'draft', labelKey: 'applicationDraft' },
  { id: 'applied', labelKey: 'applicationSent' },
  { id: 'screening', labelKey: 'applicationConsulted' },
  { id: 'interview', labelKey: 'applicationInterview' },
  { id: 'offer', labelKey: 'applicationOffer' },
  { id: 'rejected', labelKey: 'applicationRejected' },
];

// ─── View mode: kanban or list ───────────────────────────────────

export default function ApplicationsTab() {
  const { colors } = useThemeColors();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [listFilter, setListFilter] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const { data: rawApps, refetch, isLoading } = useQuery({
    queryKey: ['applications-tab'],
    queryFn: async () => {
      const { data } = await applicationsApi.list({ limit: '100' });
      return data.data?.applications ?? data.data?.items ?? [];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['applicationStats'],
    queryFn: async () => {
      const { data } = await applicationsApi.stats();
      return data.data;
    },
  });

  // Real-time WebSocket listeners
  useEffect(() => {
    let socket: ReturnType<typeof getSocket> | null = null;
    try { socket = getSocket(); } catch { return; }
    if (!socket) return;

    const handleRefresh = () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['applicationStats'] });
    };
    const handleDeleted = () => { handleRefresh(); };

    socket.on('application:created', handleRefresh);
    socket.on('application:status_changed', handleRefresh);
    socket.on('application:deleted', handleDeleted);

    return () => {
      socket!.off('application:created', handleRefresh);
      socket!.off('application:status_changed', handleRefresh);
      socket!.off('application:deleted', handleDeleted);
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    queryClient.invalidateQueries({ queryKey: ['applicationStats'] });
    setRefreshing(false);
  }, []);

  // Group applications by kanban status
  const grouped: Record<KanbanStatus, Application[]> = {
    draft: [], applied: [], screening: [], interview: [], offer: [], rejected: [],
  };
  (rawApps ?? []).forEach((app: any) => {
    const kanbanStatus = STATUS_MAPPING[app.status] || 'draft';
    grouped[kanbanStatus].push({
      id: app.id,
      company: app.job?.company?.name || 'Entreprise',
      role: app.job?.title || 'Poste',
      date: new Date(app.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }),
      nextStep: app.interviewDate
        ? `${t('applicationInterviewOn')} ${new Date(app.interviewDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
        : undefined,
      status: kanbanStatus,
      jobId: app.jobId || app.job?.id,
      location: app.job?.location,
      interviewDate: app.interviewDate,
      coverLetterContent: app.coverLetterContent,
      notes: app.notes,
    });
  });

  const totalApplications = (rawApps ?? []).length;

  // List mode filter
  const filteredList = listFilter === 'ALL'
    ? (rawApps ?? [])
    : (rawApps ?? []).filter((a: any) => STATUS_MAPPING[a.status] === listFilter || a.status === listFilter);

  const handleWithdraw = (appId: string, jobTitle?: string) => {
    Alert.alert(
      t('applicationWithdrawTitle'),
      t('applicationWithdrawConfirm').replace('{title}', jobTitle ?? t('applicationPosition')),
      [
        { text: t('applicationCancel'), style: 'cancel' },
        {
          text: t('applicationWithdrawBtn'), style: 'destructive', onPress: async () => {
            try {
              await applicationsApi.withdraw(appId);
              await refetch();
              queryClient.invalidateQueries({ queryKey: ['applicationStats'] });
            } catch {
              Alert.alert(t('applicationError'), t('applicationWithdrawError'));
            }
          },
        },
      ],
    );
  };

  // ─── Loading ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.mutedForeground, fontSize: 14 }}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        backgroundColor: colors.primary, paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20,
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
      }}>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>Pipeline</Text>
        <Text style={{ color: '#C9C3FF', fontSize: 14, marginTop: 4 }}>
          {totalApplications === 0
            ? t('applicationNoApps')
            : `${totalApplications} ${t('applicationTotal').toLowerCase()}`}
        </Text>

        {/* Mini Stats */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          <MiniStat label={t('applicationTotal')} value={stats?.total ?? totalApplications} colors={colors} />
          <MiniStat label={t('applicationInProgress')} value={(stats?.byStatus?.APPLIED ?? 0) + (stats?.byStatus?.VIEWED ?? 0)} colors={colors} />
          <MiniStat label={t('applicationInterviews')} value={stats?.byStatus?.INTERVIEW_SCHEDULED ?? 0} colors={colors} />
          <MiniStat label={t('applicationOffers')} value={stats?.byStatus?.OFFERED ?? 0} colors={colors} />
        </View>

        {/* View Toggle */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          <TouchableOpacity
            onPress={() => setViewMode('kanban')}
            style={{
              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
              paddingVertical: 8, borderRadius: 10,
              backgroundColor: viewMode === 'kanban' ? '#FFFFFF30' : '#FFFFFF10',
            }}
          >
            <Ionicons name="grid-outline" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Kanban</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode('list')}
            style={{
              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
              paddingVertical: 8, borderRadius: 10,
              backgroundColor: viewMode === 'list' ? '#FFFFFF30' : '#FFFFFF10',
            }}
          >
            <Ionicons name="list-outline" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Liste</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Empty State */}
      {totalApplications === 0 && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <View style={{
            width: 72, height: 72, borderRadius: 36, backgroundColor: colors.muted,
            justifyContent: 'center', alignItems: 'center', marginBottom: 16,
          }}>
            <Ionicons name="briefcase-outline" size={32} color={colors.mutedForeground} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, marginBottom: 8 }}>
            {t('applicationNoApps')}
          </Text>
          <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: 'center', marginBottom: 20 }}>
            Explorez les offres et postulez pour suivre vos candidatures ici.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/jobs')}
            style={{
              backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Voir les offres</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ═══ KANBAN VIEW ═══ */}
      {totalApplications > 0 && viewMode === 'kanban' && (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 16, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              status={col.id}
              label={t(col.labelKey)}
              applications={grouped[col.id]}
              colors={colors}
              t={t}
              onWithdraw={handleWithdraw}
            />
          ))}
        </ScrollView>
      )}

      {/* ═══ LIST VIEW ═══ */}
      {totalApplications > 0 && viewMode === 'list' && (
        <>
          {/* Filter chips */}
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={['ALL', ...COLUMNS.map(c => c.id)]}
            keyExtractor={(item) => item}
            contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12, gap: 6 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setListFilter(item)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                  backgroundColor: listFilter === item ? colors.primary : colors.card,
                  borderWidth: 1, borderColor: listFilter === item ? colors.primary : colors.border,
                }}
              >
                <Text style={{
                  fontSize: 12, fontWeight: '600',
                  color: listFilter === item ? '#fff' : colors.foreground,
                }}>
                  {item === 'ALL' ? t('applicationAll') : t(COLUMNS.find(c => c.id === item)?.labelKey ?? 'applicationAll')}
                </Text>
              </TouchableOpacity>
            )}
          />

          <FlatList
            data={filteredList}
            keyExtractor={(item: any) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            renderItem={({ item }: { item: any }) => {
              const kanbanStatus = STATUS_MAPPING[item.status] || 'draft';
              return (
                <TouchableOpacity
                  onPress={() => router.push(`/application/${item.id}`)}
                  style={{
                    backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 8,
                    borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4,
                    borderLeftColor: STATUS_COLORS[kanbanStatus],
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground }} numberOfLines={1}>
                        {item.job?.title ?? t('applicationPosition')}
                      </Text>
                      <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 2 }}>
                        {item.job?.company?.name ?? t('applicationCompany')}
                      </Text>
                    </View>
                    <View style={{
                      backgroundColor: STATUS_COLORS[kanbanStatus] + '15',
                      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: STATUS_COLORS[kanbanStatus] }}>
                        {t(COLUMNS.find(c => c.id === kanbanStatus)?.labelKey ?? 'applicationAll')}
                      </Text>
                    </View>
                  </View>

                  {item.status === 'INTERVIEW_SCHEDULED' && item.interview?.scheduledAt && (
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8,
                      backgroundColor: '#FFF3BF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                    }}>
                      <Ionicons name="calendar" size={12} color="#E67700" />
                      <Text style={{ fontSize: 11, fontWeight: '600', color: '#E67700' }}>
                        {t('applicationInterviewOn')} {new Date(item.interview.scheduledAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                    <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
                      {new Date(item.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      {item.job?.id && (
                        <TouchableOpacity onPress={() => router.push(`/job/${item.job.id}`)} hitSlop={8}>
                          <Ionicons name="eye-outline" size={16} color={colors.mutedForeground} />
                        </TouchableOpacity>
                      )}
                      {!['REJECTED', 'ACCEPTED', 'OFFERED'].includes(item.status) && (
                        <TouchableOpacity onPress={() => handleWithdraw(item.id, item.job?.title)} hitSlop={8}>
                          <Ionicons name="close-circle-outline" size={16} color="#FF7675" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingTop: 60 }}>
                <Ionicons name="document-text-outline" size={48} color={colors.border} />
                <Text style={{ color: colors.mutedForeground, marginTop: 12, fontSize: 15 }}>{t('applicationNoApps')}</Text>
              </View>
            }
          />
        </>
      )}
    </View>
  );
}

// ─── Sub-components ──────────────────────────────────────────────

function MiniStat({ label, value, colors }: { label: string; value: number; colors: any }) {
  return (
    <View style={{
      flex: 1, backgroundColor: '#FFFFFF20', borderRadius: 10, paddingVertical: 8, alignItems: 'center',
    }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>{value}</Text>
      <Text style={{ fontSize: 10, color: '#A29BFE' }}>{label}</Text>
    </View>
  );
}

function KanbanColumn({
  status, label, applications, colors, t, onWithdraw,
}: {
  status: KanbanStatus;
  label: string;
  applications: Application[];
  colors: any;
  t: (key: string) => string;
  onWithdraw: (id: string, title?: string) => void;
}) {
  const color = STATUS_COLORS[status];
  const icon = STATUS_ICONS[status];

  return (
    <View style={{ width: 260, marginRight: 12 }}>
      {/* Column Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>{label}</Text>
        <View style={{
          backgroundColor: color + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
        }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color }}>{applications.length}</Text>
        </View>
      </View>

      {/* Column Content */}
      <View style={{
        flex: 1, backgroundColor: colors.muted + '60', borderRadius: 14, padding: 8, minHeight: 120,
      }}>
        {applications.length === 0 && (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 30 }}>
            <Ionicons name={icon as any} size={24} color={colors.mutedForeground + '60'} />
            <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 6 }}>Aucune</Text>
          </View>
        )}

        {applications.map((app) => (
          <TouchableOpacity
            key={app.id}
            onPress={() => router.push(`/application/${app.id}`)}
            activeOpacity={0.7}
            style={{
              backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 8,
              borderWidth: 1, borderColor: colors.border,
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }} numberOfLines={2}>{app.role}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <Ionicons name="business-outline" size={12} color={colors.mutedForeground} />
                  <Text style={{ fontSize: 12, color: colors.mutedForeground }} numberOfLines={1}>{app.company}</Text>
                </View>
              </View>
              <TouchableOpacity
                hitSlop={12}
                onPress={() => {
                  Alert.alert(app.role, app.company, [
                    { text: "Voir l'offre", onPress: () => router.push(`/job/${app.jobId}`) },
                    { text: 'Voir candidature', onPress: () => router.push(`/application/${app.id}`) },
                    ...(!['rejected', 'offer'].includes(app.status)
                      ? [{ text: 'Retirer', style: 'destructive' as const, onPress: () => onWithdraw(app.id, app.role) }]
                      : []),
                    { text: t('applicationCancel'), style: 'cancel' as const },
                  ]);
                }}
              >
                <Ionicons name="ellipsis-horizontal" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
              <Ionicons name="calendar-outline" size={12} color={colors.mutedForeground} />
              <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{app.date}</Text>
            </View>

            {app.nextStep && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6,
                backgroundColor: '#FFF3BF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
              }}>
                <Ionicons name="arrow-forward" size={10} color="#E67700" />
                <Text style={{ fontSize: 10, fontWeight: '600', color: '#E67700' }} numberOfLines={1}>{app.nextStep}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
