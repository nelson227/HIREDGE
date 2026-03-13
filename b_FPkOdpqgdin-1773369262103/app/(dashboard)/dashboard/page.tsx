"use client"

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
} from "lucide-react"

const recentJobs = [
  {
    id: "1",
    title: "Senior Product Designer",
    company: "TechCorp Inc.",
    location: "Remote",
    salary: "$120k - $160k",
    match: 94,
    posted: "2h ago",
  },
  {
    id: "2",
    title: "UX Lead",
    company: "StartupXYZ",
    location: "San Francisco, CA",
    salary: "$140k - $180k",
    match: 91,
    posted: "5h ago",
  },
  {
    id: "3",
    title: "Design Director",
    company: "DesignCo",
    location: "New York, NY",
    salary: "$160k - $200k",
    match: 87,
    posted: "1d ago",
  },
]

const upcomingEvents = [
  {
    id: "1",
    title: "Technical Interview",
    company: "TechCorp Inc.",
    date: "Tomorrow, 2:00 PM",
    type: "interview",
  },
  {
    id: "2",
    title: "Squad Mock Interview",
    company: "Practice Session",
    date: "Wed, 4:00 PM",
    type: "squad",
  },
]

const squadActivity = [
  {
    id: "1",
    user: "Alex M.",
    action: "shared interview tips for",
    target: "Google",
    time: "10 min ago",
  },
  {
    id: "2",
    user: "Emma T.",
    action: "landed a job at",
    target: "Stripe",
    time: "2h ago",
  },
  {
    id: "3",
    user: "Marcus R.",
    action: "started preparing for",
    target: "Amazon interview",
    time: "4h ago",
  },
]

export default function DashboardPage() {
  return (
    <div className="p-4 lg:p-8 space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Good morning, Sarah</h1>
          <p className="text-muted-foreground mt-1">
            {"Here's what's happening with your job search today."}
          </p>
        </div>
        <Button asChild>
          <Link href="/assistant">
            <Bot className="w-4 h-4 mr-2" />
            Chat with EDGE
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
              <h3 className="font-semibold text-foreground mb-1">EDGE Insights</h3>
              <p className="text-muted-foreground">
                {"I found 12 new matches today! 3 have compatibility scores above 90%. Based on your recent activity, I'd recommend focusing on the TechCorp position - they're actively hiring and your skills align perfectly."}
              </p>
            </div>
            <Button variant="secondary" asChild className="shrink-0">
              <Link href="/jobs">
                View Matches
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
                <p className="text-2xl font-bold text-foreground">24</p>
                <p className="text-sm text-muted-foreground">Active Jobs</p>
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
                <p className="text-2xl font-bold text-foreground">8</p>
                <p className="text-sm text-muted-foreground">Applications</p>
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
                <p className="text-2xl font-bold text-foreground">3</p>
                <p className="text-sm text-muted-foreground">Interviews</p>
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
                <p className="text-2xl font-bold text-foreground">67%</p>
                <p className="text-sm text-muted-foreground">Response Rate</p>
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
              <CardTitle className="text-lg font-semibold">Recent Job Matches</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/jobs">
                  View All
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {recentJobs.map((job) => (
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
                          <p className="text-sm text-muted-foreground">{job.company}</p>
                        </div>
                        <div className="px-2.5 py-1 rounded-full bg-success/10 text-success text-xs font-semibold shrink-0">
                          {job.match}% Match
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {job.location}
                        </span>
                        <span>{job.salary}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {job.posted}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Upcoming Events */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Upcoming</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        event.type === "interview" ? "bg-primary/10" : "bg-success/10"
                      }`}>
                        {event.type === "interview" ? (
                          <Calendar className="w-5 h-5 text-primary" />
                        ) : (
                          <Users className="w-5 h-5 text-success" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">{event.title}</h4>
                        <p className="text-sm text-muted-foreground">{event.company}</p>
                        <p className="text-xs text-primary mt-1">{event.date}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Squad Activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg font-semibold">Squad Activity</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/squad">View Squad</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {squadActivity.map((activity) => (
                  <div key={activity.id} className="p-4">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{activity.user}</span>{" "}
                      <span className="text-muted-foreground">{activity.action}</span>{" "}
                      <span className="font-medium">{activity.target}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
