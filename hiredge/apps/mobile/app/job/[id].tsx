import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Alert, Modal, Switch, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { jobsApi, applicationsApi, squadApi } from '../../lib/api';
import { useThemeColors } from '../../lib/theme';
import { useTranslation } from '../../lib/i18n';
import type { TranslationKey } from '@hiredge/shared/src/i18n/translations';

// ─── Types ───────────────────────────────────────────────────────
interface CoverLetterData { coverLetter: string; generatedAt: string }
interface CompanyAnalysisData {
  companyName: string; industry?: string; location?: string;
  activeJobCount: number; topSkills: string[]; locations: string[];
  hasRemote: boolean; jobTitles: string[]; analysis: string | null;
}

// ─── Utilitaires ─────────────────────────────────────────────────
function cleanDescription(text: string): string {
  if (!text) return '';
  return text
    .replace(/please mention the word \*{0,2}\w+\*{0,2} and tag [A-Za-z0-9+\/=]+ when applying[^.]*\./gi, '')
    .replace(/#[A-Za-z0-9+\/=]{10,}/g, '')
    .replace(/\(#[A-Za-z0-9+\/=]{5,}=[^)]*\)/g, '')
    .replace(/\*\*/g, '')
    .replace(/\s{3,}/g, '\n\n')
    .trim();
}

function formatSalary(min?: number, max?: number, currency?: string, t?: (k: TranslationKey) => string): string {
  if (!min && !max) return '';
  const cur = currency ?? 'EUR';
  const symbol = cur === 'CAD' ? 'CA$' : cur === 'USD' ? '$' : '€';
  const fmt = (n: number) => n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
  if (min && max) return `${symbol}${fmt(min)} - ${fmt(max)}`;
  if (min) return `${symbol}${fmt(min)}+`;
  if (max) return `${t?.('jobUpTo') ?? 'jusqu\'\u00e0'} ${symbol}${fmt(max)}`;
  return '';
}

function formatLevel(level: string, t?: (k: TranslationKey) => string): string {
  if (!t) {
    const map: Record<string, string> = { junior: 'Junior', mid: 'Confirmé', senior: 'Senior', lead: 'Lead' };
    return map[level?.toLowerCase()] ?? level;
  }
  const map: Record<string, string> = {
    junior: t('jobLevelJunior'), mid: t('jobLevelMid'),
    senior: t('jobLevelSenior'), lead: t('jobLevelLead'),
  };
  return map[level?.toLowerCase()] ?? level;
}

function getMatchColor(score: number): string {
  if (score >= 80) return '#00B894';
  if (score >= 60) return '#6C5CE7';
  if (score >= 40) return '#FDCB6E';
  return '#FF7675';
}

function getContractLabel(type: string, t?: (k: TranslationKey) => string): string {
  if (!t) {
    const labels: Record<string, string> = {
      CDI: 'CDI', CDD: 'CDD', FREELANCE: 'Freelance', STAGE: 'Stage',
      ALTERNANCE: 'Alternance', TEMPS_PARTIEL: 'Temps partiel',
      FULL_TIME: 'Temps plein', PART_TIME: 'Temps partiel', CONTRACT: 'Contrat',
    };
    return labels[type] || type;
  }
  const labels: Record<string, string> = {
    CDI: t('jobContractCDI'), CDD: t('jobContractCDD'), FREELANCE: t('jobContractFreelance'),
    STAGE: t('jobContractStage'), ALTERNANCE: t('jobContractAlternance'),
    TEMPS_PARTIEL: t('jobContractPartTime'), FULL_TIME: t('jobContractFullTime'),
    PART_TIME: t('jobContractPartTime'), CONTRACT: t('jobContractContract'),
  };
  return labels[type] || type;
}

function formatDate(dateString: string, t?: (k: TranslationKey) => string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours < 1) return t?.('jobJustNow') ?? "\u00c0 l'instant";
  if (diffHours < 24) return t?.('jobHoursAgo')?.replace('{n}', String(diffHours)) ?? `Il y a ${diffHours}h`;
  if (diffDays < 7) return t?.('jobDaysAgo')?.replace('{n}', String(diffDays)) ?? `Il y a ${diffDays}j`;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function parseSkills(skills: string[] | string | undefined): string[] {
  if (!skills) return [];
  if (Array.isArray(skills)) return skills;
  try { return JSON.parse(skills); } catch { return []; }
}

// ─── Composant Principal ─────────────────────────────────────────
export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'offer' | 'letter' | 'company'>('offer');
  const { colors } = useThemeColors();
  const { t } = useTranslation();

  // Cover letter state
  const [coverLetter, setCoverLetter] = useState<CoverLetterData | null>(null);
  const [coverLetterLoading, setCoverLetterLoading] = useState(false);
  const [coverLetterError, setCoverLetterError] = useState<string | null>(null);

  // Company analysis state
  const [companyAnalysis, setCompanyAnalysis] = useState<CompanyAnalysisData | null>(null);
  const [companyLoading, setCompanyLoading] = useState(false);

  // Apply state
  const [applied, setApplied] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [squadSuggestions, setSquadSuggestions] = useState<any[]>([]);
  const [showSquadBanner, setShowSquadBanner] = useState(false);
  const [joiningSquad, setJoiningSquad] = useState<string | null>(null);

  // One-click apply modal state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [includeCoverLetter, setIncludeCoverLetter] = useState(true);
  const [applyCoverLetter, setApplyCoverLetter] = useState<string | null>(null);
  const [applyCoverLetterLoading, setApplyCoverLetterLoading] = useState(false);

  // Import cover letter state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [isCustomLetter, setIsCustomLetter] = useState(false);

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: async () => {
      const { data } = await jobsApi.getById(id!);
      const jobData = data?.data || data;
      if (jobData?.hasApplied) setApplied(true);
      return jobData;
    },
    enabled: !!id,
  });

  // ─── Cover Letter ───────────────────────────────────────────
  const loadCoverLetter = useCallback(async () => {
    if (coverLetter || coverLetterLoading) return;
    try {
      setCoverLetterLoading(true);
      setCoverLetterError(null);
      const res = await jobsApi.getCoverLetter(id!);
      if (res.data?.data) setCoverLetter(res.data.data);
    } catch (err: any) {
      setCoverLetterError(err.response?.data?.error?.message || t('jobGenerationError'));
    } finally {
      setCoverLetterLoading(false);
    }
  }, [id]);

  const regenerateCoverLetter = useCallback(async () => {
    setCoverLetter(null);
    setCoverLetterLoading(true);
    setCoverLetterError(null);
    setIsCustomLetter(false);
    try {
      const res = await jobsApi.getCoverLetter(id!, true);
      if (res.data?.data) setCoverLetter(res.data.data);
    } catch (err: any) {
      setCoverLetterError(err.response?.data?.error?.message || t('jobGenerationError'));
    } finally {
      setCoverLetterLoading(false);
    }
  }, [id]);

  const handleConfirmImport = useCallback(() => {
    if (!importText.trim()) return;
    const imported: CoverLetterData = {
      coverLetter: importText.trim(),
      generatedAt: new Date().toISOString(),
    };
    setCoverLetter(imported);
    setApplyCoverLetter(imported.coverLetter);
    setIsCustomLetter(true);
    setShowImportModal(false);
    setImportText('');
  }, [importText]);

  // ─── Company Analysis ───────────────────────────────────────
  const loadCompanyAnalysis = useCallback(async () => {
    if (companyAnalysis || companyLoading) return;
    try {
      setCompanyLoading(true);
      const res = await jobsApi.getCompanyAnalysis(id!);
      if (res.data?.data) setCompanyAnalysis(res.data.data);
    } catch { /* silently fail */ }
    finally { setCompanyLoading(false); }
  }, [id, companyAnalysis, companyLoading]);

  // ─── Tab Change ─────────────────────────────────────────────
  const handleTabChange = useCallback((tab: 'offer' | 'letter' | 'company') => {
    setActiveTab(tab);
    if (tab === 'letter') loadCoverLetter();
    if (tab === 'company') loadCompanyAnalysis();
  }, [loadCoverLetter, loadCompanyAnalysis]);

  // ─── Apply ──────────────────────────────────────────────────
  const handleOpenApplyModal = useCallback(async () => {
    if (applied) return;
    setShowApplyModal(true);
    // Auto-load cover letter for the modal
    if (!applyCoverLetter && !applyCoverLetterLoading) {
      setApplyCoverLetterLoading(true);
      try {
        const res = await jobsApi.getCoverLetter(id!);
        if (res.data?.data?.coverLetter) {
          setApplyCoverLetter(res.data.data.coverLetter);
        }
      } catch {
        // Non-blocking — user can still apply without cover letter
      } finally {
        setApplyCoverLetterLoading(false);
      }
    }
  }, [id, applied, applyCoverLetter, applyCoverLetterLoading]);

  const applyMutation = useMutation({
    mutationFn: async () => {
      const payload: { jobId: string; coverLetterContent?: string } = { jobId: id! };
      if (includeCoverLetter && applyCoverLetter) {
        payload.coverLetterContent = applyCoverLetter;
      }
      const response = await applicationsApi.create(payload);
      return response.data;
    },
    onSuccess: (data) => {
      setApplied(true);
      setApplyError(null);
      setShowApplyModal(false);
      const appData = data?.data;
      if (appData?.squadSuggestions?.length > 0) {
        setSquadSuggestions(appData.squadSuggestions);
        setShowSquadBanner(true);
      }
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || t('jobApplicationError');
      if (err.response?.data?.error?.code === 'ALREADY_APPLIED') {
        setApplied(true);
        setShowApplyModal(false);
      } else {
        setApplyError(msg);
      }
    },
  });

  const handleJoinSquad = async (squadId: string) => {
    try {
      setJoiningSquad(squadId);
      await squadApi.joinById(squadId);
      setShowSquadBanner(false);
    } catch { /* error */ }
    finally { setJoiningSquad(null); }
  };

  // ─── Loading / Error ───────────────────────────────────────
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.mutedForeground, fontSize: 14 }}>{t('jobLoading')}</Text>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 24 }}>
        <Ionicons name="business-outline" size={48} color={colors.mutedForeground} />
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, marginTop: 16 }}>{t('jobNotFound')}</Text>
        <Text style={{ color: colors.mutedForeground, marginTop: 8, textAlign: 'center' }}>{t('jobNotFoundDesc')}</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>{t('jobBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const skills = parseSkills(job.requiredSkills);
  const niceToHave = parseSkills(job.niceToHave);
  const salaryLabel = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency, t);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>

        {/* ═══ Header ═══ */}
        <View style={{
          backgroundColor: colors.primary, paddingTop: 56, paddingBottom: 28,
          paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF20', justifyContent: 'center', alignItems: 'center' }}
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            {job.matchScore != null && job.matchScore > 0 && (
              <View style={{
                backgroundColor: job.matchScore >= 70 ? '#00B89430' : job.matchScore >= 40 ? '#FFFFFF30' : '#FF767530',
                paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
              }}>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>{job.matchScore}% Match</Text>
              </View>
            )}
          </View>

          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', lineHeight: 28 }}>{job.title}</Text>
          <Text style={{ color: '#C9C3FF', fontSize: 16, marginTop: 6, fontWeight: '500' }}>{job.company?.name ?? t('jobCompanyFallback')}</Text>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <InfoBadge icon="location-outline" text={`${job.location}${job.remote ? ` (${t('jobRemote')})` : ''}`} />
            {salaryLabel ? <InfoBadge icon="cash-outline" text={salaryLabel} /> : null}
            <InfoBadge icon="briefcase-outline" text={getContractLabel(job.contractType, t)} />
            <InfoBadge icon="time-outline" text={formatDate(job.postedAt, t)} />
          </View>
        </View>

        {/* ═══ EDGE Analysis Card ═══ */}
        <View style={{
          marginHorizontal: 16, marginTop: 16, borderRadius: 16, overflow: 'hidden',
          backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primaryMedium,
        }}>
          <View style={{ flexDirection: 'row', padding: 16, gap: 12, alignItems: 'flex-start' }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="sparkles" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground, marginBottom: 4 }}>{t('jobEdgeAnalysis')}</Text>
              <Text style={{ fontSize: 13, color: colors.mutedForeground, lineHeight: 20 }}>
                {job.matchAnalysis
                  || (job.matchScore != null && job.matchScore >= 70
                    ? t('jobMatchHigh')
                    : job.matchScore != null && job.matchScore >= 40
                    ? t('jobMatchMedium')
                    : t('jobMatchLow'))}
              </Text>
            </View>
          </View>
        </View>

        {/* ═══ Squad Suggestion Banner (post-apply) ═══ */}
        {showSquadBanner && squadSuggestions.length > 0 && (
          <View style={{
            marginHorizontal: 16, marginTop: 12, borderRadius: 16, backgroundColor: '#EBF5FF',
            borderWidth: 1, borderColor: '#93C5FD', padding: 16,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flexDirection: 'row', gap: 12, flex: 1 }}>
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="people" size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E3A5F' }}>{t('jobSquadBannerTitle')}</Text>
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{t('jobSquadBannerSubtitle')}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowSquadBanner(false)}>
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <View style={{ marginTop: 12, gap: 8 }}>
              {squadSuggestions.slice(0, 3).map((sq: any) => (
                <View key={sq.id} style={{
                  backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E2E8F0',
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B' }} numberOfLines={1}>{sq.name}</Text>
                    <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                      {sq._count?.members || 0}/{sq.maxMembers || 10} {t('jobMembers')}{sq.jobFamily ? ` • ${sq.jobFamily}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleJoinSquad(sq.id)}
                    disabled={joiningSquad === sq.id}
                    style={{ backgroundColor: '#3B82F6', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 }}
                  >
                    {joiningSquad === sq.id
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{t('jobJoin')}</Text>
                    }
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ═══ Apply Error ═══ */}
        {applyError && !applied && (
          <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: '#FEE2E2', borderRadius: 12, padding: 14 }}>
            <Text style={{ color: '#DC2626', fontSize: 13 }}>{applyError}</Text>
          </View>
        )}

        {/* ═══ Tabs ═══ */}
        <View style={{
          flexDirection: 'row', marginHorizontal: 16, marginTop: 20,
          backgroundColor: colors.card, borderRadius: 14, padding: 4,
          borderWidth: 1, borderColor: colors.border,
        }}>
          {([
            { key: 'offer' as const, label: t('jobTabOffer'), icon: 'document-text-outline' },
            { key: 'letter' as const, label: t('jobTabLetter'), icon: 'mail-outline' },
            { key: 'company' as const, label: t('jobTabCompany'), icon: 'business-outline' },
          ]).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => handleTabChange(tab.key)}
              style={{
                flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
                paddingVertical: 10, borderRadius: 10,
                backgroundColor: activeTab === tab.key ? colors.primary : 'transparent',
              }}
            >
              <Ionicons name={tab.icon as any} size={16} color={activeTab === tab.key ? '#fff' : colors.mutedForeground} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: activeTab === tab.key ? '#fff' : colors.mutedForeground }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ═══ TAB: Offre ═══ */}
        {activeTab === 'offer' && (
          <View>
            {/* Quick Info Grid */}
            <View style={{
              marginHorizontal: 16, marginTop: 16, backgroundColor: colors.card, borderRadius: 16,
              padding: 16, borderWidth: 1, borderColor: colors.border,
            }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                <QuickInfoItem icon="briefcase-outline" label={t('jobContract')} value={getContractLabel(job.contractType, t)} colors={colors} />
                <QuickInfoItem icon="location-outline" label={t('jobLocation')} value={`${job.location}${job.remote ? ` (${t('jobRemote')})` : ''}`} colors={colors} />
                {salaryLabel ? <QuickInfoItem icon="cash-outline" label={t('jobSalary')} value={salaryLabel} colors={colors} /> : null}
                {(job.experienceMin != null || job.experienceMax != null) && (
                  <QuickInfoItem icon="star-outline" label={t('jobExperience')} value={
                    job.experienceMin != null && job.experienceMax != null
                      ? `${job.experienceMin}-${job.experienceMax} ${t('jobYears')}`
                      : job.experienceMin != null ? `${job.experienceMin}+ ${t('jobYears')}` : `${t('jobUpTo')} ${job.experienceMax} ${t('jobYears')}`
                  } colors={colors} />
                )}
              </View>
            </View>

            {/* Skills */}
            {skills.length > 0 && (
              <Section title={t('jobRequiredSkills')} colors={colors}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {skills.map((skill, i) => (
                    <View key={i} style={{ backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.primaryMedium }}>
                      <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>{skill}</Text>
                    </View>
                  ))}
                </View>
                {niceToHave.length > 0 && (
                  <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.muted }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.mutedForeground, marginBottom: 8 }}>{t('jobNiceToHave')}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {niceToHave.map((skill, i) => (
                        <View key={i} style={{ backgroundColor: colors.muted, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                          <Text style={{ fontSize: 13, color: colors.mutedForeground, fontWeight: '500' }}>{skill}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </Section>
            )}

            {/* Description */}
            {job.description && (
              <Section title={t('jobDescription')} colors={colors}>
                <DescriptionView text={cleanDescription(job.description)} colors={colors} />
              </Section>
            )}

            {/* Avantages */}
            {job.benefits?.length > 0 && (
              <Section title={t('jobBenefits')} colors={colors}>
                <View style={{ gap: 8 }}>
                  {job.benefits.map((b: string, i: number) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                      <Ionicons name="star-outline" size={16} color="#FDCB6E" style={{ marginTop: 2 }} />
                      <Text style={{ flex: 1, fontSize: 14, color: '#495057', lineHeight: 20 }}>{b}</Text>
                    </View>
                  ))}
                </View>
              </Section>
            )}

            {/* Source URL */}
            {job.sourceUrl && (
              <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
                <TouchableOpacity
                  onPress={() => Linking.openURL(job.sourceUrl)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card,
                    padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
                  }}
                >
                  <Ionicons name="open-outline" size={18} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>{t('jobViewOriginal')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Footer date */}
            <Text style={{ paddingHorizontal: 20, color: colors.mutedForeground, fontSize: 12, marginTop: 16, marginBottom: 8 }}>
              {t('jobPostedOn')} {new Date(job.postedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })} {job.source ? `• Source : ${job.source}` : ''}
            </Text>
          </View>
        )}

        {/* ═══ TAB: Lettre de Motivation ═══ */}
        {activeTab === 'letter' && (
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            {coverLetterLoading && (
              <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '600', marginTop: 16 }}>
                  {t('jobEdgeWriting')}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 4 }}>
                  {t('jobAnalysisInProgress')}
                </Text>
              </View>
            )}

            {coverLetterError && !coverLetterLoading && (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="alert-circle-outline" size={40} color={colors.destructive} />
                <Text style={{ color: colors.destructive, fontSize: 14, marginTop: 12, textAlign: 'center' }}>{coverLetterError}</Text>
                <TouchableOpacity onPress={regenerateCoverLetter} style={{
                  marginTop: 16, backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10,
                }}>
                  <Text style={{ color: '#fff', fontWeight: '600' }}>{t('jobRetry')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {coverLetter && !coverLetterLoading && (
              <View>
                {/* Imported label */}
                {isCustomLetter && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Ionicons name="cloud-upload-outline" size={14} color={colors.primary} />
                    <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>{t('jobImportedLabel')}</Text>
                  </View>
                )}
                {/* Action buttons */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  <TouchableOpacity
                    onPress={async () => {
                      await Clipboard.setStringAsync(coverLetter.coverLetter);
                      Alert.alert(t('jobCopied'), t('jobCopiedMessage'));
                    }}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.card, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}
                  >
                    <Ionicons name="copy-outline" size={18} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>{t('jobCopy')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={regenerateCoverLetter}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.card, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}
                  >
                    <Ionicons name="refresh-outline" size={18} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>{t('jobRegenerate')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowImportModal(true)}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.card, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}
                  >
                    <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>{t('jobImport')}</Text>
                  </TouchableOpacity>
                </View>
                {/* Letter content */}
                <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ fontSize: 14, lineHeight: 24, color: colors.foreground }}>{coverLetter.coverLetter}</Text>
                </View>
              </View>
            )}

            {!coverLetter && !coverLetterLoading && !coverLetterError && (
              <View style={{ alignItems: 'center', paddingVertical: 50 }}>
                <Ionicons name="mail-outline" size={48} color={colors.mutedForeground} />
                <Text style={{ color: colors.mutedForeground, fontSize: 15, marginTop: 12, textAlign: 'center' }}>
                  {t('jobGenerateLetterPrompt')}
                </Text>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                  <TouchableOpacity onPress={loadCoverLetter} style={{
                    backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14,
                    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
                  }}>
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>✦  {t('jobGenerateLetter')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowImportModal(true)} style={{
                    borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 14,
                    backgroundColor: colors.card,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
                      <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '600' }}>{t('jobImport')}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ═══ TAB: Analyse Entreprise ═══ */}
        {activeTab === 'company' && (
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            {companyLoading && (
              <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ color: colors.mutedForeground, fontSize: 14, marginTop: 12 }}>{t('jobCompanyAnalysisLoading')}</Text>
              </View>
            )}

            {companyAnalysis && !companyLoading && (
              <View style={{ gap: 16 }}>
                {/* Company header */}
                <View style={{
                  backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border,
                  flexDirection: 'row', gap: 14, alignItems: 'flex-start',
                }}>
                  <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: `${colors.primary}18`, justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="business" size={24} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}>{companyAnalysis.companyName}</Text>
                    {companyAnalysis.industry && <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 2 }}>{companyAnalysis.industry}</Text>}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="briefcase-outline" size={14} color={colors.primary} />
                        <Text style={{ fontSize: 13, color: colors.mutedForeground }}>{companyAnalysis.activeJobCount} {t('jobOffers')}</Text>
                      </View>
                      {companyAnalysis.location && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="globe-outline" size={14} color={colors.primary} />
                          <Text style={{ fontSize: 13, color: colors.mutedForeground }}>{companyAnalysis.location}</Text>
                        </View>
                      )}
                      {companyAnalysis.hasRemote && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="wifi-outline" size={14} color={colors.success} />
                          <Text style={{ fontSize: 13, color: colors.success }}>{t('jobRemote')}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* AI Analysis */}
                {companyAnalysis.analysis && (
                  <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground, marginBottom: 10 }}>{t('jobAIAnalysis')}</Text>
                    <Text style={{ fontSize: 14, color: colors.mutedForeground, lineHeight: 22 }}>{companyAnalysis.analysis}</Text>
                  </View>
                )}

                {/* Top Skills */}
                {companyAnalysis.topSkills?.length > 0 && (
                  <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground, marginBottom: 10 }}>{t('jobTechRequired')}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {companyAnalysis.topSkills.map((skill, i) => (
                        <View key={i} style={{ backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                          <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>{skill}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Open positions */}
                {companyAnalysis.jobTitles?.length > 0 && (
                  <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground, marginBottom: 10 }}>{t('jobOpenPositions')}</Text>
                    <View style={{ gap: 8 }}>
                      {companyAnalysis.jobTitles.map((title, i) => (
                        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                          <Text style={{ fontSize: 14, color: colors.mutedForeground, flex: 1 }}>{title}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            {!companyAnalysis && !companyLoading && (
              <View style={{ alignItems: 'center', paddingVertical: 50 }}>
                <Ionicons name="business-outline" size={48} color={colors.mutedForeground} />
                <Text style={{ color: colors.mutedForeground, fontSize: 14, marginTop: 12 }}>{t('jobNoCompanyData')}</Text>
              </View>
            )}
          </View>
        )}

        {/* ═══ Sidebar-like: Score Details + Points forts/faibles (always visible below tabs) ═══ */}
        {job.matchScore != null && job.matchScore > 0 && (
          <View style={{ marginHorizontal: 16, marginTop: 24 }}>
            {/* Score breakdown */}
            <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground, marginBottom: 16 }}>{t('jobCompatibilityScore')}</Text>

              {/* Circular score */}
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <View style={{
                  width: 100, height: 100, borderRadius: 50, borderWidth: 6,
                  borderColor: getMatchColor(job.matchScore) + '30',
                  justifyContent: 'center', alignItems: 'center',
                }}>
                  <Text style={{ fontSize: 28, fontWeight: '800', color: getMatchColor(job.matchScore) }}>{job.matchScore}%</Text>
                </View>
              </View>

              {/* Score bars */}
              {job.matchDetails && (
                <View style={{ gap: 12 }}>
                  {[
                    { label: t('jobSkills'), value: job.matchDetails.skills },
                    { label: t('jobRelevance'), value: job.matchDetails.semantic },
                    { label: t('jobExperience'), value: job.matchDetails.experience },
                    { label: t('jobSalaryLabel'), value: job.matchDetails.salary },
                    { label: t('jobLocationLabel'), value: job.matchDetails.location },
                  ].map(({ label, value }: { label: string; value: number }) => (
                    <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ width: 90, fontSize: 12, color: colors.mutedForeground }}>{label}</Text>
                      <View style={{ flex: 1, height: 6, backgroundColor: colors.muted, borderRadius: 3, overflow: 'hidden' }}>
                        <View style={{
                          width: `${value}%`, height: '100%', borderRadius: 3,
                          backgroundColor: value >= 70 ? colors.primary : value >= 40 ? colors.primary : '#FDCB6E',
                        }} />
                      </View>
                      <Text style={{ width: 32, fontSize: 12, fontWeight: '600', color: colors.foreground, textAlign: 'right' }}>{value}%</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Selling Points */}
            {job.sellingPoints?.length > 0 && (
              <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, marginTop: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground, marginBottom: 12 }}>{t('jobSellingPoints')}</Text>
                <View style={{ gap: 10 }}>
                  {job.sellingPoints.map((point: string, i: number) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                      <Ionicons name="star" size={16} color={colors.success} style={{ marginTop: 2 }} />
                      <Text style={{ flex: 1, fontSize: 14, color: colors.mutedForeground, lineHeight: 20 }}>{point}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Gaps */}
            {job.gaps?.length > 0 && (
              <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, marginTop: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground, marginBottom: 12 }}>{t('jobGaps')}</Text>
                <View style={{ gap: 10 }}>
                  {job.gaps.map((gap: string, i: number) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FDCB6E', marginTop: 6 }} />
                      <Text style={{ flex: 1, fontSize: 14, color: colors.mutedForeground, lineHeight: 20 }}>{gap}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

      </ScrollView>

      {/* ═══ CTA bas de page ═══ */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: colors.card, padding: 16, paddingBottom: 28,
        borderTopWidth: 1, borderColor: colors.muted,
        flexDirection: 'row', gap: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 12,
      }}>
        <TouchableOpacity style={{
          width: 52, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border,
          justifyContent: 'center', alignItems: 'center', backgroundColor: colors.card,
        }}>
          <Ionicons name="bookmark-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { if (!applied) handleOpenApplyModal(); }}
          disabled={applyMutation.isPending || applied}
          style={{
            flex: 1, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
            backgroundColor: applied ? '#00B894' : colors.primary,
            opacity: applyMutation.isPending ? 0.7 : 1,
            shadowColor: applied ? '#00B894' : colors.primary,
            shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
            {applied ? t('jobApplied') : applyMutation.isPending ? t('jobSending') : t('jobApplyWithEdge')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ═══ One-Click Apply Confirmation Modal ═══ */}
      <Modal visible={showApplyModal} transparent animationType="slide" onRequestClose={() => setShowApplyModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
            paddingHorizontal: 20, paddingTop: 20, paddingBottom: 34, maxHeight: '80%',
          }}>
            {/* Handle */}
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 }} />

            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="send" size={20} color={colors.primary} />
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.foreground }}>{t('jobApplyModalTitle')}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowApplyModal(false)}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Job Summary */}
              <View style={{
                backgroundColor: colors.background, borderRadius: 16, padding: 14, marginBottom: 14,
                borderWidth: 1, borderColor: colors.border,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="business" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }} numberOfLines={2}>{job.title}</Text>
                    <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 2 }}>{job.company?.name ?? t('jobCompanyFallback')}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Ionicons name="location-outline" size={12} color={colors.mutedForeground} />
                        <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{job.location}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Ionicons name="briefcase-outline" size={12} color={colors.mutedForeground} />
                        <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{getContractLabel(job.contractType, t)}</Text>
                      </View>
                    </View>
                  </View>
                  {job.matchScore != null && job.matchScore > 0 && (
                    <View style={{
                      backgroundColor: job.matchScore >= 70 ? '#00B89420' : '#6C5CE720',
                      paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
                    }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: job.matchScore >= 70 ? '#00B894' : '#6C5CE7' }}>
                        {job.matchScore}%
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Cover Letter Toggle */}
              <View style={{
                backgroundColor: colors.card, borderRadius: 16, padding: 14, marginBottom: 14,
                borderWidth: 1, borderColor: colors.border,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="document-text" size={18} color={colors.primary} />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>{t('jobCoverLetterAI')}</Text>
                  </View>
                  <Switch
                    value={includeCoverLetter}
                    onValueChange={setIncludeCoverLetter}
                    trackColor={{ false: colors.border, true: `${colors.primary}80` }}
                    thumbColor={includeCoverLetter ? colors.primary : '#CED4DA'}
                  />
                </View>
                {includeCoverLetter && (
                  <View style={{ marginTop: 10 }}>
                    {applyCoverLetterLoading ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={{ fontSize: 12, color: colors.primary }}>{t('jobEdgeWriting')}</Text>
                      </View>
                    ) : applyCoverLetter ? (
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                          <Text style={{ fontSize: 12, color: colors.success, fontWeight: '600' }}>{t('jobLetterReady')}</Text>
                        </View>
                        <View style={{ backgroundColor: colors.background, borderRadius: 10, padding: 10, maxHeight: 100 }}>
                          <Text style={{ fontSize: 11, color: colors.mutedForeground, lineHeight: 16 }} numberOfLines={5}>
                            {applyCoverLetter}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                        {t('jobLetterWillGenerate')}
                      </Text>
                    )}
                  </View>
                )}
              </View>

              {/* EDGE tip */}
              <View style={{
                flexDirection: 'row', gap: 10, backgroundColor: colors.primaryLight, borderRadius: 12, padding: 12, marginBottom: 14,
              }}>
                <Ionicons name="sparkles" size={16} color={colors.primary} style={{ marginTop: 1 }} />
                <Text style={{ flex: 1, fontSize: 12, color: colors.primary, lineHeight: 18 }}>
                  {t('jobEdgeTip')}
                </Text>
              </View>

              {/* Error display */}
              {applyError && !applied && (
                <View style={{ backgroundColor: '#FEE2E2', borderRadius: 12, padding: 12, marginBottom: 14 }}>
                  <Text style={{ color: '#DC2626', fontSize: 13 }}>{applyError}</Text>
                </View>
              )}
            </ScrollView>

            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => setShowApplyModal(false)}
                disabled={applyMutation.isPending}
                style={{
                  flex: 1, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
                  borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.mutedForeground }}>{t('jobCancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => applyMutation.mutate()}
                disabled={applyMutation.isPending || applied}
                style={{
                  flex: 2, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
                  backgroundColor: colors.primary, opacity: applyMutation.isPending ? 0.7 : 1,
                  flexDirection: 'row', gap: 8,
                  shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
                }}
              >
                {applyMutation.isPending ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{t('jobSending')}</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="send" size={16} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{t('jobConfirm')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══ Import Cover Letter Modal ═══ */}
      <Modal visible={showImportModal} transparent animationType="slide" onRequestClose={() => setShowImportModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={{
              backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
              paddingHorizontal: 20, paddingTop: 20, paddingBottom: 34, maxHeight: '80%',
            }}>
              {/* Handle */}
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 }} />

              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.foreground }}>{t('jobImportTitle')}</Text>
                </View>
                <TouchableOpacity onPress={() => { setShowImportModal(false); setImportText(''); }}>
                  <Ionicons name="close" size={24} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 13, color: colors.mutedForeground, marginBottom: 12 }}>{t('jobImportDesc')}</Text>

              {/* Text input */}
              <TextInput
                multiline
                placeholder={t('jobImportPlaceholder')}
                placeholderTextColor={colors.mutedForeground}
                value={importText}
                onChangeText={setImportText}
                style={{
                  minHeight: 200, maxHeight: 300, borderRadius: 14, borderWidth: 1,
                  borderColor: colors.border, backgroundColor: colors.background,
                  padding: 16, fontSize: 14, color: colors.foreground, lineHeight: 22,
                  textAlignVertical: 'top',
                }}
              />

              {/* Action buttons */}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <TouchableOpacity
                  onPress={() => { setShowImportModal(false); setImportText(''); }}
                  style={{
                    flex: 1, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
                    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.mutedForeground }}>{t('jobCancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleConfirmImport}
                  disabled={!importText.trim()}
                  style={{
                    flex: 2, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
                    backgroundColor: importText.trim() ? colors.primary : colors.muted,
                    flexDirection: 'row', gap: 8,
                  }}
                >
                  <Ionicons name="checkmark-circle" size={18} color={importText.trim() ? '#fff' : colors.mutedForeground} />
                  <Text style={{ color: importText.trim() ? '#fff' : colors.mutedForeground, fontSize: 15, fontWeight: '700' }}>
                    {t('jobImportConfirm')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Sub-components ──────────────────────────────────────────────

function DescriptionView({ text, colors }: { text: string; colors: any }) {
  const paragraphs = text.split(/\n+/).filter(Boolean);
  return (
    <View style={{ gap: 8 }}>
      {paragraphs.map((p, i) => {
        const trimmed = p.trim();
        if (!trimmed) return null;
        // Bullet points
        if (/^[•\-\*·∙◦▪▸►]/.test(trimmed)) {
          return (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingLeft: 4 }}>
              <Text style={{ color: colors.primary, fontSize: 14, marginTop: 2 }}>•</Text>
              <Text style={{ flex: 1, fontSize: 14, color: colors.mutedForeground, lineHeight: 22 }}>
                {trimmed.replace(/^[•\-\*·∙◦▪▸►]\s*/, '')}
              </Text>
            </View>
          );
        }
        // Short lines that look like headers
        if (trimmed.length < 80 && /^[A-ZÀ-Ú]/.test(trimmed) && !trimmed.endsWith('.') && !trimmed.endsWith(',') && trimmed.split(' ').length <= 10) {
          return (
            <Text key={i} style={{ fontSize: 15, fontWeight: '700', color: colors.foreground, marginTop: 8 }}>
              {trimmed}
            </Text>
          );
        }
        return (
          <Text key={i} style={{ fontSize: 14, color: colors.mutedForeground, lineHeight: 22 }}>{trimmed}</Text>
        );
      })}
    </View>
  );
}

function Section({ title, children, colors }: { title: string; children: React.ReactNode; colors: any }) {
  return (
    <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.foreground, marginBottom: 12 }}>{title}</Text>
      <View style={{ borderTopWidth: 1, borderTopColor: colors.muted, paddingTop: 12 }}>{children}</View>
    </View>
  );
}

function InfoBadge({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: '#FFFFFF25', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
      borderWidth: 1, borderColor: '#FFFFFF30',
    }}>
      <Ionicons name={icon as any} size={13} color="#fff" />
      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }} numberOfLines={1}>{text}</Text>
    </View>
  );
}

function QuickInfoItem({ icon, label, value, colors }: { icon: string; label: string; value: string; colors: any }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, width: '47%', padding: 10, backgroundColor: colors.background, borderRadius: 12 }}>
      <Ionicons name={icon as any} size={18} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{label}</Text>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}
