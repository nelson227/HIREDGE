import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import api, { jobsApi, applicationsApi } from '../../lib/api';

// Nettoie les descriptions avec patterns anti-spam (RemoteOK, etc.)
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

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: async () => {
      const { data } = await jobsApi.getById(id!);
      return data.data;
    },
    enabled: !!id,
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      await applicationsApi.create({ jobId: id! });
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

  const description = cleanDescription(job.description ?? '');
  const salaryLabel = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={{
          backgroundColor: '#6C5CE7',
          paddingTop: 56,
          paddingBottom: 28,
          paddingHorizontal: 20,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
        }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: '#FFFFFF20', justifyContent: 'center', alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Titre + entreprise */}
          <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', lineHeight: 30 }}>
            {job.title}
          </Text>
          <Text style={{ color: '#C9C3FF', fontSize: 16, marginTop: 6, fontWeight: '500' }}>
            {job.company?.name}
          </Text>

          {/* Badges infos */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            {job.location && (
              <InfoBadge icon="location-outline" text={job.location} />
            )}
            {job.contractType && (
              <InfoBadge icon="document-text-outline" text={job.contractType} />
            )}
            {job.remote && (
              <InfoBadge icon="globe-outline" text="Remote" />
            )}
          </View>
        </View>

        {/* Grille de détails (style Sorce) */}
        <View style={{
          marginHorizontal: 16,
          marginTop: 16,
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 10,
        }}>
          {salaryLabel && (
            <DetailChip icon="cash-outline" text={salaryLabel} color="#00B894" bg="#E6FAF5" />
          )}
          {job.remote !== undefined && (
            <DetailChip
              icon={job.remote ? 'globe-outline' : 'business-outline'}
              text={job.remote ? 'Remote' : 'Présentiel'}
              color="#6C5CE7"
              bg="#F0EEFF"
            />
          )}
          {job.contractType && (
            <DetailChip icon="briefcase-outline" text={job.contractType} color="#2D3436" bg="#F1F3F5" />
          )}
          {job.experienceLevel && (
            <DetailChip icon="trending-up-outline" text={formatLevel(job.experienceLevel)} color="#E17055" bg="#FFF0EC" />
          )}
        </View>

        {/* Score de matching */}
        {job.matchScore != null && (
          <View style={{
            marginHorizontal: 16, marginTop: 12,
            backgroundColor: '#fff', borderRadius: 16,
            padding: 16, borderWidth: 1, borderColor: '#E9ECEF',
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#2D3436' }}>Compatibilité avec ton profil</Text>
              <Text style={{ fontSize: 12, color: '#868E96', marginTop: 2 }}>Calculé à partir de tes compétences</Text>
            </View>
            <View style={{
              width: 58, height: 58, borderRadius: 29,
              justifyContent: 'center', alignItems: 'center',
              backgroundColor: getMatchColor(job.matchScore) + '18',
              borderWidth: 2,
              borderColor: getMatchColor(job.matchScore) + '40',
            }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: getMatchColor(job.matchScore) }}>
                {job.matchScore}%
              </Text>
            </View>
          </View>
        )}

        {/* Description */}
        {description.length > 0 && (
          <Section title="Description du poste">
            <Text style={{ color: '#495057', fontSize: 14, lineHeight: 24 }}>{description}</Text>
          </Section>
        )}

        {/* Compétences requises */}
        {job.requiredSkills?.length > 0 && (
          <Section title="Compétences requises">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {job.requiredSkills.map((skill: string, i: number) => (
                <View key={i} style={{
                  backgroundColor: '#F0EEFF',
                  paddingHorizontal: 12, paddingVertical: 6,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: '#DDD6FE',
                }}>
                  <Text style={{ fontSize: 13, color: '#6C5CE7', fontWeight: '600' }}>{skill}</Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {/* Compétences souhaitées */}
        {job.niceToHave?.length > 0 && (
          <Section title="Un plus si tu as...">
            <View style={{ gap: 8 }}>
              {job.niceToHave.map((item: string, i: number) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#00B894" style={{ marginTop: 2 }} />
                  <Text style={{ flex: 1, fontSize: 14, color: '#495057', lineHeight: 20 }}>{item}</Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {/* Avantages */}
        {job.benefits?.length > 0 && (
          <Section title="Avantages">
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

        {/* Entreprise */}
        {job.company && (
          <Section title="À propos de l'entreprise">
            <View style={{
              backgroundColor: '#fff', borderRadius: 16, padding: 16,
              borderWidth: 1, borderColor: '#E9ECEF',
              flexDirection: 'row', alignItems: 'flex-start', gap: 14,
            }}>
              <View style={{
                width: 48, height: 48, borderRadius: 12,
                backgroundColor: '#6C5CE7' + '18',
                justifyContent: 'center', alignItems: 'center',
              }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#6C5CE7' }}>
                  {(job.company.name ?? '?')[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#2D3436' }}>{job.company.name}</Text>
                {job.company.industry && (
                  <Text style={{ color: '#868E96', fontSize: 13, marginTop: 2 }}>{job.company.industry}</Text>
                )}
                {job.company.size && (
                  <Text style={{ color: '#ADB5BD', fontSize: 12, marginTop: 4 }}>
                    {job.company.size} collaborateurs
                  </Text>
                )}
                {job.company.description && (
                  <Text style={{ color: '#495057', fontSize: 13, marginTop: 8, lineHeight: 20 }}>
                    {job.company.description}
                  </Text>
                )}
              </View>
            </View>
          </Section>
        )}

        {/* Footer meta */}
        <Text style={{ paddingHorizontal: 20, color: '#ADB5BD', fontSize: 12, marginTop: 12, marginBottom: 8 }}>
          Publiée le {new Date(job.postedAt).toLocaleDateString('fr-FR')} • Source : {job.source}
        </Text>
      </ScrollView>

      {/* CTA bas de page */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff',
        padding: 16,
        paddingBottom: 24,
        borderTopWidth: 1,
        borderColor: '#F1F3F5',
        flexDirection: 'row',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      }}>
        <TouchableOpacity
          style={{
            width: 52, height: 52, borderRadius: 14,
            borderWidth: 1.5, borderColor: '#E9ECEF',
            justifyContent: 'center', alignItems: 'center',
            backgroundColor: '#fff',
          }}
        >
          <Ionicons name="bookmark-outline" size={22} color="#6C5CE7" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => applyMutation.mutate()}
          disabled={applyMutation.isPending}
          style={{
            flex: 1, height: 52, borderRadius: 14,
            justifyContent: 'center', alignItems: 'center',
            backgroundColor: '#6C5CE7',
            shadowColor: '#6C5CE7',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 8,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
            {applyMutation.isPending ? 'Envoi...' : '✦  Postuler avec EDGE'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
      <Text style={{ fontSize: 16, fontWeight: '800', color: '#2D3436', marginBottom: 12 }}>{title}</Text>
      <View style={{
        borderTopWidth: 1,
        borderTopColor: '#F1F3F5',
        paddingTop: 12,
      }}>
        {children}
      </View>
    </View>
  );
}

function InfoBadge({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: '#FFFFFF25',
      borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
      borderWidth: 1, borderColor: '#FFFFFF30',
    }}>
      <Ionicons name={icon as any} size={13} color="#fff" />
      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}

function DetailChip({ icon, text, color, bg }: { icon: string; text: string; color: string; bg: string }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: bg, borderRadius: 20,
      paddingHorizontal: 12, paddingVertical: 8,
    }}>
      <Ionicons name={icon as any} size={15} color={color} />
      <Text style={{ fontSize: 13, fontWeight: '600', color }}>{text}</Text>
    </View>
  );
}

function formatSalary(min?: number, max?: number, currency?: string): string {
  if (!min && !max) return '';
  const cur = currency ?? 'EUR';
  const symbol = cur === 'CAD' ? 'CA$' : cur === 'USD' ? '$' : '€';
  const fmt = (n: number) => n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
  if (min && max) return `${symbol}${fmt(min)} - ${fmt(max)}`;
  if (min) return `${symbol}${fmt(min)}+`;
  if (max) return `jusqu'à ${symbol}${fmt(max)}`;
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
