"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Search,
  Filter,
  Building2,
  MapPin,
  Clock,
  Bookmark,
  BookmarkCheck,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react"
import { jobsApi, JobSearchParams } from "@/lib/api"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Job {
  id: string
  title: string
  company: string | { id: string; name: string; logo?: string; industry?: string }
  location: string
  salary?: string
  salaryMin?: number
  salaryMax?: number
  type: string
  contractType?: string
  match?: number
  matchScore?: number
  postedAt: string
  skills: string[]
  requiredSkills?: string[]
  strengths?: string[]
  gaps?: string[]
  remote?: boolean
  description?: string
}

function getCompanyName(company: Job['company']): string {
  if (typeof company === 'string') return company
  return company?.name || 'Entreprise'
}

function formatSalary(job: Job): string {
  if (job.salary) return job.salary
  if (job.salaryMin && job.salaryMax) {
    return `${job.salaryMin.toLocaleString()}€ - ${job.salaryMax.toLocaleString()}€`
  }
  if (job.salaryMin) return `À partir de ${job.salaryMin.toLocaleString()}€`
  return "Salaire non précisé"
}

function formatPostedAt(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffHours < 1) return "À l'instant"
  if (diffHours < 24) return `Il y a ${diffHours}h`
  if (diffDays < 7) return `Il y a ${diffDays}j`
  return date.toLocaleDateString('fr-FR')
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [locationFilter, setLocationFilter] = useState("")
  const [contractFilter, setContractFilter] = useState<string>("")
  const [savedJobs, setSavedJobs] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [totalJobs, setTotalJobs] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [sortBy, setSortBy] = useState<"match" | "date">("match")

  // Load jobs on mount and when filters change
  useEffect(() => {
    loadJobs()
  }, [])

  const loadJobs = async (params: JobSearchParams = {}, append = false) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const currentPage = append ? page + 1 : 1
      
      const searchParams: JobSearchParams = {
        q: searchQuery || undefined,
        location: locationFilter || undefined,
        contract: contractFilter || undefined,
        limit: 50,
        page: currentPage,
        ...params,
      }
      
      const { data } = await jobsApi.search(searchParams)
      
      if (data.success) {
        const newJobs = data.data || []
        // Sort by match score if available
        const sortedJobs = sortBy === "match" 
          ? newJobs.sort((a: Job, b: Job) => (b.matchScore || 0) - (a.matchScore || 0))
          : newJobs
        
        if (append) {
          setJobs(prev => [...prev, ...sortedJobs])
          setPage(currentPage)
        } else {
          setJobs(sortedJobs)
          setPage(1)
        }
        setTotalJobs(data.pagination?.total || data.data?.length || 0)
        setHasMore(data.pagination?.page < data.pagination?.totalPages)
      }
    } catch (err: any) {
      console.error("Failed to load jobs:", err)
      setError(err.response?.data?.error?.message || "Erreur lors du chargement des offres")
    } finally {
      setIsLoading(false)
    }
  }

  const loadMore = () => {
    loadJobs({}, true)
  }

  const handleSearch = () => {
    loadJobs()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const clearFilters = () => {
    setSearchQuery("")
    setLocationFilter("")
    setContractFilter("")
    loadJobs({ q: undefined, location: undefined, contract: undefined })
  }

  const toggleSave = (jobId: string) => {
    setSavedJobs((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    )
  }

  const getMatchScore = (job: Job) => job.match || job.matchScore || 0
  const getSkills = (job: Job) => job.skills || job.requiredSkills || []

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Offres d'emploi</h1>
          <p className="text-muted-foreground mt-1">
            {totalJobs > 0 ? `${totalJobs} offres trouvées` : "Recherchez des offres correspondant à votre profil"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un poste, une entreprise..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4" />
          </Button>
          <Button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <Input
                placeholder="Ville, région..."
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-48"
              />
              <Select value={contractFilter} onValueChange={setContractFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Type de contrat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cdi">CDI</SelectItem>
                  <SelectItem value="cdd">CDD</SelectItem>
                  <SelectItem value="stage">Stage</SelectItem>
                  <SelectItem value="alternance">Alternance</SelectItem>
                  <SelectItem value="freelance">Freelance</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" /> Effacer
              </Button>
              <Button size="sm" onClick={handleSearch}>
                Appliquer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Summary */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="p-4 lg:p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-foreground">
                <span className="font-semibold">EDGE Analysis: </span>
                {jobs.length > 0
                  ? `J'ai trouvé ${jobs.length} offres qui correspondent à ton profil. Utilise les filtres pour affiner ta recherche.`
                  : "Lance une recherche pour découvrir des offres qui correspondent à ton profil !"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Card className="border-destructive">
          <CardContent className="p-6 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button variant="outline" onClick={() => loadJobs()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Réessayer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && jobs.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune offre trouvée</h3>
            <p className="text-muted-foreground mb-4">
              Essaie de modifier tes critères de recherche ou d'élargir ta zone géographique.
            </p>
            <Button onClick={clearFilters}>Réinitialiser les filtres</Button>
          </CardContent>
        </Card>
      )}

      {/* Job List */}
      {!isLoading && !error && jobs.length > 0 && (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Card key={job.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  {/* Company Logo */}
                  <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Building2 className="w-7 h-7 text-muted-foreground" />
                  </div>

                  {/* Job Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Link
                          href={`/jobs/${job.id}`}
                          className="text-lg font-semibold text-foreground hover:text-primary transition-colors"
                        >
                          {job.title}
                        </Link>
                        <p className="text-muted-foreground">{getCompanyName(job.company)}</p>
                      </div>
                      {getMatchScore(job) > 0 && (
                        <div className="flex items-center gap-2 shrink-0">
                          <div className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                            getMatchScore(job) >= 90
                              ? "bg-success/10 text-success"
                              : getMatchScore(job) >= 80
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {getMatchScore(job)}% Match
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Job Details */}
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {job.location || "Non précisé"}
                        {job.remote && " (Remote)"}
                      </span>
                      <span>{formatSalary(job)}</span>
                      <span>{job.contractType || job.type}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatPostedAt(job.postedAt)}
                      </span>
                    </div>

                    {/* Skills */}
                    {getSkills(job).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {getSkills(job).slice(0, 5).map((skill) => (
                          <span
                            key={skill}
                            className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                        {getSkills(job).length > 5 && (
                          <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                            +{getSkills(job).length - 5}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Strengths & Gaps (if available from matching) */}
                    {(job.strengths?.length || job.gaps?.length) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {job.strengths && job.strengths.length > 0 && (
                          <div className="flex items-start gap-2">
                            <TrendingUp className="w-4 h-4 text-success mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-success mb-1">Points forts</p>
                              <p className="text-sm text-muted-foreground">{job.strengths.join(", ")}</p>
                            </div>
                          </div>
                        )}
                        {job.gaps && job.gaps.length > 0 && (
                          <div className="flex items-start gap-2">
                            <TrendingDown className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-warning mb-1">À développer</p>
                              <p className="text-sm text-muted-foreground">{job.gaps.join(", ")}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex lg:flex-col items-center gap-2 shrink-0">
                    <Button asChild>
                      <Link href={`/jobs/${job.id}`}>
                        Voir détails
                        <ArrowUpRight className="w-4 h-4 ml-1" />
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleSave(job.id)}
                      className={savedJobs.includes(job.id) ? "text-primary" : ""}
                    >
                      {savedJobs.includes(job.id) ? (
                        <BookmarkCheck className="w-4 h-4" />
                      ) : (
                        <Bookmark className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={loadMore} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Voir plus d'offres ({jobs.length} / {totalJobs})
              </Button>
            </div>
          )}
          
          {/* Showing count */}
          {!hasMore && jobs.length > 0 && (
            <p className="text-center text-sm text-muted-foreground pt-4">
              {jobs.length} offres affichées sur {totalJobs}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
