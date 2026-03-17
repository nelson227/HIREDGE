"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
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
  Languages,
  Monitor,
} from "lucide-react"
import { profileApi, authApi, paymentsApi } from "@/lib/api"
import { useTranslation, LOCALE_LABELS, LOCALE_FLAGS, type Locale } from "@/lib/i18n"

const LOCALES: Locale[] = ['fr', 'en', 'de', 'es']

export default function SettingsPage() {
  const router = useRouter()
  const { theme: currentTheme, setTheme: setNextTheme } = useTheme()
  const { t, locale, setLocale } = useTranslation()
  const [activeSection, setActiveSection] = useState("account")
  const [notifications, setNotifications] = useState<Array<{ id: string; labelKey: string; descKey: string; enabled: boolean }>>([])
  const [privacy, setPrivacy] = useState<Array<{ id: string; labelKey: string; descKey: string; enabled: boolean }>>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [accountForm, setAccountForm] = useState({ firstName: "", lastName: "", email: "", phone: "" })
  const [prefForm, setPrefForm] = useState({ salaryMin: "", salaryMax: "", city: "", country: "" })
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" })
  const [message, setMessage] = useState("")
  const [pwLoading, setPwLoading] = useState(false)
  const [deletePassword, setDeletePassword] = useState("")
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [subscription, setSubscription] = useState<{ tier: string; applicationsUsed: number; applicationsLimit: number } | null>(null)
  const [billingLoading, setBillingLoading] = useState(false)

  useEffect(() => {
    setNotifications([
      { id: "new_matches", labelKey: "notifNewMatches", descKey: "notifNewMatchesDesc", enabled: true },
      { id: "application_updates", labelKey: "notifApplicationUpdates", descKey: "notifApplicationUpdatesDesc", enabled: true },
      { id: "squad_activity", labelKey: "notifSquadActivity", descKey: "notifSquadActivityDesc", enabled: true },
      { id: "interview_reminders", labelKey: "notifInterviewReminders", descKey: "notifInterviewRemindersDesc", enabled: true },
      { id: "weekly_digest", labelKey: "notifWeeklyDigest", descKey: "notifWeeklyDigestDesc", enabled: false },
      { id: "marketing", labelKey: "notifMarketing", descKey: "notifMarketingDesc", enabled: false },
    ])
    setPrivacy([
      { id: "profile_visibility", labelKey: "privacyProfileVisibility", descKey: "privacyProfileVisibilityDesc", enabled: true },
      { id: "anonymous_mode", labelKey: "privacyAnonymousMode", descKey: "privacyAnonymousModeDesc", enabled: false },
      { id: "data_sharing", labelKey: "privacyDataSharing", descKey: "privacyDataSharingDesc", enabled: true },
    ])
  }, [])

  const settingsSections = [
    { id: "account", label: t('settingsAccount'), icon: User },
    { id: "notifications", label: t('settingsNotifications'), icon: Bell },
    { id: "privacy", label: t('settingsPrivacy'), icon: Shield },
    { id: "preferences", label: t('settingsPreferences'), icon: Globe },
    { id: "billing", label: t('settingsBilling'), icon: CreditCard },
    { id: "security", label: t('settingsSecurity'), icon: Lock },
  ]

  useEffect(() => {
    loadProfile()
    loadSubscription()
  }, [])

  const loadSubscription = async () => {
    try {
      const { data } = await paymentsApi.getStatus()
      if (data.success) setSubscription(data.data)
    } catch { /* no-op */ }
  }

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
    } catch { setMessage(t('settingsSaveError')) }
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
    } catch { setMessage(t('settingsSaveError')) }
    finally { setSaving(false) }
  }

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setMessage("Veuillez entrer votre mot de passe pour confirmer la suppression")
      return
    }
    setDeleteLoading(true)
    try {
      await authApi.deleteAccount(deletePassword)
      router.push("/login")
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || t('settingsDeleteError')
      setMessage(msg)
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleLogout = async () => {
    try { await authApi.logout() } catch { /* no-op */ }
    try { sessionStorage.removeItem('adminToken') } catch {}
    router.push("/login")
  }

  const handleChangePassword = async () => {
    if (!pwForm.current || !pwForm.newPw) {
      setMessage(t('settingsFillAllFields'))
      return
    }
    if (pwForm.newPw.length < 8) {
      setMessage("Le nouveau mot de passe doit contenir au moins 8 caractères")
      return
    }
    if (pwForm.newPw !== pwForm.confirm) {
      setMessage(t('settingsPasswordMismatch'))
      return
    }
    setPwLoading(true)
    setMessage("")
    try {
      await authApi.changePassword(pwForm.current, pwForm.newPw)
      setMessage("Mot de passe modifié avec succès !")
      setPwForm({ current: "", newPw: "", confirm: "" })
      setTimeout(() => setMessage(""), 3000)
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || t('settingsPasswordError')
      setMessage(msg)
    } finally {
      setPwLoading(false)
    }
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
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{t('settingsTitle')}</h1>
        <p className="text-muted-foreground mt-1">{t('settingsSubtitle')}</p>
        {message && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${message.includes("Erreur") || message.includes("Error") ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
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
                  <CardTitle>{t('settingsAccountInfo')}</CardTitle>
                  <CardDescription>{t('settingsAccountDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loading ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">{t('profileFirstName')}</label>
                          <Input value={accountForm.firstName} onChange={(e) => setAccountForm({...accountForm, firstName: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">{t('profileLastName')}</label>
                          <Input value={accountForm.lastName} onChange={(e) => setAccountForm({...accountForm, lastName: e.target.value})} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">{t('email')}</label>
                        <Input type="email" value={accountForm.email} disabled className="opacity-60" />
                        <p className="text-xs text-muted-foreground">{t('settingsEmailNotEditable')}</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">{t('profilePhone')}</label>
                        <Input type="tel" value={accountForm.phone} onChange={(e) => setAccountForm({...accountForm, phone: e.target.value})} />
                      </div>
                      <Button onClick={saveAccount} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {t('save')}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-destructive">{t('settingsDangerZone')}</CardTitle>
                  <CardDescription>{t('settingsDangerZoneDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-destructive/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{t('settingsDeleteAccount')}</p>
                        <p className="text-sm text-muted-foreground">{t('settingsDeleteAccountDesc')}</p>
                      </div>
                      {!deleteConfirmOpen && (
                        <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
                          <Trash2 className="w-4 h-4 mr-2" />{t('delete')}
                        </Button>
                      )}
                    </div>
                    {deleteConfirmOpen && (
                      <div className="space-y-2 pt-2 border-t border-destructive/20">
                        <p className="text-sm text-destructive font-medium">Entrez votre mot de passe pour confirmer la suppression :</p>
                        <Input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder="Mot de passe" />
                        <div className="flex gap-2">
                          <Button variant="destructive" size="sm" onClick={handleDeleteAccount} disabled={deleteLoading}>
                            {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                            Supprimer définitivement
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => { setDeleteConfirmOpen(false); setDeletePassword("") }}>Annuler</Button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                    <div>
                      <p className="font-medium text-foreground">{t('logout')}</p>
                      <p className="text-sm text-muted-foreground">{t('settingsLogoutSession')}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleLogout}>
                      <LogOut className="w-4 h-4 mr-2" />{t('logout')}
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
                <CardTitle>{t('settingsNotifications')}</CardTitle>
                <CardDescription>{t('settingsNotificationsDesc')}</CardDescription>
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
                          <p className="font-medium text-foreground">{t(notification.labelKey as any)}</p>
                          <p className="text-sm text-muted-foreground">{t(notification.descKey as any)}</p>
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
                <CardTitle>{t('settingsPrivacy')}</CardTitle>
                <CardDescription>{t('settingsPrivacyDesc')}</CardDescription>
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
                          <p className="font-medium text-foreground">{t(setting.labelKey as any)}</p>
                          <p className="text-sm text-muted-foreground">{t(setting.descKey as any)}</p>
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
              {/* Language */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('settingsLanguage')}</CardTitle>
                  <CardDescription>{t('settingsLanguageDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {LOCALES.map((loc) => (
                      <button
                        key={loc}
                        onClick={() => setLocale(loc)}
                        className={`flex items-center gap-2 p-3 rounded-xl border transition-colors ${
                          locale === loc
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <span className="text-xl">{LOCALE_FLAGS[loc]}</span>
                        <span className={`text-sm font-medium ${
                          locale === loc ? "text-primary" : "text-foreground"
                        }`}>
                          {LOCALE_LABELS[loc]}
                        </span>
                        {locale === loc && <Check className="w-4 h-4 text-primary ml-auto" />}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Theme */}
              <Card>
                <CardHeader>
                <CardTitle>{t('settingsAppearance')}</CardTitle>
                <CardDescription>{t('settingsAppearanceDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { id: "light", label: t('settingsThemeLight'), icon: Sun },
                      { id: "dark", label: t('settingsThemeDark'), icon: Moon },
                      { id: "system", label: t('settingsThemeSystem'), icon: Monitor },
                    ].map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setNextTheme(option.id)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors ${
                          currentTheme === option.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <option.icon className={`w-6 h-6 ${
                          currentTheme === option.id ? "text-primary" : "text-muted-foreground"
                        }`} />
                        <span className={`text-sm font-medium ${
                          currentTheme === option.id ? "text-primary" : "text-foreground"
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
                  <CardTitle>{t('settingsJobPreferences')}</CardTitle>
                  <CardDescription>{t('settingsJobPreferencesDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">{t('settingsPreferredCity')}</label>
                      <Input value={prefForm.city} onChange={(e) => setPrefForm({...prefForm, city: e.target.value})} placeholder={t('settingsPreferredCity')} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">{t('settingsCountry')}</label>
                      <Input value={prefForm.country} onChange={(e) => setPrefForm({...prefForm, country: e.target.value})} placeholder={t('settingsCountry')} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">{t('settingsSalaryMin')}</label>
                      <Input type="number" value={prefForm.salaryMin} onChange={(e) => setPrefForm({...prefForm, salaryMin: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">{t('settingsSalaryMax')}</label>
                      <Input type="number" value={prefForm.salaryMax} onChange={(e) => setPrefForm({...prefForm, salaryMax: e.target.value})} />
                    </div>
                  </div>
                  <Button onClick={savePreferences} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {t('settingsSavePreferences')}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* Billing Section */}
          {activeSection === "billing" && (
            <Card>
              <CardHeader>
                <CardTitle>{t('settingsBilling')}</CardTitle>
                <CardDescription>Gérez votre abonnement et votre facturation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {subscription ? (
                  <>
                    <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${subscription.tier === 'PREMIUM' ? 'bg-yellow-500/10' : 'bg-primary/10'}`}>
                          <CreditCard className={`w-6 h-6 ${subscription.tier === 'PREMIUM' ? 'text-yellow-500' : 'text-primary'}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-lg">
                            {subscription.tier === 'PREMIUM' ? 'Premium' : 'Gratuit'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {subscription.tier === 'PREMIUM' ? '19,99 $ CAD / mois' : 'Plan de base'}
                          </p>
                        </div>
                      </div>
                      {subscription.tier === 'PREMIUM' ? (
                        <Button variant="outline" size="sm" disabled={billingLoading} onClick={async () => {
                          setBillingLoading(true)
                          try {
                            const { data } = await paymentsApi.createPortal()
                            if (data.data?.url) window.location.href = data.data.url
                          } catch { setMessage('Erreur lors de l\'ouverture du portail') }
                          finally { setBillingLoading(false) }
                        }}>
                          {billingLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          Gérer l'abonnement
                        </Button>
                      ) : (
                        <Button size="sm" disabled={billingLoading} onClick={async () => {
                          setBillingLoading(true)
                          try {
                            const { data } = await paymentsApi.createCheckout()
                            if (data.data?.url) window.location.href = data.data.url
                          } catch { setMessage('Erreur lors de la création du paiement') }
                          finally { setBillingLoading(false) }
                        }}>
                          {billingLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          Passer en Premium
                        </Button>
                      )}
                    </div>
                    <div className="p-4 rounded-xl bg-muted">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-foreground">Candidatures</p>
                        <p className="text-sm text-muted-foreground">
                          {subscription.applicationsUsed} / {subscription.applicationsLimit === -1 ? '∞' : subscription.applicationsLimit}
                        </p>
                      </div>
                      {subscription.applicationsLimit !== -1 && (
                        <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min((subscription.applicationsUsed / subscription.applicationsLimit) * 100, 100)}%` }} />
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Security Section */}
          {activeSection === "security" && (
            <>
              <Card>
                <CardHeader>
                <CardTitle>{t('settingsPassword')}</CardTitle>
                <CardDescription>{t('settingsPasswordDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t('settingsCurrentPassword')}</label>
                    <Input type="password" value={pwForm.current} onChange={(e) => setPwForm({...pwForm, current: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t('settingsNewPassword')}</label>
                    <Input type="password" value={pwForm.newPw} onChange={(e) => setPwForm({...pwForm, newPw: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t('settingsConfirmPassword')}</label>
                    <Input type="password" value={pwForm.confirm} onChange={(e) => setPwForm({...pwForm, confirm: e.target.value})} />
                  </div>
                  <Button onClick={handleChangePassword} disabled={pwLoading}>
                    {pwLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {t('settingsChangePassword')}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('settings2FA')}</CardTitle>
                  <CardDescription>{t('comingSoon')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Shield className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{t('settings2FA')}</p>
                        <p className="text-sm text-muted-foreground">{t('comingSoon')}</p>
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
