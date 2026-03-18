"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DollarSign,
  TrendingUp,
  Loader2,
  BarChart3,
  Search,
  AlertCircle,
  Info,
} from "lucide-react"
import { salaryApi } from "@/lib/api"

export default function SalaryPage() {
  const [tab, setTab] = useState<"data" | "contribute">("data")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [searchError, setSearchError] = useState<string | null>(null)

  // Data tab
  const [dataForm, setDataForm] = useState({ title: "", jobFamily: "", location: "", experienceLevel: "", company: "" })

  // Contribute tab
  const [contribForm, setContribForm] = useState({
    jobTitle: "", jobFamily: "", location: "", country: "CA", experienceLevel: "", salary: "",
  })
  const [contributed, setContributed] = useState(false)
  const [contribError, setContribError] = useState<string | null>(null)

  const searchSalary = async () => {
    if (!dataForm.title && !dataForm.jobFamily) return
    setLoading(true)
    setResult(null)
    setSearchError(null)
    try {
      const { data } = await salaryApi.getData(dataForm)
      if (data.success) {
        setResult(data.data)
      } else {
        setSearchError(data.error?.message || "Erreur lors de la recherche")
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || "Erreur de connexion au serveur"
      setSearchError(msg)
    } finally { setLoading(false) }
  }

  const contribute = async () => {
    if (!contribForm.jobTitle || !contribForm.salary || !contribForm.location) return
    setLoading(true)
    setContribError(null)
    try {
      const resp = await salaryApi.contribute({
        ...contribForm,
        salary: parseInt(contribForm.salary),
        experienceLevel: contribForm.experienceLevel || "mid",
      })
      if (resp.data.success) setContributed(true)
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message
      if (err?.response?.status === 422 && msg) {
        setContribError(msg)
      } else {
        setContribError("Une erreur est survenue. Veuillez réessayer.")
      }
    } finally { setLoading(false) }
  }

  const tabs = [
    { id: "data", label: "Explorer les salaires", icon: BarChart3 },
    { id: "contribute", label: "Contribuer", icon: TrendingUp },
  ] as const

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Explorateur de Salaires</h1>
        <p className="text-muted-foreground mt-1">Données salariales en temps réel basées sur le marché et la communauté</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setResult(null); setContribError(null) }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Data Tab */}
      {tab === "data" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Search className="w-5 h-5" /> Rechercher</CardTitle>
              <CardDescription>Consultez les données salariales par poste et localisation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Titre de poste</label>
                <Input
                  value={dataForm.title}
                  onChange={(e) => setDataForm({...dataForm, title: e.target.value})}
                  placeholder="Ex: Software Engineer, Product Manager"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Famille de métier</label>
                <Input
                  value={dataForm.jobFamily}
                  onChange={(e) => setDataForm({...dataForm, jobFamily: e.target.value})}
                  placeholder="Ex: Développement, Product, Data"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Localisation</label>
                <Input
                  value={dataForm.location}
                  onChange={(e) => setDataForm({...dataForm, location: e.target.value})}
                  placeholder="Ex: Montréal, Toronto, Remote"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Entreprise (optionnel)</label>
                <Input
                  value={dataForm.company}
                  onChange={(e) => setDataForm({...dataForm, company: e.target.value})}
                  placeholder="Ex: Google, Shopify, Desjardins"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Niveau d&apos;expérience</label>
                <select
                  value={dataForm.experienceLevel}
                  onChange={(e) => setDataForm({...dataForm, experienceLevel: e.target.value})}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Tous niveaux</option>
                  <option value="junior">Junior (0-2 ans)</option>
                  <option value="mid">Confirmé (3-5 ans)</option>
                  <option value="senior">Senior (6-10 ans)</option>
                  <option value="lead">Lead/Staff (10+ ans)</option>
                </select>
              </div>
              <Button onClick={searchSalary} disabled={loading || (!dataForm.title && !dataForm.jobFamily)} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                Rechercher
              </Button>
            </CardContent>
          </Card>

          {(result || searchError) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5" /> Résultats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {searchError ? (
                  <div className="flex items-center gap-3 text-red-400 justify-center py-8">
                    <AlertCircle className="w-5 h-5" />
                    <p>{searchError}</p>
                  </div>
                ) : result.salaryMin != null ? (
                  <>
                    {result.company && (
                      <p className="text-sm font-medium text-center text-primary">{result.company}</p>
                    )}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 rounded-xl bg-muted">
                        <p className="text-2xl font-bold text-foreground">{result.salaryMin?.toLocaleString()} {result.currency === 'USD' ? 'US$' : '$'}</p>
                        <p className="text-xs text-muted-foreground">Minimum</p>
                      </div>
                      <div className="text-center p-4 rounded-xl bg-primary/10 border border-primary/20">
                        <p className="text-2xl font-bold text-primary">{result.salaryMedian?.toLocaleString()} {result.currency === 'USD' ? 'US$' : '$'}</p>
                        <p className="text-xs text-muted-foreground">Médiane</p>
                      </div>
                      <div className="text-center p-4 rounded-xl bg-muted">
                        <p className="text-2xl font-bold text-foreground">{result.salaryMax?.toLocaleString()} {result.currency === 'USD' ? 'US$' : '$'}</p>
                        <p className="text-xs text-muted-foreground">Maximum</p>
                      </div>
                    </div>
                    {result.confidence && (
                      <div className="flex items-center justify-center gap-2 text-xs">
                        <span className={`px-2 py-0.5 rounded-full ${result.confidence === 'VERY_HIGH' || result.confidence === 'CONFIDENT' ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'}`}>
                          {result.confidence === 'VERY_HIGH' ? 'Très haute confiance' : result.confidence === 'CONFIDENT' ? 'Confiance élevée' : result.confidence}
                        </span>
                      </div>
                    )}
                    {result.sources && result.sources.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                        <Info className="w-3 h-3" />
                        Sources : {result.sources.join(", ")}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground text-center">
                      Basé sur {result.sampleSize || 0} données • {result.currency || "CAD"} / an
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Aucune donnée trouvée pour ces critères</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Contribute Tab */}
      {tab === "contribute" && (
        <div className="max-w-lg mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Contribuer</CardTitle>
              <CardDescription>Partagez anonymement votre salaire pour enrichir la communauté. Votre contribution sera validée par rapport aux données du marché.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {contributed ? (
                <div className="text-center py-8 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 mx-auto flex items-center justify-center">
                    <DollarSign className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold">Merci pour votre contribution !</h3>
                  <p className="text-sm text-muted-foreground">Vos données aident toute la communauté HIREDGE.</p>
                  <Button variant="outline" onClick={() => { setContributed(false); setContribForm({ jobTitle: "", jobFamily: "", location: "", country: "CA", experienceLevel: "", salary: "" }) }}>
                    Contribuer à nouveau
                  </Button>
                </div>
              ) : (
                <>
                  {contribError && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                      <p className="text-sm text-destructive">{contribError}</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Titre de poste *</label>
                    <Input value={contribForm.jobTitle} onChange={(e) => setContribForm({...contribForm, jobTitle: e.target.value})} placeholder="Senior Developer" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Famille de métier</label>
                    <Input value={contribForm.jobFamily} onChange={(e) => setContribForm({...contribForm, jobFamily: e.target.value})} placeholder="Développement" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Ville *</label>
                      <Input value={contribForm.location} onChange={(e) => setContribForm({...contribForm, location: e.target.value})} placeholder="Montréal" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Pays</label>
                      <Input value={contribForm.country} onChange={(e) => setContribForm({...contribForm, country: e.target.value})} placeholder="CA" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Niveau</label>
                      <select
                        value={contribForm.experienceLevel}
                        onChange={(e) => setContribForm({...contribForm, experienceLevel: e.target.value})}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Sélectionner</option>
                        <option value="junior">Junior</option>
                        <option value="mid">Confirmé</option>
                        <option value="senior">Senior</option>
                        <option value="lead">Lead</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Salaire annuel ($) *</label>
                      <Input type="number" value={contribForm.salary} onChange={(e) => setContribForm({...contribForm, salary: e.target.value})} placeholder="90000" />
                    </div>
                  </div>
                  <Button onClick={contribute} disabled={loading || !contribForm.jobTitle || !contribForm.salary || !contribForm.location} className="w-full">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <DollarSign className="w-4 h-4 mr-2" />}
                    Contribuer anonymement
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">Toutes les données sont anonymisées et agrégées. Les contributions hors marché seront refusées.</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
