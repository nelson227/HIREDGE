import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { interviewsApi } from '../../lib/api';
import { useThemeColors } from '../../lib/theme';
import { useTranslation } from '../../lib/i18n';

export default function InterviewSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const { colors } = useThemeColors();
  const { t } = useTranslation();

  const { data: simulation, isLoading, refetch } = useQuery({
    queryKey: ['simulation', id],
    queryFn: async () => {
      const { data } = await interviewsApi.getById(id!);
      return data.data;
    },
    enabled: !!id,
  });

  const respondMutation = useMutation({
    mutationFn: async (message: string) => {
      const { data } = await interviewsApi.respond(id!, message);
      return data.data;
    },
    onSuccess: () => refetch(),
  });

  const endMutation = useMutation({
    mutationFn: async () => {
      const { data } = await interviewsApi.end(id!);
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

  const handleEnd = () => {
    Alert.alert(t('interviewEndTitle'), t('interviewEndConfirm'), [
      { text: t('interviewEndCancel'), style: 'cancel' },
      { text: t('interviewEndConfirmBtn'), style: 'destructive', onPress: () => endMutation.mutate() },
    ]);
  };

  useEffect(() => {
    if (simulation?.messages?.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [simulation?.messages?.length]);

  if (isLoading || !simulation) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.mutedForeground, marginTop: 12 }}>{t('interviewLoading')}</Text>
      </View>
    );
  }

  const isFinished = simulation.status === 'COMPLETED';
  const character = simulation.character;
  const messageCount = (simulation.messages ?? []).filter((m: any) => m.role === 'user').length;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={{
        backgroundColor: colors.foreground, paddingTop: 50, paddingBottom: 14, paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center', gap: 12,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{
          width: 36, height: 36, borderRadius: 18, backgroundColor: colors.mutedForeground,
          justifyContent: 'center', alignItems: 'center',
        }}>
          <Text style={{ fontSize: 16 }}>🎭</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
            {character?.name ?? t('interviewRecruiter')}
          </Text>
          <Text style={{ color: colors.border, fontSize: 11 }}>
            {character?.role ?? simulation.type} {simulation.company ? `· ${simulation.company}` : ''}
          </Text>
        </View>
        {!isFinished && (
          <TouchableOpacity onPress={handleEnd} style={{ marginRight: 4 }}>
            <Ionicons name="stop-circle-outline" size={24} color="#FF7675" />
          </TouchableOpacity>
        )}
        <View style={{
          backgroundColor: getPhaseColor(simulation.phase, colors),
          paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
        }}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{simulation.phase}</Text>
        </View>
      </View>

      {/* Progress bar */}
      {!isFinished && (
        <View style={{ height: 3, backgroundColor: colors.border }}>
          <View style={{
            height: 3, backgroundColor: colors.primary,
            width: `${Math.min(100, (messageCount / 10) * 100)}%`,
          }} />
        </View>
      )}

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
                backgroundColor: isUser ? colors.primary : colors.card,
                borderRadius: 14,
                borderBottomRightRadius: isUser ? 4 : 14,
                borderBottomLeftRadius: isUser ? 14 : 4,
                paddingHorizontal: 14, paddingVertical: 10,
                ...(isUser ? {} : { borderWidth: 1, borderColor: colors.border }),
              }}>
                <Text style={{ color: isUser ? '#fff' : colors.foreground, fontSize: 14, lineHeight: 21 }}>
                  {item.content}
                </Text>
              </View>
              {/* Real-time evaluation badge */}
              {item.evaluation && (
                <View style={{
                  flexDirection: 'row', gap: 4, marginTop: 4, flexWrap: 'wrap',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                }}>
                  <ScoreBadge label={t('interviewRelevance')} score={item.evaluation.relevance} colors={colors} />
                  <ScoreBadge label={t('interviewDepth')} score={item.evaluation.depth} colors={colors} />
                  <ScoreBadge label={t('interviewStructure')} score={item.evaluation.structure} colors={colors} />
                  {item.evaluation.specificity != null && (
                    <ScoreBadge label={t('interviewSpecificity')} score={item.evaluation.specificity} colors={colors} />
                  )}
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
            backgroundColor: colors.card, alignSelf: 'flex-start', borderRadius: 14, borderBottomLeftRadius: 4,
            paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.border,
          }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{t('interviewThinking')}</Text>
          </View>
        </View>
      )}

      {/* Debrief / Report */}
      {isFinished && simulation.analysis && (
        <View style={{
          margin: 16, backgroundColor: colors.card, borderRadius: 14, padding: 16,
          borderWidth: 1, borderColor: colors.border,
        }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, marginBottom: 8 }}>
            📊 {t('interviewReport')}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 }}>
            <ScoreCircle label={t('interviewGlobal')} score={simulation.analysis.overallScore} colors={colors} />
          </View>
          {simulation.analysis.strengths?.length > 0 && (
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontWeight: '600', color: colors.success, marginBottom: 4 }}>✅ {t('interviewStrengths')}</Text>
              {simulation.analysis.strengths.map((s: string, i: number) => (
                <Text key={i} style={{ color: colors.mutedForeground, fontSize: 13, marginLeft: 8, lineHeight: 20 }}>• {s}</Text>
              ))}
            </View>
          )}
          {simulation.analysis.improvements?.length > 0 && (
            <View>
              <Text style={{ fontWeight: '600', color: colors.destructive, marginBottom: 4 }}>📌 {t('interviewImprovements')}</Text>
              {simulation.analysis.improvements.map((s: string, i: number) => (
                <Text key={i} style={{ color: colors.mutedForeground, fontSize: 13, marginLeft: 8, lineHeight: 20 }}>• {s}</Text>
              ))}
            </View>
          )}
          {simulation.analysis.advice && (
            <View style={{ marginTop: 10, backgroundColor: colors.primaryLight, borderRadius: 10, padding: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary, marginBottom: 4 }}>💡 {t('interviewAdvice')}</Text>
              <Text style={{ fontSize: 12, color: colors.foreground, lineHeight: 18 }}>{simulation.analysis.advice}</Text>
            </View>
          )}
        </View>
      )}

      {/* Input or Finished */}
      {isFinished ? (
        <View style={{ padding: 16, backgroundColor: colors.card, borderTopWidth: 1, borderColor: colors.border }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{t('interviewBackToSims')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{
          flexDirection: 'row', alignItems: 'flex-end', padding: 12,
          backgroundColor: colors.card, borderTopWidth: 1, borderColor: colors.border, gap: 8,
        }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t('interviewAnswerPlaceholder')}
            placeholderTextColor={colors.mutedForeground}
            multiline
            style={{
              flex: 1, backgroundColor: colors.muted, borderRadius: 20, paddingHorizontal: 16,
              paddingVertical: 10, fontSize: 15, maxHeight: 100, color: colors.foreground,
            }}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!input.trim() || respondMutation.isPending}
            style={{
              width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center',
              backgroundColor: input.trim() ? colors.primary : colors.border,
            }}
          >
            <Ionicons name="send" size={18} color={input.trim() ? '#fff' : colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function ScoreBadge({ label, score, colors }: { label: string; score: number; colors: any }) {
  const color = score >= 4 ? '#22C55E' : score >= 3 ? colors.primary : '#EF4444';
  return (
    <View style={{ backgroundColor: color + '15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
      <Text style={{ fontSize: 9, color, fontWeight: '600' }}>{label} {score}/5</Text>
    </View>
  );
}

function ScoreCircle({ label, score, colors }: { label: string; score: number; colors: any }) {
  const color = score >= 4 ? '#22C55E' : score >= 3 ? colors.primary : '#EF4444';
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{
        width: 60, height: 60, borderRadius: 30, borderWidth: 3, borderColor: color,
        justifyContent: 'center', alignItems: 'center',
      }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color }}>{score}</Text>
        <Text style={{ fontSize: 8, color: colors.mutedForeground }}>/5</Text>
      </View>
      <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 4 }}>{label}</Text>
    </View>
  );
}

function getPhaseColor(phase: string, colors: any): string {
  switch (phase) {
    case 'WARMUP': return '#00CEC9';
    case 'CORE': return colors.primary;
    case 'WRAP_UP': return colors.warning;
    case 'DEBRIEF': return colors.success;
    default: return colors.mutedForeground;
  }
}
