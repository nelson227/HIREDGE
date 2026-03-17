import { View, Text, TouchableOpacity, FlatList, RefreshControl, Alert } from 'react-native';
import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api, { applicationsApi } from '../lib/api';
import { useThemeColors } from '../lib/theme';
import { useTranslation } from '../lib/i18n';

const STATUS_FILTERS = ['ALL', 'DRAFT', 'APPLIED', 'VIEWED', 'INTERVIEW_SCHEDULED', 'OFFERED', 'REJECTED'];
const STATUS_LABEL_KEYS: Record<string, string> = {
  ALL: 'applicationAll',
  DRAFT: 'applicationDraft',
  APPLIED: 'applicationSent',
  VIEWED: 'applicationConsulted',
  INTERVIEW_SCHEDULED: 'applicationInterview',
  OFFERED: 'applicationOffer',
  REJECTED: 'applicationRejected',
  ACCEPTED: 'applicationAccepted',
};
const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#ADB5BD',
  APPLIED: '#6C5CE7',
  VIEWED: '#00CEC9',
  INTERVIEW_SCHEDULED: '#FDCB6E',
  OFFERED: '#00B894',
  REJECTED: '#FF7675',
  ACCEPTED: '#00B894',
};

export default function ApplicationsScreen() {
  const { colors } = useThemeColors();
  const { t } = useTranslation();
  const [filter, setFilter] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const { data, refetch } = useQuery({
    queryKey: ['applications', filter],
    queryFn: async () => {
      const params: Record<string, string> = { limit: '50' };
      if (filter !== 'ALL') params.status = filter;
      const { data } = await applicationsApi.list(params);
      return data.data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['applicationStats'],
    queryFn: async () => {
      const { data } = await applicationsApi.stats();
      return data.data;
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, []);

  const applications = data?.applications ?? data?.items ?? [];

  const handleWithdraw = (appId: string, jobTitle?: string) => {
    Alert.alert(t('applicationWithdrawTitle'), t('applicationWithdrawConfirm').replace('{title}', jobTitle ?? t('applicationPosition')), [
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
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        backgroundColor: colors.primary, paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20,
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>{t('applicationsTitle')}</Text>
        </View>

        {/* Mini Stats */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <MiniStat label={t('applicationTotal')} value={stats?.total ?? 0} />
          <MiniStat label={t('applicationInProgress')} value={(stats?.byStatus?.APPLIED ?? 0) + (stats?.byStatus?.VIEWED ?? 0)} />
          <MiniStat label={t('applicationInterviews')} value={stats?.byStatus?.INTERVIEW_SCHEDULED ?? 0} />
          <MiniStat label={t('applicationOffers')} value={stats?.byStatus?.OFFERED ?? 0} />
        </View>
      </View>

      {/* Filters */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={STATUS_FILTERS}
        keyExtractor={(item) => item}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12, gap: 6 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setFilter(item)}
            style={{
              paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
              backgroundColor: filter === item ? colors.primary : colors.card,
              borderWidth: 1, borderColor: filter === item ? colors.primary : colors.border,
            }}
          >
            <Text style={{
              fontSize: 12, fontWeight: '600',
              color: filter === item ? '#fff' : colors.foreground,
            }}>
              {t(STATUS_LABEL_KEYS[item] ?? 'applicationAll')}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Applications List */}
      <FlatList
        data={applications}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }: { item: any }) => (
          <TouchableOpacity
            onPress={() => router.push(`/application/${item.id}`)}
            style={{
              backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 8,
              borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4,
              borderLeftColor: STATUS_COLORS[item.status] ?? '#ADB5BD',
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
                backgroundColor: (STATUS_COLORS[item.status] ?? '#ADB5BD') + '15',
                paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
              }}>
                <Text style={{
                  fontSize: 11, fontWeight: '700',
                  color: STATUS_COLORS[item.status] ?? '#ADB5BD',
                }}>
                  {t(STATUS_LABEL_KEYS[item.status] ?? 'applicationAll')}
                </Text>
              </View>
            </View>
            {/* Next step for interview */}
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
                {formatDate(item.createdAt)}
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
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Ionicons name="document-text-outline" size={48} color={colors.border} />
            <Text style={{ color: colors.mutedForeground, marginTop: 12, fontSize: 15 }}>{t('applicationNoApps')}</Text>
          </View>
        }
      />
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={{
      flex: 1, backgroundColor: '#FFFFFF20', borderRadius: 10, paddingVertical: 8, alignItems: 'center',
    }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>{value}</Text>
      <Text style={{ fontSize: 10, color: '#A29BFE' }}>{label}</Text>
    </View>
  );
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
