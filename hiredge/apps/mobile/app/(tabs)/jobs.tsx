import { View, Text, ScrollView, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Modal, Platform } from 'react-native';
import { useState, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api, { jobsApi } from '../../lib/api';
import { colors } from '../../lib/theme';

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
  contract: null, remote: null, salaryMin: null, experienceLevel: null, postedAfter: null, location: '',
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
  return [f.contract, f.remote, f.salaryMin, f.experienceLevel, f.postedAfter, f.location || null].filter(Boolean).length;
}

function getMatchColor(s: number) { return s >= 90 ? colors.success : s >= 75 ? colors.primary : colors.warning; }
function getMatchBg(s: number) { return s >= 90 ? 'rgba(34,197,94,0.10)' : s >= 75 ? colors.primaryLight : 'rgba(245,158,11,0.10)'; }

function fmt$(n: number) { return n >= 1000 ? `${Math.round(n / 1000)}k` : String(n); }
function formatSalaryShort(min?: number, max?: number, cur?: string) {
  const u = cur === 'CAD' ? ' CA$' : '€';
  if (min && max) return `${fmt$(min)}-${fmt$(max)}${u}`;
  if (min) return `${fmt$(min)}+${u}`;
  if (max) return `≤${fmt$(max)}${u}`;
  return '';
}

function formatLevel(l: string) {
  return ({ junior: 'Junior', mid: 'Confirmé', senior: 'Senior', lead: 'Lead' } as any)[l] ?? l;
}

function formatDate(d: string) {
  if (!d) return '';
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (diff < 1) return "Aujourd'hui";
  if (diff === 1) return 'Hier';
  if (diff < 7) return `${diff}j`;
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// ─── Composant principal ─────────────────────────────────────────────────────
export default function JobsScreen() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [tempFilters, setTempFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const activeCount = countActiveFilters(filters);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['jobs', search, filters],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await jobsApi.search({
        q: search || undefined,
        contract: filters.contract || undefined,
        remote: (filters.remote as any) || undefined,
        salaryMin: filters.salaryMin || undefined,
        experienceLevel: filters.experienceLevel || undefined,
        postedAfter: filters.postedAfter ? postedAfterDate(filters.postedAfter) : undefined,
        location: filters.location || undefined,
        page: pageParam,
        limit: 20,
      });
      return data;
    },
    getNextPageParam: (lastPage: any) => {
      const p = lastPage.pagination;
      return p && p.page < p.totalPages ? p.page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const jobs = data?.pages.flatMap((p: any) => p.data ?? p.jobs ?? []).filter(Boolean) ?? [];

  const openFilters = () => { setTempFilters({ ...filters }); setShowFilters(true); };
  const applyFilters = () => { setFilters({ ...tempFilters }); setShowFilters(false); };
  const resetFilters = () => setTempFilters({ ...EMPTY_FILTERS });

  // ─── Rich Job Card ─────────────────────────────────────────
  const renderJob = useCallback(({ item, index }: { item: any; index: number }) => {
    const skills = (item.requiredSkills ?? item.skills ?? []).slice(0, 4);
    const salary = formatSalaryShort(item.salaryMin, item.salaryMax, item.salaryCurrency);
    const date = formatDate(item.postedAt);
    const isLast = index === jobs.length - 1;

    return (
      <TouchableOpacity
        onPress={() => router.push(`/job/${item.id}`)}
        activeOpacity={0.7}
        style={{
          paddingHorizontal: 20, paddingVertical: 18,
          borderBottomWidth: isLast ? 0 : 1, borderColor: colors.border,
        }}
      >
        {/* Row 1 : Company + Title + Match */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
          <View style={{
            width: 48, height: 48, borderRadius: 12,
            backgroundColor: colors.muted, justifyContent: 'center', alignItems: 'center',
          }}>
            <Ionicons name="business-outline" size={24} color={colors.mutedForeground} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground, lineHeight: 20 }} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 2, fontWeight: '500' }}>
              {item.company?.name}
            </Text>
          </View>
          {item.matchScore != null && (
            <View style={{
              paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
              backgroundColor: getMatchBg(item.matchScore),
            }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: getMatchColor(item.matchScore) }}>
                {item.matchScore}%
              </Text>
            </View>
          )}
        </View>

        {/* Row 2 : Meta chips */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, marginLeft: 58 }}>
          {item.location && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.muted, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Ionicons name="location-outline" size={11} color={colors.mutedForeground} />
              <Text style={{ fontSize: 11, color: colors.mutedForeground, fontWeight: '500' }}>{item.location}</Text>
            </View>
          )}
          {item.contractType && (
            <View style={{ backgroundColor: colors.primaryLight, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600' }}>{item.contractType}</Text>
            </View>
          )}
          {item.remote && (
            <View style={{ backgroundColor: 'rgba(14,165,233,0.10)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, color: '#0ea5e9', fontWeight: '600' }}>Remote</Text>
            </View>
          )}
          {salary !== '' && (
            <View style={{ backgroundColor: 'rgba(34,197,94,0.10)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, color: colors.success, fontWeight: '600' }}>{salary}</Text>
            </View>
          )}
          {item.experienceLevel && (
            <View style={{ backgroundColor: 'rgba(245,158,11,0.10)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, color: colors.warning, fontWeight: '600' }}>{formatLevel(item.experienceLevel)}</Text>
            </View>
          )}
        </View>

        {/* Row 3 : Skills tags */}
        {skills.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, marginLeft: 58 }}>
            {skills.map((s: string) => (
              <View key={s} style={{ backgroundColor: colors.muted, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, color: colors.foreground, fontWeight: '600' }}>{s}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Row 4 : Date + bookmark */}
        {date && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginLeft: 58 }}>
            <Text style={{ fontSize: 11, color: colors.border }}>{date}</Text>
            <Ionicons name="bookmark-outline" size={16} color={colors.border} />
          </View>
        )}
      </TouchableOpacity>
    );
  }, [jobs.length]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ─── Sticky Header ─── */}
      <View style={{ backgroundColor: colors.background, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 14 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: colors.foreground, marginBottom: 14 }}>
          Offres d'emploi
        </Text>

        {/* Search row */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{
            flex: 1, flexDirection: 'row', alignItems: 'center',
            backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 14,
            borderWidth: 1, borderColor: colors.border,
          }}>
            <Ionicons name="search" size={17} color={colors.mutedForeground} />
            <TextInput
              value={search} onChangeText={setSearch}
              placeholder="Poste, compétence, entreprise..."
              placeholderTextColor={colors.mutedForeground}
              style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 8, fontSize: 14, color: colors.foreground }}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={17} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={openFilters}
            style={{
              width: 48, height: 48, borderRadius: 12,
              backgroundColor: activeCount > 0 ? colors.primary : colors.card,
              borderWidth: activeCount > 0 ? 0 : 1, borderColor: colors.border,
              justifyContent: 'center', alignItems: 'center',
            }}
          >
            <Ionicons name="options-outline" size={20} color={activeCount > 0 ? '#fff' : colors.foreground} />
            {activeCount > 0 && (
              <View style={{
                position: 'absolute', top: -3, right: -3,
                width: 18, height: 18, borderRadius: 9,
                backgroundColor: colors.destructive, justifyContent: 'center', alignItems: 'center',
                borderWidth: 2, borderColor: colors.background,
              }}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{activeCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Active filter bar */}
        {activeCount > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ gap: 6 }}>
            {filters.contract && <ActiveTag label={filters.contract} onRemove={() => setFilters(f => ({ ...f, contract: null }))} />}
            {filters.remote && <ActiveTag label={REMOTE_OPTIONS.find(r => r.value === filters.remote)?.label ?? filters.remote} onRemove={() => setFilters(f => ({ ...f, remote: null }))} />}
            {filters.salaryMin && <ActiveTag label={`${filters.salaryMin / 1000}k+`} onRemove={() => setFilters(f => ({ ...f, salaryMin: null }))} />}
            {filters.experienceLevel && <ActiveTag label={formatLevel(filters.experienceLevel)} onRemove={() => setFilters(f => ({ ...f, experienceLevel: null }))} />}
            {filters.postedAfter && <ActiveTag label={POSTED_OPTIONS.find(p => p.value === filters.postedAfter)?.label ?? ''} onRemove={() => setFilters(f => ({ ...f, postedAfter: null }))} />}
            {filters.location && <ActiveTag label={filters.location} onRemove={() => setFilters(f => ({ ...f, location: '' }))} />}
            <TouchableOpacity onPress={() => setFilters({ ...EMPTY_FILTERS })} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(239,68,68,0.08)' }}>
              <Text style={{ fontSize: 12, color: colors.destructive, fontWeight: '700' }}>Tout effacer</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* Result count badge */}
      {!isLoading && (
        <View style={{ paddingHorizontal: 20, paddingBottom: 6 }}>
          <Text style={{ fontSize: 12, color: colors.mutedForeground, fontWeight: '500' }}>
            {data?.pages[0]?.pagination?.total ?? jobs.length} offres
          </Text>
        </View>
      )}

      {/* ─── Job list in single card container ─── */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={jobs}
          renderItem={renderJob}
          keyExtractor={(item, i) => item?.id ?? String(i)}
          contentContainerStyle={{ paddingBottom: 100 }}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={
            <View style={{
              marginHorizontal: 16, marginTop: 4,
              backgroundColor: colors.card, borderTopLeftRadius: 12, borderTopRightRadius: 12,
              borderWidth: 1, borderBottomWidth: 0, borderColor: colors.border,
              height: 0,
            }} />
          }
          CellRendererComponent={({ children, index, ...props }) => (
            <View
              {...props}
              style={{
                marginHorizontal: 16,
                backgroundColor: colors.card,
                borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border,
                ...(index === 0 ? { borderTopWidth: 1, borderTopLeftRadius: 12, borderTopRightRadius: 12 } : {}),
                ...(index === jobs.length - 1 ? { borderBottomWidth: 1, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 } : {}),
              }}
            >
              {children}
            </View>
          )}
          ListFooterComponent={
            isFetchingNextPage
              ? <ActivityIndicator color={colors.primary} style={{ padding: 20 }} />
              : null
          }
          ListEmptyComponent={
            <View style={{
              marginHorizontal: 16, backgroundColor: colors.card, borderRadius: 12,
              borderWidth: 1, borderColor: colors.border, padding: 48, alignItems: 'center',
            }}>
              <View style={{
                width: 56, height: 56, borderRadius: 16, backgroundColor: colors.muted,
                justifyContent: 'center', alignItems: 'center', marginBottom: 14,
              }}>
                <Ionicons name="briefcase-outline" size={24} color={colors.mutedForeground} />
              </View>
              <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700' }}>Aucune offre trouvée</Text>
              <Text style={{ color: colors.mutedForeground, marginTop: 6, fontSize: 13 }}>Essaie d'autres critères</Text>
            </View>
          }
        />
      )}

      {/* ─── Filter Modal ─── */}
      <Modal visible={showFilters} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowFilters(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16,
            borderBottomWidth: 1, borderColor: colors.border,
          }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}>Filtres</Text>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <TouchableOpacity onPress={resetFilters}>
                <Text style={{ fontSize: 14, color: colors.mutedForeground, fontWeight: '600' }}>Réinitialiser</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <View style={{ width: 32, height: 32, borderRadius: 999, backgroundColor: colors.muted, justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="close" size={18} color={colors.foreground} />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 28 }} showsVerticalScrollIndicator={false}>
            <FilterSection title="📍 Localisation">
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 14,
                borderWidth: 1, borderColor: colors.border,
              }}>
                <Ionicons name="location-outline" size={16} color={colors.mutedForeground} />
                <TextInput
                  value={tempFilters.location}
                  onChangeText={v => setTempFilters(f => ({ ...f, location: v }))}
                  placeholder="Paris, Lyon, Montréal..."
                  placeholderTextColor={colors.mutedForeground}
                  style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 8, fontSize: 14, color: colors.foreground }}
                />
              </View>
            </FilterSection>

            <FilterSection title="📄 Type de contrat">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {CONTRACT_OPTIONS.map(c => (
                  <FilterChip key={c} label={c} active={tempFilters.contract === c} onPress={() => setTempFilters(f => ({ ...f, contract: f.contract === c ? null : c }))} />
                ))}
              </View>
            </FilterSection>

            <FilterSection title="🌐 Mode de travail">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {REMOTE_OPTIONS.map(r => (
                  <FilterChip key={r.value} label={r.label} active={tempFilters.remote === r.value} onPress={() => setTempFilters(f => ({ ...f, remote: f.remote === r.value ? null : r.value }))} />
                ))}
              </View>
            </FilterSection>

            <FilterSection title="💰 Salaire minimum">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {SALARY_OPTIONS.map(s => (
                  <FilterChip key={s.value} label={s.label} active={tempFilters.salaryMin === s.value} onPress={() => setTempFilters(f => ({ ...f, salaryMin: f.salaryMin === s.value ? null : s.value }))} />
                ))}
              </View>
            </FilterSection>

            <FilterSection title="📈 Niveau d'expérience">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {LEVEL_OPTIONS.map(l => (
                  <FilterChip key={l.value} label={l.label} active={tempFilters.experienceLevel === l.value} onPress={() => setTempFilters(f => ({ ...f, experienceLevel: f.experienceLevel === l.value ? null : l.value }))} />
                ))}
              </View>
            </FilterSection>

            <FilterSection title="🗓 Date de publication">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {POSTED_OPTIONS.map(p => (
                  <FilterChip key={p.value} label={p.label} active={tempFilters.postedAfter === p.value} onPress={() => setTempFilters(f => ({ ...f, postedAfter: f.postedAfter === p.value ? null : p.value }))} />
                ))}
              </View>
            </FilterSection>
          </ScrollView>

          <View style={{ padding: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20, borderTopWidth: 1, borderColor: colors.border }}>
            <TouchableOpacity
              onPress={applyFilters}
              style={{ backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
                Voir les offres {countActiveFilters(tempFilters) > 0 ? `(${countActiveFilters(tempFilters)} filtre${countActiveFilters(tempFilters) > 1 ? 's' : ''})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>{title}</Text>
      {children}
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999,
        backgroundColor: active ? colors.primary : colors.card,
        borderWidth: 1, borderColor: active ? colors.primary : colors.border,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : colors.foreground }}>{label}</Text>
    </TouchableOpacity>
  );
}

function ActiveTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: colors.primaryLight, borderRadius: 999,
      paddingLeft: 10, paddingRight: 6, paddingVertical: 5,
    }}>
      <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>{label}</Text>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
        <Ionicons name="close" size={12} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}
