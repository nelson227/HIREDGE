"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Shield,
  ShieldCheck,
  Crown,
  UserX,
  ArrowLeft,
  MoreHorizontal,
  Mail,
  Calendar,
  MapPin,
} from "lucide-react"
import Link from "next/link"
import { adminApi, authApi } from "@/lib/api"
import { useTranslation } from "@/lib/i18n"

interface AdminUser {
  id: string
  email: string
  role: string
  subscriptionTier: string
  isEmailVerified: boolean
  lastActiveAt: string | null
  createdAt: string
  candidateProfile: {
    firstName: string
    lastName: string
    title: string
    avatarUrl: string | null
    city: string | null
    country: string | null
  } | null
  _count: {
    applications: number
    squadMembers: number
    simulations: number
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const ROLES = ['CANDIDATE', 'SCOUT', 'RECRUITER', 'ADMIN'] as const
const TIERS = ['FREE', 'STARTER', 'PRO', 'SQUAD_PLUS'] as const

const roleLabels: Record<string, string> = {
  CANDIDATE: "Candidat",
  SCOUT: "Éclaireur",
  RECRUITER: "Recruteur",
  ADMIN: "Admin",
}

const roleBadgeColors: Record<string, string> = {
  CANDIDATE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  SCOUT: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  RECRUITER: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  ADMIN: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

const tierLabels: Record<string, string> = {
  FREE: "Gratuit",
  STARTER: "Starter",
  PRO: "Pro",
  SQUAD_PLUS: "Squad+",
}

const tierBadgeColors: Record<string, string> = {
  FREE: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  STARTER: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  PRO: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  SQUAD_PLUS: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
}

export default function AdminUsersPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [tierFilter, setTierFilter] = useState("")
  const [page, setPage] = useState(1)
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    // Check admin session
    const adminToken = sessionStorage.getItem('adminToken')
    if (!adminToken) {
      router.replace('/admin/login')
      return
    }
    authApi.me().then(({ data }) => {
      if (!data.success || data.data?.role !== 'ADMIN') {
        router.replace('/dashboard')
        return
      }
      loadUsers()
    }).catch(() => router.replace('/dashboard'))
  }, [])

  const loadUsers = useCallback(async (p = page, s = search, r = roleFilter, t = tierFilter) => {
    setLoading(true)
    try {
      const { data } = await adminApi.listUsers({
        page: p,
        limit: 20,
        search: s || undefined,
        role: r || undefined,
        subscriptionTier: t || undefined,
      })
      if (data.success) {
        setUsers(data.data)
        setPagination(data.pagination)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [page, search, roleFilter, tierFilter])

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      loadUsers(1, search, roleFilter, tierFilter)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, roleFilter, tierFilter])

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    loadUsers(newPage, search, roleFilter, tierFilter)
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    setActionLoading(true)
    try {
      await adminApi.updateUserRole(userId, newRole)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    } catch { /* silent */ }
    setActionLoading(false)
    setActionMenuId(null)
  }

  const handleTierChange = async (userId: string, newTier: string) => {
    setActionLoading(true)
    try {
      await adminApi.updateUserSubscription(userId, newTier)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, subscriptionTier: newTier } : u))
    } catch { /* silent */ }
    setActionLoading(false)
    setActionMenuId(null)
  }

  const handleDelete = async (userId: string) => {
    setActionLoading(true)
    try {
      await adminApi.deleteUser(userId)
      setUsers(prev => prev.filter(u => u.id !== userId))
      setPagination(prev => prev ? { ...prev, total: prev.total - 1 } : null)
    } catch { /* silent */ }
    setActionLoading(false)
    setConfirmDelete(null)
    setActionMenuId(null)
  }

  const formatDate = (date: string | null) => {
    if (!date) return t('dashboardNever')
    return new Date(date).toLocaleDateString(undefined, {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  }

  const getInitials = (user: AdminUser) => {
    const p = user.candidateProfile
    if (p?.firstName || p?.lastName) {
      return `${p.firstName?.[0] || ''}${p.lastName?.[0] || ''}`.toUpperCase()
    }
    return user.email[0].toUpperCase()
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin" className="p-2 hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{t('adminUserManagement')}</h1>
          <p className="text-sm text-muted-foreground">
            {pagination?.total || 0} {t('adminUsersRegistered')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('adminSearchUsers')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">{t('adminAllRoles')}</option>
          {ROLES.map(r => <option key={r} value={r}>{roleLabels[r]}</option>)}
        </select>
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">{t('adminAllSubscriptions')}</option>
          {TIERS.map(tier => <option key={tier} value={tier}>{tierLabels[tier]}</option>)}
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">{t('loading')}</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">{t('dashboardNoUsersFound')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t('adminUser')}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t('adminRole')}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t('adminSubscription')}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">{t('adminActivity')}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">{t('adminRegisteredOn')}</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">{t('adminActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                    {/* User info */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {user.candidateProfile?.avatarUrl ? (
                            <img
                              src={user.candidateProfile.avatarUrl.startsWith('data:') ? user.candidateProfile.avatarUrl : undefined}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs font-semibold text-primary">{getInitials(user)}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {user.candidateProfile?.firstName
                              ? `${user.candidateProfile.firstName} ${user.candidateProfile.lastName || ''}`
                              : user.email.split('@')[0]}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{user.email}</span>
                          </div>
                          {user.candidateProfile?.city && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <MapPin className="w-3 h-3" />
                              <span>{user.candidateProfile.city}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Role badge */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeColors[user.role] || ''}`}>
                        {roleLabels[user.role] || user.role}
                      </span>
                    </td>

                    {/* Subscription badge */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${tierBadgeColors[user.subscriptionTier] || ''}`}>
                        {tierLabels[user.subscriptionTier] || user.subscriptionTier}
                      </span>
                    </td>

                    {/* Activity */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>{user._count.applications} {t('dashboardApplication')}{user._count.applications > 1 ? 's' : ''}</p>
                        <p>{user._count.simulations} {t('dashboardSimulation')}{user._count.simulations > 1 ? 's' : ''}</p>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(user.createdAt)}</span>
                      </div>
                      {user.lastActiveAt && (
                        <p className="text-xs text-muted-foreground/60 mt-0.5">{t('dashboardActiveOn')} {formatDate(user.lastActiveAt)}</p>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setActionMenuId(actionMenuId === user.id ? null : user.id)}
                          className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                          disabled={actionLoading}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {/* Dropdown menu */}
                        {actionMenuId === user.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => { setActionMenuId(null); setConfirmDelete(null) }} />
                            <div className="absolute right-0 top-full mt-1 w-56 bg-popover border border-border rounded-lg shadow-lg z-50 py-1">
                              {/* Role section */}
                              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">{t('adminChangeRole')}</div>
                              {ROLES.map(role => (
                                <button
                                  key={role}
                                  onClick={() => handleRoleChange(user.id, role)}
                                  disabled={user.role === role || actionLoading}
                                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors flex items-center gap-2 ${user.role === role ? 'text-primary font-medium' : ''} disabled:opacity-50`}
                                >
                                  {role === 'ADMIN' ? <ShieldCheck className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                                  {roleLabels[role]}
                                  {user.role === role && <span className="ml-auto text-xs">✓</span>}
                                </button>
                              ))}

                              <div className="border-t border-border my-1" />

                              {/* Subscription section */}
                              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">{t('adminChangeSubscription')}</div>
                              {TIERS.map(tier => (
                                <button
                                  key={tier}
                                  onClick={() => handleTierChange(user.id, tier)}
                                  disabled={user.subscriptionTier === tier || actionLoading}
                                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors flex items-center gap-2 ${user.subscriptionTier === tier ? 'text-primary font-medium' : ''} disabled:opacity-50`}
                                >
                                  <Crown className="w-3.5 h-3.5" />
                                  {tierLabels[tier]}
                                  {user.subscriptionTier === tier && <span className="ml-auto text-xs">✓</span>}
                                </button>
                              ))}

                              {/* Delete */}
                              {user.role !== 'ADMIN' && (
                                <>
                                  <div className="border-t border-border my-1" />
                                  {confirmDelete === user.id ? (
                                    <div className="px-3 py-2">
                                      <p className="text-xs text-destructive mb-2">{t('adminDeleteConfirm')}</p>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => handleDelete(user.id)}
                                          disabled={actionLoading}
                                          className="flex-1 px-2 py-1 bg-destructive text-destructive-foreground rounded text-xs font-medium hover:bg-destructive/90 disabled:opacity-50"
                                        >
                                          {actionLoading ? '...' : t('confirm')}
                                        </button>
                                        <button
                                          onClick={() => setConfirmDelete(null)}
                                          className="flex-1 px-2 py-1 bg-muted rounded text-xs font-medium hover:bg-muted/80"
                                        >
                                          {t('cancel')}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setConfirmDelete(user.id)}
                                      className="w-full text-left px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      {t('adminDeleteAccount')}
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Page {pagination.page} {t('dashboardResultsPage')} {pagination.totalPages} ({pagination.total} {t('dashboardResultsPage')})
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, pagination.totalPages - 4))
                const pageNum = start + i
                if (pageNum > pagination.totalPages) return null
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      pageNum === page
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= pagination.totalPages}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
