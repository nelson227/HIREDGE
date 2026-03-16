"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Play,
  Mic,
  Bot,
  Building2,
  Clock,
  Star,
  ChevronRight,
  Loader2,
  Calendar,
  MessageSquare,
} from "lucide-react"
import { interviewsApi } from "@/lib/api"
import { getSocket } from "@/lib/socket"

interface Interview {
  id: string
  type: string
  status: string
  score?: number
  createdAt: string
  application?: {
    job?: {
      title: string
      company?: { name: string }
    }
  }
}

interface UpcomingInterview {
  applicationId: string
  jobTitle: string
  company: string
  interviewDate: string
}

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [upcomingInterviews, setUpcomingInterviews] = useState<UpcomingInterview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  // Real-time WebSocket listeners
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const refresh = () => loadData()

    socket.on('interview:started', refresh)
    socket.on('interview:completed', refresh)

    return () => {
      socket.off('interview:started', refresh)
      socket.off('interview:completed', refresh)
    }
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [interviewsRes, upcomingRes] = await Promise.all([
        interviewsApi.list().catch(() => ({ data: { data: [] } })),
        interviewsApi.list({ status: 'upcoming' }).catch(() => ({ data: { data: [] } }))
      ])

      if (interviewsRes.data?.data) {
        setInterviews(interviewsRes.data.data)
      }
      if (upcomingRes.data) {
        setUpcomingInterviews(upcomingRes.data)
      }
    } catch {
      // silently fail — empty state will show
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getInterviewTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      RH: "Entretien RH",
      TECHNICAL: "Technique",
      BEHAVIORAL: "Comportemental",
      CASE_STUDY: "Étude de cas",
    }
    return labels[type] || labels[type.toUpperCase()] || type
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  const totalInterviews = interviews.length
  const scoredInterviews = interviews.filter(i => i.score)
  const averageScore = scoredInterviews.length > 0
    ? Math.round(scoredInterviews.reduce((acc, i) => acc + (i.score || 0), 0) / scoredInterviews.length)
    : 0

  return (
    <div className="p-4 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Préparation aux Entretiens</h1>
          <p className="text-muted-foreground mt-1">
            Entraînez-vous avec l&apos;IA ou préparez vos entretiens planifiés
          </p>
        </div>
        <Link href="/interview">
          <Button size="lg">
            <Play className="w-4 h-4 mr-2" />
            Démarrer une simulation
          </Button>
        </Link>
      </div>

      {/* Quick Start Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          className="hover:border-primary/30 transition-all"
        >
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-1">Simulation IA</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Entraînez-vous avec EDGE dans un entretien réaliste. Obtenez un feedback instantané.
                </p>
                <Button asChild>
                  <Link href="/interview">
                    <Mic className="w-4 h-4 mr-2" />
                    Démarrer
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="hover:border-primary/30 transition-all"
        >
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center shrink-0">
                <Building2 className="w-7 h-7 text-success" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-1">Préparation spécifique</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Pratiquez avec des questions réelles rapportées par les éclaireurs.
                </p>
                <Link href="/scouts">
                  <Button variant="secondary">
                    <Building2 className="w-4 h-4 mr-2" />
                    Voir les éclaireurs
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Interviews */}
          {upcomingInterviews.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Entretiens à venir
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {upcomingInterviews.map((interview) => (
                    <div key={interview.applicationId} className="p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Calendar className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground">{interview.jobTitle}</h4>
                        <p className="text-sm text-muted-foreground">{interview.company}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">
                          {formatDate(interview.interviewDate)}
                        </p>
                        <Link href={`/interview?applicationId=${interview.applicationId}`}>
                          <Button variant="outline" size="sm" className="mt-2">
                            Préparer
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Practice Sessions */}
          <Card>
            <CardHeader>
              <CardTitle>Sessions de pratique</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {interviews.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2">Aucune session de pratique</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Démarrez votre première simulation d&apos;entretien pour vous entraîner.
                  </p>
                  <Link href="/interview">
                    <Button>
                      <Play className="w-4 h-4 mr-2" />
                      Commencer
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {interviews.map((interview) => (
                    <div key={interview.id} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Bot className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground">
                              {getInterviewTypeLabel(interview.type)}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {interview.application?.job?.company?.name || "Simulation générale"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(interview.createdAt)}
                            </p>
                          </div>
                        </div>
                        {interview.score && (
                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-warning" />
                              <span className="font-semibold text-foreground">{interview.score}%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Performance Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aperçu des performances</CardTitle>
            </CardHeader>
            <CardContent>
              {totalInterviews === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    Complétez des simulations pour voir vos statistiques
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center mb-6">
                    <div className="relative w-32 h-32">
                      <svg className="w-full h-full -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          strokeWidth="8"
                          fill="none"
                          className="stroke-muted"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${(averageScore / 100) * 352} 352`}
                          className="stroke-primary"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-foreground">
                          {averageScore}%
                        </span>
                        <span className="text-xs text-muted-foreground">Score moyen</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-center text-sm text-muted-foreground">
                    {totalInterviews} session{totalInterviews > 1 ? "s" : ""} complétée{totalInterviews > 1 ? "s" : ""}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conseils rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Utilisez la méthode STAR pour structurer vos réponses
                </p>
              </div>
              <div className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Préparez 3-5 exemples concrets de vos réalisations
                </p>
              </div>
              <div className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Renseignez-vous sur l&apos;entreprise avant l&apos;entretien
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
