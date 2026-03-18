"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  Star,
  FileText,
  CheckCircle2,
  XCircle,
  User,
  Bot,
} from "lucide-react"
import { interviewsExtApi } from "@/lib/api"

interface Exchange {
  question: string
  answer: string
  score?: number
  feedback?: string
}

interface ReplayData {
  exchanges: Exchange[]
  analysis?: {
    overallScore?: number
    strengths?: string[]
    improvements?: string[]
    summary?: string
  }
}

export default function InterviewReplayPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [tab, setTab] = useState<"replay" | "report">("replay")
  const [replay, setReplay] = useState<ReplayData | null>(null)
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) loadData()
  }, [id])

  const loadData = async () => {
    setLoading(true)
    try {
      const [replayRes, reportRes] = await Promise.all([
        interviewsExtApi.getReplay(id).catch(() => null),
        interviewsExtApi.getReport(id).catch(() => null),
      ])
      if (replayRes?.data?.success) setReplay(replayRes.data.data)
      if (reportRes?.data?.success) setReport(reportRes.data.data)
    } catch { /* no-op */ }
    finally { setLoading(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const scoreColor = (score?: number) => {
    if (!score) return "text-muted-foreground"
    if (score >= 4) return "text-green-500"
    if (score >= 3) return "text-yellow-500"
    return "text-red-500"
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Replay d&apos;entretien</h1>
          <p className="text-muted-foreground text-sm">Revivez votre simulation avec les annotations IA</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        <button
          onClick={() => setTab("replay")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "replay" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Transcript annoté
        </button>
        <button
          onClick={() => setTab("report")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "report" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <FileText className="w-4 h-4" />
          Rapport complet
        </button>
      </div>

      {/* Replay Tab */}
      {tab === "replay" && (
        <div className="space-y-6">
          {replay?.analysis && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Star className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">{replay.analysis.overallScore || "—"}<span className="text-lg text-muted-foreground">/5</span></p>
                    <p className="text-sm text-muted-foreground">Score global</p>
                  </div>
                  {replay.analysis.summary && (
                    <p className="flex-1 text-sm text-muted-foreground ml-4 border-l border-border pl-4">{replay.analysis.summary}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {replay?.exchanges?.length ? (
            replay.exchanges.map((ex, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="border-b border-border bg-muted/50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Question {i + 1}</p>
                      <p className="text-sm text-foreground">{ex.question}</p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Votre réponse</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{ex.answer}</p>
                    </div>
                    {ex.score !== undefined && (
                      <div className={`text-lg font-bold ${scoreColor(ex.score)}`}>
                        {ex.score}/5
                      </div>
                    )}
                  </div>
                  {ex.feedback && (
                    <div className="ml-11 p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <p className="text-xs font-medium text-primary mb-1">Feedback IA</p>
                      <p className="text-sm text-foreground">{ex.feedback}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun échange trouvé pour cette simulation</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Report Tab */}
      {tab === "report" && (
        <div className="space-y-6">
          {report ? (
            <>
              {report.overallScore && (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-5xl font-bold text-primary mb-2">{report.overallScore}<span className="text-2xl text-muted-foreground">/5</span></p>
                    <p className="text-muted-foreground">Score global de performance</p>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {report.strengths?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-500">
                        <CheckCircle2 className="w-5 h-5" />
                        Points forts
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {report.strengths.map((s: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {report.improvements?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-yellow-500">
                        <XCircle className="w-5 h-5" />
                        Axes d&apos;amélioration
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {report.improvements.map((s: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <XCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>

              {report.detailedFeedback && (
                <Card>
                  <CardHeader>
                    <CardTitle>Analyse détaillée</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                      {typeof report.detailedFeedback === 'string' ? report.detailedFeedback : JSON.stringify(report.detailedFeedback, null, 2)}
                    </div>
                  </CardContent>
                </Card>
              )}

              {report.recommendations && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recommandations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                      {typeof report.recommendations === 'string' ? report.recommendations : JSON.stringify(report.recommendations, null, 2)}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Rapport non disponible. Terminez d&apos;abord la simulation.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
