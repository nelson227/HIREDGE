"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Search,
  Building2,
  MessageSquare,
  Star,
  Clock,
  Users,
  Loader2,
  Briefcase,
  DollarSign,
  ChevronRight,
  UserSearch,
} from "lucide-react"
import { scoutsApi } from "@/lib/api"
import { connectSocket } from "@/lib/socket"

interface Scout {
  id: string
  companyId: string
  companyName: string
  role: string
  department?: string
  hiredAt: string
  trustScore: number
  responseCount: number
  averageRating?: number
  insights?: {
    culture?: string
    process?: string
    salary?: string
  }
}

interface Company {
  id: string
  name: string
  scoutCount: number
  logo?: string
}

export default function ScoutsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null)
  const [scouts, setScouts] = useState<Scout[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadScouts()
  }, [selectedCompany])

  // Real-time WebSocket listeners
  useEffect(() => {
    let socket: ReturnType<typeof connectSocket> | null = null
    try { socket = connectSocket() } catch { return }
    if (!socket) return

    const refresh = () => loadScouts()

    socket.on('scout:new_answer', refresh)
    socket.on('notification:new', (n: any) => {
      if (n.type === 'SCOUT') refresh()
    })

    return () => {
      socket.off('scout:new_answer', refresh)
      socket.off('notification:new')
    }
  }, [selectedCompany])

  const loadScouts = async () => {
    try {
      setLoading(true)
      const { data } = await scoutsApi.list(selectedCompany || undefined)
      if (data.success) {
        setScouts(data.data.scouts || [])
        // Extraire les entreprises uniques
        if (!selectedCompany) {
          const uniqueCompanies = data.data.companies || []
          setCompanies(uniqueCompanies)
        }
      }
    } catch {
      // handled by UI state
    } finally {
      setLoading(false)
    }
  }

  const formatHiredDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMonths = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 30))
    if (diffMonths < 1) return "Ce mois"
    if (diffMonths === 1) return "Il y a 1 mois"
    return `Il y a ${diffMonths} mois`
  }

  const filteredScouts = scouts.filter(scout => 
    searchQuery === "" || 
    scout.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    scout.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading && scouts.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Chargement des éclaireurs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Réseau d&apos;Éclaireurs</h1>
          <p className="text-muted-foreground mt-1">
            Connectez-vous avec des professionnels récemment embauchés pour des insights exclusifs
          </p>
        </div>
        <div className="relative flex-1 lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher entreprise ou éclaireur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Company Pills */}
      {companies.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCompany(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCompany === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Toutes les entreprises
          </button>
          {companies.slice(0, 5).map((company) => (
            <button
              key={company.id}
              onClick={() => setSelectedCompany(company.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCompany === company.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {company.name} ({company.scoutCount})
            </button>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredScouts.length === 0 && !loading && (
        <div className="max-w-md mx-auto text-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <UserSearch className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Aucun éclaireur disponible</h2>
          <p className="text-muted-foreground mb-6">
            {searchQuery 
              ? "Aucun éclaireur ne correspond à votre recherche. Essayez d'autres termes."
              : "Les éclaireurs sont des employés récemment embauchés qui partagent leur expérience. La communauté se développe progressivement."
            }
          </p>
          {searchQuery && (
            <Button variant="outline" onClick={() => setSearchQuery("")}>
              Effacer la recherche
            </Button>
          )}
        </div>
      )}

      {/* Scouts Grid */}
      {filteredScouts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Scouts List */}
          <div className="lg:col-span-2 space-y-4">
            {filteredScouts.map((scout) => (
              <Card key={scout.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-foreground">Éclaireur Anonyme</h3>
                          <p className="text-sm text-muted-foreground">
                            {scout.role} chez {scout.companyName}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              Embauché {formatHiredDate(scout.hiredAt)}
                            </span>
                            {scout.averageRating && (
                              <span className="flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 text-warning" />
                                {scout.averageRating.toFixed(1)}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3.5 h-3.5" />
                              {scout.responseCount} réponses
                            </span>
                          </div>
                        </div>
                        <Link href={`/scout/${scout.id}`}>
                          <Button size="sm">Poser une question</Button>
                        </Link>
                      </div>

                      {/* Insights */}
                      {scout.insights && (
                        <div className="mt-4 space-y-2">
                          {scout.insights.culture && (
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                              <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center shrink-0">
                                <Users className="w-4 h-4 text-primary" />
                              </div>
                              <p className="text-sm text-foreground leading-relaxed">
                                {scout.insights.culture}
                              </p>
                            </div>
                          )}
                          {scout.insights.process && (
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                              <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center shrink-0">
                                <Briefcase className="w-4 h-4 text-chart-2" />
                              </div>
                              <p className="text-sm text-foreground leading-relaxed">
                                {scout.insights.process}
                              </p>
                            </div>
                          )}
                          {scout.insights.salary && (
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                              <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center shrink-0">
                                <DollarSign className="w-4 h-4 text-success" />
                              </div>
                              <p className="text-sm text-foreground leading-relaxed">
                                {scout.insights.salary}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Companies with Scouts */}
            {companies.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Entreprises avec éclaireurs</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {companies.map((company) => (
                      <button
                        key={company.id}
                        onClick={() => setSelectedCompany(company.id === selectedCompany ? null : company.id)}
                        className="flex items-center gap-3 w-full p-4 hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{company.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {company.scoutCount} éclaireur{company.scoutCount > 1 ? "s" : ""}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">À propos des éclaireurs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Les éclaireurs sont des professionnels récemment embauchés qui partagent anonymement leur expérience de recrutement.
                </p>
                <p>
                  Posez-leur des questions sur le processus, la culture d&apos;entreprise ou les salaires.
                </p>
                <p className="text-xs">
                  💡 Leurs réponses sont anonymisées pour protéger leur identité.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
