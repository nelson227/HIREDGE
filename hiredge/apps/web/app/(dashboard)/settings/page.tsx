"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Bell,
  Lock,
  CreditCard,
  User,
  Globe,
  Moon,
  Sun,
  Mail,
  MessageSquare,
  Briefcase,
  Users,
  Shield,
  Trash2,
  LogOut,
  Check,
  Loader2,
} from "lucide-react"
import { profileApi, authApi } from "@/lib/api"

const notificationSettings = [
  {
    id: "new_matches",
    label: "Nouvelles offres compatibles",
    description: "Soyez notifié quand EDGE trouve des offres correspondant à votre profil",
    enabled: true,
  },
  {
    id: "application_updates",
    label: "Mises à jour de candidatures",
    description: "Changements de statut et réponses des employeurs",
    enabled: true,
  },
  {
    id: "squad_activity",
    label: "Activité de l'escouade",
    description: "Messages et mises à jour de votre escouade",
    enabled: true,
  },
  {
    id: "interview_reminders",
    label: "Rappels d'entretiens",
    description: "Rappels avant vos entretiens programmés",
    enabled: true,
  },
  {
    id: "weekly_digest",
    label: "Résumé hebdomadaire",
    description: "Récapitulatif de votre progression dans la recherche d'emploi",
    enabled: false,
  },
  {
    id: "marketing",
    label: "Nouveautés produit",
    description: "Nouvelles fonctionnalités et améliorations d'HIREDGE",
    enabled: false,
  },
]

const privacySettings = [
  {
    id: "profile_visibility",
    label: "Visibilité du profil",
    description: "Permettre aux éclaireurs et membres d'escouade de voir votre profil",
    enabled: true,
  },
  {
    id: "anonymous_mode",
    label: "Mode anonyme",
    description: "Masquer votre identité lors de la consultation des infos entreprises",
    enabled: false,
  },
  {
    id: "data_sharing",
    label: "Partage de données",
    description: "Aider à améliorer EDGE en partageant des données d'utilisation anonymisées",
    enabled: true,
  },
]

const settingsSections = [
  { id: "account", label: "Compte", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Confidentialité", icon: Shield },
  { id: "preferences", label: "Préférences", icon: Globe },
  { id: "billing", label: "Abonnement", icon: CreditCard },
  { id: "security", label: "Sécurité", icon: Lock },
]

export default function SettingsPage() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState("account")
  const [notifications, setNotifications] = useState(notificationSettings)
  const [privacy, setPrivacy] = useState(privacySettings)
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [accountForm, setAccountForm] = useState({ firstName: "", lastName: "", email: "", phone: "" })
  const [prefForm, setPrefForm] = useState({ salaryMin: "", salaryMax: "", city: "", country: "" })
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" })
  const [message, setMessage] = useState("")

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const { data } = await profileApi.get()
      if (data.success && data.data) {
        const p = data.data
        setAccountForm({
          firstName: p.firstName || "",
          lastName: p.lastName || "",
          email: p.user?.email || "",
          phone: p.phone || "",
        })
        setPrefForm({
          salaryMin: p.salaryMin?.toString() || "",
          salaryMax: p.salaryMax?.toString() || "",
          city: p.city || "",
          country: p.country || "",
        })
        // Load notification & privacy prefs from backend
        if (p.notificationPrefs) {
          setNotifications(prev => prev.map(n => ({
            ...n,
            enabled: (p.notificationPrefs as Record<string, boolean>)[n.id] ?? n.enabled,
          })))
        }
        if (p.privacyPrefs) {
          setPrivacy(prev => prev.map(pr => ({
            ...pr,
            enabled: (p.privacyPrefs as Record<string, boolean>)[pr.id] ?? pr.enabled,
          })))
        }
      }
    } catch { /* no-op */ }
    finally { setLoading(false) }
  }

  const saveAccount = async () => {
    setSaving(true)
    setMessage("")
    try {
      await profileApi.update({
        firstName: accountForm.firstName,
        lastName: accountForm.lastName,
        phone: accountForm.phone,
      })
      setMessage("Modifications sauvegardées !")
      setTimeout(() => setMessage(""), 3000)
    } catch { setMessage("Erreur lors de la sauvegarde") }
    finally { setSaving(false) }
  }

  const savePreferences = async () => {
    setSaving(true)
    setMessage("")
    try {
      await profileApi.update({
        salaryMin: prefForm.salaryMin ? parseInt(prefForm.salaryMin) : undefined,
        salaryMax: prefForm.salaryMax ? parseInt(prefForm.salaryMax) : undefined,
        city: prefForm.city,
        country: prefForm.country,
      })
      setMessage("Préférences sauvegardées !")
      setTimeout(() => setMessage(""), 3000)
    } catch { setMessage("Erreur lors de la sauvegarde") }
    finally { setSaving(false) }
  }

  const handleDeleteAccount = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.")) return
    if (!confirm("Dernière confirmation : toutes vos données seront supprimées définitivement.")) return
    try {
      await authApi.logout()
      setMessage("Votre demande de suppression a été enregistrée. Le support vous contactera.")
    } catch {
      setMessage("Erreur lors de la demande de suppression. Contactez le support.")
    }
    router.push("/login")
  }

  const handleLogout = async () => {
    try { await authApi.logout() } catch { /* no-op */ }
    try { sessionStorage.removeItem('adminToken') } catch {}
    router.push("/login")
  }

  const toggleNotification = async (id: string) => {
    const updated = notifications.map(n => 
      n.id === id ? { ...n, enabled: !n.enabled } : n
    )
    setNotifications(updated)
    const target = updated.find(n => n.id === id)
    if (target) {
      try {
        await profileApi.update({ notificationPrefs: { [id]: target.enabled } })
      } catch { /* no-op */ }
    }
  }

  const togglePrivacy = async (id: string) => {
    const updated = privacy.map(p => 
      p.id === id ? { ...p, enabled: !p.enabled } : p
    )
    setPrivacy(updated)
    const target = updated.find(p => p.id === id)
    if (target) {
      try {
        await profileApi.update({ privacyPrefs: { [id]: target.enabled } })
      } catch { /* no-op */ }
    }
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Paramètres</h1>
        <p className="text-muted-foreground mt-1">Gérez votre compte et vos préférences</p>
        {message && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${message.includes("Erreur") ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
            {message}
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:w-64 shrink-0">
          <Card>
            <CardContent className="p-2">
              <nav className="space-y-1">
                {settingsSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      activeSection === section.id
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <section.icon className="w-4 h-4" />
                    {section.label}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Account Section */}
          {activeSection === "account" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Informations du compte</CardTitle>
                  <CardDescription>Modifiez vos informations personnelles</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loading ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Prénom</label>
                          <Input value={accountForm.firstName} onChange={(e) => setAccountForm({...accountForm, firstName: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Nom</label>
                          <Input value={accountForm.lastName} onChange={(e) => setAccountForm({...accountForm, lastName: e.target.value})} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Email</label>
                        <Input type="email" value={accountForm.email} disabled className="opacity-60" />
                        <p className="text-xs text-muted-foreground">L&apos;email ne peut pas être modifié</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Téléphone</label>
                        <Input type="tel" value={accountForm.phone} onChange={(e) => setAccountForm({...accountForm, phone: e.target.value})} />
                      </div>
                      <Button onClick={saveAccount} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Sauvegarder
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-destructive">Zone dangereuse</CardTitle>
                  <CardDescription>Actions irréversibles</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/5">
                    <div>
                      <p className="font-medium text-foreground">Supprimer le compte</p>
                      <p className="text-sm text-muted-foreground">Supprime définitivement votre compte et toutes vos données</p>
                    </div>
                    <Button variant="destructive" size="sm" onClick={handleDeleteAccount}>
                      <Trash2 className="w-4 h-4 mr-2" />Supprimer
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                    <div>
                      <p className="font-medium text-foreground">Se déconnecter</p>
                      <p className="text-sm text-muted-foreground">Déconnectez-vous de votre session</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleLogout}>
                      <LogOut className="w-4 h-4 mr-2" />Déconnexion
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Notifications Section */}
          {activeSection === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle>Préférences de notifications</CardTitle>
                <CardDescription>Choisissez les mises à jour que vous souhaitez recevoir</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="flex items-center justify-between p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          {notification.id.includes("match") && <Briefcase className="w-5 h-5 text-primary" />}
                          {notification.id.includes("application") && <Mail className="w-5 h-5 text-primary" />}
                          {notification.id.includes("squad") && <Users className="w-5 h-5 text-primary" />}
                          {notification.id.includes("interview") && <Bell className="w-5 h-5 text-primary" />}
                          {notification.id.includes("weekly") && <MessageSquare className="w-5 h-5 text-primary" />}
                          {notification.id.includes("marketing") && <Globe className="w-5 h-5 text-primary" />}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{notification.label}</p>
                          <p className="text-sm text-muted-foreground">{notification.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleNotification(notification.id)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          notification.enabled ? "bg-primary" : "bg-muted"
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 rounded-full bg-background transition-transform ${
                            notification.enabled ? "left-6" : "left-1"
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Privacy Section */}
          {activeSection === "privacy" && (
            <Card>
              <CardHeader>
                <CardTitle>Paramètres de confidentialité</CardTitle>
                <CardDescription>Contrôlez comment vos données sont utilisées et partagées</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {privacy.map((setting) => (
                    <div key={setting.id} className="flex items-center justify-between p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Shield className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{setting.label}</p>
                          <p className="text-sm text-muted-foreground">{setting.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => togglePrivacy(setting.id)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          setting.enabled ? "bg-primary" : "bg-muted"
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 rounded-full bg-background transition-transform ${
                            setting.enabled ? "left-6" : "left-1"
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preferences Section */}
          {activeSection === "preferences" && (
            <>
              <Card>
                <CardHeader>
                <CardTitle>Apparence</CardTitle>
                <CardDescription>Personnalisez l'apparence d'HIREDGE</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { id: "light", label: "Clair", icon: Sun },
                      { id: "dark", label: "Sombre", icon: Moon },
                      { id: "system", label: "Système", icon: Globe },
                    ].map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setTheme(option.id as "light" | "dark" | "system")}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors ${
                          theme === option.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <option.icon className={`w-6 h-6 ${
                          theme === option.id ? "text-primary" : "text-muted-foreground"
                        }`} />
                        <span className={`text-sm font-medium ${
                          theme === option.id ? "text-primary" : "text-foreground"
                        }`}>
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Préférences d&apos;emploi</CardTitle>
                  <CardDescription>Aidez EDGE à trouver les meilleures offres</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Ville préférée</label>
                      <Input value={prefForm.city} onChange={(e) => setPrefForm({...prefForm, city: e.target.value})} placeholder="Ex: Paris" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Pays</label>
                      <Input value={prefForm.country} onChange={(e) => setPrefForm({...prefForm, country: e.target.value})} placeholder="Ex: France" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Salaire min (€/an)</label>
                      <Input type="number" value={prefForm.salaryMin} onChange={(e) => setPrefForm({...prefForm, salaryMin: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Salaire max (€/an)</label>
                      <Input type="number" value={prefForm.salaryMax} onChange={(e) => setPrefForm({...prefForm, salaryMax: e.target.value})} />
                    </div>
                  </div>
                  <Button onClick={savePreferences} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Sauvegarder les préférences
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* Billing Section */}
          {activeSection === "billing" && (
            <Card>
              <CardHeader>
                <CardTitle>Abonnement</CardTitle>
                <CardDescription>Gérez votre abonnement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">Bientôt disponible</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    La gestion des abonnements et paiements sera disponible prochainement.
                    Vous bénéficiez actuellement d&apos;un accès gratuit.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Security Section */}
          {activeSection === "security" && (
            <>
              <Card>
                <CardHeader>
                <CardTitle>Mot de passe</CardTitle>
                <CardDescription>Modifier votre mot de passe</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Mot de passe actuel</label>
                    <Input type="password" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Nouveau mot de passe</label>
                    <Input type="password" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Confirmer le nouveau mot de passe</label>
                    <Input type="password" />
                  </div>
                  <Button>Modifier le mot de passe</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Authentification à deux facteurs</CardTitle>
                  <CardDescription>Bientôt disponible</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Shield className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">2FA</p>
                        <p className="text-sm text-muted-foreground">Sera disponible prochainement</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
