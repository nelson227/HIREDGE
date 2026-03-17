"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Shield, Eye, EyeOff, Loader2 } from "lucide-react"
import { adminApi } from "@/lib/api"
import { useTranslation } from "@/lib/i18n"

export default function AdminLoginPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const { data } = await adminApi.verifyAccess(email, password)
      if (data.success && data.data?.adminToken) {
        sessionStorage.setItem("adminToken", data.data.adminToken)
        router.replace("/admin")
      } else {
        setError(t('dashboardInvalidCredentials'))
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || t('dashboardInvalidCredentials')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold">{t('adminTitle')}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('adminLoginDesc')}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="admin-email" className="block text-sm font-medium mb-1.5">
                {t('dashboardAdminEmail')}
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@hiredge.app"
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-sm font-medium mb-1.5">
                {t('dashboardPassword')}
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 pr-11 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? t('dashboardHidePassword') : t('dashboardShowPassword')}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('dashboardVerification')}
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  {t('dashboardAccessAdmin')}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
