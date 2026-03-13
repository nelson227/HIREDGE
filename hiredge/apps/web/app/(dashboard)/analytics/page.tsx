"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  TrendingUp,
  TrendingDown,
  Briefcase,
  Mail,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  ArrowUp,
  ArrowDown,
} from "lucide-react"

const statsCards = [
  {
    title: "Applications Sent",
    value: 24,
    change: +8,
    trend: "up",
    period: "vs last month",
    icon: Mail,
  },
  {
    title: "Response Rate",
    value: "67%",
    change: +12,
    trend: "up",
    period: "vs last month",
    icon: TrendingUp,
  },
  {
    title: "Interviews Scheduled",
    value: 8,
    change: +3,
    trend: "up",
    period: "vs last month",
    icon: Calendar,
  },
  {
    title: "Avg. Time to Response",
    value: "4.2 days",
    change: -1.5,
    trend: "down",
    period: "vs last month",
    icon: Clock,
  },
]

const applicationsByStatus = [
  { status: "Applied", count: 8, color: "bg-primary" },
  { status: "Screening", count: 4, color: "bg-chart-2" },
  { status: "Interview", count: 3, color: "bg-warning" },
  { status: "Offer", count: 1, color: "bg-success" },
  { status: "Rejected", count: 8, color: "bg-destructive" },
]

const weeklyActivity = [
  { day: "Mon", applications: 3, responses: 1 },
  { day: "Tue", applications: 2, responses: 2 },
  { day: "Wed", applications: 4, responses: 1 },
  { day: "Thu", applications: 1, responses: 3 },
  { day: "Fri", applications: 5, responses: 2 },
  { day: "Sat", applications: 2, responses: 0 },
  { day: "Sun", applications: 1, responses: 1 },
]

const topCompanies = [
  { name: "TechCorp Inc.", applications: 3, interviews: 2, status: "In Progress" },
  { name: "Google", applications: 2, interviews: 1, status: "In Progress" },
  { name: "Stripe", applications: 2, interviews: 1, status: "Offer Stage" },
  { name: "Vercel", applications: 1, interviews: 0, status: "Applied" },
  { name: "Notion", applications: 1, interviews: 1, status: "Rejected" },
]

const insights = [
  {
    type: "positive",
    title: "Strong Response Rate",
    description: "Your response rate is 67%, which is 35% above average. Keep up the great work!",
    icon: CheckCircle2,
  },
  {
    type: "improvement",
    title: "Application Volume",
    description: "Consider increasing your application rate. The most successful candidates apply to 30+ jobs monthly.",
    icon: Target,
  },
  {
    type: "positive",
    title: "Interview Success",
    description: "You're converting 50% of responses into interviews - well above the 30% benchmark.",
    icon: TrendingUp,
  },
]

export default function AnalyticsPage() {
  const maxApplications = Math.max(...weeklyActivity.map((d) => d.applications))

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Track your job search performance and identify areas for improvement
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  stat.trend === "up" ? "text-success" : "text-destructive"
                }`}>
                  {stat.trend === "up" ? (
                    <ArrowUp className="w-4 h-4" />
                  ) : (
                    <ArrowDown className="w-4 h-4" />
                  )}
                  {stat.change > 0 ? "+" : ""}{stat.change}
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Weekly Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Weekly Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-2 h-48">
                {weeklyActivity.map((day) => (
                  <div key={day.day} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex flex-col gap-1 h-40 justify-end">
                      <div
                        className="w-full bg-primary rounded-t transition-all"
                        style={{
                          height: `${(day.applications / maxApplications) * 100}%`,
                        }}
                      />
                      <div
                        className="w-full bg-success rounded-b transition-all"
                        style={{
                          height: `${(day.responses / maxApplications) * 50}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{day.day}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-primary" />
                  <span className="text-sm text-muted-foreground">Applications</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-success" />
                  <span className="text-sm text-muted-foreground">Responses</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Applications by Status */}
          <Card>
            <CardHeader>
              <CardTitle>Applications by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-8 rounded-lg overflow-hidden mb-6">
                {applicationsByStatus.map((status) => (
                  <div
                    key={status.status}
                    className={`${status.color} transition-all`}
                    style={{
                      width: `${(status.count / 24) * 100}%`,
                    }}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {applicationsByStatus.map((status) => (
                  <div key={status.status} className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <div className={`w-3 h-3 rounded ${status.color}`} />
                      <span className="text-2xl font-bold text-foreground">{status.count}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{status.status}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Companies */}
          <Card>
            <CardHeader>
              <CardTitle>Top Companies Applied To</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {topCompanies.map((company) => (
                  <div key={company.name} className="flex items-center gap-4 p-4">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <Briefcase className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{company.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {company.applications} applications • {company.interviews} interviews
                      </p>
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      company.status === "Offer Stage"
                        ? "bg-success/10 text-success"
                        : company.status === "Rejected"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-primary/10 text-primary"
                    }`}>
                      {company.status}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Success Probability */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Success Probability</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center mb-6">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      strokeWidth="8"
                      fill="none"
                      className="stroke-muted"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${(78 / 100) * 352} 352`}
                      className="stroke-success"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-foreground">78%</span>
                    <span className="text-xs text-muted-foreground">Likely</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Based on your activity and market conditions, you have a high probability of landing a job within 30 days.
              </p>
            </CardContent>
          </Card>

          {/* EDGE Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">EDGE Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {insights.map((insight, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-xl ${
                    insight.type === "positive" ? "bg-success/5" : "bg-warning/5"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      insight.type === "positive" ? "bg-success/10" : "bg-warning/10"
                    }`}>
                      <insight.icon className={`w-4 h-4 ${
                        insight.type === "positive" ? "text-success" : "text-warning"
                      }`} />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground text-sm">{insight.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Goals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Weekly Goals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Applications", current: 18, target: 25 },
                { label: "Follow-ups", current: 5, target: 8 },
                { label: "Interview Prep", current: 3, target: 5 },
              ].map((goal) => (
                <div key={goal.label}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">{goal.label}</span>
                    <span className="font-medium text-foreground">
                      {goal.current}/{goal.target}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        goal.current >= goal.target ? "bg-success" : "bg-primary"
                      }`}
                      style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
