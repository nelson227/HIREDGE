"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Bot,
  Briefcase,
  TrendingUp,
  Calendar,
  ArrowRight,
  Building2,
  MapPin,
  Clock,
  Users,
  Sparkles,
  MessageSquare,
  Loader2,
} from "lucide-react"
import { jobsApi, applicationsApi, interviewsApi, squadApi, profileApi } from "@/lib/api"
import { connectSocket } from "@/lib/socket"
import { useTranslation } from "@/lib/i18n"

interface Job {
  id: string
  title: string
  company: string | { id: string; name: string; logo?: string }
  location: string
  salary?: string
  salaryMin?: number
  salaryMax?: number
  match?: number
  matchScore?: number
  postedAt: string
  remote?: boolean
}

interface Application {
  id: string
  status: string
  job?: { title: string; company?: { name: string } }
  createdAt: string
}

interface Interview {
  id: string
  type: string
  status: string
  scheduledAt?: string
  application?: { job?: { title: string; company?: { name: string } } }
}

interface SquadMember {
  id: string
  user: { candidateProfile?: { firstName: string } }
  joinedAt: string
}

interface SquadMessage {
  id: string
  content: string
  sender?: { candidateProfile?: { firstName: string } }
  createdAt: string
}

interface UserProfile {
  firstName?: string
  lastName?: string
}

function getCompanyName(company: Job['company'], fallback: string): string {
  if (typeof company === 'string') return company
  return company?.name || fallback
}

function formatSalary(job: Job, t: (k: string) => string): string {
  if (job.salary) return job.salary
  if (job.salaryMin && job.salaryMax) {
    return `${job.salaryMin.toLocaleString()}€ - ${job.salaryMax.toLocaleString()}€`
  }
  if (job.salaryMin) return `${t('dashboardSalaryFrom')} ${job.salaryMin.toLocaleString()}€`
  return t('dashboardNotSpecified')
}

function formatPostedAt(dateStr: string, t: (k: string) => string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return t('dashboardJustNow')
  if (diffHours < 24) return t('dashboardHoursAgo').replace('{n}', String(diffHours))
  if (diffDays < 7) return t('dashboardDaysAgo').replace('{n}', String(diffDays))
  return date.toLocaleDateString()
}

function formatEventDate(dateStr: string | undefined, t: (k: string) => string): string {
  if (!dateStr) return t('dashboardDateNotDefined')
  const date = new Date(dateStr)
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (date.toDateString() === now.toDateString()) {
    return `${t('dashboardToday')}, ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return `${t('dashboardTomorrow')}, ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
  }
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [squad, setSquad] = useState<{ id: string; name: string; members: SquadMember[]; messages: SquadMessage[] } | null>(null)
  const [totalJobs, setTotalJobs] = useState(0)

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Real-time WebSocket listeners — refresh dashboard on key events
  useEffect(() => {
    let socket: ReturnType<typeof connectSocket> | null = null
    try { socket = connectSocket() } catch { return }
    if (!socket) return

    const refresh = () => loadDashboardData()

    socket.on('application:created', refresh)
    socket.on('application:status_changed', refresh)
    socket.on('application:deleted', refresh)
    socket.on('interview:started', refresh)
    socket.on('interview:completed', refresh)

    return () => {
      socket.off('application:created', refresh)
      socket.off('application:status_changed', refresh)
      socket.off('application:deleted', refresh)
      socket.off('interview:started', refresh)
      socket.off('interview:completed', refresh)
    }
  }, [])

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      // Load all data in parallel
      const [profileRes, jobsRes, appsRes, interviewsRes, squadRes] = await Promise.allSettled([
        profileApi.get(),
        jobsApi.getRecommended(5),
        applicationsApi.list(),
        interviewsApi.list(),
        squadApi.getMySquad(),
      ])

      if (profileRes.status === 'fulfilled' && profileRes.value.data.success) {
        setProfile(profileRes.value.data.data)
      }

      if (jobsRes.status === 'fulfilled' && jobsRes.value.data.success) {
        setJobs(jobsRes.value.data.data || [])
        setTotalJobs(jobsRes.value.data.pagination?.total || jobsRes.value.data.data?.length || 0)
      }

      if (appsRes.status === 'fulfilled' && appsRes.value.data.success) {
        const appsData = appsRes.value.data.data
        setApplications(Array.isArray(appsData) ? appsData : appsData?.applications || [])
      }

      if (interviewsRes.status === 'fulfilled' && interviewsRes.value.data.success) {
        setInterviews(interviewsRes.value.data.data || [])
      }

      if (squadRes.status === 'fulfilled' && squadRes.value.data.success) {
        setSquad(squadRes.value.data.data)
      }
    } catch {
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate stats
  const activeApplications = applications.filter(a => 
    ['DRAFT', 'APPLIED', 'VIEWED', 'INTERVIEW_SCHEDULED'].includes(a.status)
  ).length
  
  const upcomingInterviews = interviews.filter(i => 
    i.status === 'SCHEDULED' && i.scheduledAt && new Date(i.scheduledAt) > new Date()
  )

  const respondedApplications = applications.filter(a => 
    ['VIEWED', 'INTERVIEW_SCHEDULED', 'OFFER_RECEIVED', 'ACCEPTED'].includes(a.status)
  ).length
  const responseRate = applications.length > 0 
    ? Math.round((respondedApplications / applications.length) * 100) 
    : 0

  const userName = profile?.firstName || t('dashboardUser')

  // Get recent squad activity (last messages)
  const recentSquadActivity = squad?.messages?.slice(0, 3) || []

  if (isLoading) {
    return (
      <div className="p-4 lg:p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            {t('dashboardWelcome').replace('{name}', userName)} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('dashboardSummary')}
          </p>
        </div>
        <Button asChild>
          <Link href="/assistant">
            <Bot className="w-4 h-4 mr-2" />
            {t('dashboardTalkEdge')}
          </Link>
        </Button>
      </div>

      {/* AI Insights Card */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shrink-0">
              <Sparkles className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">{t('dashboardEdgeInsights')}</h3>
              <p className="text-muted-foreground">
                {totalJobs > 0
                  ? `${t('dashboardEdgeFoundJobs').replace('{n}', String(totalJobs))} ${upcomingInterviews.length > 0 ? t('dashboardEdgeUpcoming').replace('{n}', String(upcomingInterviews.length)) : t('dashboardEdgeContinueApply')}`
                  : applications.length > 0
                  ? t('dashboardEdgeApplications').replace('{n}', String(applications.length))
                  : t('dashboardEdgeNoJobs')}
              </p>
            </div>
            <Button variant="secondary" asChild className="shrink-0">
              <Link href="/jobs">
                {t('dashboardViewJobs')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalJobs}</p>
                <p className="text-sm text-muted-foreground">{t('dashboardJobsFound')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{activeApplications}</p>
                <p className="text-sm text-muted-foreground">{t('dashboardApplications')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{upcomingInterviews.length}</p>
                <p className="text-sm text-muted-foreground">{t('dashboardInterviews')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-chart-5/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-chart-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{responseRate}%</p>
                <p className="text-sm text-muted-foreground">{t('dashboardResponseRate')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Job Matches */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg font-semibold">{t('dashboardRecommended')}</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/jobs">
                  {t('dashboardViewAll')}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {jobs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{t('dashboardNoJobs')}</p>
                  <p className="text-sm mt-2">{t('dashboardCompleteProfile')}</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {jobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <Building2 className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-foreground truncate">{job.title}</h4>
                            <p className="text-sm text-muted-foreground">{getCompanyName(job.company, t('dashboardCompany'))}</p>
                          </div>
                          {(job.match || job.matchScore) && (
                            <div className="px-2.5 py-1 rounded-full bg-success/10 text-success text-xs font-semibold shrink-0">
                              {job.match || job.matchScore}% Match
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {job.location || t('dashboardNotSpecified')}
                            {job.remote && ` (${t('dashboardRemote')})`}
                          </span>
                          <span>{formatSalary(job, t)}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatPostedAt(job.postedAt, t)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Upcoming Events */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">{t('dashboardUpcoming')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {upcomingInterviews.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Calendar className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">{t('dashboardNoInterviews')}</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {upcomingInterviews.slice(0, 3).map((interview) => (
                    <div key={interview.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Calendar className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">
                            {t('dashboardInterviewLabel')} {interview.type === 'TECHNICAL' ? t('dashboardInterviewTechnical').toLowerCase() : interview.type === 'HR' ? t('dashboardInterviewHR') : ''}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {interview.application?.job?.company?.name || interview.application?.job?.title || t('dashboardCompany')}
                          </p>
                          <p className="text-xs text-primary mt-1">{formatEventDate(interview.scheduledAt, t)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Squad Activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg font-semibold">{t('dashboardSquadActivity')}</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/squad">{t('dashboardViewSquad')}</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {!squad ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">{t('dashboardNoSquad')}</p>
                  <Button variant="outline" size="sm" className="mt-3" asChild>
                    <Link href="/squad">{t('dashboardJoinSquad')}</Link>
                  </Button>
                </div>
              ) : recentSquadActivity.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">{t('dashboardNoActivity')}</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {recentSquadActivity.map((message) => (
                    <div key={message.id} className="p-4">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">
                          {message.sender?.candidateProfile?.firstName || t('dashboardMember')}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          {message.content.length > 50 
                            ? message.content.slice(0, 50) + "..." 
                            : message.content}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatPostedAt(message.createdAt, t)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
