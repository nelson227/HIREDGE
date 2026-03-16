"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Users,
  Briefcase,
  FileStack,
  Users2,
  TrendingUp,
  UserPlus,
  Activity,
  Shield,
  ArrowRight,
} from "lucide-react"
import { adminApi, authApi } from "@/lib/api"

interface PlatformStats {
  totalUsers: number
  totalJobs: number
  totalApplications: number
  totalSquads: number
  recentSignups: number
  activeUsersLast7d: number
  usersByRole: Record<string, number>
  usersBySubscription: Record<string, number>
}

export default function AdminPage() {
  const router = useRouter()
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    // Check admin session
    const adminToken = sessionStorage.getItem('adminToken')
    if (!adminToken) {
      router.replace('/admin/login')
      return
    }
    // Also verify user is ADMIN
    authApi.me().then(({ data }) => {
      if (!data.success || data.data?.role !== 'ADMIN') {
        router.replace('/dashboard')
        return
      }
      loadStats()
    }).catch(() => router.replace('/dashboard'))
  }, [])

  const loadStats = async () => {
    try {
      const { data } = await adminApi.getStats()
      if (data.success) setStats(data.data)
    } catch {
      setError("Impossible de charger les statistiques")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-muted rounded-xl" />)}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">{error}</div>
      </div>
    )
  }

  const statCards = [
    { label: "Utilisateurs totaux", value: stats?.totalUsers || 0, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Offres d'emploi", value: stats?.totalJobs || 0, icon: Briefcase, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Candidatures", value: stats?.totalApplications || 0, icon: FileStack, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Escouades", value: stats?.totalSquads || 0, icon: Users2, color: "text-orange-500", bg: "bg-orange-500/10" },
  ]

  const activityCards = [
    { label: "Inscriptions (7j)", value: stats?.recentSignups || 0, icon: UserPlus, color: "text-emerald-500" },
    { label: "Utilisateurs actifs (7j)", value: stats?.activeUsersLast7d || 0, icon: Activity, color: "text-cyan-500" },
  ]

  const roleLabels: Record<string, string> = {
    CANDIDATE: "Candidats",
    SCOUT: "Éclaireurs",
    RECRUITER: "Recruteurs",
    ADMIN: "Admins",
  }

  const tierLabels: Record<string, string> = {
    FREE: "Gratuit",
    STARTER: "Starter",
    PRO: "Pro",
    SQUAD_PLUS: "Squad+",
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Administration</h1>
          </div>
          <p className="text-muted-foreground">Tableau de bord de la plateforme HIREDGE</p>
        </div>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          Gérer les utilisateurs
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold">{card.value.toLocaleString('fr-FR')}</p>
            <p className="text-sm text-muted-foreground mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activityCards.map((card) => (
          <div key={card.label} className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{card.value.toLocaleString('fr-FR')}</p>
              <p className="text-sm text-muted-foreground">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By Role */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            Répartition par rôle
          </h2>
          <div className="space-y-3">
            {Object.entries(stats?.usersByRole || {}).map(([role, count]) => {
              const total = stats?.totalUsers || 1
              const percent = Math.round((count / total) * 100)
              return (
                <div key={role}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{roleLabels[role] || role}</span>
                    <span className="font-medium">{count} ({percent}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* By Subscription */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
            Répartition par abonnement
          </h2>
          <div className="space-y-3">
            {Object.entries(stats?.usersBySubscription || {}).map(([tier, count]) => {
              const total = stats?.totalUsers || 1
              const percent = Math.round((count / total) * 100)
              return (
                <div key={tier}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{tierLabels[tier] || tier}</span>
                    <span className="font-medium">{count} ({percent}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
