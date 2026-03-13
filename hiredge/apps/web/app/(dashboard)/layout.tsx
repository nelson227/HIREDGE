"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
} from "lucide-react"
import { Input } from "@/components/ui/input"

const sidebarItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Jobs", href: "/jobs", icon: Briefcase },
  { label: "Applications", href: "/applications", icon: FileStack },
  { label: "AI Assistant", href: "/assistant", icon: Bot },
  { label: "Interview Prep", href: "/interviews", icon: GraduationCap },
  { label: "Squad", href: "/squad", icon: Users },
  { label: "Scouts", href: "/scouts", icon: Building2 },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
]

const bottomItems = [
  { label: "Profile", href: "/profile", icon: User },
  { label: "Settings", href: "/settings", icon: Settings },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

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
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {sidebarItems.map((item) => {
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
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Bottom Items */}
          <div className="p-4 border-t border-sidebar-border">
            <ul className="space-y-1">
              {bottomItems.map((item) => {
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
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>

            {/* User Info */}
            <div className="mt-4 p-3 rounded-lg bg-sidebar-accent">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-sidebar-primary flex items-center justify-center">
                  <span className="text-sm font-semibold text-sidebar-primary-foreground">SC</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">Sarah Chen</p>
                  <p className="text-xs text-sidebar-foreground/60 truncate">sarah@example.com</p>
                </div>
                <ChevronRight className="w-4 h-4 text-sidebar-foreground/40" />
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
                aria-label="Open sidebar"
              >
                <Menu className="w-6 h-6" />
              </button>
              
              {/* Search */}
              <div className="hidden sm:block relative w-64 lg:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search jobs, companies..."
                  className="pl-9 h-9 bg-muted/50 border-transparent focus:border-border"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Notifications */}
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />
              </Button>

              {/* EDGE Quick Access */}
              <Button variant="outline" size="sm" asChild className="hidden sm:flex">
                <Link href="/assistant">
                  <Bot className="w-4 h-4 mr-2" />
                  Ask EDGE
                </Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  )
}
