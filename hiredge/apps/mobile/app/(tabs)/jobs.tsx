import { View, Text, ScrollView, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Modal, Platform } from 'react-native';
import { useState, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';

// ─── Types des filtres ──────────────────────────────────────────────────────
interface Filters {
  contract: string | null;       // CDI, CDD, freelance, stage, alternance
  remote: string | null;         // remote, hybrid, onsite
  salaryMin: number | null;      // 0 = pas de min
  experienceLevel: string | null;
  postedAfter: string | null;    // today, week, month
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
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 10,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F1F3F5',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {/* Logo entreprise */}
        <View style={{
          width: 44, height: 44, borderRadius: 12,
          backgroundColor: '#6C5CE7' + '18',
          justifyContent: 'center', alignItems: 'center',
          marginRight: 12, flexShrink: 0,
        }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#6C5CE7' }}>
            {(item.company?.name ?? '?')[0].toUpperCase()}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1D2E' }} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={{ color: '#868E96', marginTop: 2, fontSize: 13, fontWeight: '500' }}>
            {item.company?.name}
          </Text>
        </View>

        {item.matchScore != null && (
          <View style={{
            minWidth: 44, height: 44, borderRadius: 12,
            justifyContent: 'center', alignItems: 'center',
            backgroundColor: getMatchColor(item.matchScore) + '15',
            marginLeft: 8, flexShrink: 0,
          }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: getMatchColor(item.matchScore) }}>
              {item.matchScore}%
            </Text>
          </View>
        )}
      </View>

      {/* Location */}
      {item.location && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 }}>
          <Ionicons name="location-outline" size={13} color="#ADB5BD" />
          <Text style={{ fontSize: 12, color: '#868E96' }}>{item.location}</Text>
        </View>
      )}

      {/* Badges */}
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
        {item.contractType && <JobBadge text={item.contractType} color="#6C5CE7" />}
        {item.remote && <JobBadge text="Remote" color="#00CEC9" />}
        {(item.salaryMin || item.salaryMax) && (
          <JobBadge
            text={formatSalaryShort(item.salaryMin, item.salaryMax, item.salaryCurrency)}
            color="#00B894"
          />
        )}
        {item.experienceLevel && <JobBadge text={formatLevel(item.experienceLevel)} color="#E17055" />}
      </View>

      <Text style={{ fontSize: 11, color: '#CED4DA', marginTop: 10 }}>
        {formatDate(item.postedAt)}
      </Text>
    </TouchableOpacity>
  ), []);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      {/* En-tête */}
      <View style={{
        backgroundColor: '#fff',
        paddingTop: 56,
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderColor: '#F1F3F5',
      }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#1A1D2E', marginBottom: 12 }}>Offres d'emploi</Text>

        {/* Barre de recherche + bouton filtre */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{
            flex: 1,
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: '#F1F3F5', borderRadius: 12, paddingHorizontal: 12,
          }}>
            <Ionicons name="search" size={17} color="#ADB5BD" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Poste, compétence, entreprise..."
              placeholderTextColor="#ADB5BD"
              style={{ flex: 1, paddingVertical: 11, paddingHorizontal: 8, fontSize: 14, color: '#2D3436' }}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={17} color="#ADB5BD" />
              </TouchableOpacity>
            )}
          </View>

          {/* Bouton filtres avec badge */}
          <TouchableOpacity
            onPress={openFilters}
            style={{
              width: 44, height: 44, borderRadius: 12,
              backgroundColor: activeCount > 0 ? '#6C5CE7' : '#F1F3F5',
              justifyContent: 'center', alignItems: 'center',
              position: 'relative',
            }}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={activeCount > 0 ? '#fff' : '#495057'}
            />
            {activeCount > 0 && (
              <View style={{
                position: 'absolute', top: -4, right: -4,
                width: 18, height: 18, borderRadius: 9,
                backgroundColor: '#FF7675',
                justifyContent: 'center', alignItems: 'center',
                borderWidth: 2, borderColor: '#fff',
              }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{activeCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Tags filtres actifs */}
        {activeCount > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 10 }}
            contentContainerStyle={{ gap: 6 }}
          >
            {filters.contract && <ActiveTag label={filters.contract} onRemove={() => setFilters(f => ({ ...f, contract: null }))} />}
            {filters.remote && <ActiveTag label={REMOTE_OPTIONS.find(r => r.value === filters.remote)?.label ?? filters.remote} onRemove={() => setFilters(f => ({ ...f, remote: null }))} />}
            {filters.salaryMin && <ActiveTag label={`${filters.salaryMin / 1000}k+`} onRemove={() => setFilters(f => ({ ...f, salaryMin: null }))} />}
            {filters.experienceLevel && <ActiveTag label={formatLevel(filters.experienceLevel)} onRemove={() => setFilters(f => ({ ...f, experienceLevel: null }))} />}
            {filters.postedAfter && <ActiveTag label={POSTED_OPTIONS.find(p => p.value === filters.postedAfter)?.label ?? ''} onRemove={() => setFilters(f => ({ ...f, postedAfter: null }))} />}
            {filters.location && <ActiveTag label={filters.location} onRemove={() => setFilters(f => ({ ...f, location: '' }))} />}
            <TouchableOpacity
              onPress={() => setFilters({ ...EMPTY_FILTERS })}
              style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: '#FFE5E5' }}
            >
              <Text style={{ fontSize: 12, color: '#FF7675', fontWeight: '700' }}>Tout effacer</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* Compteur résultats */}
      {!isLoading && (
        <Text style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, fontSize: 13, color: '#ADB5BD', fontWeight: '500' }}>
          {data?.pages[0]?.pagination?.total ?? jobs.length} offres trouvées
        </Text>
      )}

      {/* Liste des offres */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#6C5CE7" />
        </View>
      ) : (
        <FlatList
          data={jobs}
          renderItem={renderJob}
          keyExtractor={(item, index) => item?.id ?? String(index)}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 }}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage
              ? <ActivityIndicator color="#6C5CE7" style={{ padding: 16 }} />
              : null
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80 }}>
              <Ionicons name="briefcase-outline" size={52} color="#DEE2E6" />
              <Text style={{ color: '#ADB5BD', marginTop: 14, fontSize: 17, fontWeight: '600' }}>
                Aucune offre trouvée
              </Text>
              <Text style={{ color: '#CED4DA', marginTop: 6, fontSize: 13 }}>
                Essaie d'autres critères de recherche
              </Text>
            </View>
          }
        />
      )}

      {/* ── Panneau filtres ─────────────────────────────────────────────── */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          {/* Header modal */}
          <View style={{
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
            borderBottomWidth: 1, borderColor: '#F1F3F5',
          }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#1A1D2E' }}>Filtres</Text>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <TouchableOpacity onPress={resetFilters}>
                <Text style={{ fontSize: 14, color: '#ADB5BD', fontWeight: '600' }}>Réinitialiser</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F3F5', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="close" size={18} color="#495057" />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 24 }} showsVerticalScrollIndicator={false}>

            {/* Localisation */}
            <FilterSection title="📍 Localisation">
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: '#F8F9FA', borderRadius: 12,
                paddingHorizontal: 14, borderWidth: 1, borderColor: '#E9ECEF',
              }}>
                <Ionicons name="location-outline" size={16} color="#ADB5BD" />
                <TextInput
                  value={tempFilters.location}
                  onChangeText={v => setTempFilters(f => ({ ...f, location: v }))}
                  placeholder="Paris, Lyon, Montréal..."
                  placeholderTextColor="#ADB5BD"
                  style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 8, fontSize: 14, color: '#2D3436' }}
                />
                {tempFilters.location.length > 0 && (
                  <TouchableOpacity onPress={() => setTempFilters(f => ({ ...f, location: '' }))}>
                    <Ionicons name="close-circle" size={16} color="#ADB5BD" />
                  </TouchableOpacity>
                )}
              </View>
            </FilterSection>

            {/* Type de contrat */}
            <FilterSection title="📄 Type de contrat">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
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

            {/* Mode de travail */}
            <FilterSection title="🌐 Mode de travail">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
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

            {/* Salaire minimum */}
            <FilterSection title="💰 Salaire minimum">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
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

            {/* Niveau d'expérience */}
            <FilterSection title="📈 Niveau d'expérience">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
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

            {/* Date de publication */}
            <FilterSection title="🗓 Date de publication">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
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

          {/* Bouton Appliquer */}
          <View style={{ padding: 20, paddingBottom: Platform.OS === 'ios' ? 32 : 20, borderTopWidth: 1, borderColor: '#F1F3F5' }}>
            <TouchableOpacity
              onPress={applyFilters}
              style={{
                backgroundColor: '#6C5CE7', borderRadius: 16,
                paddingVertical: 16, alignItems: 'center',
                shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3, shadowRadius: 8,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
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
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: '#2D3436' }}>{title}</Text>
      {children}
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 16, paddingVertical: 9, borderRadius: 24,
        backgroundColor: active ? '#6C5CE7' : '#F8F9FA',
        borderWidth: 1.5,
        borderColor: active ? '#6C5CE7' : '#E9ECEF',
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : '#495057' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ActiveTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: '#F0EEFF', borderRadius: 20,
      paddingLeft: 10, paddingRight: 6, paddingVertical: 5,
    }}>
      <Text style={{ fontSize: 12, color: '#6C5CE7', fontWeight: '600' }}>{label}</Text>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
        <Ionicons name="close" size={13} color="#6C5CE7" />
      </TouchableOpacity>
    </View>
  );
}

function JobBadge({ text, color }: { text: string; color: string }) {
  return (
    <View style={{ backgroundColor: color + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color }}>{text}</Text>
    </View>
  );
}

function formatSalaryShort(min?: number, max?: number, currency?: string): string {
  const sym = (currency === 'CAD') ? 'CA$' : (currency === 'USD') ? '$' : '€';
  const fmt = (n: number) => `${Math.round(n / 1000)}k`;
  if (min && max) return `${sym}${fmt(min)}-${fmt(max)}`;
  if (min) return `${sym}${fmt(min)}+`;
  if (max) return `<${sym}${fmt(max)}`;
  return '';
}

function formatLevel(level: string): string {
  const map: Record<string, string> = {
    junior: 'Junior', mid: 'Confirmé', senior: 'Senior', lead: 'Lead',
  };
  return map[level?.toLowerCase()] ?? level;
}

function getMatchColor(score: number): string {
  if (score >= 80) return '#00B894';
  if (score >= 60) return '#6C5CE7';
  if (score >= 40) return '#FDCB6E';
  return '#FF7675';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} sem.`;
  return date.toLocaleDateString('fr-FR');
}
