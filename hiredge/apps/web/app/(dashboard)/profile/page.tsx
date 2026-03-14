"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  User,
  Mail,
  MapPin,
  Briefcase,
  Link as LinkIcon,
  Edit3,
  Check,
  X,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  Save,
  Phone,
  Upload,
  FileText,
  AlertCircle,
} from "lucide-react"
import { profileApi } from "@/lib/api"

interface Skill {
  id: string
  name: string
  level: string
}

interface Experience {
  id: string
  title: string
  company: string
  location?: string
  startDate: string
  endDate?: string | null
  current: boolean
  description?: string
}

interface Education {
  id: string
  degree: string
  institution: string
  field?: string
  startDate: string
  endDate?: string | null
  current: boolean
}

interface ProfileData {
  firstName: string
  lastName: string
  title: string
  bio: string
  phone: string
  city: string
  country: string
  linkedinUrl: string
  portfolioUrl: string
  completionScore: number
  cvUrl: string | null
  skills: Skill[]
  experiences: Experience[]
  educations: Education[]
  user?: { email: string }
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [isEditingBasic, setIsEditingBasic] = useState(false)
  const [isEditingBio, setIsEditingBio] = useState(false)
  const [editForm, setEditForm] = useState({
    firstName: "", lastName: "", title: "", phone: "", city: "", country: "",
    linkedinUrl: "", portfolioUrl: "",
  })
  const [editedBio, setEditedBio] = useState("")
  const [newSkill, setNewSkill] = useState("")
  const [addingSkill, setAddingSkill] = useState(false)

  const [showNewExp, setShowNewExp] = useState(false)
  const [newExp, setNewExp] = useState({ company: "", title: "", description: "", startDate: "", endDate: "", current: false })
  const [showNewEdu, setShowNewEdu] = useState(false)
  const [newEdu, setNewEdu] = useState({ institution: "", degree: "", field: "", startDate: "", endDate: "", current: false })
  const [feedbackMsg, setFeedbackMsg] = useState("")
  const showFeedback = (msg: string) => { setFeedbackMsg(msg); setTimeout(() => setFeedbackMsg(""), 3000) }

  // CV upload state
  const cvInputRef = useRef<HTMLInputElement>(null)
  const [uploadingCv, setUploadingCv] = useState(false)
  const [cvError, setCvError] = useState("")
  const [cvSuccess, setCvSuccess] = useState("")

  useEffect(() => { loadProfile() }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const { data } = await profileApi.get()
      if (data.success && data.data) {
        const p = data.data
        setProfile(p)
        setEditForm({
          firstName: p.firstName || "", lastName: p.lastName || "", title: p.title || "",
          phone: p.phone || "", city: p.city || "", country: p.country || "",
          linkedinUrl: p.linkedinUrl || "", portfolioUrl: p.portfolioUrl || "",
        })
        setEditedBio(p.bio || "")
      }
    } catch { setError("Erreur lors du chargement du profil") }
    finally { setLoading(false) }
  }

  const saveBasicInfo = async () => {
    setSaving(true)
    try { await profileApi.update(editForm); await loadProfile(); setIsEditingBasic(false) }
    catch { showFeedback("Erreur lors de la sauvegarde") }
    finally { setSaving(false) }
  }

  const saveBio = async () => {
    setSaving(true)
    try { await profileApi.update({ bio: editedBio }); await loadProfile(); setIsEditingBio(false) }
    catch { showFeedback("Erreur lors de la sauvegarde") }
    finally { setSaving(false) }
  }

  const handleAddSkill = async () => {
    if (!newSkill.trim()) return
    setAddingSkill(true)
    try { await profileApi.addSkill({ name: newSkill.trim(), level: "intermediate" }); setNewSkill(""); await loadProfile() }
    catch { showFeedback("Erreur lors de l'ajout") }
    finally { setAddingSkill(false) }
  }

  const handleRemoveSkill = async (skillId: string) => {
    try { await profileApi.removeSkill(skillId); await loadProfile() }
    catch { showFeedback("Erreur lors de la suppression") }
  }

  const handleAddExperience = async () => {
    if (!newExp.company || !newExp.title || !newExp.startDate) return
    try {
      await profileApi.addExperience(newExp)
      setShowNewExp(false)
      setNewExp({ company: "", title: "", description: "", startDate: "", endDate: "", current: false })
      await loadProfile()
    } catch { showFeedback("Erreur lors de l'ajout") }
  }

  const handleRemoveExperience = async (expId: string) => {
    if (!confirm("Supprimer cette expérience ?")) return
    try { await profileApi.removeExperience(expId); await loadProfile() }
    catch { showFeedback("Erreur lors de la suppression") }
  }

  const handleAddEducation = async () => {
    if (!newEdu.institution || !newEdu.degree || !newEdu.startDate) return
    try {
      await profileApi.addEducation(newEdu)
      setShowNewEdu(false)
      setNewEdu({ institution: "", degree: "", field: "", startDate: "", endDate: "", current: false })
      await loadProfile()
    } catch { showFeedback("Erreur lors de l'ajout") }
  }

  const handleRemoveEducation = async (eduId: string) => {
    if (!confirm("Supprimer cette formation ?")) return
    try { await profileApi.removeEducation(eduId); await loadProfile() }
    catch { showFeedback("Erreur lors de la suppression") }
  }

  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset input so same file can be re-selected
    e.target.value = ""

    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ]
    if (!validTypes.includes(file.type)) {
      setCvError("Format non supporté. Utilisez un fichier PDF ou DOCX.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setCvError("Le fichier ne doit pas dépasser 5 Mo.")
      return
    }

    setCvError("")
    setCvSuccess("")
    setUploadingCv(true)
    try {
      const { data } = await profileApi.uploadCv(file)
      if (data.success) {
        setCvSuccess("CV importé et profil mis à jour avec succès !")
        setTimeout(() => setCvSuccess(""), 5000)
        await loadProfile()
      } else {
        setCvError(data.error?.message || "Erreur lors de l'analyse du CV")
      }
    } catch (err: any) {
      setCvError(err.response?.data?.error?.message || "Erreur lors de l'envoi du CV")
    } finally {
      setUploadingCv(false)
    }
  }

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("fr-FR", { year: "numeric", month: "short" }) : ""

  if (loading) return (
    <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  )

  if (error || !profile) return (
    <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <div className="text-center">
        <p className="text-destructive mb-4">{error || "Profil introuvable"}</p>
        <Button onClick={loadProfile}>Réessayer</Button>
      </div>
    </div>
  )

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {feedbackMsg && (
        <div className="bg-destructive/10 text-destructive text-sm px-4 py-2 rounded-lg">{feedbackMsg}</div>
      )}
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Mon Profil</h1>
          <p className="text-muted-foreground mt-1">Gérez votre profil professionnel</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Informations de base</CardTitle>
              {!isEditingBasic ? (
                <Button variant="ghost" size="sm" onClick={() => setIsEditingBasic(true)}>
                  <Edit3 className="w-4 h-4 mr-2" />Modifier
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsEditingBasic(false)}><X className="w-4 h-4" /></Button>
                  <Button size="sm" onClick={saveBasicInfo} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}Sauvegarder
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {isEditingBasic ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Prénom</label>
                      <Input value={editForm.firstName} onChange={(e) => setEditForm({...editForm, firstName: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nom</label>
                      <Input value={editForm.lastName} onChange={(e) => setEditForm({...editForm, lastName: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Titre professionnel</label>
                    <Input value={editForm.title} onChange={(e) => setEditForm({...editForm, title: e.target.value})} placeholder="Ex: Développeur Full Stack" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Téléphone</label>
                    <Input value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Ville</label>
                      <Input value={editForm.city} onChange={(e) => setEditForm({...editForm, city: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Pays</label>
                      <Input value={editForm.country} onChange={(e) => setEditForm({...editForm, country: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">LinkedIn</label>
                    <Input value={editForm.linkedinUrl} onChange={(e) => setEditForm({...editForm, linkedinUrl: e.target.value})} placeholder="https://linkedin.com/in/..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Portfolio</label>
                    <Input value={editForm.portfolioUrl} onChange={(e) => setEditForm({...editForm, portfolioUrl: e.target.value})} placeholder="https://..." />
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-6">
                  <div className="w-24 h-24 rounded-2xl bg-primary flex items-center justify-center">
                    <span className="text-3xl font-bold text-primary-foreground">
                      {(profile.firstName?.[0] || "")}{(profile.lastName?.[0] || "")}
                    </span>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">{profile.firstName} {profile.lastName}</h2>
                      <p className="text-muted-foreground">{profile.title || "Pas de titre"}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {profile.user?.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-muted-foreground" /><span className="text-foreground">{profile.user.email}</span>
                        </div>
                      )}
                      {profile.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-muted-foreground" /><span className="text-foreground">{profile.phone}</span>
                        </div>
                      )}
                      {(profile.city || profile.country) && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-muted-foreground" /><span className="text-foreground">{[profile.city, profile.country].filter(Boolean).join(", ")}</span>
                        </div>
                      )}
                      {profile.linkedinUrl && (
                        <div className="flex items-center gap-2 text-sm">
                          <LinkIcon className="w-4 h-4 text-muted-foreground" />
                          <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">LinkedIn</a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bio Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>À propos</CardTitle>
              {!isEditingBio ? (
                <Button variant="ghost" size="sm" onClick={() => { setEditedBio(profile.bio || ""); setIsEditingBio(true) }}>
                  <Edit3 className="w-4 h-4 mr-2" />Modifier
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsEditingBio(false)}><X className="w-4 h-4" /></Button>
                  <Button size="sm" onClick={saveBio} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}Sauvegarder
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {isEditingBio ? (
                <textarea value={editedBio} onChange={(e) => setEditedBio(e.target.value)}
                  className="w-full min-h-[120px] p-3 rounded-lg border border-border bg-background text-foreground text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Décrivez votre parcours professionnel..." />
              ) : (
                <p className="text-muted-foreground leading-relaxed">{profile.bio || "Aucune description. Cliquez sur Modifier pour ajouter une bio."}</p>
              )}
            </CardContent>
          </Card>

          {/* Experience Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Expériences</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowNewExp(true)}><Plus className="w-4 h-4 mr-2" />Ajouter</Button>
            </CardHeader>
            <CardContent className="p-0">
              {showNewExp && (
                <div className="p-6 border-b border-border bg-muted/30 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Titre du poste *" value={newExp.title} onChange={(e) => setNewExp({...newExp, title: e.target.value})} />
                    <Input placeholder="Entreprise *" value={newExp.company} onChange={(e) => setNewExp({...newExp, company: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input type="date" value={newExp.startDate} onChange={(e) => setNewExp({...newExp, startDate: e.target.value})} />
                    <Input type="date" value={newExp.endDate} onChange={(e) => setNewExp({...newExp, endDate: e.target.value})} disabled={newExp.current} />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={newExp.current} onChange={(e) => setNewExp({...newExp, current: e.target.checked, endDate: ""})} />Poste actuel
                  </label>
                  <textarea placeholder="Description..." value={newExp.description} onChange={(e) => setNewExp({...newExp, description: e.target.value})}
                    className="w-full min-h-[80px] p-3 rounded-lg border border-border bg-background text-sm resize-none" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddExperience}>Ajouter</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowNewExp(false)}>Annuler</Button>
                  </div>
                </div>
              )}
              <div className="divide-y divide-border">
                {profile.experiences.length === 0 && !showNewExp && (
                  <div className="p-8 text-center text-muted-foreground text-sm">Aucune expérience ajoutée.</div>
                )}
                {profile.experiences.map((exp) => (
                  <div key={exp.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                          <Briefcase className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">{exp.title}</h4>
                          <p className="text-sm text-primary">{exp.company}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {fmtDate(exp.startDate)} - {exp.current ? "Présent" : (exp.endDate ? fmtDate(exp.endDate) : "N/A")}
                          </p>
                          {exp.description && <p className="text-sm text-muted-foreground mt-2">{exp.description}</p>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0 text-destructive hover:text-destructive" onClick={() => handleRemoveExperience(exp.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Education Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Formation</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowNewEdu(true)}><Plus className="w-4 h-4 mr-2" />Ajouter</Button>
            </CardHeader>
            <CardContent className="p-0">
              {showNewEdu && (
                <div className="p-6 border-b border-border bg-muted/30 space-y-3">
                  <Input placeholder="Établissement *" value={newEdu.institution} onChange={(e) => setNewEdu({...newEdu, institution: e.target.value})} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Diplôme *" value={newEdu.degree} onChange={(e) => setNewEdu({...newEdu, degree: e.target.value})} />
                    <Input placeholder="Domaine" value={newEdu.field} onChange={(e) => setNewEdu({...newEdu, field: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input type="date" value={newEdu.startDate} onChange={(e) => setNewEdu({...newEdu, startDate: e.target.value})} />
                    <Input type="date" value={newEdu.endDate} onChange={(e) => setNewEdu({...newEdu, endDate: e.target.value})} disabled={newEdu.current} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddEducation}>Ajouter</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowNewEdu(false)}>Annuler</Button>
                  </div>
                </div>
              )}
              <div className="divide-y divide-border">
                {profile.educations.length === 0 && !showNewEdu && (
                  <div className="p-8 text-center text-muted-foreground text-sm">Aucune formation ajoutée.</div>
                )}
                {profile.educations.map((edu) => (
                  <div key={edu.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                          <User className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">{edu.degree}</h4>
                          <p className="text-sm text-primary">{edu.institution}</p>
                          {edu.field && <p className="text-xs text-muted-foreground">{edu.field}</p>}
                          <p className="text-xs text-muted-foreground mt-1">
                            {fmtDate(edu.startDate)} - {edu.current ? "En cours" : (edu.endDate ? fmtDate(edu.endDate) : "N/A")}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0 text-destructive hover:text-destructive" onClick={() => handleRemoveEducation(edu.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* CV Upload Card */}
          <Card>
            <CardHeader><CardTitle className="text-base">Mon CV</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {cvError && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 text-destructive text-xs">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{cvError}</span>
                  <button onClick={() => setCvError("")} className="ml-auto"><X className="w-3 h-3" /></button>
                </div>
              )}
              {cvSuccess && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-success/10 text-success text-xs">
                  <Check className="w-3 h-3 shrink-0" />
                  <span>{cvSuccess}</span>
                </div>
              )}

              {profile.cvUrl ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">CV importé</p>
                      <p className="text-xs text-muted-foreground truncate">Profil rempli automatiquement</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => cvInputRef.current?.click()}
                    disabled={uploadingCv}
                  >
                    {uploadingCv ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyse en cours...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        Remplacer le CV
                      </span>
                    )}
                  </Button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                  onClick={() => cvInputRef.current?.click()}
                >
                  {uploadingCv ? (
                    <div className="space-y-2">
                      <Loader2 className="w-8 h-8 text-primary mx-auto animate-spin" />
                      <p className="text-sm font-medium text-foreground">Analyse du CV en cours...</p>
                      <p className="text-xs text-muted-foreground">L'IA extrait vos informations</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
                      <p className="text-sm font-medium text-foreground">Importer un CV</p>
                      <p className="text-xs text-muted-foreground">PDF ou DOCX, max 5 Mo</p>
                      <p className="text-xs text-primary">Votre profil sera rempli automatiquement</p>
                    </div>
                  )}
                </div>
              )}

              <input
                ref={cvInputRef}
                type="file"
                accept=".pdf,.docx,.doc"
                onChange={handleCvUpload}
                className="hidden"
              />
            </CardContent>
          </Card>

          {/* Profile Completion */}
          <Card>
            <CardHeader><CardTitle className="text-base">Complétion du profil</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-center mb-4">
                <div className="relative w-24 h-24">
                  <svg className="w-full h-full -rotate-90">
                    <circle cx="48" cy="48" r="40" strokeWidth="6" fill="none" className="stroke-muted" />
                    <circle cx="48" cy="48" r="40" strokeWidth="6" fill="none"
                      strokeDasharray={`${((profile.completionScore || 0) / 100) * 251} 251`}
                      className="stroke-success" strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-foreground">{profile.completionScore || 0}%</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Nom et prénom", done: !!(profile.firstName && profile.lastName) },
                  { label: "Titre professionnel", done: !!profile.title },
                  { label: "Bio / description", done: !!profile.bio },
                  { label: "Au moins 1 compétence", done: profile.skills.length > 0 },
                  { label: "Au moins 1 expérience", done: profile.experiences.length > 0 },
                  { label: "Profil LinkedIn", done: !!profile.linkedinUrl },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${item.done ? "bg-success" : "bg-muted"}`}>
                      {item.done && <Check className="w-3 h-3 text-success-foreground" />}
                    </div>
                    <span className={item.done ? "text-muted-foreground line-through" : "text-foreground"}>{item.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Skills Card */}
          <Card>
            <CardHeader><CardTitle className="text-base">Compétences</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {profile.skills.map((skill) => (
                  <div key={skill.id} className="group flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                    {skill.name}
                    <button onClick={() => handleRemoveSkill(skill.id)} className="opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                  </div>
                ))}
                {profile.skills.length === 0 && <p className="text-sm text-muted-foreground">Aucune compétence</p>}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Ajouter une compétence..." value={newSkill} onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddSkill()} className="flex-1" />
                <Button size="icon" onClick={handleAddSkill} disabled={!newSkill.trim() || addingSkill}>
                  {addingSkill ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Social Links */}
          <Card>
            <CardHeader><CardTitle className="text-base">Liens</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {profile.linkedinUrl && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-muted-foreground">LI</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">LinkedIn</p>
                    <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate block">
                      {profile.linkedinUrl.replace("https://", "")}
                    </a>
                  </div>
                  <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="icon"><ExternalLink className="w-4 h-4" /></Button></a>
                </div>
              )}
              {profile.portfolioUrl && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-muted-foreground">WB</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Portfolio</p>
                    <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate block">
                      {profile.portfolioUrl.replace("https://", "")}
                    </a>
                  </div>
                  <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="icon"><ExternalLink className="w-4 h-4" /></Button></a>
                </div>
              )}
              {!profile.linkedinUrl && !profile.portfolioUrl && (
                <p className="text-sm text-muted-foreground">Aucun lien. Modifiez vos infos pour en ajouter.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
