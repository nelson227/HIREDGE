import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { interviewsApi } from '../../lib/api';
import { colors } from '../../lib/theme';

const INTERVIEW_TYPES = [
  { key: 'RH', label: 'Entretien RH', icon: '👤', desc: 'Motivation, parcours, soft skills' },
  { key: 'TECHNICAL', label: 'Technique', icon: '💻', desc: 'Compétences techniques, problem solving' },
  { key: 'BEHAVIORAL', label: 'Comportemental', icon: '🎭', desc: 'Mise en situation, méthode STAR' },
  { key: 'CULTURE_FIT', label: 'Culture Fit', icon: '🏢', desc: 'Valeurs, vision, intégration' },
];

const TIPS = [
  { icon: 'star-outline', text: 'Utilise la méthode STAR : Situation, Tâche, Action, Résultat' },
  { icon: 'documents-outline', text: 'Prépare 3-5 exemples concrets de tes réalisations' },
  { icon: 'business-outline', text: 'Renseigne-toi sur l\'entreprise avant l\'entretien' },
  { icon: 'time-outline', text: 'Sois concis : 1-2 minutes par réponse max' },
];

export default function InterviewScreen() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const queryClient = useQueryClient();

  const { data: history } = useQuery({
    queryKey: ['interviewHistory'],
    queryFn: async () => {
      try { const { data } = await interviewsApi.getHistory(); return data.data ?? []; }
      catch { return []; }
    },
  });

  const { data: upcoming } = useQuery({
    queryKey: ['upcomingInterviews'],
    queryFn: async () => {
      try { const { data } = await interviewsApi.list({ status: 'upcoming' }); return data.data ?? []; }
      catch { return []; }
    },
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      const { data } = await interviewsApi.start({
        type: selectedType!,
        company: company || undefined,
        jobTitle: jobTitle || undefined,
      });
      return data.data;
    },
    onSuccess: (sim) => {
      queryClient.invalidateQueries({ queryKey: ['interviewHistory'] });
      router.push(`/interview/${sim.id}`);
    },
  });

  // Compute average score from history
  const completedSessions = (history ?? []).filter((s: any) => s.overallScore != null);
  const avgScore = completedSessions.length > 0
    ? +(completedSessions.reduce((sum: number, s: any) => sum + s.overallScore, 0) / completedSessions.length).toFixed(1)
    : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Header */}
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 12 }}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={{ fontSize: 22, fontWeight: '700', color: colors.foreground }}>Simulation d'entretien</Text>
        <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 4 }}>
          Entraîne-toi avec un recruteur IA réaliste
        </Text>
      </View>

      {/* Performance Overview */}
      {(completedSessions.length > 0 || (upcoming?.length ?? 0) > 0) && (
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {avgScore != null && (
              <View style={{
                flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 16,
                borderWidth: 1, borderColor: colors.border, alignItems: 'center',
              }}>
                <Text style={{ fontSize: 28, fontWeight: '800', color: getScoreColor(avgScore) }}>{avgScore}</Text>
                <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>Score moyen</Text>
                <Text style={{ fontSize: 10, color: colors.border }}>{completedSessions.length} session{completedSessions.length > 1 ? 's' : ''}</Text>
              </View>
            )}
            {(upcoming?.length ?? 0) > 0 && (
              <View style={{
                flex: 1, backgroundColor: colors.primaryLight, borderRadius: 14, padding: 16,
                borderWidth: 1, borderColor: colors.primaryMedium,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Ionicons name="calendar" size={14} color={colors.primary} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>À venir</Text>
                </View>
                {upcoming!.slice(0, 2).map((int: any) => (
                  <View key={int.id} style={{ marginBottom: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: colors.foreground }} numberOfLines={1}>
                      {int.type ?? 'Entretien'} {int.company ? `· ${int.company}` : ''}
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.mutedForeground }}>
                      {int.scheduledAt ? new Date(int.scheduledAt).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      )}

      {/* Type Selection */}
      <View style={{ paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, marginBottom: 10 }}>
          Type d'entretien
        </Text>
        {INTERVIEW_TYPES.map((type) => (
          <TouchableOpacity
            key={type.key}
            onPress={() => setSelectedType(type.key)}
            style={{
              backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 8,
              borderWidth: 2, borderColor: selectedType === type.key ? colors.primary : colors.border,
              flexDirection: 'row', alignItems: 'center', gap: 12,
            }}
          >
            <Text style={{ fontSize: 26 }}>{type.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>{type.label}</Text>
              <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 1 }}>{type.desc}</Text>
            </View>
            {selectedType === type.key && (
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Optional Context */}
      <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, marginBottom: 10 }}>
          Contexte (optionnel)
        </Text>
        <TextInput
          value={company} onChangeText={setCompany}
          placeholder="Nom de l'entreprise visée"
          placeholderTextColor={colors.mutedForeground}
          style={{
            backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 14, color: colors.foreground,
            borderWidth: 1, borderColor: colors.border, marginBottom: 8,
          }}
        />
        <TextInput
          value={jobTitle} onChangeText={setJobTitle}
          placeholder="Poste visé"
          placeholderTextColor={colors.mutedForeground}
          style={{
            backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 14, color: colors.foreground,
            borderWidth: 1, borderColor: colors.border,
          }}
        />
      </View>

      {/* Start Button */}
      <View style={{ paddingHorizontal: 16, marginTop: 18 }}>
        <TouchableOpacity
          onPress={() => startMutation.mutate()}
          disabled={!selectedType || startMutation.isPending}
          style={{
            backgroundColor: selectedType ? colors.primary : colors.border, borderRadius: 12, padding: 16,
            alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
          }}
        >
          {startMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="play" size={18} color="#fff" />
          )}
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
            {startMutation.isPending ? 'Préparation...' : 'Lancer la simulation'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tips */}
      <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, marginBottom: 10 }}>
          Conseils de préparation
        </Text>
        <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
          {TIPS.map((tip, i) => (
            <View key={i} style={{
              flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14,
              borderBottomWidth: i < TIPS.length - 1 ? 1 : 0, borderColor: colors.border,
            }}>
              <Ionicons name={tip.icon as any} size={16} color={colors.primary} style={{ marginTop: 1 }} />
              <Text style={{ fontSize: 12, color: colors.mutedForeground, flex: 1, lineHeight: 17 }}>{tip.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* History */}
      {(history?.length ?? 0) > 0 && (
        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, marginBottom: 10 }}>
            Historique des simulations
          </Text>
          {history!.map((sim: any) => (
            <TouchableOpacity
              key={sim.id}
              onPress={() => router.push(`/interview/${sim.id}`)}
              style={{
                backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 8,
                borderWidth: 1, borderColor: colors.border,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>
                  {sim.type} {sim.company ? `· ${sim.company}` : ''}
                </Text>
                <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>
                  {new Date(sim.createdAt).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                </Text>
              </View>
              {sim.overallScore != null && (
                <View style={{
                  backgroundColor: getScoreColor(sim.overallScore) + '15',
                  paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
                }}>
                  <Text style={{ fontWeight: '700', fontSize: 13, color: getScoreColor(sim.overallScore) }}>
                    {sim.overallScore}/5
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function getScoreColor(score: number): string {
  if (score >= 4) return '#22C55E';
  if (score >= 3) return '#6C5CE7';
  if (score >= 2) return '#EAB308';
  return '#EF4444';
}
