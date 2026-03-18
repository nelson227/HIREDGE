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
  MessageSquare,
  ArrowRight,
  Search,
} from "lucide-react"
import { salaryApi } from "@/lib/api"

export default function SalaryPage() {
  const [tab, setTab] = useState<"data" | "negotiate" | "contribute">("data")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  // Data tab
  const [dataForm, setDataForm] = useState({ jobFamily: "", location: "", experienceLevel: "" })

  // Negotiate tab
  const [negForm, setNegForm] = useState({
    jobTitle: "", company: "", currentOffer: "", targetSalary: "", context: "",
  })

  // Contribute tab
  const [contribForm, setContribForm] = useState({
    jobTitle: "", jobFamily: "", location: "", country: "CA", experienceLevel: "", salary: "",
  })
  const [contributed, setContributed] = useState(false)

  const searchSalary = async () => {
    if (!dataForm.jobFamily) return
    setLoading(true)
    setResult(null)
    try {
      const { data } = await salaryApi.getData(dataForm)
      if (data.success) setResult(data.data)
    } catch { /* no-op */ }
    finally { setLoading(false) }
  }

  const negotiate = async () => {
    if (!negForm.jobTitle || !negForm.company || !negForm.currentOffer) return
    setLoading(true)
    setResult(null)
    try {
      const { data } = await salaryApi.negotiate({
        ...negForm,
        currentOffer: parseInt(negForm.currentOffer),
        targetSalary: parseInt(negForm.targetSalary) || parseInt(negForm.currentOffer) * 1.15,
      })
      if (data.success) setResult(data.data)
    } catch { /* no-op */ }
    finally { setLoading(false) }
  }

  const contribute = async () => {
    if (!contribForm.jobTitle || !contribForm.salary) return
    setLoading(true)
    try {
      await salaryApi.contribute({
        ...contribForm,
        salary: parseInt(contribForm.salary),
        experienceLevel: contribForm.experienceLevel || "mid",
      })
      setContributed(true)
    } catch { /* no-op */ }
    finally { setLoading(false) }
  }

  const tabs = [
    { id: "data", label: "Explorer les salaires", icon: BarChart3 },
    { id: "negotiate", label: "Simuler une négo", icon: MessageSquare },
    { id: "contribute", label: "Contribuer", icon: TrendingUp },
  ] as const

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Salaires & Négociation</h1>
        <p className="text-muted-foreground mt-1">Explorez les données salariales et préparez vos négociations</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setResult(null) }}
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
              <CardDescription>Consultez les données salariales par métier et localisation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Famille de métier *</label>
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
                  placeholder="Ex: Montréal, Paris, Remote"
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
              <Button onClick={searchSalary} disabled={loading || !dataForm.jobFamily} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                Rechercher
              </Button>
            </CardContent>
          </Card>

          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5" /> Résultats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.aggregated ? (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 rounded-xl bg-muted">
                        <p className="text-2xl font-bold text-foreground">{result.aggregated.min?.toLocaleString()} $</p>
                        <p className="text-xs text-muted-foreground">Minimum</p>
                      </div>
                      <div className="text-center p-4 rounded-xl bg-primary/10 border border-primary/20">
                        <p className="text-2xl font-bold text-primary">{result.aggregated.median?.toLocaleString()} $</p>
                        <p className="text-xs text-muted-foreground">Médiane</p>
                      </div>
                      <div className="text-center p-4 rounded-xl bg-muted">
                        <p className="text-2xl font-bold text-foreground">{result.aggregated.max?.toLocaleString()} $</p>
                        <p className="text-xs text-muted-foreground">Maximum</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      Basé sur {result.aggregated.sampleSize || 0} données
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

      {/* Negotiate Tab */}
      {tab === "negotiate" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5" /> Simulation</CardTitle>
              <CardDescription>Préparez votre négociation salariale avec l&apos;IA</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Poste *</label>
                <Input
                  value={negForm.jobTitle}
                  onChange={(e) => setNegForm({...negForm, jobTitle: e.target.value})}
                  placeholder="Ex: Senior Developer"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Entreprise *</label>
                <Input
                  value={negForm.company}
                  onChange={(e) => setNegForm({...negForm, company: e.target.value})}
                  placeholder="Ex: Shopify"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Offre actuelle ($) *</label>
                  <Input
                    type="number"
                    value={negForm.currentOffer}
                    onChange={(e) => setNegForm({...negForm, currentOffer: e.target.value})}
                    placeholder="85000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Objectif ($)</label>
                  <Input
                    type="number"
                    value={negForm.targetSalary}
                    onChange={(e) => setNegForm({...negForm, targetSalary: e.target.value})}
                    placeholder="95000"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Contexte (optionnel)</label>
                <Input
                  value={negForm.context}
                  onChange={(e) => setNegForm({...negForm, context: e.target.value})}
                  placeholder="Ex: 5 ans d'expérience, offre d'un concurrent..."
                />
              </div>
              <Button onClick={negotiate} disabled={loading || !negForm.jobTitle || !negForm.currentOffer} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                Lancer la simulation
              </Button>
            </CardContent>
          </Card>

          {result && (
            <Card>
              <CardHeader>
                <CardTitle>Stratégie de négociation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                  {result.strategy || result.message || JSON.stringify(result, null, 2)}
                </div>
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
              <CardDescription>Partagez anonymement votre salaire pour enrichir la communauté</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {contributed ? (
                <div className="text-center py-8 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 mx-auto flex items-center justify-center">
                    <DollarSign className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold">Merci pour votre contribution !</h3>
                  <p className="text-sm text-muted-foreground">Vos données aident toute la communauté HIREDGE.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Titre de poste *</label>
                    <Input value={contribForm.jobTitle} onChange={(e) => setContribForm({...contribForm, jobTitle: e.target.value})} placeholder="Senior Developer" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Famille de métier *</label>
                    <Input value={contribForm.jobFamily} onChange={(e) => setContribForm({...contribForm, jobFamily: e.target.value})} placeholder="Développement" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Ville</label>
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
                  <Button onClick={contribute} disabled={loading || !contribForm.jobTitle || !contribForm.salary} className="w-full">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <DollarSign className="w-4 h-4 mr-2" />}
                    Contribuer anonymement
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">Toutes les données sont anonymisées et agrégées.</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
