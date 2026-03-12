import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon', APPLIED: 'Envoyée', VIEWED: 'Consultée',
  INTERVIEW_SCHEDULED: 'Entretien programmé', OFFERED: 'Offre reçue',
  REJECTED: 'Refusée', ACCEPTED: 'Acceptée',
};
const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#ADB5BD', APPLIED: '#6C5CE7', VIEWED: '#00CEC9',
  INTERVIEW_SCHEDULED: '#FDCB6E', OFFERED: '#00B894', REJECTED: '#FF7675', ACCEPTED: '#00B894',
};
const TIMELINE_ORDER = ['DRAFT', 'APPLIED', 'VIEWED', 'INTERVIEW_SCHEDULED', 'OFFERED', 'ACCEPTED'];

export default function ApplicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: application, isLoading } = useQuery({
    queryKey: ['application', id],
    queryFn: async () => {
      const { data } = await api.get(`/applications/${id}`);
      return data.data;
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: () => api.patch(`/applications/${id}`, { status: 'REJECTED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#6C5CE7" size="large" />
      </View>
    );
  }

  if (!application) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#ADB5BD' }}>Candidature introuvable</Text>
      </View>
    );
  }

  const job = application.job;
  const currentIdx = TIMELINE_ORDER.indexOf(application.status);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#6C5CE7', paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20,
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>{job?.title ?? 'Poste'}</Text>
        <Text style={{ color: '#A29BFE', fontSize: 14, marginTop: 4 }}>{job?.company?.name ?? 'Entreprise'}</Text>
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
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#2D3436', marginBottom: 16 }}>Progression</Text>
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
                    backgroundColor: isRejected && isCurrent ? '#FF7675' : isReached ? '#6C5CE7' : '#DEE2E6',
                    borderWidth: isCurrent ? 3 : 0, borderColor: isRejected ? '#FF767540' : '#6C5CE740',
                  }} />
                  {idx < TIMELINE_ORDER.length - 1 && (
                    <View style={{
                      width: 2, height: 28,
                      backgroundColor: isReached && idx < currentIdx ? '#6C5CE7' : '#DEE2E6',
                    }} />
                  )}
                </View>
                {/* Label */}
                <Text style={{
                  marginLeft: 10, fontSize: 13, marginTop: -2,
                  fontWeight: isCurrent ? '700' : '400',
                  color: isReached ? '#2D3436' : '#ADB5BD',
                }}>
                  {STATUS_LABELS[step]}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Dates */}
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#2D3436', marginBottom: 12 }}>Dates</Text>
          <InfoRow icon="calendar-outline" label="Postulé le" value={formatDate(application.createdAt)} />
          {application.updatedAt !== application.createdAt && (
            <InfoRow icon="refresh-outline" label="Dernière maj" value={formatDate(application.updatedAt)} />
          )}
        </View>

        {/* Job Info */}
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#2D3436', marginBottom: 12 }}>L'offre</Text>
          {job?.location && <InfoRow icon="location-outline" label="Lieu" value={job.location} />}
          {job?.contractType && <InfoRow icon="document-text-outline" label="Contrat" value={job.contractType} />}
          {job?.salaryMin && (
            <InfoRow icon="cash-outline" label="Salaire"
              value={`${job.salaryMin.toLocaleString()}€ - ${job.salaryMax?.toLocaleString() ?? '?'}€`} />
          )}
          <TouchableOpacity
            onPress={() => router.push(`/job/${job?.id}`)}
            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}
          >
            <Text style={{ color: '#6C5CE7', fontWeight: '600', fontSize: 13 }}>Voir l'offre complète</Text>
            <Ionicons name="chevron-forward" size={14} color="#6C5CE7" />
          </TouchableOpacity>
        </View>

        {/* Cover Letter */}
        {application.coverLetter && (
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#2D3436', marginBottom: 8 }}>Lettre de motivation</Text>
            <Text style={{ fontSize: 13, color: '#495057', lineHeight: 20 }} numberOfLines={6}>
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
            <Text style={{ color: '#FF7675', fontWeight: '600' }}>Retirer ma candidature</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
      <Ionicons name={icon as any} size={16} color="#868E96" />
      <Text style={{ marginLeft: 8, fontSize: 12, color: '#868E96', width: 90 }}>{label}</Text>
      <Text style={{ fontSize: 13, color: '#2D3436', fontWeight: '500', flex: 1 }}>{value}</Text>
    </View>
  );
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}
