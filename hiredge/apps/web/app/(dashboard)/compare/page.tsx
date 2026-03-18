"use client"

import { useState } from "react"
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

interface CompareResult {
  jobs: Array<{
    id: string
    title: string
    company: string
    location?: string
    salary?: string
    matchScore?: number
    pros?: string[]
    cons?: string[]
  }>
  recommendation?: string
}

export default function ComparePage() {
  const [jobIds, setJobIds] = useState<string[]>(["", ""])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CompareResult | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  const addJobId = (id: string) => {
    const emptyIndex = jobIds.findIndex((j) => !j)
    if (emptyIndex !== -1) {
      const updated = [...jobIds]
      updated[emptyIndex] = id
      setJobIds(updated)
    } else {
      setJobIds([...jobIds, id])
    }
    setSearchResults([])
    setSearchQuery("")
  }

  const removeJobId = (index: number) => {
    const updated = [...jobIds]
    updated[index] = ""
    setJobIds(updated)
  }

  const searchJobs = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const { data } = await jobsApi.search({ q: searchQuery, limit: 5 })
      setSearchResults(data.data?.jobs || [])
    } catch { /* no-op */ }
    finally { setSearching(false) }
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
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchJobs()}
              placeholder="Rechercher une offre par titre, entreprise..."
              className="flex-1"
            />
            <Button onClick={searchJobs} disabled={searching || !searchQuery.trim()}>
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="space-y-2 border border-border rounded-lg p-3">
              {searchResults.map((job: any) => (
                <button
                  key={job.id}
                  onClick={() => addJobId(job.id)}
                  className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{job.title}</p>
                    <p className="text-xs text-muted-foreground">{job.company} · {job.location}</p>
                  </div>
                  <Check className="w-4 h-4 text-primary" />
                </button>
              ))}
            </div>
          )}

          {/* Selected jobs */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Offres sélectionnées ({filledCount})</p>
            {jobIds.map((id, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={id}
                  onChange={(e) => { const u = [...jobIds]; u[i] = e.target.value; setJobIds(u) }}
                  placeholder={`ID de l'offre ${i + 1}`}
                  className="flex-1 font-mono text-xs"
                />
                {id && (
                  <Button variant="ghost" size="icon" onClick={() => removeJobId(i)}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {jobIds.length < 4 && (
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
                    {job.salary && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{job.salary}</span>}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {job.matchScore !== undefined && (
                    <div className="text-center p-3 rounded-xl bg-primary/10">
                      <p className="text-2xl font-bold text-primary">{job.matchScore}%</p>
                      <p className="text-xs text-muted-foreground">Match</p>
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
