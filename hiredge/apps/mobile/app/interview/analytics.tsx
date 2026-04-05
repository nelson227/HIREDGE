import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { interviewsApi } from '../../lib/api';
import { useThemeColors } from '../../lib/theme';
import { useTranslation } from '../../lib/i18n';

export default function InterviewAnalyticsScreen() {
  const { colors } = useThemeColors();
  const { t } = useTranslation();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const screenWidth = Dimensions.get('window').width - 64;

  useEffect(() => {
    interviewsApi.getAnalytics()
      .then(({ data }) => setAnalytics(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!analytics || analytics.totalSessions === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 24 }}>
        <Ionicons name="bar-chart-outline" size={64} color={colors.mutedForeground} />
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground, marginTop: 16 }}>
          Pas encore de données
        </Text>
        <Text style={{ color: colors.mutedForeground, textAlign: 'center', marginTop: 8, marginBottom: 24 }}>
          Complète ton premier entretien pour voir tes analytics.
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/interview')}
          style={{ backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Lancer une simulation</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const confidenceColor = (score: number) =>
    score >= 70 ? '#22C55E' : score >= 50 ? '#F59E0B' : '#EF4444';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        backgroundColor: colors.foreground, paddingTop: 50, paddingBottom: 20, paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center', gap: 12,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>Performance Analytics</Text>
          <Text style={{ color: colors.border, fontSize: 12 }}>{analytics.totalSessions} sessions analysées</Text>
        </View>
      </View>

      <View style={{ padding: 16, gap: 16 }}>
        {/* Top metrics row */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <MetricCard
            icon="flash" iconColor="#F59E0B"
            value={Math.round(analytics.averageConfidence)} suffix="%"
            label="Confiance moy." colors={colors}
            trend={analytics.trend}
          />
          <MetricCard
            icon="chatbubble-outline" iconColor="#3B82F6"
            value={Math.round(analytics.speechStats.avgWordsPerMinute)}
            label="Mots/min" colors={colors}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <MetricCard
            icon="alert-circle-outline" iconColor="#EF4444"
            value={analytics.speechStats.avgFillerCount.toFixed(1)}
            label="Fillers/réponse" colors={colors}
          />
          <MetricCard
            icon="checkmark-circle-outline" iconColor="#22C55E"
            value={analytics.totalSessions}
            label="Sessions" colors={colors}
          />
        </View>

        {/* Confidence history */}
        <View style={{
          backgroundColor: colors.card, borderRadius: 14, padding: 16,
          borderWidth: 1, borderColor: colors.border,
        }}>
          <Text style={{ fontWeight: '600', color: colors.foreground, marginBottom: 12 }}>
            📈 Évolution de la Confiance
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 2 }}>
            {analytics.confidenceStats.history.slice(-15).map((point: any, i: number) => (
              <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                <View style={{
                  width: '100%', borderRadius: 3,
                  backgroundColor: confidenceColor(point.score),
                  height: `${point.score}%`,
                }} />
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={{ fontSize: 10, color: colors.mutedForeground }}>Min: {analytics.confidenceStats.min}</Text>
            <Text style={{ fontSize: 10, color: colors.mutedForeground }}>Moy: {Math.round(analytics.confidenceStats.avg)}</Text>
            <Text style={{ fontSize: 10, color: colors.mutedForeground }}>Max: {analytics.confidenceStats.max}</Text>
          </View>
        </View>

        {/* Content dimensions */}
        <View style={{
          backgroundColor: colors.card, borderRadius: 14, padding: 16,
          borderWidth: 1, borderColor: colors.border,
        }}>
          <Text style={{ fontWeight: '600', color: colors.foreground, marginBottom: 12 }}>
            🧠 Dimensions du Contenu
          </Text>
          {[
            { label: 'Pertinence', value: analytics.contentStats.avgRelevance, color: '#3B82F6' },
            { label: 'Profondeur', value: analytics.contentStats.avgDepth, color: '#8B5CF6' },
            { label: 'Structure', value: analytics.contentStats.avgStructure, color: '#22C55E' },
            { label: 'Spécificité', value: analytics.contentStats.avgSpecificity, color: '#F59E0B' },
            { label: 'Communication', value: analytics.contentStats.avgCommunication, color: '#06B6D4' },
          ].map(dim => (
            <View key={dim.label} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 13, color: colors.foreground }}>{dim.label}</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>{dim.value.toFixed(1)}/5</Text>
              </View>
              <View style={{ height: 6, backgroundColor: colors.muted, borderRadius: 3, overflow: 'hidden' }}>
                <View style={{
                  height: 6, borderRadius: 3, backgroundColor: dim.color,
                  width: `${(dim.value / 5) * 100}%`,
                }} />
              </View>
            </View>
          ))}
        </View>

        {/* Strengths & improvements */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{
            flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 14,
            borderWidth: 1, borderColor: colors.border,
          }}>
            <Text style={{ fontWeight: '600', color: '#22C55E', marginBottom: 8 }}>✅ Points forts</Text>
            {analytics.topStrengths.map((s: string, i: number) => (
              <Text key={i} style={{ fontSize: 12, color: colors.mutedForeground, lineHeight: 18 }}>• {s}</Text>
            ))}
          </View>
          <View style={{
            flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 14,
            borderWidth: 1, borderColor: colors.border,
          }}>
            <Text style={{ fontWeight: '600', color: '#F59E0B', marginBottom: 8 }}>📌 À améliorer</Text>
            {analytics.topImprovements.map((s: string, i: number) => (
              <Text key={i} style={{ fontSize: 12, color: colors.mutedForeground, lineHeight: 18 }}>• {s}</Text>
            ))}
          </View>
        </View>

        {/* Filler words */}
        {Object.keys(analytics.speechStats.totalFillerWords ?? {}).length > 0 && (
          <View style={{
            backgroundColor: colors.card, borderRadius: 14, padding: 16,
            borderWidth: 1, borderColor: colors.border,
          }}>
            <Text style={{ fontWeight: '600', color: colors.foreground, marginBottom: 12 }}>
              🗣️ Mots de remplissage
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(analytics.speechStats.totalFillerWords)
                .sort(([, a]: any, [, b]: any) => b - a)
                .slice(0, 8)
                .map(([word, count]: [string, any]) => (
                  <View key={word} style={{
                    backgroundColor: '#EF444415', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                    flexDirection: 'row', gap: 4, alignItems: 'center',
                  }}>
                    <Text style={{ fontSize: 13, color: '#EF4444', fontWeight: '600' }}>"{word}"</Text>
                    <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{count}×</Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        {/* Session history */}
        <View style={{
          backgroundColor: colors.card, borderRadius: 14, padding: 16,
          borderWidth: 1, borderColor: colors.border,
        }}>
          <Text style={{ fontWeight: '600', color: colors.foreground, marginBottom: 12 }}>
            📋 Historique
          </Text>
          {analytics.sessionHistory.slice(0, 10).map((s: any) => (
            <TouchableOpacity
              key={s.id}
              onPress={() => router.push(`/interview/${s.id}`)}
              style={{
                flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
                borderBottomWidth: 1, borderColor: colors.border, gap: 10,
              }}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: confidenceColor(s.confidence) + '20',
                justifyContent: 'center', alignItems: 'center',
              }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: confidenceColor(s.confidence) }}>
                  {s.confidence}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>
                  {s.company || s.type}
                </Text>
                <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
                  {new Date(s.date).toLocaleDateString('fr-FR')} · {s.questionCount} Q · Score {s.score}/100
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

function MetricCard({ icon, iconColor, value, suffix, label, colors, trend }: any) {
  const trendIcon = trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : null;
  const trendColor = trend === 'up' ? '#22C55E' : '#EF4444';
  return (
    <View style={{
      flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 14,
      borderWidth: 1, borderColor: colors.border, alignItems: 'center',
    }}>
      <Ionicons name={icon} size={20} color={iconColor} />
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: colors.foreground }}>{value}</Text>
        {suffix && <Text style={{ fontSize: 14, color: colors.mutedForeground }}>{suffix}</Text>}
        {trendIcon && <Ionicons name={trendIcon} size={14} color={trendColor} style={{ marginLeft: 4 }} />}
      </View>
      <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>{label}</Text>
    </View>
  );
}
