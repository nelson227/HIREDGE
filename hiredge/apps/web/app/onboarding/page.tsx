"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Sparkles,
  Upload,
  FileText,
  PenLine,
  Loader2,
  Check,
  ArrowRight,
  AlertCircle,
  X,
} from "lucide-react"
import { profileApi } from "@/lib/api"
import Link from "next/link"

type Step = "choose" | "uploading" | "parsed" | "manual"

export default function OnboardingPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>("choose")
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [parsedData, setParsedData] = useState<any>(null)
  const [dragOver, setDragOver] = useState(false)

  // Manual form state
  const [manualForm, setManualForm] = useState({
    firstName: "",
    lastName: "",
    title: "",
    phone: "",
    city: "",
    country: "CA",
  })
  const [savingManual, setSavingManual] = useState(false)

  const handleFileUpload = useCallback(async (file: File) => {
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ]
    if (!validTypes.includes(file.type)) {
      setError("Format non supporté. Veuillez utiliser un fichier PDF ou DOCX.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Le fichier ne doit pas dépasser 5 Mo.")
      return
    }

    setError("")
    setUploading(true)
    setStep("uploading")

    try {
      const { data } = await profileApi.uploadCv(file)
      if (data.success) {
        setParsedData(data.data)
        setStep("parsed")
      } else {
        setError(data.error?.message || "Erreur lors de l'analyse du CV")
        setStep("choose")
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Erreur lors de l'envoi du CV. Vérifiez votre connexion.")
      setStep("choose")
    } finally {
      setUploading(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileUpload(file)
  }, [handleFileUpload])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
  }

  const handleSaveManual = async () => {
    if (!manualForm.firstName.trim() || !manualForm.lastName.trim()) {
      setError("Le prénom et le nom sont requis.")
      return
    }
    setSavingManual(true)
    setError("")
    try {
      await profileApi.update(manualForm)
      router.push("/profile")
    } catch {
      setError("Erreur lors de la sauvegarde. Réessayez.")
    } finally {
      setSavingManual(false)
    }
  }

  const goToProfile = () => router.push("/profile")

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">HIREDGE</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={goToProfile}>
            Passer
          </Button>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">

          {/* Step: Choose */}
          {step === "choose" && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center mb-6">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Bienvenue sur HIREDGE !</h1>
                <p className="text-muted-foreground">
                  Comment souhaitez-vous configurer votre profil ?
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                  <button onClick={() => setError("")} className="ml-auto"><X className="w-4 h-4" /></button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Option 1: Upload CV */}
                <Card
                  className="cursor-pointer transition-all hover:border-primary hover:shadow-lg group"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  <CardContent className="p-8 text-center space-y-4">
                    <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center transition-colors ${
                      dragOver ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary group-hover:bg-primary/20"
                    }`}>
                      <Upload className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">Importer mon CV</h3>
                      <p className="text-sm text-muted-foreground">
                        Téléchargez votre CV et votre profil sera rempli automatiquement grâce à l'IA
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <FileText className="w-3 h-3" />
                      <span>PDF ou DOCX, max 5 Mo</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Option 2: Manual */}
                <Card
                  className="cursor-pointer transition-all hover:border-primary hover:shadow-lg group"
                  onClick={() => { setStep("manual"); setError("") }}
                >
                  <CardContent className="p-8 text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-secondary/50 mx-auto flex items-center justify-center group-hover:bg-secondary text-foreground transition-colors">
                      <PenLine className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">Remplir manuellement</h3>
                      <p className="text-sm text-muted-foreground">
                        Saisissez vos informations vous-même pour configurer votre profil
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <ArrowRight className="w-3 h-3" />
                      <span>Quelques minutes suffisent</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc"
                onChange={handleFileInput}
                className="hidden"
              />

              <p className="text-center text-xs text-muted-foreground mt-4">
                Vous pourrez toujours modifier votre profil ou importer un nouveau CV plus tard.
              </p>
            </div>
          )}

          {/* Step: Uploading */}
          {step === "uploading" && (
            <Card>
              <CardContent className="p-12 text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">Analyse de votre CV en cours...</h2>
                  <p className="text-muted-foreground">
                    Notre IA extrait vos informations. Cela peut prendre quelques secondes.
                  </p>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Check className="w-4 h-4 text-success" />
                    <span>Fichier reçu</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Extraction du texte et analyse IA...</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step: Parsed — show summary */}
          {step === "parsed" && parsedData && (
            <Card>
              <CardContent className="p-8 space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-success/10 mx-auto flex items-center justify-center mb-4">
                    <Check className="w-8 h-8 text-success" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">Profil créé avec succès !</h2>
                  <p className="text-muted-foreground">
                    Votre CV a été analysé et votre profil a été rempli automatiquement.
                  </p>
                </div>

                {/* Summary of what was extracted */}
                <div className="bg-muted/50 rounded-xl p-6 space-y-3">
                  <h3 className="font-medium text-foreground text-sm uppercase tracking-wide">Résumé extrait</h3>
                  {parsedData.parsed?.firstName && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Nom</span>
                      <span className="font-medium text-foreground">{parsedData.parsed.firstName} {parsedData.parsed.lastName}</span>
                    </div>
                  )}
                  {parsedData.parsed?.title && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Titre</span>
                      <span className="font-medium text-foreground">{parsedData.parsed.title}</span>
                    </div>
                  )}
                  {parsedData.parsed?.city && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Localisation</span>
                      <span className="font-medium text-foreground">{parsedData.parsed.city}{parsedData.parsed.country ? `, ${parsedData.parsed.country}` : ""}</span>
                    </div>
                  )}
                  {parsedData.parsed?.skills?.length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Compétences</span>
                      <span className="font-medium text-foreground">{parsedData.parsed.skills.length} extraites</span>
                    </div>
                  )}
                  {parsedData.parsed?.experiences?.length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Expériences</span>
                      <span className="font-medium text-foreground">{parsedData.parsed.experiences.length} extraites</span>
                    </div>
                  )}
                  {parsedData.parsed?.educations?.length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Formations</span>
                      <span className="font-medium text-foreground">{parsedData.parsed.educations.length} extraites</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <Button onClick={goToProfile} className="w-full h-11">
                    <span className="flex items-center gap-2">
                      Voir mon profil complet
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Vous pouvez modifier toutes les informations depuis votre profil.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step: Manual fill */}
          {step === "manual" && (
            <Card>
              <CardContent className="p-8 space-y-6">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-semibold text-foreground mb-2">Informations de base</h2>
                  <p className="text-sm text-muted-foreground">
                    Remplissez vos informations essentielles. Vous pourrez compléter votre profil plus tard.
                  </p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Prénom *</label>
                      <Input
                        value={manualForm.firstName}
                        onChange={(e) => setManualForm({ ...manualForm, firstName: e.target.value })}
                        placeholder="Jean"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nom *</label>
                      <Input
                        value={manualForm.lastName}
                        onChange={(e) => setManualForm({ ...manualForm, lastName: e.target.value })}
                        placeholder="Dupont"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Titre professionnel</label>
                    <Input
                      value={manualForm.title}
                      onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
                      placeholder="Ex: Développeur Full Stack"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Téléphone</label>
                    <Input
                      value={manualForm.phone}
                      onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })}
                      placeholder="+1 514 000 0000"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Ville</label>
                      <Input
                        value={manualForm.city}
                        onChange={(e) => setManualForm({ ...manualForm, city: e.target.value })}
                        placeholder="Montréal"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Pays</label>
                      <Input
                        value={manualForm.country}
                        onChange={(e) => setManualForm({ ...manualForm, country: e.target.value })}
                        placeholder="CA"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => { setStep("choose"); setError("") }} className="flex-1 h-11">
                    Retour
                  </Button>
                  <Button onClick={handleSaveManual} disabled={savingManual} className="flex-1 h-11">
                    {savingManual ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sauvegarde...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Continuer
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  Vous pourrez aussi importer votre CV plus tard depuis votre profil.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
