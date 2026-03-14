"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Plus,
  GripVertical,
  Building2,
  Calendar,
  MoreHorizontal,
  ArrowRight,
  Loader2,
  Briefcase,
} from "lucide-react"
import { applicationsApi } from "@/lib/api"

// Statuts UI du Kanban (frontend)
type KanbanStatus = "draft" | "applied" | "screening" | "interview" | "offer" | "rejected"

// Mapping des statuts API vers Kanban
const statusMapping: Record<string, KanbanStatus> = {
  DRAFT: "draft",
  SENT: "applied",
  VIEWED: "screening",
  INTERVIEW: "interview",
  OFFER: "offer",
  ACCEPTED: "offer",
  REJECTED: "rejected",
}

// Mapping inverse pour les updates vers l'API
const reverseStatusMapping: Record<KanbanStatus, string> = {
  draft: "DRAFT",
  applied: "SENT",
  screening: "VIEWED",
  interview: "INTERVIEW",
  offer: "OFFER",
  rejected: "REJECTED",
}

interface Application {
  id: string
  company: string
  companyLogo?: string
  role: string
  date: string
  nextStep?: string
  status: KanbanStatus
  jobId: string
}

const columns: { id: KanbanStatus; label: string; color: string }[] = [
  { id: "draft", label: "Brouillon", color: "bg-muted-foreground" },
  { id: "applied", label: "Envoyée", color: "bg-primary" },
  { id: "screening", label: "Vue", color: "bg-chart-2" },
  { id: "interview", label: "Entretien", color: "bg-warning" },
  { id: "offer", label: "Offre", color: "bg-success" },
  { id: "rejected", label: "Refusée", color: "bg-destructive" },
]

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Record<KanbanStatus, Application[]>>({
    draft: [],
    applied: [],
    screening: [],
    interview: [],
    offer: [],
    rejected: [],
  })
  const [loading, setLoading] = useState(true)
  const [draggedItem, setDraggedItem] = useState<Application | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<KanbanStatus | null>(null)
  const [feedbackMsg, setFeedbackMsg] = useState("")

  // Charger les candidatures depuis l'API
  useEffect(() => {
    loadApplications()
  }, [])

  const loadApplications = async () => {
    try {
      setLoading(true)
      const response = await applicationsApi.list()
      
      // Initialiser toutes les colonnes vides
      const grouped: Record<KanbanStatus, Application[]> = {
        draft: [],
        applied: [],
        screening: [],
        interview: [],
        offer: [],
        rejected: [],
      }

      // Mapper les données API vers les colonnes Kanban
      if (response.data?.data?.applications) {
        response.data.data.applications.forEach((app: any) => {
          const kanbanStatus = statusMapping[app.status] || "draft"
          grouped[kanbanStatus].push({
            id: app.id,
            company: app.job?.company?.name || "Entreprise",
            companyLogo: app.job?.company?.logo,
            role: app.job?.title || "Poste",
            date: new Date(app.createdAt).toLocaleDateString("fr-FR", {
              year: "numeric",
              month: "short",
              day: "numeric",
            }),
            nextStep: app.interviewDate 
              ? `Entretien ${new Date(app.interviewDate).toLocaleDateString("fr-FR")}`
              : undefined,
            status: kanbanStatus,
            jobId: app.jobId,
          })
        })
      }

      setApplications(grouped)
    } catch {
      // handled by UI state
    } finally {
      setLoading(false)
    }
  }

  const handleDragStart = (app: Application) => {
    setDraggedItem(app)
  }

  const handleDragOver = (e: React.DragEvent, status: KanbanStatus) => {
    e.preventDefault()
    setDragOverColumn(status)
  }

  const handleDrop = async (status: KanbanStatus) => {
    if (!draggedItem) return

    const oldStatus = draggedItem.status
    if (oldStatus === status) {
      setDraggedItem(null)
      setDragOverColumn(null)
      return
    }

    // Mise à jour optimiste de l'UI
    setApplications((prev) => ({
      ...prev,
      [oldStatus]: prev[oldStatus].filter((app) => app.id !== draggedItem.id),
      [status]: [...prev[status], { ...draggedItem, status }],
    }))

    // Mise à jour via l'API
    try {
      await applicationsApi.updateStatus(draggedItem.id, reverseStatusMapping[status])
    } catch {
      // Annuler le changement en cas d'erreur
      loadApplications()
    }

    setDraggedItem(null)
    setDragOverColumn(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverColumn(null)
  }

  const totalApplications = Object.values(applications).flat().length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Chargement des candidatures...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 h-[calc(100vh-4rem)] flex flex-col">
      {feedbackMsg && (
        <div className="bg-destructive/10 text-destructive text-sm px-4 py-2 rounded-lg shrink-0">{feedbackMsg}</div>
      )}
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Pipeline de Candidatures</h1>
          <p className="text-muted-foreground mt-1">
            {totalApplications === 0 
              ? "Commencez à postuler pour voir vos candidatures ici"
              : `${totalApplications} candidature${totalApplications > 1 ? "s" : ""} en cours`
            }
          </p>
        </div>
        <Link href="/jobs">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle candidature
          </Button>
        </Link>
      </div>

      {/* Message si aucune candidature */}
      {totalApplications === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Aucune candidature pour le moment</h2>
            <p className="text-muted-foreground mb-6">
              Explorez les offres d&apos;emploi et commencez à postuler pour suivre vos candidatures ici.
            </p>
            <Link href="/jobs">
              <Button size="lg">
                <Briefcase className="w-4 h-4 mr-2" />
                Voir les offres
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      {totalApplications > 0 && (
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 min-w-max h-full pb-4">
            {columns.map((column) => (
              <div
                key={column.id}
                className="w-72 flex flex-col"
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDrop={() => handleDrop(column.id)}
              >
                {/* Column Header */}
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-2.5 h-2.5 rounded-full ${column.color}`} />
                  <h3 className="font-semibold text-foreground">{column.label}</h3>
                  <span className="text-sm text-muted-foreground">
                    {applications[column.id].length}
                  </span>
                </div>

                {/* Column Content */}
                <div
                  className={`flex-1 rounded-xl p-2 space-y-2 transition-colors ${
                    dragOverColumn === column.id ? "bg-primary/10" : "bg-muted/50"
                  }`}
                >
                  {applications[column.id].map((app) => (
                    <Card
                      key={app.id}
                      draggable
                      onDragStart={() => handleDragStart(app)}
                      onDragEnd={handleDragEnd}
                      className={`cursor-grab active:cursor-grabbing transition-all ${
                        draggedItem?.id === app.id ? "opacity-50 scale-95" : ""
                      } hover:border-primary/30`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <GripVertical className="w-4 h-4 text-muted-foreground/50 mt-1 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <Link
                                  href={`/jobs/${app.jobId}`}
                                  className="font-medium text-foreground hover:text-primary truncate block"
                                >
                                  {app.role}
                                </Link>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground truncate">
                                    {app.company}
                                  </span>
                                </div>
                              </div>
                              <div className="relative group">
                                <button className="text-muted-foreground hover:text-foreground">
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                                <div className="absolute right-0 top-6 z-10 w-40 rounded-lg border border-border bg-background shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                                  <Link
                                    href={`/jobs/${app.jobId}`}
                                    className="block px-3 py-2 text-sm text-foreground hover:bg-muted rounded-t-lg"
                                  >
                                    Voir l'offre
                                  </Link>
                                  <button
                                    onClick={async () => {
                                      if (confirm('Retirer cette candidature ?')) {
                                        try {
                                          await applicationsApi.withdraw(app.id)
                                          loadApplications()
                                        } catch { setFeedbackMsg('Erreur lors du retrait'); setTimeout(() => setFeedbackMsg(''), 3000) }
                                      }
                                    }}
                                    className="block w-full text-left px-3 py-2 text-sm text-destructive hover:bg-muted rounded-b-lg"
                                  >
                                    Retirer
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{app.date}</span>
                            </div>

                            {app.nextStep && (
                              <div className="flex items-center gap-1.5 mt-2 text-xs">
                                <ArrowRight className="w-3.5 h-3.5 text-primary" />
                                <span className="text-foreground">{app.nextStep}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {applications[column.id].length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <p className="text-sm text-muted-foreground">Aucune candidature</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        Glissez les cartes ici
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
