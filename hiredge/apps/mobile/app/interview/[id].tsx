import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';

export default function InterviewSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const { data: simulation, isLoading, refetch } = useQuery({
    queryKey: ['simulation', id],
    queryFn: async () => {
      const { data } = await api.get(`/interviews/${id}`);
      return data.data;
    },
    enabled: !!id,
  });

  const respondMutation = useMutation({
    mutationFn: async (message: string) => {
      const { data } = await api.post(`/interviews/${id}/respond`, { message });
      return data.data;
    },
    onSuccess: () => refetch(),
  });

  const handleSend = () => {
    const text = input.trim();
    if (!text || respondMutation.isPending) return;
    setInput('');
    respondMutation.mutate(text);
  };

  useEffect(() => {
    if (simulation?.messages?.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [simulation?.messages?.length]);

  if (isLoading || !simulation) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' }}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={{ color: '#868E96', marginTop: 12 }}>Préparation de l'entretien...</Text>
      </View>
    );
  }

  const isFinished = simulation.status === 'COMPLETED';
  const character = simulation.character;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F8F9FA' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={{
        backgroundColor: '#2D3436', paddingTop: 50, paddingBottom: 14, paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center', gap: 12,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{
          width: 36, height: 36, borderRadius: 18, backgroundColor: '#636E72',
          justifyContent: 'center', alignItems: 'center',
        }}>
          <Text style={{ fontSize: 16 }}>🎭</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
            {character?.name ?? 'Recruteur'}
          </Text>
          <Text style={{ color: '#B2BEC3', fontSize: 11 }}>
            {character?.role ?? simulation.type} {simulation.company ? `• ${simulation.company}` : ''}
          </Text>
        </View>
        <View style={{
          backgroundColor: getPhaseColor(simulation.phase),
          paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
        }}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{simulation.phase}</Text>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={simulation.messages ?? []}
        keyExtractor={(item: any, idx: number) => item.id ?? String(idx)}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        renderItem={({ item }: { item: any }) => {
          const isUser = item.role === 'user';
          return (
            <View style={{
              alignSelf: isUser ? 'flex-end' : 'flex-start',
              maxWidth: '82%', marginBottom: 10,
            }}>
              <View style={{
                backgroundColor: isUser ? '#6C5CE7' : '#fff',
                borderRadius: 14,
                borderBottomRightRadius: isUser ? 4 : 14,
                borderBottomLeftRadius: isUser ? 14 : 4,
                paddingHorizontal: 14, paddingVertical: 10,
                ...(isUser ? {} : { borderWidth: 1, borderColor: '#E9ECEF' }),
              }}>
                <Text style={{ color: isUser ? '#fff' : '#2D3436', fontSize: 14, lineHeight: 21 }}>
                  {item.content}
                </Text>
              </View>
              {/* Real-time evaluation badge */}
              {item.evaluation && (
                <View style={{
                  flexDirection: 'row', gap: 4, marginTop: 4, justifyContent: isUser ? 'flex-end' : 'flex-start',
                }}>
                  <ScoreBadge label="Pertinence" score={item.evaluation.relevance} />
                  <ScoreBadge label="Profondeur" score={item.evaluation.depth} />
                  <ScoreBadge label="Structure" score={item.evaluation.structure} />
                </View>
              )}
            </View>
          );
        }}
      />

      {/* Typing */}
      {respondMutation.isPending && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
          <View style={{
            backgroundColor: '#fff', alignSelf: 'flex-start', borderRadius: 14, borderBottomLeftRadius: 4,
            paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#E9ECEF',
          }}>
            <Text style={{ color: '#ADB5BD', fontSize: 13 }}>Le recruteur réfléchit...</Text>
          </View>
        </View>
      )}

      {/* Debrief / Report */}
      {isFinished && simulation.analysis && (
        <View style={{
          margin: 16, backgroundColor: '#fff', borderRadius: 14, padding: 16,
          borderWidth: 1, borderColor: '#E9ECEF',
        }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#2D3436', marginBottom: 8 }}>
            📊 Rapport de simulation
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 }}>
            <ScoreCircle label="Global" score={simulation.analysis.overallScore} />
          </View>
          {simulation.analysis.strengths?.length > 0 && (
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontWeight: '600', color: '#00B894', marginBottom: 4 }}>✅ Points forts</Text>
              {simulation.analysis.strengths.map((s: string, i: number) => (
                <Text key={i} style={{ color: '#495057', fontSize: 13, marginLeft: 8 }}>• {s}</Text>
              ))}
            </View>
          )}
          {simulation.analysis.improvements?.length > 0 && (
            <View>
              <Text style={{ fontWeight: '600', color: '#FF7675', marginBottom: 4 }}>📌 À améliorer</Text>
              {simulation.analysis.improvements.map((s: string, i: number) => (
                <Text key={i} style={{ color: '#495057', fontSize: 13, marginLeft: 8 }}>• {s}</Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Input or Finished */}
      {isFinished ? (
        <View style={{ padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#E9ECEF' }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              backgroundColor: '#6C5CE7', borderRadius: 12, padding: 14, alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Retour aux simulations</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{
          flexDirection: 'row', alignItems: 'flex-end', padding: 12,
          backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#E9ECEF', gap: 8,
        }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Votre réponse..."
            placeholderTextColor="#ADB5BD"
            multiline
            style={{
              flex: 1, backgroundColor: '#F1F3F5', borderRadius: 20, paddingHorizontal: 16,
              paddingVertical: 10, fontSize: 15, maxHeight: 100, color: '#2D3436',
            }}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!input.trim() || respondMutation.isPending}
            style={{
              width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center',
              backgroundColor: input.trim() ? '#6C5CE7' : '#E9ECEF',
            }}
          >
            <Ionicons name="send" size={18} color={input.trim() ? '#fff' : '#ADB5BD'} />
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function ScoreBadge({ label, score }: { label: string; score: number }) {
  const color = score >= 4 ? '#00B894' : score >= 3 ? '#6C5CE7' : '#FF7675';
  return (
    <View style={{ backgroundColor: color + '15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
      <Text style={{ fontSize: 9, color, fontWeight: '600' }}>{label} {score}/5</Text>
    </View>
  );
}

function ScoreCircle({ label, score }: { label: string; score: number }) {
  const color = score >= 4 ? '#00B894' : score >= 3 ? '#6C5CE7' : '#FF7675';
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{
        width: 60, height: 60, borderRadius: 30, borderWidth: 3, borderColor: color,
        justifyContent: 'center', alignItems: 'center',
      }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color }}>{score}</Text>
        <Text style={{ fontSize: 8, color: '#ADB5BD' }}>/5</Text>
      </View>
      <Text style={{ fontSize: 11, color: '#868E96', marginTop: 4 }}>{label}</Text>
    </View>
  );
}

function getPhaseColor(phase: string): string {
  switch (phase) {
    case 'WARMUP': return '#00CEC9';
    case 'CORE': return '#6C5CE7';
    case 'WRAP_UP': return '#FDCB6E';
    case 'DEBRIEF': return '#00B894';
    default: return '#868E96';
  }
}
