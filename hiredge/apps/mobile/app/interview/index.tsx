import { View, Text, ScrollView, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';

const INTERVIEW_TYPES = [
  { key: 'RH', label: 'Entretien RH', icon: '👤', desc: 'Motivation, parcours, soft skills' },
  { key: 'TECHNICAL', label: 'Technique', icon: '💻', desc: 'Compétences techniques, problem solving' },
  { key: 'BEHAVIORAL', label: 'Comportemental', icon: '🎭', desc: 'Mise en situation, méthode STAR' },
  { key: 'CULTURE_FIT', label: 'Culture Fit', icon: '🏢', desc: 'Valeurs, vision, intégration' },
];

export default function InterviewScreen() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const queryClient = useQueryClient();

  const { data: history } = useQuery({
    queryKey: ['interviewHistory'],
    queryFn: async () => {
      const { data } = await api.get('/interviews/history');
      return data.data;
    },
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/interviews/start', {
        type: selectedType,
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

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F8F9FA' }} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#6C5CE7', paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20,
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 12 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>🎭 Simulation d'entretien</Text>
        <Text style={{ color: '#A29BFE', fontSize: 14, marginTop: 4 }}>
          Entraîne-toi avec un recruteur IA réaliste
        </Text>
      </View>

      {/* Type Selection */}
      <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#2D3436', marginBottom: 10 }}>
          Type d'entretien
        </Text>
        {INTERVIEW_TYPES.map((type) => (
          <TouchableOpacity
            key={type.key}
            onPress={() => setSelectedType(type.key)}
            style={{
              backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8,
              borderWidth: 2, borderColor: selectedType === type.key ? '#6C5CE7' : '#E9ECEF',
              flexDirection: 'row', alignItems: 'center', gap: 12,
            }}
          >
            <Text style={{ fontSize: 28 }}>{type.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#2D3436' }}>{type.label}</Text>
              <Text style={{ fontSize: 12, color: '#868E96', marginTop: 2 }}>{type.desc}</Text>
            </View>
            {selectedType === type.key && (
              <Ionicons name="checkmark-circle" size={22} color="#6C5CE7" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Optional Context */}
      <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#2D3436', marginBottom: 10 }}>
          Contexte (optionnel)
        </Text>
        <TextInput
          value={company}
          onChangeText={setCompany}
          placeholder="Nom de l'entreprise visée"
          placeholderTextColor="#ADB5BD"
          style={{
            backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 15, color: '#2D3436',
            borderWidth: 1, borderColor: '#E9ECEF', marginBottom: 8,
          }}
        />
        <TextInput
          value={jobTitle}
          onChangeText={setJobTitle}
          placeholder="Poste visé"
          placeholderTextColor="#ADB5BD"
          style={{
            backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 15, color: '#2D3436',
            borderWidth: 1, borderColor: '#E9ECEF',
          }}
        />
      </View>

      {/* Start Button */}
      <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
        <TouchableOpacity
          onPress={() => startMutation.mutate()}
          disabled={!selectedType || startMutation.isPending}
          style={{
            backgroundColor: selectedType ? '#6C5CE7' : '#CED4DA', borderRadius: 12, padding: 16,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
            {startMutation.isPending ? 'Préparation...' : '🎬 Lancer la simulation'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* History */}
      {history?.length > 0 && (
        <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#2D3436', marginBottom: 10 }}>
            Historique
          </Text>
          {history.map((sim: any) => (
            <TouchableOpacity
              key={sim.id}
              onPress={() => router.push(`/interview/${sim.id}`)}
              style={{
                backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
                borderWidth: 1, borderColor: '#E9ECEF',
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#2D3436' }}>
                  {sim.type} {sim.company ? `• ${sim.company}` : ''}
                </Text>
                <Text style={{ fontSize: 12, color: '#ADB5BD', marginTop: 2 }}>
                  {new Date(sim.createdAt).toLocaleDateString('fr-FR')}
                </Text>
              </View>
              {sim.overallScore != null && (
                <View style={{
                  backgroundColor: getScoreColor(sim.overallScore) + '15',
                  paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
                }}>
                  <Text style={{ fontWeight: '700', color: getScoreColor(sim.overallScore) }}>
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
  if (score >= 4) return '#00B894';
  if (score >= 3) return '#6C5CE7';
  if (score >= 2) return '#FDCB6E';
  return '#FF7675';
}
