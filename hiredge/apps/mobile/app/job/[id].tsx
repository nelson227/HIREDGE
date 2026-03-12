import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: async () => {
      const { data } = await api.get(`/jobs/${id}`);
      return data.data;
    },
    enabled: !!id,
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      await api.post('/applications', { jobId: id });
    },
    onSuccess: () => {
      router.push('/(tabs)');
    },
  });

  if (isLoading || !job) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' }}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={{
          backgroundColor: '#6C5CE7', paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20,
          borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
        }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>{job.title}</Text>
          <Text style={{ color: '#A29BFE', fontSize: 16, marginTop: 4 }}>{job.company?.name}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <Tag icon="location-outline" text={job.location} />
            <Tag icon="document-text-outline" text={job.contractType} />
            {job.remote && <Tag icon="globe-outline" text="Remote" />}
            {job.experienceLevel && <Tag icon="trending-up-outline" text={job.experienceLevel} />}
          </View>
        </View>

        {/* Match Score */}
        {job.matchScore != null && (
          <View style={{
            marginHorizontal: 16, marginTop: -16, backgroundColor: '#fff', borderRadius: 12,
            padding: 16, borderWidth: 1, borderColor: '#E9ECEF',
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#2D3436' }}>Score de compatibilité</Text>
              <Text style={{ fontSize: 12, color: '#868E96', marginTop: 2 }}>Basé sur ton profil</Text>
            </View>
            <View style={{
              width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center',
              backgroundColor: getMatchColor(job.matchScore) + '15',
            }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: getMatchColor(job.matchScore) }}>
                {job.matchScore}%
              </Text>
            </View>
          </View>
        )}

        {/* Salary */}
        {(job.salaryMin || job.salaryMax) && (
          <View style={{
            marginHorizontal: 16, marginTop: 12, backgroundColor: '#E8FAF9', borderRadius: 12,
            padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10,
          }}>
            <Ionicons name="cash-outline" size={22} color="#00B894" />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#00B894' }}>
              {job.salaryMin ? `${(job.salaryMin / 1000).toFixed(0)}k` : '?'} - {job.salaryMax ? `${(job.salaryMax / 1000).toFixed(0)}k` : '?'} €/an
            </Text>
          </View>
        )}

        {/* Description */}
        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <SectionTitle title="Description du poste" />
          <Text style={{ color: '#495057', fontSize: 14, lineHeight: 22 }}>{job.description}</Text>
        </View>

        {/* Required Skills */}
        {job.requiredSkills?.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
            <SectionTitle title="Compétences requises" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {job.requiredSkills.map((skill: string, i: number) => (
                <View key={i} style={{
                  backgroundColor: '#F0EEFF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
                }}>
                  <Text style={{ fontSize: 13, color: '#6C5CE7', fontWeight: '500' }}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Company Info */}
        {job.company && (
          <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
            <SectionTitle title="À propos de l'entreprise" />
            <View style={{
              backgroundColor: '#fff', borderRadius: 12, padding: 16,
              borderWidth: 1, borderColor: '#E9ECEF',
            }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#2D3436' }}>{job.company.name}</Text>
              {job.company.industry && (
                <Text style={{ color: '#868E96', fontSize: 13, marginTop: 2 }}>{job.company.industry}</Text>
              )}
              {job.company.size && (
                <Text style={{ color: '#868E96', fontSize: 13, marginTop: 2 }}>
                  {job.company.size} employés
                </Text>
              )}
              {job.company.description && (
                <Text style={{ color: '#495057', fontSize: 13, marginTop: 8, lineHeight: 20 }}>
                  {job.company.description}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Posted date */}
        <Text style={{ paddingHorizontal: 16, color: '#ADB5BD', fontSize: 12, marginTop: 20 }}>
          Publiée le {new Date(job.postedAt).toLocaleDateString('fr-FR')} • Source : {job.source}
        </Text>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderColor: '#E9ECEF',
        flexDirection: 'row', gap: 12,
      }}>
        <TouchableOpacity
          onPress={() => {/* save */}}
          style={{
            width: 50, height: 50, borderRadius: 12, borderWidth: 1, borderColor: '#E9ECEF',
            justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff',
          }}
        >
          <Ionicons name="bookmark-outline" size={22} color="#6C5CE7" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => applyMutation.mutate()}
          disabled={applyMutation.isPending}
          style={{
            flex: 1, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
            backgroundColor: '#6C5CE7',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
            {applyMutation.isPending ? 'Envoi...' : '📨 Postuler avec EDGE'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={{ fontSize: 16, fontWeight: '700', color: '#2D3436', marginBottom: 10 }}>{title}</Text>;
}

function Tag({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFFFF20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
      <Ionicons name={icon as any} size={14} color="#fff" />
      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '500' }}>{text}</Text>
    </View>
  );
}

function getMatchColor(score: number): string {
  if (score >= 80) return '#00B894';
  if (score >= 60) return '#6C5CE7';
  if (score >= 40) return '#FDCB6E';
  return '#FF7675';
}
