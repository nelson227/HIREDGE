"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  TrendingUp,
  Briefcase,
  Mail,
  Calendar,
  Clock,
  Target,
  ArrowUp,
  Loader2,
  BarChart3,
  CheckCircle2,
} from "lucide-react"
import { applicationsApi, interviewsApi, jobsApi } from "@/lib/api"
import { getSocket } from "@/lib/socket"

interface ApplicationStats {
  total: number
  byStatus: Record<string, number>
}

interface Stats {
  applications: ApplicationStats
  interviews: number
  jobs: number
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  // Real-time WebSocket listeners — refresh stats on key events
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const refresh = () => loadStats()

    socket.on('application:created', refresh)
    socket.on('application:status_changed', refresh)
    socket.on('application:deleted', refresh)
    socket.on('interview:started', refresh)
    socket.on('interview:completed', refresh)

    return () => {
      socket.off('application:created', refresh)
      socket.off('application:status_changed', refresh)
      socket.off('application:deleted', refresh)
      socket.off('interview:started', refresh)
      socket.off('interview:completed', refresh)
    }
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      
      // Charger les données en parallèle
      const [applicationsRes, interviewsRes, jobsRes] = await Promise.all([
        applicationsApi.list().catch(() => ({ data: { data: { applications: [], pagination: { total: 0 } } } })),
        interviewsApi.list().catch(() => ({ data: { data: [] } })),
        jobsApi.getRecommended(1).catch(() => ({ data: { data: { pagination: { total: 0 } } } }))
      ])

      // Compter les candidatures par statut
      const applications = applicationsRes.data?.data?.applications || []
      const byStatus: Record<string, number> = {
        DRAFT: 0,
        SENT: 0,
        VIEWED: 0,
        INTERVIEW: 0,
        OFFER: 0,
        REJECTED: 0,
      }
      applications.forEach((app: any) => {
        if (byStatus[app.status] !== undefined) {
          byStatus[app.status]++
        }
      })

      setStats({
        applications: {
          total: applicationsRes.data?.data?.pagination?.total || applications.length,
          byStatus,
        },
        interviews: interviewsRes.data?.data?.length || 0,
        jobs: jobsRes.data?.data?.pagination?.total || 0,
      })
    } catch {
      // handled by UI state
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Chargement des statistiques...</p>
        </div>
      </div>
    )
  }

  const totalApplications = stats?.applications.total || 0
  const totalInterviews = stats?.interviews || 0
  const totalJobs = stats?.jobs || 0
  const responseRate = totalApplications > 0 
    ? Math.round(((stats?.applications.byStatus.VIEWED || 0) + (stats?.applications.byStatus.INTERVIEW || 0) + (stats?.applications.byStatus.OFFER || 0)) / totalApplications * 100)
    : 0

  const applicationsByStatus = [
    { status: "Envoyées", count: stats?.applications.byStatus.SENT || 0, color: "bg-primary" },
    { status: "Vues", count: stats?.applications.byStatus.VIEWED || 0, color: "bg-chart-2" },
    { status: "Entretien", count: stats?.applications.byStatus.INTERVIEW || 0, color: "bg-warning" },
    { status: "Offre", count: stats?.applications.byStatus.OFFER || 0, color: "bg-success" },
    { status: "Refusées", count: stats?.applications.byStatus.REJECTED || 0, color: "bg-destructive" },
  ]

  const statsCards = [
    {
      title: "Candidatures envoyées",
      value: totalApplications,
      icon: Mail,
    },
    {
      title: "Taux de réponse",
      value: `${responseRate}%`,
      icon: TrendingUp,
    },
    {
      title: "Entretiens",
      value: totalInterviews,
      icon: Calendar,
    },
    {
      title: "Offres disponibles",
      value: totalJobs,
      icon: Briefcase,
    },
  ]

  // Empty state
  if (totalApplications === 0) {
    return (
      <div className="p-4 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Tableau de bord Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Suivez vos performances de recherche d&apos;emploi
          </p>
        </div>

        <div className="max-w-md mx-auto text-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Pas encore de données</h2>
          <p className="text-muted-foreground mb-6">
            Commencez à postuler pour voir vos statistiques apparaître ici. Nous suivons automatiquement vos candidatures, réponses et entretiens.
          </p>
          <Link href="/jobs">
            <Button>
              <Briefcase className="w-4 h-4 mr-2" />
              Voir les offres
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Tableau de bord Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Suivez vos performances de recherche d&apos;emploi
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Applications by Status */}
          <Card>
            <CardHeader>
              <CardTitle>Candidatures par statut</CardTitle>
            </CardHeader>
            <CardContent>
              {totalApplications > 0 ? (
                <>
                  <div className="flex h-8 rounded-lg overflow-hidden mb-6">
                    {applicationsByStatus.map((status) => (
                      status.count > 0 && (
                        <div
                          key={status.status}
                          className={`${status.color} transition-all`}
                          style={{
                            width: `${(status.count / totalApplications) * 100}%`,
                          }}
                        />
                      )
                    ))}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {applicationsByStatus.map((status) => (
                      <div key={status.status} className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <div className={`w-3 h-3 rounded ${status.color}`} />
                          <span className="text-2xl font-bold text-foreground">{status.count}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{status.status}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Aucune candidature pour le moment
                </p>
              )}
            </CardContent>
          </Card>

          {/* Progress Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Résumé de progression</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    {totalApplications} candidature{totalApplications > 1 ? "s" : ""} envoyée{totalApplications > 1 ? "s" : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Continuez à postuler pour augmenter vos chances
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-success" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    {responseRate}% de taux de réponse
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {responseRate > 30 ? "Excellent taux de réponse !" : "Personnalisez vos candidatures pour améliorer ce taux"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                  <Calendar className="w-6 h-6 text-warning" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    {totalInterviews} simulation{totalInterviews > 1 ? "s" : ""} d&apos;entretien
                  </p>
                  <p className="text-sm text-muted-foreground">
                    L&apos;entraînement améliore vos performances
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conseils pour améliorer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <Target className="w-4 h-4 text-primary mt-1 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Les candidats les plus performants postulent à 10+ offres par semaine
                </p>
              </div>
              <div className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-primary mt-1 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Personnalisez votre lettre de motivation pour chaque poste
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-primary mt-1 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Postulez tôt - les premières candidatures ont plus de chances d&apos;être lues
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/jobs" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Briefcase className="w-4 h-4 mr-2" />
                  Voir les offres
                </Button>
              </Link>
              <Link href="/interview" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="w-4 h-4 mr-2" />
                  S&apos;entraîner aux entretiens
                </Button>
              </Link>
              <Link href="/applications" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Mail className="w-4 h-4 mr-2" />
                  Voir mes candidatures
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
