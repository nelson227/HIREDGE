"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sparkles,
  LayoutDashboard,
  Briefcase,
  FileStack,
  Bot,
  Users,
  Building2,
  GraduationCap,
  BarChart3,
  Settings,
  User,
  Menu,
  X,
  Bell,
  Search,
  ChevronRight,
  LogOut,
  Shield,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { ErrorBoundary } from "@/components/error-boundary"
import { profileApi, authApi, notificationsApi, squadApi, clearTokens } from "@/lib/api"
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket"
import { useTranslation } from "@/lib/i18n"

type NavItem = { labelKey: any; href: string; icon: any }

const sidebarItemKeys: NavItem[] = [
  { labelKey: "navDashboard", href: "/dashboard", icon: LayoutDashboard },
  { labelKey: "navJobOffers", href: "/jobs", icon: Briefcase },
  { labelKey: "navApplications", href: "/applications", icon: FileStack },
  { labelKey: "navAssistant", href: "/assistant", icon: Bot },
  { labelKey: "navInterviews", href: "/interviews", icon: GraduationCap },
  { labelKey: "navSquad", href: "/squad", icon: Users },
  { labelKey: "navScouts", href: "/scouts", icon: Building2 },
  { labelKey: "navAnalytics", href: "/analytics", icon: BarChart3 },
]

const bottomItemKeys: NavItem[] = [
  { labelKey: "navProfile", href: "/profile", icon: User },
  { labelKey: "navSettings", href: "/settings", icon: Settings },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState("")
  const [userInfo, setUserInfo] = useState<{ firstName: string; lastName: string; email: string; avatarUrl?: string | null; role?: string } | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [squadUnreadTotal, setSquadUnreadTotal] = useState(0)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    // Fetch user profile + role
    Promise.all([
      profileApi.get().catch(() => null),
      authApi.me().catch(() => null),
    ]).then(([profileRes, meRes]) => {
      const profile = profileRes?.data?.success ? profileRes.data.data : null
      const me = meRes?.data?.success ? meRes.data.data : null

      if (profile || me) {
        setUserInfo({
          firstName: profile?.firstName || me?.candidateProfile?.firstName || me?.email?.split('@')[0] || '',
          lastName: profile?.lastName || me?.candidateProfile?.lastName || '',
          email: profile?.user?.email || me?.email || '',
          avatarUrl: profile?.avatarUrl || me?.candidateProfile?.avatarUrl || null,
          role: me?.role || 'CANDIDATE',
        })
        setAuthChecked(true)
      } else {
        router.replace('/login')
      }
    })

    // Fetch unread notifications count
    notificationsApi.list(true)
      .then(({ data }) => {
        if (data.success) {
          setUnreadCount(data.data?.length || 0)
        }
      })
      .catch(() => {})

    // Fetch unread squad messages count
    squadApi.getMySquads()
      .then(({ data }) => {
        if (data.success && Array.isArray(data.data)) {
          const total = data.data.reduce((sum: number, s: any) => sum + (s.unreadCount || 0), 0)
          setSquadUnreadTotal(total)
        }
      })
      .catch(() => {})

    // Listen for avatar updates from profile page
    const handleAvatarUpdate = (e: Event) => {
      const avatarUrl = (e as CustomEvent).detail?.avatarUrl
      if (avatarUrl) setUserInfo(prev => prev ? { ...prev, avatarUrl } : prev)
    }
    window.addEventListener('avatar-updated', handleAvatarUpdate)

    // Connect WebSocket for real-time updates
    let socket: ReturnType<typeof getSocket> = null
    const onNotificationNew = () => setUnreadCount(prev => prev + 1)
    const onNotificationRead = () => setUnreadCount(prev => Math.max(0, prev - 1))
    const onNotificationAllRead = () => setUnreadCount(0)
    const onSquadNewMessage = () => {
      if (!window.location.pathname.startsWith('/squad')) {
        setSquadUnreadTotal(prev => prev + 1)
      }
    }

    try {
      socket = connectSocket()
      socket.on('notification:new', onNotificationNew)
      socket.on('notification:read', onNotificationRead)
      socket.on('notification:all_read', onNotificationAllRead)
      socket.on('squad:new_message', onSquadNewMessage)
    } catch {
      // Socket connection may fail if no token yet
    }

    return () => {
      window.removeEventListener('avatar-updated', handleAvatarUpdate)
      if (socket) {
        socket.off('notification:new', onNotificationNew)
        socket.off('notification:read', onNotificationRead)
        socket.off('notification:all_read', onNotificationAllRead)
        socket.off('squad:new_message', onSquadNewMessage)
      }
      // Do NOT call disconnectSocket() here — other pages still need the socket.
      // disconnectSocket() is only called on logout.
    }
  }, [])

  const userInitials = userInfo 
    ? `${userInfo.firstName?.[0] || ''}${userInfo.lastName?.[0] || ''}`.toUpperCase() || 'U'
    : 'U'
  const userName = userInfo 
    ? `${userInfo.firstName} ${userInfo.lastName}`.trim() || t('dashboardUser')
    : t('loading')
  const userEmail = userInfo?.email || ''

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/jobs?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery("")
    }
  }

  const handleLogout = async () => {
    try { await authApi.logout() } catch { /* logout failure is non-blocking */ }
    disconnectSocket()
    clearTokens()
    try { sessionStorage.removeItem('adminToken') } catch {}
    window.location.href = '/login'
  }

  // Show loading while checking auth
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Sparkles className="w-10 h-10 text-primary animate-pulse" />
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-screen w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out lg:transform-none",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-sidebar-primary-foreground" />
              </div>
              <span className="text-lg font-bold tracking-tight text-sidebar-foreground">HIREDGE</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-sidebar-foreground"
              aria-label={t('dashboardCloseSidebar')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {sidebarItemKeys.map((item) => {
                const isActive = pathname === item.href
                const badge = item.href === '/squad' && squadUnreadTotal > 0 ? squadUnreadTotal : null
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => {
                        if (item.href === '/squad') setSquadUnreadTotal(0)
                      }}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="flex-1">{t(item.labelKey)}</span>
                      {badge && (
                        <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground px-1.5">
                          {badge > 99 ? '99+' : badge}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>

            {/* Admin section */}
            {userInfo?.role === 'ADMIN' && (
              <div className="mt-4 pt-4 border-t border-sidebar-border/50">
                <p className="px-3 mb-2 text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider">Admin</p>
                <ul className="space-y-1">
                  {[{ label: t('adminTitle'), href: "/admin", icon: Shield }].map((item) => {
                    const isActive = pathname.startsWith(item.href)
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                            isActive
                              ? "bg-red-500/10 text-red-500"
                              : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                          )}
                        >
                          <item.icon className="w-5 h-5" />
                          {item.label}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </nav>

          {/* Bottom Items */}
          <div className="p-4 border-t border-sidebar-border">
            <ul className="space-y-1">
              {bottomItemKeys.map((item) => {
                const isActive = pathname === item.href
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      {t(item.labelKey)}
                    </Link>
                  </li>
                )
              })}
            </ul>

            {/* User Info */}
            <div className="mt-4 p-3 rounded-lg bg-sidebar-accent">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-sidebar-primary flex items-center justify-center overflow-hidden">
                  {userInfo?.avatarUrl ? (
                    <img src={userInfo.avatarUrl.startsWith('data:') ? userInfo.avatarUrl : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:8083'}${userInfo.avatarUrl}`} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-semibold text-sidebar-primary-foreground">{userInitials}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">{userName}</p>
                  <p className="text-xs text-sidebar-foreground/60 truncate">{userEmail}</p>
                </div>
                <button onClick={handleLogout} className="text-sidebar-foreground/40 hover:text-sidebar-foreground" title={t('logout')}>
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="flex items-center justify-between h-full px-4 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-foreground"
                aria-label={t('dashboardOpenSidebar')}
              >
                <Menu className="w-6 h-6" />
              </button>
              
              {/* Search */}
              <form onSubmit={handleSearch} className="hidden sm:block relative w-64 lg:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t('dashboardSearchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 bg-muted/50 border-transparent focus:border-border"
                />
              </form>
            </div>

            <div className="flex items-center gap-3">
              {/* Notifications */}
              <Button variant="ghost" size="icon" className="relative" asChild>
                <Link href="/notifications">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-destructive" />
                  )}
                </Link>
              </Button>

              {/* EDGE Quick Access */}
              <Button variant="outline" size="sm" asChild className="hidden sm:flex">
                <Link href="/assistant">
                  <Bot className="w-4 h-4 mr-2" />
                  {t('homeAskEdge')}
                </Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="min-h-[calc(100vh-4rem)]">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
