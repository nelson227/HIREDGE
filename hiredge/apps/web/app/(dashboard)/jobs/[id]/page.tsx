"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft,
  Building2,
  MapPin,
  Briefcase,
  DollarSign,
  Clock,
  ExternalLink,
  Bot,
  Loader2,
  Star,
} from "lucide-react"
import { jobsApi, applicationsApi } from "@/lib/api"

interface Job {
  id: string
  title: string
  description: string
  location: string
  remote: boolean
  contractType: string
  salaryMin?: number | null
  salaryMax?: number | null
  experienceLevel?: string
  requiredSkills: string[] | string
  status: string
  postedAt: string
  sourceUrl?: string | null
  company?: {
    name: string
    industry?: string
    location?: string
  }
  matchScore?: number
  matchDetails?: {
    semantic: number
    skills: number
    experience: number
    salary: number
    location: number
    recency: number
  }
  matchAnalysis?: string
  sellingPoints?: string[]
  gaps?: string[]
}

export default function JobDetailPage() {
  const params = useParams()
  const jobId = params.id as string
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)

  useEffect(() => {
    if (jobId) loadJob()
  }, [jobId])

  const loadJob = async () => {
    try {
      setLoading(true)
      const res = await jobsApi.getById(jobId)
      if (res.data?.data) setJob(res.data.data)
      else if (res.data) setJob(res.data)
    } catch {
      // job not found
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    if (!job || applying) return
    try {
      setApplying(true)
      await applicationsApi.create({ jobId: job.id })
      setApplied(true)
    } catch {
      // error
    } finally {
      setApplying(false)
    }
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

  const formatSalary = (min?: number | null, max?: number | null) => {
    if (!min && !max) return null
    const fmt = (n: number) => n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`
    if (min && max) return `${fmt(min)} - ${fmt(max)} EUR`
    if (min) return `A partir de ${fmt(min)} EUR`
    return `Jusqu${String.fromCharCode(39)}a ${fmt(max!)} EUR`
  }

  const getContractLabel = (type: string) => {
    const labels: Record<string, string> = {
      CDI: "CDI", CDD: "CDD", FREELANCE: "Freelance",
      STAGE: "Stage", ALTERNANCE: "Alternance", TEMPS_PARTIEL: "Temps partiel",
    }
    return labels[type] || type
  }

  const parseSkills = (skills: string[] | string): string[] => {
    if (Array.isArray(skills)) return skills
    try { return JSON.parse(skills) } catch { return [] }
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

  if (!job) {
    return (
      <div className="p-4 lg:p-8">
        <Link href="/jobs" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Retour aux offres
        </Link>
        <div className="text-center py-16">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Offre introuvable</h2>
          <p className="text-muted-foreground">Cette offre n&apos;existe plus ou a ete retiree.</p>
        </div>
      </div>
    )
  }

  const skills = parseSkills(job.requiredSkills)
  const salary = formatSalary(job.salaryMin, job.salaryMax)

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <Link href="/jobs" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Retour aux offres
      </Link>

      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-muted flex items-center justify-center shrink-0">
          <Building2 className="w-8 h-8 lg:w-10 lg:h-10 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{job.title}</h1>
              <p className="text-lg text-muted-foreground mt-1">{job.company?.name ?? "Entreprise"}</p>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{job.location}{job.remote && " (Teletravail)"}</span>
                {salary && <span className="flex items-center gap-1"><DollarSign className="w-4 h-4" />{salary}</span>}
                <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" />{getContractLabel(job.contractType)}</span>
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{formatDate(job.postedAt)}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {job.matchScore != null && (
                <div className="px-4 py-2 rounded-xl bg-success/10 text-success font-semibold">{job.matchScore}% Compatible</div>
              )}
              <Button onClick={handleApply} disabled={applying || applied}>
                {applied ? "Candidature envoyee" : applying ? "Envoi..." : "Postuler"}
                {!applied && !applying && <ExternalLink className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <Bot className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-2">Analyse EDGE</h3>
              <p className="text-muted-foreground">
                {job.matchAnalysis
                  ? job.matchAnalysis
                  : job.matchScore != null && job.matchScore >= 80
                  ? "Cette offre correspond bien a ton profil ! Tes competences s'alignent avec les exigences du poste."
                  : job.matchScore != null && job.matchScore >= 50
                  ? "Ce poste presente un potentiel interessant. Tu as certaines des competences recherchees."
                  : "Consulte les details de l'offre pour voir si elle correspond a tes attentes."}
              </p>
              {job.sellingPoints && job.sellingPoints.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-success mb-1">Tes points forts :</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {job.sellingPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-success mt-0.5">✓</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {job.gaps && job.gaps.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-amber-500 mb-1">Points a travailler :</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {job.gaps.map((gap, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">!</span>
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Description du poste</CardTitle></CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">{job.description}</div>
            </CardContent>
          </Card>

          {job.company && (
            <Card>
              <CardHeader><CardTitle>A propos de l&apos;entreprise</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{job.company.name}</h4>
                    {job.company.industry && <p className="text-sm text-muted-foreground">{job.company.industry}</p>}
                    {job.company.location && <p className="text-sm text-muted-foreground">{job.company.location}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {job.sourceUrl && (
            <Card>
              <CardContent className="p-4">
                <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                  <ExternalLink className="w-4 h-4" />
                  Voir l&apos;offre originale
                </a>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {job.matchScore != null && (
            <Card>
              <CardHeader><CardTitle className="text-base">Score de compatibilite</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center justify-center mb-4">
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full -rotate-90">
                      <circle cx="64" cy="64" r="56" strokeWidth="8" fill="none" className="stroke-muted" />
                      <circle cx="64" cy="64" r="56" strokeWidth="8" fill="none" strokeDasharray={`${(job.matchScore / 100) * 352} 352`} className={job.matchScore >= 80 ? "stroke-success" : job.matchScore >= 50 ? "stroke-primary" : "stroke-amber-500"} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold text-foreground">{job.matchScore}%</span>
                    </div>
                  </div>
                </div>
                {job.matchDetails && (
                  <div className="space-y-2 mt-4">
                    {[
                      { label: "Competences", value: job.matchDetails.skills },
                      { label: "Pertinence", value: job.matchDetails.semantic },
                      { label: "Experience", value: job.matchDetails.experience },
                      { label: "Salaire", value: job.matchDetails.salary },
                      { label: "Localisation", value: job.matchDetails.location },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-24">{label}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${value >= 80 ? "bg-success" : value >= 50 ? "bg-primary" : "bg-amber-500"}`}
                            style={{ width: `${value}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium w-8 text-right">{value}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {skills.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Competences requises</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <span key={skill} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{skill}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Contrat :</span>
                <span className="text-sm font-medium text-foreground">{getContractLabel(job.contractType)}</span>
              </div>
              {job.experienceLevel && (
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Niveau :</span>
                  <span className="text-sm font-medium text-foreground">{job.experienceLevel}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Lieu :</span>
                <span className="text-sm font-medium text-foreground">{job.location}{job.remote ? " (Teletravail)" : ""}</span>
              </div>
              {salary && (
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Salaire :</span>
                  <span className="text-sm font-medium text-foreground">{salary}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
