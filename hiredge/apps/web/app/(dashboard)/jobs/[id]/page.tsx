"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  FileText,
  Mail,
  Copy,
  Download,
  RefreshCw,
  Globe,
  Users,
  Wifi,
  CheckCircle2,
  Target,
  X,
} from "lucide-react"
import { jobsApi, applicationsApi, squadApi } from "@/lib/api"

interface Job {
  id: string
  title: string
  description: string
  location: string
  remote: boolean
  contractType: string
  salaryMin?: number | null
  salaryMax?: number | null
  experienceMin?: number | null
  experienceMax?: number | null
  experienceLevel?: string
  requiredSkills: string[] | string
  niceToHave?: string[] | string
  status: string
  postedAt: string
  sourceUrl?: string | null
  company?: {
    id: string
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

interface CoverLetterData {
  coverLetter: string
  generatedAt: string
}

interface CompanyAnalysisData {
  companyName: string
  industry?: string
  location?: string
  activeJobCount: number
  topSkills: string[]
  locations: string[]
  hasRemote: boolean
  jobTitles: string[]
  analysis: string | null
}

export default function JobDetailPage() {
  const params = useParams()
  const jobId = params.id as string
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const [activeTab, setActiveTab] = useState("offer")

  // Cover letter state
  const [coverLetter, setCoverLetter] = useState<CoverLetterData | null>(null)
  const [coverLetterLoading, setCoverLetterLoading] = useState(false)
  const [coverLetterError, setCoverLetterError] = useState<string | null>(null)

  // Company analysis state
  const [companyAnalysis, setCompanyAnalysis] = useState<CompanyAnalysisData | null>(null)
  const [companyLoading, setCompanyLoading] = useState(false)

  // Squad suggestion state (post-application)
  const [squadSuggestions, setSquadSuggestions] = useState<any[]>([])
  const [showSquadBanner, setShowSquadBanner] = useState(false)
  const [joiningSquad, setJoiningSquad] = useState<string | null>(null)

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

  const loadCoverLetter = async () => {
    if (coverLetter || coverLetterLoading) return
    try {
      setCoverLetterLoading(true)
      setCoverLetterError(null)
      const res = await jobsApi.getCoverLetter(jobId)
      if (res.data?.data) setCoverLetter(res.data.data)
    } catch (err: any) {
      setCoverLetterError(err.response?.data?.error?.message || "Erreur lors de la génération")
    } finally {
      setCoverLetterLoading(false)
    }
  }

  const regenerateCoverLetter = async () => {
    setCoverLetter(null)
    setCoverLetterLoading(true)
    setCoverLetterError(null)
    try {
      const res = await jobsApi.getCoverLetter(jobId)
      if (res.data?.data) setCoverLetter(res.data.data)
    } catch (err: any) {
      setCoverLetterError(err.response?.data?.error?.message || "Erreur lors de la génération")
    } finally {
      setCoverLetterLoading(false)
    }
  }

  const loadCompanyAnalysis = async () => {
    if (companyAnalysis || companyLoading) return
    try {
      setCompanyLoading(true)
      const res = await jobsApi.getCompanyAnalysis(jobId)
      if (res.data?.data) setCompanyAnalysis(res.data.data)
    } catch {
      // fail silently
    } finally {
      setCompanyLoading(false)
    }
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    if (tab === "letter") loadCoverLetter()
    if (tab === "company") loadCompanyAnalysis()
  }

  const handleApply = async () => {
    if (!job || applying) return
    try {
      setApplying(true)
      await applicationsApi.create({ jobId: job.id })
      setApplied(true)
      // Fetch squad suggestions post-application
      try {
        const { data } = await squadApi.getSuggestions(job.id)
        if (data.success && data.data?.show && data.data.squads?.length > 0) {
          setSquadSuggestions(data.data.squads)
          setShowSquadBanner(true)
        }
      } catch {
        // Squad suggestions are non-blocking
      }
    } catch {
      // error
    } finally {
      setApplying(false)
    }
  }

  const handleDismissSquad = async () => {
    setShowSquadBanner(false)
    try { await squadApi.dismiss() } catch {}
  }

  const handleJoinSuggestedSquad = async (squadId: string) => {
    try {
      setJoiningSquad(squadId)
      await squadApi.joinById(squadId)
      setShowSquadBanner(false)
    } catch {
      // error
    } finally {
      setJoiningSquad(null)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffHours < 1) return "À l'instant"
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays < 7) return `Il y a ${diffDays}j`
    return date.toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })
  }

  const formatSalary = (min?: number | null, max?: number | null) => {
    if (!min && !max) return null
    const fmt = (n: number) => n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`
    if (min && max) return `${fmt(min)} - ${fmt(max)} $`
    if (min) return `À partir de ${fmt(min)} $`
    return `Jusqu'à ${fmt(max!)} $`
  }

  const getContractLabel = (type: string) => {
    const labels: Record<string, string> = {
      CDI: "CDI", CDD: "CDD", FREELANCE: "Freelance",
      STAGE: "Stage", ALTERNANCE: "Alternance", TEMPS_PARTIEL: "Temps partiel",
      FULL_TIME: "Temps plein", PART_TIME: "Temps partiel", CONTRACT: "Contrat",
    }
    return labels[type] || type
  }

  const parseSkills = (skills: string[] | string | undefined): string[] => {
    if (!skills) return []
    if (Array.isArray(skills)) return skills
    try { return JSON.parse(skills) } catch { return [] }
  }

  const formatDescription = (text: string): string => {
    // Clean up common noise patterns from scraped descriptions
    let cleaned = text
      .replace(/^(Job Description\s*){1,3}/i, "")
      .replace(/^(Description du poste\s*){1,2}/i, "")
      .replace(/^(Intitul[ée] du poste\s*:?\s*)/i, "")
      .trim()
    // Escape HTML to prevent XSS
    const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    const escaped = escape(cleaned)
    const lines = escaped.split(/\n/)
    const result: string[] = []
    let inList = false

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) {
        if (inList) { result.push("</ul>"); inList = false }
        result.push("<br/>")
        continue
      }
      // Bullet points: •, -, *, ·, o (at start of line)
      if (/^[•\-\*·∙◦▪▸►]/.test(trimmed) || /^o\s/.test(trimmed)) {
        if (!inList) { result.push('<ul class="list-disc pl-5 space-y-1 my-2">'); inList = true }
        result.push(`<li>${trimmed.replace(/^[•\-\*·∙◦▪▸►o]\s*/, "")}</li>`)
        continue
      }
      if (inList) { result.push("</ul>"); inList = false }
      // Bold-like headers: lines that are short, title-case, and followed by content
      // Detect patterns like "About the team", "Our Purpose", "What will your typical day look like?"
      if (trimmed.length < 80 && /^[A-Z]/.test(trimmed) && !trimmed.endsWith(".") && !trimmed.endsWith(",")) {
        // Check if it looks like a section header (no sentence continuation)
        const looksLikeHeader = /^[A-Z][^.]*[a-z?!:]$/.test(trimmed) || /^[A-Z][^.]*$/.test(trimmed)
        if (looksLikeHeader && trimmed.split(" ").length <= 12) {
          result.push(`<h4 class="font-semibold text-foreground mt-4 mb-2">${trimmed}</h4>`)
          continue
        }
      }
      // Key:Value pairs like "Job Type: Permanent"
      if (/^[A-Z][A-Za-z\s]+:/.test(trimmed) && trimmed.length < 120) {
        const [key, ...rest] = trimmed.split(":")
        const value = rest.join(":").trim()
        if (value) {
          result.push(`<p class="my-1"><strong class="text-foreground">${key}:</strong> ${value}</p>`)
          continue
        }
      }
      result.push(`<p class="my-1">${trimmed}</p>`)
    }
    if (inList) result.push("</ul>")
    return result.join("")
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
          <p className="text-muted-foreground">Cette offre n&apos;existe plus ou a été retirée.</p>
        </div>
      </div>
    )
  }

  const skills = parseSkills(job.requiredSkills)
  const niceToHave = parseSkills(job.niceToHave)
  const salary = formatSalary(job.salaryMin, job.salaryMax)

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Back link */}
      <Link href="/jobs" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Retour aux offres
      </Link>

      {/* Header */}
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
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{job.location}{job.remote && " (Télétravail)"}</span>
                {salary && <span className="flex items-center gap-1"><DollarSign className="w-4 h-4" />{salary}</span>}
                <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" />{getContractLabel(job.contractType)}</span>
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{formatDate(job.postedAt)}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {job.matchScore != null && job.matchScore > 0 && (
                <div className={`px-4 py-2 rounded-xl font-semibold ${
                  job.matchScore >= 80 ? "bg-success/10 text-success"
                  : job.matchScore >= 50 ? "bg-primary/10 text-primary"
                  : "bg-amber-500/10 text-amber-600"
                }`}>
                  {job.matchScore}% Match
                </div>
              )}
              {job.sourceUrl ? (
                <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer">
                  <Button>
                    Postuler <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              ) : (
                <Button onClick={handleApply} disabled={applying || applied}>
                  {applied ? "Candidature envoyée" : applying ? "Envoi..." : "Postuler"}
                  {!applied && !applying && <ExternalLink className="w-4 h-4 ml-2" />}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* EDGE Analysis Card */}
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
                  || (job.matchScore != null && job.matchScore >= 70
                    ? "Ce poste correspond bien à ton profil ! Consulte la lettre de motivation que j'ai préparée et l'analyse de l'entreprise pour te préparer."
                    : job.matchScore != null && job.matchScore >= 40
                    ? "Ce poste présente un potentiel intéressant. J'ai préparé une lettre de motivation adaptée et une analyse de l'entreprise pour t'aider."
                    : "Découvre les détails de l'offre ci-dessous. J'ai préparé une lettre de motivation et une analyse de l'entreprise pour toi.")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Squad Suggestion Banner (post-application) */}
      {showSquadBanner && squadSuggestions.length > 0 && (
        <Card className="bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent border-blue-500/20 animate-in fade-in slide-in-from-top-2 duration-500">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">Candidature envoyée ! Rejoins une escouade</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    J&apos;ai trouvé des candidats avec un objectif similaire au tien. Rejoins une escouade pour vous soutenir mutuellement !
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {squadSuggestions.map((sq: any) => (
                      <div key={sq.id} className="rounded-xl border bg-background p-3 hover:border-primary/50 transition-colors">
                        <h4 className="font-medium text-sm text-foreground truncate">{sq.name}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {sq._count?.members || 0}/{sq.maxMembers || 10}
                          </span>
                          {sq.jobFamily && (
                            <span className="flex items-center gap-1">
                              <Target className="w-3 h-3" />
                              {sq.jobFamily}
                            </span>
                          )}
                          {sq.locationFilter && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {sq.locationFilter}
                            </span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => handleJoinSuggestedSquad(sq.id)}
                          disabled={joiningSquad === sq.id}
                        >
                          {joiningSquad === sq.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                          Rejoindre
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleDismissSquad} className="shrink-0">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs + Sidebar layout */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="border-b">
          <TabsList className="w-full justify-start bg-transparent rounded-none h-auto p-0 gap-6">
            <TabsTrigger value="offer" className="relative rounded-none border-0 bg-transparent! shadow-none! px-1 py-3 gap-2 text-muted-foreground data-[state=active]:text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-transparent data-[state=active]:after:bg-primary after:transition-all">
              <FileText className="w-4 h-4" />
              Offre d&apos;emploi
            </TabsTrigger>
            <TabsTrigger value="letter" className="relative rounded-none border-0 bg-transparent! shadow-none! px-1 py-3 gap-2 text-muted-foreground data-[state=active]:text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-transparent data-[state=active]:after:bg-primary after:transition-all">
              <Mail className="w-4 h-4" />
              Lettre de Motivation
            </TabsTrigger>
            <TabsTrigger value="company" className="relative rounded-none border-0 bg-transparent! shadow-none! px-1 py-3 gap-2 text-muted-foreground data-[state=active]:text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-transparent data-[state=active]:after:bg-primary after:transition-all">
              <Building2 className="w-4 h-4" />
              Analyse Entreprise
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* LEFT: Tab Content */}
          <div className="lg:col-span-2">
            {/* Tab 1: Full Job Offer */}
            <TabsContent value="offer" className="mt-0 space-y-6">
              {/* Quick Info Grid */}
              <Card>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Briefcase className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Contrat</p>
                        <p className="text-sm font-semibold">{getContractLabel(job.contractType)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <MapPin className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Lieu</p>
                        <p className="text-sm font-semibold">{job.location}{job.remote ? " (Télétravail)" : ""}</p>
                      </div>
                    </div>
                    {salary && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <DollarSign className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Salaire</p>
                          <p className="text-sm font-semibold">{salary}</p>
                        </div>
                      </div>
                    )}
                    {(job.experienceMin != null || job.experienceMax != null) && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <Star className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Expérience</p>
                          <p className="text-sm font-semibold">
                            {job.experienceMin != null && job.experienceMax != null
                              ? `${job.experienceMin}-${job.experienceMax} ans`
                              : job.experienceMin != null
                              ? `${job.experienceMin}+ ans`
                              : `Jusqu'à ${job.experienceMax} ans`}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Skills */}
              {skills.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Compétences requises</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill) => (
                        <span key={skill} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">{skill}</span>
                      ))}
                    </div>
                    {niceToHave.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Compétences appréciées</p>
                        <div className="flex flex-wrap gap-2">
                          {niceToHave.map((skill) => (
                            <span key={skill} className="px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-sm font-medium">{skill}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Description */}
              <Card>
                <CardHeader><CardTitle>Description du poste</CardTitle></CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: formatDescription(job.description) }}
                  />
                  {job.sourceUrl && (
                    <div className="mt-6 pt-4 border-t">
                      <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Voir l&apos;offre originale
                        </Button>
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 2: Cover Letter */}
            <TabsContent value="letter" className="mt-0 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Lettre de Motivation</CardTitle>
                    <div className="flex items-center gap-2">
                      {coverLetter && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => copyToClipboard(coverLetter.coverLetter)}>
                            <Copy className="w-4 h-4 mr-1" /> Copier
                          </Button>
                          <Button variant="outline" size="sm" onClick={regenerateCoverLetter}>
                            <RefreshCw className="w-4 h-4 mr-1" /> Régénérer
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {coverLetterLoading && (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                      <p className="text-muted-foreground">EDGE rédige ta lettre de motivation...</p>
                      <p className="text-xs text-muted-foreground mt-1">Analyse du poste et de ton profil en cours</p>
                    </div>
                  )}
                  {coverLetterError && (
                    <div className="text-center py-8">
                      <p className="text-destructive mb-4">{coverLetterError}</p>
                      <Button variant="outline" onClick={regenerateCoverLetter}>
                        <RefreshCw className="w-4 h-4 mr-2" /> Réessayer
                      </Button>
                    </div>
                  )}
                  {coverLetter && !coverLetterLoading && (
                    <div className="bg-muted/30 rounded-xl p-6">
                      <div className="prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed text-foreground">
                        {coverLetter.coverLetter}
                      </div>
                    </div>
                  )}
                  {!coverLetter && !coverLetterLoading && !coverLetterError && (
                    <div className="text-center py-8">
                      <Mail className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground mb-4">Clique pour générer une lettre de motivation personnalisée</p>
                      <Button onClick={loadCoverLetter}>Générer la lettre</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 3: Company Analysis */}
            <TabsContent value="company" className="mt-0 space-y-6">
              {companyLoading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Analyse de l&apos;entreprise en cours...</p>
                </div>
              )}
              {companyAnalysis && !companyLoading && (
                <>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
                          <Building2 className="w-7 h-7 text-muted-foreground" />
                        </div>
                        <div>
                          <CardTitle>{companyAnalysis.companyName}</CardTitle>
                          {companyAnalysis.industry && <p className="text-sm text-muted-foreground mt-1">{companyAnalysis.industry}</p>}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground">Offres actives</p>
                            <p className="font-semibold">{companyAnalysis.activeJobCount}</p>
                          </div>
                        </div>
                        {companyAnalysis.location && (
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-primary" />
                            <div>
                              <p className="text-xs text-muted-foreground">Localisation</p>
                              <p className="font-semibold text-sm">{companyAnalysis.location}</p>
                            </div>
                          </div>
                        )}
                        {companyAnalysis.hasRemote && (
                          <div className="flex items-center gap-2">
                            <Wifi className="w-4 h-4 text-success" />
                            <div>
                              <p className="text-xs text-muted-foreground">Télétravail</p>
                              <p className="font-semibold text-sm">Disponible</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {companyAnalysis.analysis && (
                    <Card>
                      <CardHeader><CardTitle>Analyse IA</CardTitle></CardHeader>
                      <CardContent>
                        <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {companyAnalysis.analysis}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {companyAnalysis.topSkills.length > 0 && (
                    <Card>
                      <CardHeader><CardTitle>Technologies les plus demandées</CardTitle></CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {companyAnalysis.topSkills.map((skill) => (
                            <span key={skill} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">{skill}</span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {companyAnalysis.jobTitles.length > 0 && (
                    <Card>
                      <CardHeader><CardTitle>Postes actuellement ouverts</CardTitle></CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {companyAnalysis.jobTitles.map((title, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                              {title}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
              {!companyAnalysis && !companyLoading && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Building2 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">Aucune donnée disponible pour cette entreprise.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </div>

          {/* RIGHT SIDEBAR: Compatibility Score + Key Strengths */}
          <div className="space-y-6">
            {/* Compatibility Score */}
            {job.matchScore != null && job.matchScore > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Score de compatibilité</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center mb-6">
                    <div className="relative w-32 h-32">
                      <svg className="w-full h-full -rotate-90">
                        <circle cx="64" cy="64" r="56" strokeWidth="8" fill="none" className="stroke-muted" />
                        <circle cx="64" cy="64" r="56" strokeWidth="8" fill="none" strokeDasharray={`${(job.matchScore / 100) * 352} 352`} className={job.matchScore >= 70 ? "stroke-success" : job.matchScore >= 40 ? "stroke-primary" : "stroke-amber-500"} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-bold text-foreground">{job.matchScore}%</span>
                      </div>
                    </div>
                  </div>
                  {job.matchDetails && (
                    <div className="space-y-3">
                      {[
                        { label: "Compétences", value: job.matchDetails.skills },
                        { label: "Pertinence", value: job.matchDetails.semantic },
                        { label: "Expérience", value: job.matchDetails.experience },
                        { label: "Salaire", value: job.matchDetails.salary },
                        { label: "Localisation", value: job.matchDetails.location },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-24">{label}</span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${value >= 70 ? "bg-primary" : value >= 40 ? "bg-primary" : "bg-amber-500"}`}
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

            {/* Key Strengths */}
            {job.sellingPoints && job.sellingPoints.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Points forts</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {job.sellingPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Star className="w-4 h-4 text-success shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Gaps */}
            {job.gaps && job.gaps.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Points à travailler</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {job.gaps.map((gap, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                        <span className="text-muted-foreground">{gap}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Required Skills quick view */}
            {skills.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Compétences clés</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {skills.slice(0, 8).map((skill) => (
                      <span key={skill} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{skill}</span>
                    ))}
                    {skills.length > 8 && (
                      <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs">+{skills.length - 8}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </Tabs>
    </div>
  )
}
