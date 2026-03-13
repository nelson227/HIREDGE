"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Plus,
  Building2,
  Calendar,
  MoreHorizontal,
  GripVertical,
  ArrowRight,
  Bell,
} from "lucide-react"
import Link from "next/link"

type ApplicationStatus = "draft" | "applied" | "screening" | "interview" | "offer" | "rejected"

type Application = {
  id: string
  company: string
  role: string
  date: string
  nextStep?: string
  reminder?: string
  status: ApplicationStatus
}

const initialApplications: Record<ApplicationStatus, Application[]> = {
  draft: [
    {
      id: "1",
      company: "FinanceApp",
      role: "Product Designer",
      date: "Mar 10, 2026",
      status: "draft",
    },
  ],
  applied: [
    {
      id: "2",
      company: "TechCorp Inc.",
      role: "Senior Product Designer",
      date: "Mar 8, 2026",
      nextStep: "Waiting for response",
      status: "applied",
    },
    {
      id: "3",
      company: "StartupXYZ",
      role: "UX Lead",
      date: "Mar 5, 2026",
      nextStep: "Recruiter reviewing",
      status: "applied",
    },
  ],
  screening: [
    {
      id: "4",
      company: "DesignCo",
      role: "Design Director",
      date: "Mar 3, 2026",
      nextStep: "Phone screen scheduled",
      reminder: "Tomorrow, 2:00 PM",
      status: "screening",
    },
  ],
  interview: [
    {
      id: "5",
      company: "HealthTech Solutions",
      role: "Senior UX Designer",
      date: "Feb 28, 2026",
      nextStep: "Final round",
      reminder: "Wed, 10:00 AM",
      status: "interview",
    },
  ],
  offer: [
    {
      id: "6",
      company: "CloudServices",
      role: "Product Designer",
      date: "Feb 20, 2026",
      nextStep: "Negotiating offer",
      status: "offer",
    },
  ],
  rejected: [
    {
      id: "7",
      company: "BigTech Corp",
      role: "UX Designer",
      date: "Feb 15, 2026",
      status: "rejected",
    },
  ],
}

const columns: { id: ApplicationStatus; label: string; color: string }[] = [
  { id: "draft", label: "Draft", color: "bg-muted-foreground" },
  { id: "applied", label: "Applied", color: "bg-primary" },
  { id: "screening", label: "Screening", color: "bg-chart-2" },
  { id: "interview", label: "Interview", color: "bg-warning" },
  { id: "offer", label: "Offer", color: "bg-success" },
  { id: "rejected", label: "Rejected", color: "bg-destructive" },
]

export default function ApplicationsPage() {
  const [applications, setApplications] = useState(initialApplications)
  const [draggedItem, setDraggedItem] = useState<Application | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<ApplicationStatus | null>(null)

  const handleDragStart = (app: Application) => {
    setDraggedItem(app)
  }

  const handleDragOver = (e: React.DragEvent, status: ApplicationStatus) => {
    e.preventDefault()
    setDragOverColumn(status)
  }

  const handleDrop = (status: ApplicationStatus) => {
    if (!draggedItem) return

    const oldStatus = draggedItem.status
    if (oldStatus === status) {
      setDraggedItem(null)
      setDragOverColumn(null)
      return
    }

    setApplications((prev) => ({
      ...prev,
      [oldStatus]: prev[oldStatus].filter((app) => app.id !== draggedItem.id),
      [status]: [...prev[status], { ...draggedItem, status }],
    }))

    setDraggedItem(null)
    setDragOverColumn(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverColumn(null)
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Application Pipeline</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage your job applications
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Application
        </Button>
      </div>

      {/* Kanban Board */}
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
                                href={`/jobs/${app.id}`}
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
                            <button className="text-muted-foreground hover:text-foreground">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
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

                          {app.reminder && (
                            <div className="flex items-center gap-1.5 mt-2 text-xs">
                              <Bell className="w-3.5 h-3.5 text-warning" />
                              <span className="text-warning font-medium">{app.reminder}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {applications[column.id].length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-sm text-muted-foreground">No applications</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Drag cards here or add new
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
