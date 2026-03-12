import { View, Text, ScrollView, TextInput, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useState, useCallback } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';

const CONTRACT_FILTERS = ['Tous', 'CDI', 'CDD', 'freelance', 'stage', 'alternance'];

export default function JobsScreen() {
  const [search, setSearch] = useState('');
  const [selectedContract, setSelectedContract] = useState('Tous');
  const [remoteOnly, setRemoteOnly] = useState(false);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['jobs', search, selectedContract, remoteOnly],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      if (search) params.set('keyword', search);
      if (selectedContract !== 'Tous') params.set('contractType', selectedContract);
      if (remoteOnly) params.set('remote', 'true');
      params.set('page', String(pageParam));
      params.set('limit', '20');
      const { data } = await api.get(`/jobs/search?${params}`);
      return data; // { success, data: jobs[], pagination }
    },
    getNextPageParam: (lastPage: any) => {
      const pagination = lastPage.pagination;
      if (!pagination) return undefined;
      if (pagination.page < pagination.totalPages) return pagination.page + 1;
      return undefined;
    },
    initialPageParam: 1,
  });

  const jobs = data?.pages.flatMap((p: any) => p.data ?? p.jobs ?? []).filter(Boolean) ?? [];

  const renderJob = useCallback(({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => router.push(`/job/${item.id}`)}
      style={{
        backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 12,
        padding: 16, borderWidth: 1, borderColor: '#E9ECEF',
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#2D3436' }} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={{ color: '#868E96', marginTop: 2, fontSize: 14 }}>{item.company?.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <Ionicons name="location-outline" size={14} color="#868E96" />
            <Text style={{ fontSize: 13, color: '#495057' }}>{item.location}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <Badge text={item.contractType} color="#6C5CE7" />
            {item.remote && <Badge text="Remote" color="#00CEC9" />}
            {item.salaryMin && (
              <Badge text={`${item.salaryMin / 1000}k - ${item.salaryMax / 1000}k €`} color="#00B894" />
            )}
          </View>
        </View>
        {item.matchScore != null && (
          <View style={{
            width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center',
            backgroundColor: getMatchColor(item.matchScore) + '15',
          }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: getMatchColor(item.matchScore) }}>
              {item.matchScore}%
            </Text>
          </View>
        )}
      </View>
      <Text style={{ fontSize: 12, color: '#ADB5BD', marginTop: 8 }}>
        {formatDate(item.postedAt)}
      </Text>
    </TouchableOpacity>
  ), []);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      {/* Search Bar */}
      <View style={{ backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderColor: '#E9ECEF' }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F3F5',
          borderRadius: 10, paddingHorizontal: 12,
        }}>
          <Ionicons name="search" size={18} color="#868E96" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher un poste, mot-clé..."
            placeholderTextColor="#ADB5BD"
            style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 8, fontSize: 15, color: '#2D3436' }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#ADB5BD" />
            </TouchableOpacity>
          )}
        </View>

        {/* Contract Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 10 }}
          contentContainerStyle={{ gap: 6 }}
        >
          {CONTRACT_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter}
              onPress={() => setSelectedContract(filter)}
              style={{
                paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
                backgroundColor: selectedContract === filter ? '#6C5CE7' : '#F1F3F5',
              }}
            >
              <Text style={{
                fontSize: 13, fontWeight: '600',
                color: selectedContract === filter ? '#fff' : '#495057',
              }}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => setRemoteOnly(!remoteOnly)}
            style={{
              paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
              backgroundColor: remoteOnly ? '#00CEC9' : '#F1F3F5',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: remoteOnly ? '#fff' : '#495057' }}>
              🏠 Remote
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Job List */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#6C5CE7" />
        </View>
      ) : (
        <FlatList
          data={jobs}
          renderItem={renderJob}
          keyExtractor={(item, index) => item?.id ?? String(index)}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.3}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color="#6C5CE7" style={{ padding: 16 }} /> : null}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Ionicons name="briefcase-outline" size={48} color="#DEE2E6" />
              <Text style={{ color: '#ADB5BD', marginTop: 12, fontSize: 16 }}>
                Aucune offre trouvée
              </Text>
              <Text style={{ color: '#CED4DA', marginTop: 4, fontSize: 13 }}>
                Essaie d'autres critères de recherche
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <View style={{ backgroundColor: color + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color }}>{text}</Text>
    </View>
  );
}

function getMatchColor(score: number): string {
  if (score >= 80) return '#00B894';
  if (score >= 60) return '#6C5CE7';
  if (score >= 40) return '#FDCB6E';
  return '#FF7675';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`;
  return date.toLocaleDateString('fr-FR');
}
