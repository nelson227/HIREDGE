import { View, Text, ScrollView, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Modal, Platform } from 'react-native';
import { useState, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';
import { colors, spacing, radius, fontSize, shadows } from '../../lib/theme';

// ─── Types des filtres ──────────────────────────────────────────────────────
interface Filters {
  contract: string | null;
  remote: string | null;
  salaryMin: number | null;
  experienceLevel: string | null;
  postedAfter: string | null;
  location: string;
}

const EMPTY_FILTERS: Filters = {
  contract: null,
  remote: null,
  salaryMin: null,
  experienceLevel: null,
  postedAfter: null,
  location: '',
};

const CONTRACT_OPTIONS = ['CDI', 'CDD', 'freelance', 'stage', 'alternance'];
const REMOTE_OPTIONS = [
  { value: 'remote', label: '🌐 Remote' },
  { value: 'hybrid', label: '🔀 Hybride' },
  { value: 'onsite', label: '🏢 Présentiel' },
];
const SALARY_OPTIONS = [
  { value: 40000, label: '40k+' },
  { value: 60000, label: '60k+' },
  { value: 80000, label: '80k+' },
  { value: 100000, label: '100k+' },
];
const LEVEL_OPTIONS = [
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Confirmé' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
];
const POSTED_OPTIONS = [
  { value: 'today', label: "Aujourd'hui" },
  { value: 'week', label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois' },
];

function postedAfterDate(value: string): string {
  const d = new Date();
  if (value === 'today') { d.setHours(0, 0, 0, 0); }
  else if (value === 'week') { d.setDate(d.getDate() - 7); }
  else if (value === 'month') { d.setMonth(d.getMonth() - 1); }
  return d.toISOString();
}

function countActiveFilters(f: Filters): number {
  return [f.contract, f.remote, f.salaryMin, f.experienceLevel, f.postedAfter, f.location || null]
    .filter(Boolean).length;
}

function getMatchColor(score: number) {
  if (score >= 90) return colors.success;
  if (score >= 80) return colors.primary;
  return colors.mutedForeground;
}
function getMatchBg(score: number) {
  if (score >= 90) return colors.successLight;
  if (score >= 80) return colors.primaryLight;
  return colors.muted;
}

function formatSalaryShort(min?: number, max?: number, currency?: string) {
  const fmt = (n: number) => n >= 1000 ? `${Math.round(n / 1000)}k` : n;
  if (min && max) return `${fmt(min)}-${fmt(max)}${currency === 'CAD' ? ' CA$' : '€'}`;
  if (min) return `${fmt(min)}+${currency === 'CAD' ? ' CA$' : '€'}`;
  if (max) return `≤${fmt(max)}${currency === 'CAD' ? ' CA$' : '€'}`;
  return '';
}

function formatLevel(level: string) {
  const map: Record<string, string> = { junior: 'Junior', mid: 'Confirmé', senior: 'Senior', lead: 'Lead' };
  return map[level] ?? level;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff < 1) return "Aujourd'hui";
  if (diff === 1) return 'Hier';
  if (diff < 7) return `Il y a ${diff}j`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// ─── Composant principal ─────────────────────────────────────────────────────
export default function JobsScreen() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [tempFilters, setTempFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const activeCount = countActiveFilters(filters);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['jobs', search, filters],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (filters.contract) params.set('contract', filters.contract);
      if (filters.remote) params.set('remote', filters.remote);
      if (filters.salaryMin) params.set('salaryMin', String(filters.salaryMin));
      if (filters.experienceLevel) params.set('experienceLevel', filters.experienceLevel);
      if (filters.postedAfter) params.set('postedAfter', postedAfterDate(filters.postedAfter));
      if (filters.location) params.set('location', filters.location);
      params.set('page', String(pageParam));
      params.set('limit', '20');
      const { data } = await api.get(`/jobs/search?${params}`);
      return data;
    },
    getNextPageParam: (lastPage: any) => {
      const p = lastPage.pagination;
      if (!p) return undefined;
      return p.page < p.totalPages ? p.page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const jobs = data?.pages.flatMap((p: any) => p.data ?? p.jobs ?? []).filter(Boolean) ?? [];

  const openFilters = () => {
    setTempFilters({ ...filters });
    setShowFilters(true);
  };

  const applyFilters = () => {
    setFilters({ ...tempFilters });
    setShowFilters(false);
  };

  const resetFilters = () => {
    setTempFilters({ ...EMPTY_FILTERS });
  };

  const renderJob = useCallback(({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => router.push(`/job/${item.id}`)}
      style={{
        backgroundColor: colors.card,
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        borderRadius: radius.xl,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadows.sm,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        {/* Company icon */}
        <View style={{
          width: 48, height: 48, borderRadius: radius.lg,
          backgroundColor: colors.muted,
          justifyContent: 'center', alignItems: 'center',
          marginRight: spacing.md, flexShrink: 0,
        }}>
          <Text style={{ fontSize: fontSize.lg, fontWeight: '800', color: colors.primary }}>
            {(item.company?.name ?? '?')[0].toUpperCase()}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: colors.foreground }} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={{ color: colors.mutedForeground, marginTop: 2, fontSize: fontSize.sm, fontWeight: '500' }}>
            {item.company?.name}
          </Text>
        </View>

        {item.matchScore != null && (
          <View style={{
            paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
            borderRadius: radius.full,
            backgroundColor: getMatchBg(item.matchScore),
            marginLeft: spacing.sm, flexShrink: 0,
          }}>
            <Text style={{ fontSize: fontSize.sm, fontWeight: '700', color: getMatchColor(item.matchScore) }}>
              {item.matchScore}%
            </Text>
          </View>
        )}
      </View>

      {/* Location */}
      {item.location && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md }}>
          <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
          <Text style={{ fontSize: fontSize.xs, color: colors.mutedForeground }}>{item.location}</Text>
        </View>
      )}

      {/* Badges */}
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' }}>
        {item.contractType && <JobBadge text={item.contractType} color={colors.primary} bg={colors.primaryLight} />}
        {item.remote && <JobBadge text="Remote" color={colors.chart3} bg="rgba(14, 165, 233, 0.10)" />}
        {(item.salaryMin || item.salaryMax) && (
          <JobBadge
            text={formatSalaryShort(item.salaryMin, item.salaryMax, item.salaryCurrency)}
            color={colors.success}
            bg={colors.successLight}
          />
        )}
        {item.experienceLevel && <JobBadge text={formatLevel(item.experienceLevel)} color={colors.warning} bg={colors.warningLight} />}
      </View>

      <Text style={{ fontSize: fontSize.xs, color: colors.border, marginTop: spacing.md }}>
        {formatDate(item.postedAt)}
      </Text>
    </TouchableOpacity>
  ), []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        backgroundColor: colors.card,
        paddingTop: 56,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderColor: colors.border,
      }}>
        <Text style={{ fontSize: fontSize['2xl'], fontWeight: '800', color: colors.foreground, marginBottom: spacing.md }}>Offres d'emploi</Text>

        {/* Search bar + filter button */}
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{
            flex: 1,
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: colors.muted, borderRadius: radius.lg, paddingHorizontal: spacing.md,
          }}>
            <Ionicons name="search" size={17} color={colors.mutedForeground} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Poste, compétence, entreprise..."
              placeholderTextColor={colors.mutedForeground}
              style={{ flex: 1, paddingVertical: 11, paddingHorizontal: spacing.sm, fontSize: fontSize.sm + 1, color: colors.foreground }}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={17} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter button with badge */}
          <TouchableOpacity
            onPress={openFilters}
            style={{
              width: 44, height: 44, borderRadius: radius.lg,
              backgroundColor: activeCount > 0 ? colors.primary : colors.muted,
              justifyContent: 'center', alignItems: 'center',
              position: 'relative',
            }}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={activeCount > 0 ? colors.primaryForeground : colors.foreground}
            />
            {activeCount > 0 && (
              <View style={{
                position: 'absolute', top: -4, right: -4,
                width: 18, height: 18, borderRadius: 9,
                backgroundColor: colors.destructive,
                justifyContent: 'center', alignItems: 'center',
                borderWidth: 2, borderColor: colors.card,
              }}>
                <Text style={{ color: colors.primaryForeground, fontSize: 10, fontWeight: '800' }}>{activeCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Active filter tags */}
        {activeCount > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: spacing.md }}
            contentContainerStyle={{ gap: spacing.sm }}
          >
            {filters.contract && <ActiveTag label={filters.contract} onRemove={() => setFilters(f => ({ ...f, contract: null }))} />}
            {filters.remote && <ActiveTag label={REMOTE_OPTIONS.find(r => r.value === filters.remote)?.label ?? filters.remote} onRemove={() => setFilters(f => ({ ...f, remote: null }))} />}
            {filters.salaryMin && <ActiveTag label={`${filters.salaryMin / 1000}k+`} onRemove={() => setFilters(f => ({ ...f, salaryMin: null }))} />}
            {filters.experienceLevel && <ActiveTag label={formatLevel(filters.experienceLevel)} onRemove={() => setFilters(f => ({ ...f, experienceLevel: null }))} />}
            {filters.postedAfter && <ActiveTag label={POSTED_OPTIONS.find(p => p.value === filters.postedAfter)?.label ?? ''} onRemove={() => setFilters(f => ({ ...f, postedAfter: null }))} />}
            {filters.location && <ActiveTag label={filters.location} onRemove={() => setFilters(f => ({ ...f, location: '' }))} />}
            <TouchableOpacity
              onPress={() => setFilters({ ...EMPTY_FILTERS })}
              style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, backgroundColor: colors.destructiveLight }}
            >
              <Text style={{ fontSize: fontSize.xs + 1, color: colors.destructive, fontWeight: '700' }}>Tout effacer</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* Result count */}
      {!isLoading && (
        <Text style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs, fontSize: fontSize.sm, color: colors.mutedForeground, fontWeight: '500' }}>
          {data?.pages[0]?.pagination?.total ?? jobs.length} offres trouvées
        </Text>
      )}

      {/* Job list */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={jobs}
          renderItem={renderJob}
          keyExtractor={(item, index) => item?.id ?? String(index)}
          contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: 100 }}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage
              ? <ActivityIndicator color={colors.primary} style={{ padding: spacing.lg }} />
              : null
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80 }}>
              <View style={{
                width: 64, height: 64, borderRadius: radius['2xl'], backgroundColor: colors.muted,
                justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg,
              }}>
                <Ionicons name="briefcase-outline" size={28} color={colors.mutedForeground} />
              </View>
              <Text style={{ color: colors.foreground, fontSize: fontSize.lg, fontWeight: '600' }}>
                Aucune offre trouvée
              </Text>
              <Text style={{ color: colors.mutedForeground, marginTop: spacing.sm, fontSize: fontSize.sm }}>
                Essaie d'autres critères de recherche
              </Text>
            </View>
          }
        />
      )}

      {/* Filter Panel */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.card }}>
          {/* Modal header */}
          <View style={{
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.lg,
            borderBottomWidth: 1, borderColor: colors.border,
          }}>
            <Text style={{ fontSize: fontSize.xl, fontWeight: '800', color: colors.foreground }}>Filtres</Text>
            <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
              <TouchableOpacity onPress={resetFilters}>
                <Text style={{ fontSize: fontSize.sm + 1, color: colors.mutedForeground, fontWeight: '600' }}>Réinitialiser</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <View style={{ width: 32, height: 32, borderRadius: radius.full, backgroundColor: colors.muted, justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="close" size={18} color={colors.foreground} />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing['2xl'] }} showsVerticalScrollIndicator={false}>

            <FilterSection title="📍 Localisation">
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: colors.muted, borderRadius: radius.lg,
                paddingHorizontal: spacing.lg - 2, borderWidth: 1, borderColor: colors.border,
              }}>
                <Ionicons name="location-outline" size={16} color={colors.mutedForeground} />
                <TextInput
                  value={tempFilters.location}
                  onChangeText={v => setTempFilters(f => ({ ...f, location: v }))}
                  placeholder="Paris, Lyon, Montréal..."
                  placeholderTextColor={colors.mutedForeground}
                  style={{ flex: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, fontSize: fontSize.sm + 1, color: colors.foreground }}
                />
                {tempFilters.location.length > 0 && (
                  <TouchableOpacity onPress={() => setTempFilters(f => ({ ...f, location: '' }))}>
                    <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                )}
              </View>
            </FilterSection>

            <FilterSection title="📄 Type de contrat">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {CONTRACT_OPTIONS.map(c => (
                  <FilterChip
                    key={c}
                    label={c}
                    active={tempFilters.contract === c}
                    onPress={() => setTempFilters(f => ({ ...f, contract: f.contract === c ? null : c }))}
                  />
                ))}
              </View>
            </FilterSection>

            <FilterSection title="🌐 Mode de travail">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {REMOTE_OPTIONS.map(r => (
                  <FilterChip
                    key={r.value}
                    label={r.label}
                    active={tempFilters.remote === r.value}
                    onPress={() => setTempFilters(f => ({ ...f, remote: f.remote === r.value ? null : r.value }))}
                  />
                ))}
              </View>
            </FilterSection>

            <FilterSection title="💰 Salaire minimum">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {SALARY_OPTIONS.map(s => (
                  <FilterChip
                    key={s.value}
                    label={s.label}
                    active={tempFilters.salaryMin === s.value}
                    onPress={() => setTempFilters(f => ({ ...f, salaryMin: f.salaryMin === s.value ? null : s.value }))}
                  />
                ))}
              </View>
            </FilterSection>

            <FilterSection title="📈 Niveau d'expérience">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {LEVEL_OPTIONS.map(l => (
                  <FilterChip
                    key={l.value}
                    label={l.label}
                    active={tempFilters.experienceLevel === l.value}
                    onPress={() => setTempFilters(f => ({ ...f, experienceLevel: f.experienceLevel === l.value ? null : l.value }))}
                  />
                ))}
              </View>
            </FilterSection>

            <FilterSection title="🗓 Date de publication">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {POSTED_OPTIONS.map(p => (
                  <FilterChip
                    key={p.value}
                    label={p.label}
                    active={tempFilters.postedAfter === p.value}
                    onPress={() => setTempFilters(f => ({ ...f, postedAfter: f.postedAfter === p.value ? null : p.value }))}
                  />
                ))}
              </View>
            </FilterSection>

          </ScrollView>

          {/* Apply button */}
          <View style={{ padding: spacing.xl, paddingBottom: Platform.OS === 'ios' ? 32 : spacing.xl, borderTopWidth: 1, borderColor: colors.border }}>
            <TouchableOpacity
              onPress={applyFilters}
              style={{
                backgroundColor: colors.primary, borderRadius: radius.xl,
                paddingVertical: spacing.lg, alignItems: 'center',
                ...shadows.lg,
              }}
            >
              <Text style={{ color: colors.primaryForeground, fontSize: fontSize.base + 1, fontWeight: '800' }}>
                Voir les offres {countActiveFilters(tempFilters) > 0 ? `(${countActiveFilters(tempFilters)} filtre${countActiveFilters(tempFilters) > 1 ? 's' : ''})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Composants utilitaires ──────────────────────────────────────────────────

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.md }}>
      <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: colors.foreground }}>{title}</Text>
      {children}
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: spacing.lg, paddingVertical: 9, borderRadius: radius.full,
        backgroundColor: active ? colors.primary : colors.muted,
        borderWidth: 1.5,
        borderColor: active ? colors.primary : colors.border,
      }}
    >
      <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: active ? colors.primaryForeground : colors.foreground }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ActiveTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
      backgroundColor: colors.primaryLight, borderRadius: radius.full,
      paddingLeft: spacing.md, paddingRight: spacing.sm, paddingVertical: 5,
    }}>
      <Text style={{ fontSize: fontSize.xs + 1, color: colors.primary, fontWeight: '600' }}>{label}</Text>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
        <Ionicons name="close" size={13} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

function JobBadge({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <View style={{
      paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
      borderRadius: radius.full, backgroundColor: bg,
    }}>
      <Text style={{ fontSize: fontSize.xs, fontWeight: '600', color }}>{text}</Text>
    </View>
  );
}
