"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft, Loader2, TrendingUp, TrendingDown, Minus,
  BarChart3, Zap, Volume2, Brain, Target, Award, AlertTriangle
} from "lucide-react"
import { interviewsApi } from "@/lib/api"

interface Analytics {
  totalSessions: number
  averageConfidence: number
  trend: "up" | "down" | "stable"
  speechStats: {
    avgWordsPerMinute: number
    avgFillerCount: number
    totalFillerWords: Record<string, number>
  }
  confidenceStats: {
    avg: number
    min: number
    max: number
    history: { date: string; score: number }[]
  }
  contentStats: {
    avgRelevance: number
    avgDepth: number
    avgStructure: number
    avgSpecificity: number
    avgCommunication: number
  }
  sessionHistory: {
    id: string
    date: string
    type: string
    company: string
    confidence: number
    score: number
    questionCount: number
  }[]
  topStrengths: string[]
  topImprovements: string[]
}

export default function InterviewAnalyticsPage() {
  const router = useRouter()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    interviewsApi.getAnalytics()
      .then(({ data }) => setAnalytics(data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Chargement des analytics...</span>
      </div>
    )
  }

  if (!analytics || analytics.totalSessions === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Pas encore de données</h2>
        <p className="text-muted-foreground mb-6">
          Complète ton premier entretien pour voir tes analytics.
        </p>
        <Button onClick={() => router.push('/interviews')}>
          Lancer une simulation
        </Button>
      </div>
    )
  }

  const TrendIcon = analytics.trend === 'up' ? TrendingUp :
    analytics.trend === 'down' ? TrendingDown : Minus
  const trendColor = analytics.trend === 'up' ? 'text-green-600' :
    analytics.trend === 'down' ? 'text-red-600' : 'text-muted-foreground'

  const contentDimensions = [
    { label: "Pertinence", value: analytics.contentStats.avgRelevance, max: 5, color: "bg-blue-500" },
    { label: "Profondeur", value: analytics.contentStats.avgDepth, max: 5, color: "bg-purple-500" },
    { label: "Structure", value: analytics.contentStats.avgStructure, max: 5, color: "bg-green-500" },
    { label: "Spécificité", value: analytics.contentStats.avgSpecificity, max: 5, color: "bg-amber-500" },
    { label: "Communication", value: analytics.contentStats.avgCommunication, max: 5, color: "bg-cyan-500" },
  ]

  // Top filler words sorted by frequency
  const topFillerWords = Object.entries(analytics.speechStats.totalFillerWords ?? {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => router.push('/interviews')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Performance Analytics</h1>
          <p className="text-muted-foreground">
            {analytics.totalSessions} session{analytics.totalSessions > 1 ? 's' : ''} analysée{analytics.totalSessions > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Zap className="h-5 w-5 text-amber-500" />
              <span className="text-3xl font-bold">{Math.round(analytics.averageConfidence)}</span>
              <TrendIcon className={`h-4 w-4 ${trendColor}`} />
            </div>
            <p className="text-sm text-muted-foreground">Confiance moyenne</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Volume2 className="h-5 w-5 text-blue-500" />
              <span className="text-3xl font-bold">{Math.round(analytics.speechStats.avgWordsPerMinute)}</span>
            </div>
            <p className="text-sm text-muted-foreground">Mots/minute (moy.)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-3xl font-bold">{analytics.speechStats.avgFillerCount.toFixed(1)}</span>
            </div>
            <p className="text-sm text-muted-foreground">Fillers/réponse</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Target className="h-5 w-5 text-green-500" />
              <span className="text-3xl font-bold">{analytics.totalSessions}</span>
            </div>
            <p className="text-sm text-muted-foreground">Sessions totales</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Confidence history chart (simple bar) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Évolution de la Confiance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-40">
              {analytics.confidenceStats.history.slice(-20).map((point, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t transition-all ${
                      point.score >= 70 ? 'bg-green-500' :
                      point.score >= 50 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ height: `${point.score}%` }}
                    title={`${point.score} — ${point.date}`}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>Min: {analytics.confidenceStats.min}</span>
              <span>Moy: {Math.round(analytics.confidenceStats.avg)}</span>
              <span>Max: {analytics.confidenceStats.max}</span>
            </div>
          </CardContent>
        </Card>

        {/* Content dimensions radar (simplified as bars) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4" /> Dimensions du Contenu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contentDimensions.map(dim => (
              <div key={dim.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{dim.label}</span>
                  <span className="font-medium">{dim.value.toFixed(1)}/{dim.max}</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${dim.color} transition-all`}
                    style={{ width: `${(dim.value / dim.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Strengths */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="h-4 w-4 text-green-500" /> Points Forts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analytics.topStrengths.map((s, i) => (
                <li key={i} className="text-sm flex gap-2 items-start">
                  <span className="text-green-500 mt-0.5">✓</span>
                  {s}
                </li>
              ))}
              {analytics.topStrengths.length === 0 && (
                <p className="text-sm text-muted-foreground">Pas encore assez de données</p>
              )}
            </ul>
          </CardContent>
        </Card>

        {/* Improvements */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> À Améliorer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analytics.topImprovements.map((s, i) => (
                <li key={i} className="text-sm flex gap-2 items-start">
                  <span className="text-amber-500 mt-0.5">→</span>
                  {s}
                </li>
              ))}
              {analytics.topImprovements.length === 0 && (
                <p className="text-sm text-muted-foreground">Pas encore assez de données</p>
              )}
            </ul>
          </CardContent>
        </Card>

        {/* Filler words breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-red-500" /> Mots de Remplissage
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topFillerWords.length > 0 ? (
              <div className="space-y-2">
                {topFillerWords.map(([word, count]) => (
                  <div key={word} className="flex justify-between items-center">
                    <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                      &ldquo;{word}&rdquo;
                    </span>
                    <span className="text-sm text-muted-foreground">{count}×</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun mot de remplissage détecté 🎉</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Session history table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Historique des Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Entreprise</th>
                  <th className="pb-2 font-medium text-center">Confiance</th>
                  <th className="pb-2 font-medium text-center">Score</th>
                  <th className="pb-2 font-medium text-center">Questions</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {analytics.sessionHistory.map(s => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-2">{new Date(s.date).toLocaleDateString('fr-FR')}</td>
                    <td className="py-2">{s.type}</td>
                    <td className="py-2">{s.company || '—'}</td>
                    <td className="py-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.confidence >= 70 ? 'bg-green-100 text-green-700' :
                        s.confidence >= 50 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {s.confidence}
                      </span>
                    </td>
                    <td className="py-2 text-center font-medium">{s.score}/100</td>
                    <td className="py-2 text-center text-muted-foreground">{s.questionCount}</td>
                    <td className="py-2">
                      <Button variant="ghost" size="sm" onClick={() => router.push(`/interviews/${s.id}/replay`)}>
                        Voir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
