"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Search,
  Building2,
  MessageSquare,
  Star,
  Clock,
  Filter,
  ChevronRight,
  DollarSign,
  Users,
  Briefcase,
} from "lucide-react"

const companies = [
  { id: "1", name: "TechCorp Inc.", scouts: 12, recentActivity: "2h ago" },
  { id: "2", name: "Google", scouts: 45, recentActivity: "1h ago" },
  { id: "3", name: "Stripe", scouts: 28, recentActivity: "3h ago" },
  { id: "4", name: "Vercel", scouts: 15, recentActivity: "5h ago" },
  { id: "5", name: "Notion", scouts: 22, recentActivity: "1d ago" },
]

const scouts = [
  {
    id: "1",
    name: "Anonymous Scout",
    company: "TechCorp Inc.",
    role: "Senior Product Designer",
    hiredAgo: "3 months",
    rating: 4.9,
    responses: 156,
    insights: [
      { type: "culture", content: "Very collaborative design team, weekly design critiques" },
      { type: "process", content: "4 rounds: recruiter, portfolio, design challenge, team fit" },
      { type: "salary", content: "Senior roles: $120-160k base + equity" },
    ],
    topQuestion: "What was the design challenge like?",
  },
  {
    id: "2",
    name: "Anonymous Scout",
    company: "Google",
    role: "UX Designer",
    hiredAgo: "6 months",
    rating: 4.8,
    responses: 203,
    insights: [
      { type: "culture", content: "Large team structure, lots of specialists" },
      { type: "process", content: "5-6 rounds depending on level, heavy on portfolio" },
      { type: "salary", content: "L4: $150-180k, L5: $180-220k + significant RSU" },
    ],
    topQuestion: "How important is prior big tech experience?",
  },
  {
    id: "3",
    name: "Anonymous Scout",
    company: "Stripe",
    role: "Product Designer",
    hiredAgo: "4 months",
    rating: 5.0,
    responses: 89,
    insights: [
      { type: "culture", content: "High bar for craft, writing culture is real" },
      { type: "process", content: "Take-home exercise + 4 interviews, emphasis on impact" },
      { type: "salary", content: "$140-170k base, generous equity refresh" },
    ],
    topQuestion: "What does the take-home involve?",
  },
]

const recentQuestions = [
  {
    id: "1",
    question: "How long did it take to hear back after applying?",
    company: "Google",
    answers: 12,
    time: "1h ago",
  },
  {
    id: "2",
    question: "What's the work-life balance like on the design team?",
    company: "TechCorp Inc.",
    answers: 8,
    time: "3h ago",
  },
  {
    id: "3",
    question: "Do they sponsor H1B visas for this role?",
    company: "Stripe",
    answers: 5,
    time: "5h ago",
  },
]

export default function ScoutsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null)

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Scout Network</h1>
          <p className="text-muted-foreground mt-1">
            Connect with recently hired professionals for insider insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search companies or scouts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Company Pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCompany(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            selectedCompany === null
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          All Companies
        </button>
        {companies.slice(0, 5).map((company) => (
          <button
            key={company.id}
            onClick={() => setSelectedCompany(company.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCompany === company.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {company.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scouts List */}
        <div className="lg:col-span-2 space-y-4">
          {scouts
            .filter(
              (scout) =>
                !selectedCompany ||
                companies.find((c) => c.id === selectedCompany)?.name === scout.company
            )
            .map((scout) => (
              <Card key={scout.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-foreground">{scout.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {scout.role} at {scout.company}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              Hired {scout.hiredAgo} ago
                            </span>
                            <span className="flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 text-warning" />
                              {scout.rating}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3.5 h-3.5" />
                              {scout.responses} responses
                            </span>
                          </div>
                        </div>
                        <Button size="sm">Ask Question</Button>
                      </div>

                      {/* Insights */}
                      <div className="mt-4 space-y-2">
                        {scout.insights.map((insight, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                          >
                            <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center shrink-0">
                              {insight.type === "culture" && (
                                <Users className="w-4 h-4 text-primary" />
                              )}
                              {insight.type === "process" && (
                                <Briefcase className="w-4 h-4 text-chart-2" />
                              )}
                              {insight.type === "salary" && (
                                <DollarSign className="w-4 h-4 text-success" />
                              )}
                            </div>
                            <p className="text-sm text-foreground leading-relaxed">
                              {insight.content}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Top Question */}
                      <div className="mt-4 p-3 rounded-lg border border-border bg-card">
                        <p className="text-xs text-muted-foreground mb-1">Most Asked Question</p>
                        <p className="text-sm font-medium text-foreground">{scout.topQuestion}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Company Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Companies with Scouts</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {companies.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => setSelectedCompany(company.id)}
                    className="flex items-center gap-3 w-full p-4 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{company.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {company.scouts} scouts • Active {company.recentActivity}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Questions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Questions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {recentQuestions.map((q) => (
                  <div key={q.id} className="p-4">
                    <p className="text-sm font-medium text-foreground mb-2">{q.question}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{q.company}</span>
                      <span>{q.answers} answers • {q.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Become a Scout */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Star className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Become a Scout</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Recently got hired? Help others by sharing your experience and insights.
              </p>
              <Button className="w-full">Apply to be a Scout</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
