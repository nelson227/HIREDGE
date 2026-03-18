import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api, { applicationsApi } from '../../lib/api';
import { useThemeColors } from '../../lib/theme';
import { useTranslation } from '../../lib/i18n';

export default function ApplicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { colors } = useThemeColors();
  const { t } = useTranslation();

  const STATUS_LABELS: Record<string, string> = {
    DRAFT: t('appStatusDraft'), APPLIED: t('appStatusApplied'), VIEWED: t('appStatusViewed'),
    INTERVIEW_SCHEDULED: t('appStatusInterview'), OFFERED: t('appStatusOffered'),
    REJECTED: t('appStatusRejected'), ACCEPTED: t('appStatusAccepted'),
  };

  const { data: application, isLoading } = useQuery({
    queryKey: ['application', id],
    queryFn: async () => {
      const { data } = await applicationsApi.getById(id!);
      return data.data;
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: () => applicationsApi.updateStatus(id!, 'REJECTED'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!application) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <Text style={{ color: colors.mutedForeground }}>{t('appNotFound')}</Text>
      </View>
    );
  }

  const job = application.job;
  const STATUS_COLORS: Record<string, string> = {
    DRAFT: colors.mutedForeground, APPLIED: colors.primary, VIEWED: '#00CEC9',
    INTERVIEW_SCHEDULED: '#FDCB6E', OFFERED: colors.success, REJECTED: colors.destructive, ACCEPTED: colors.success,
  };
  const TIMELINE_ORDER = ['DRAFT', 'APPLIED', 'VIEWED', 'INTERVIEW_SCHEDULED', 'OFFERED', 'ACCEPTED'];
  const currentIdx = TIMELINE_ORDER.indexOf(application.status);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        backgroundColor: colors.primary, paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20,
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>{job?.title ?? t('appPosition')}</Text>
        <Text style={{ color: '#A29BFE', fontSize: 14, marginTop: 4 }}>{job?.company?.name ?? t('appCompany')}</Text>
        <View style={{
          alignSelf: 'flex-start', marginTop: 12,
          backgroundColor: (STATUS_COLORS[application.status] ?? '#ADB5BD') + '30',
          paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
        }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
            {STATUS_LABELS[application.status] ?? application.status}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Timeline */}
        <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20, marginBottom: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, marginBottom: 16 }}>{t('appProgression')}</Text>
          {TIMELINE_ORDER.map((step, idx) => {
            const isReached = idx <= currentIdx;
            const isCurrent = step === application.status;
            const isRejected = application.status === 'REJECTED';

            return (
              <View key={step} style={{ flexDirection: 'row', marginBottom: idx < TIMELINE_ORDER.length - 1 ? 0 : 0 }}>
                {/* Dot + Line */}
                <View style={{ alignItems: 'center', width: 28 }}>
                  <View style={{
                    width: isCurrent ? 16 : 12, height: isCurrent ? 16 : 12, borderRadius: 8,
                    backgroundColor: isRejected && isCurrent ? colors.destructive : isReached ? colors.primary : colors.border,
                    borderWidth: isCurrent ? 3 : 0, borderColor: isRejected ? colors.destructive + '40' : colors.primary + '40',
                  }} />
                  {idx < TIMELINE_ORDER.length - 1 && (
                    <View style={{
                      width: 2, height: 28,
                      backgroundColor: isReached && idx < currentIdx ? colors.primary : colors.border,
                    }} />
                  )}
                </View>
                {/* Label */}
                <Text style={{
                  marginLeft: 10, fontSize: 13, marginTop: -2,
                  fontWeight: isCurrent ? '700' : '400',
                  color: isReached ? colors.foreground : colors.mutedForeground,
                }}>
                  {STATUS_LABELS[step]}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Dates */}
        <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20, marginBottom: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, marginBottom: 12 }}>{t('appDates')}</Text>
          <InfoRow icon="calendar-outline" label={t('appAppliedOn')} value={formatDate(application.createdAt)} colors={colors} />
          {application.updatedAt !== application.createdAt && (
            <InfoRow icon="refresh-outline" label={t('appLastUpdate')} value={formatDate(application.updatedAt)} colors={colors} />
          )}
        </View>

        {/* Job Info */}
        <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20, marginBottom: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, marginBottom: 12 }}>{t('appJobOffer')}</Text>
          {job?.location && <InfoRow icon="location-outline" label={t('appLocation')} value={job.location} colors={colors} />}
          {job?.contractType && <InfoRow icon="document-text-outline" label={t('appContract')} value={job.contractType} colors={colors} />}
          {job?.salaryMin && (
            <InfoRow icon="cash-outline" label={t('appSalary')}
              value={`${job.salaryMin.toLocaleString()}€ - ${job.salaryMax?.toLocaleString() ?? '?'}€`} colors={colors} />
          )}
          <TouchableOpacity
            onPress={() => router.push(`/job/${job?.id}`)}
            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}
          >
            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>{t('appViewFullJob')}</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Cover Letter */}
        {application.coverLetter && (
          <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20, marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, marginBottom: 8 }}>{t('appCoverLetter')}</Text>
            <Text style={{ fontSize: 13, color: colors.mutedForeground, lineHeight: 20 }} numberOfLines={6}>
              {application.coverLetter}
            </Text>
          </View>
        )}

        {/* Actions */}
        {application.status === 'APPLIED' && (
          <TouchableOpacity
            onPress={() => withdrawMutation.mutate()}
            style={{
              backgroundColor: '#FF767515', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4,
            }}
          >
            <Text style={{ color: '#FF7675', fontWeight: '600' }}>{t('appWithdraw')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value, colors }: { icon: string; label: string; value: string; colors: any }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
      <Ionicons name={icon as any} size={16} color={colors.mutedForeground} />
      <Text style={{ marginLeft: 8, fontSize: 12, color: colors.mutedForeground, width: 90 }}>{label}</Text>
      <Text style={{ fontSize: 13, color: colors.foreground, fontWeight: '500', flex: 1 }}>{value}</Text>
    </View>
  );
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}
