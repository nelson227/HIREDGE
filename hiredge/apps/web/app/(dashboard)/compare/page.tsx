"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Loader2,
  Search,
  GitCompareArrows,
  MapPin,
  DollarSign,
  Building2,
  Briefcase,
  Check,
  X,
} from "lucide-react"
import { analyticsApi, jobsApi } from "@/lib/api"

interface SelectedJobInfo {
  title: string
  company: string
  location?: string
}

interface CompareResult {
  jobs: Array<{
    id: string
    title: string
    company: string
    location?: string
    contractType?: string
    salary?: { min?: number | null; max?: number | null; currency?: string }
    remote?: boolean
    skills?: string[]
    postedAt?: string
    source?: string
    matchScore?: number
    matchingSkills?: number
    totalRequiredSkills?: number
    pros?: string[]
    cons?: string[]
  }>
  recommendation?: string
}

function getCompanyName(company: any): string {
  if (!company) return 'N/A'
  if (typeof company === 'string') return company
  return company.name || 'N/A'
}

export default function ComparePage() {
  const [jobIds, setJobIds] = useState<string[]>(["", ""])
  const [jobInfoMap, setJobInfoMap] = useState<Record<string, SelectedJobInfo>>({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CompareResult | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Autocomplete: debounced search as user types
  const searchJobs = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 1) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }
    setSearching(true)
    try {
      const { data } = await jobsApi.search({ q: query, limit: 8 })
      const jobs = Array.isArray(data.data) ? data.data : (data.data?.jobs || [])
      setSearchResults(jobs)
      setShowDropdown(jobs.length > 0)
    } catch {
      setSearchResults([])
      setShowDropdown(false)
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!searchQuery.trim()) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }
    debounceRef.current = setTimeout(() => {
      searchJobs(searchQuery)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQuery, searchJobs])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const addJobId = (job: { id: string; title: string; company?: any; location?: string }) => {
    if (jobIds.includes(job.id)) return
    const emptyIndex = jobIds.findIndex((j) => !j)
    if (emptyIndex !== -1) {
      const updated = [...jobIds]
      updated[emptyIndex] = job.id
      setJobIds(updated)
    } else {
      setJobIds([...jobIds, job.id])
    }
    setJobInfoMap((prev) => ({ ...prev, [job.id]: { title: job.title, company: getCompanyName(job.company), location: job.location } }))
    setSearchResults([])
    setSearchQuery("")
    setShowDropdown(false)
  }

  const removeJobId = (index: number) => {
    const updated = [...jobIds]
    updated[index] = ""
    setJobIds(updated)
  }

  const compare = async () => {
    const validIds = jobIds.filter(Boolean)
    if (validIds.length < 2) return
    setLoading(true)
    setResult(null)
    try {
      const { data } = await analyticsApi.compare(validIds)
      if (data.success) setResult(data.data)
    } catch { /* no-op */ }
    finally { setLoading(false) }
  }

  const filledCount = jobIds.filter(Boolean).length

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Comparer des offres</h1>
        <p className="text-muted-foreground mt-1">Comparez des offres d&apos;emploi côte à côte avec l&apos;analyse IA</p>
      </div>

      {/* Search & Select */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Search className="w-5 h-5" /> Sélectionner des offres</CardTitle>
          <CardDescription>Recherchez et ajoutez au moins 2 offres à comparer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if (searchResults.length > 0) setShowDropdown(true) }}
                placeholder="Tapez pour rechercher une offre par titre, entreprise..."
                className="flex-1"
              />
              {searching && (
                <div className="flex items-center pr-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Autocomplete dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div ref={dropdownRef} className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg max-h-80 overflow-y-auto">
                {searchResults.map((job: any) => (
                  <button
                    key={job.id}
                    onClick={() => addJobId({ id: job.id, title: job.title, company: job.company, location: job.location })}
                    className="w-full text-left px-4 py-3 hover:bg-muted transition-colors flex items-center justify-between border-b border-border last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{job.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{getCompanyName(job.company)}{job.location ? ` · ${job.location}` : ''}</p>
                    </div>
                    {jobIds.includes(job.id) ? (
                      <span className="text-xs text-muted-foreground ml-2 shrink-0">Déjà ajouté</span>
                    ) : (
                      <Check className="w-4 h-4 text-primary ml-2 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected jobs */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Offres sélectionnées ({filledCount})</p>
            {jobIds.map((id, i) => (
              <div key={i} className="flex items-center gap-2">
                {id && jobInfoMap[id] ? (
                  <div className="flex-1 flex items-center gap-2 rounded-lg border border-border px-3 py-2 bg-muted/50">
                    <Briefcase className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{jobInfoMap[id].title}</p>
                      <p className="text-xs text-muted-foreground truncate">{jobInfoMap[id].company}{jobInfoMap[id].location ? ` · ${jobInfoMap[id].location}` : ""}</p>
                    </div>
                  </div>
                ) : (
                  <Input
                    value={id}
                    onChange={(e) => { const u = [...jobIds]; u[i] = e.target.value; setJobIds(u) }}
                    placeholder={`ID de l'offre ${i + 1}`}
                    className="flex-1 font-mono text-xs"
                  />
                )}
                {id && (
                  <Button variant="ghost" size="icon" onClick={() => removeJobId(i)}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {jobIds.length < 5 && (
              <Button variant="outline" size="sm" onClick={() => setJobIds([...jobIds, ""])}>
                + Ajouter une offre
              </Button>
            )}
          </div>

          <Button onClick={compare} disabled={loading || filledCount < 2} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <GitCompareArrows className="w-4 h-4 mr-2" />}
            Comparer ({filledCount} offres)
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Side by side cards */}
          <div className={`grid gap-4 ${result.jobs.length === 2 ? 'grid-cols-1 md:grid-cols-2' : result.jobs.length === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
            {result.jobs.map((job, i) => (
              <Card key={i} className={job.matchScore && job.matchScore >= 80 ? "border-primary" : ""}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{job.title}</CardTitle>
                  <CardDescription className="space-y-1">
                    <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{job.company}</span>
                    {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>}
                    {job.salary && (job.salary.min || job.salary.max) && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {job.salary.min?.toLocaleString() || '?'} - {job.salary.max?.toLocaleString() || '?'} {job.salary.currency || '$'}
                      </span>
                    )}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {job.contractType && <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{job.contractType}</span>}
                      {job.remote && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">Remote</span>}
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {job.matchScore !== undefined && (
                    <div className="text-center p-3 rounded-xl bg-primary/10">
                      <p className="text-2xl font-bold text-primary">{job.matchScore}%</p>
                      <p className="text-xs text-muted-foreground">Match{job.matchingSkills !== undefined ? ` · ${job.matchingSkills}/${job.totalRequiredSkills} compétences` : ''}</p>
                    </div>
                  )}
                  {job.skills && job.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {job.skills.slice(0, 6).map((skill, si) => (
                        <span key={si} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{skill}</span>
                      ))}
                      {job.skills.length > 6 && <span className="text-xs text-muted-foreground">+{job.skills.length - 6}</span>}
                    </div>
                  )}
                  {job.pros && job.pros.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-green-500 mb-1">Avantages</p>
                      <ul className="space-y-1">
                        {job.pros.map((p, j) => (
                          <li key={j} className="text-xs text-foreground flex items-start gap-1">
                            <Check className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {job.cons && job.cons.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-red-500 mb-1">Inconvénients</p>
                      <ul className="space-y-1">
                        {job.cons.map((c, j) => (
                          <li key={j} className="text-xs text-foreground flex items-start gap-1">
                            <X className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* AI Recommendation */}
          {result.recommendation && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  Recommandation IA
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground whitespace-pre-wrap">{result.recommendation}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
