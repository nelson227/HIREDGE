"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Play,
  Mic,
  Video,
  Building2,
  Clock,
  Star,
  ChevronRight,
  Bot,
  Target,
  TrendingUp,
  MessageSquare,
  BookOpen,
} from "lucide-react"
import Link from "next/link"

const practiceCategories = [
  {
    id: "behavioral",
    name: "Behavioral Questions",
    description: "STAR method, teamwork, leadership",
    questions: 45,
    completed: 12,
    icon: MessageSquare,
  },
  {
    id: "design",
    name: "Design Challenges",
    description: "Product thinking, whiteboard exercises",
    questions: 30,
    completed: 8,
    icon: Target,
  },
  {
    id: "portfolio",
    name: "Portfolio Review",
    description: "Present your work effectively",
    questions: 20,
    completed: 15,
    icon: BookOpen,
  },
  {
    id: "technical",
    name: "Technical Questions",
    description: "Tools, processes, systems",
    questions: 35,
    completed: 5,
    icon: TrendingUp,
  },
]

const companyQuestions = [
  {
    id: "1",
    company: "TechCorp Inc.",
    role: "Senior Product Designer",
    questions: 15,
    lastUpdated: "2 days ago",
  },
  {
    id: "2",
    company: "Google",
    role: "UX Designer",
    questions: 28,
    lastUpdated: "1 week ago",
  },
  {
    id: "3",
    company: "Stripe",
    role: "Product Designer",
    questions: 22,
    lastUpdated: "3 days ago",
  },
]

const recentSessions = [
  {
    id: "1",
    type: "AI Mock Interview",
    company: "TechCorp Inc.",
    date: "Yesterday",
    score: 85,
    feedback: "Strong storytelling, could improve on metrics",
  },
  {
    id: "2",
    type: "Squad Practice",
    company: "General Behavioral",
    date: "3 days ago",
    score: 78,
    feedback: "Good structure, add more specific examples",
  },
]

const performanceData = {
  overall: 82,
  categories: [
    { name: "Communication", score: 88 },
    { name: "Problem Solving", score: 85 },
    { name: "Technical Knowledge", score: 78 },
    { name: "Leadership Examples", score: 75 },
  ],
}

export default function InterviewsPage() {
  const [selectedMode, setSelectedMode] = useState<"ai" | "company" | null>(null)

  return (
    <div className="p-4 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Interview Preparation</h1>
          <p className="text-muted-foreground mt-1">
            Practice with AI or real questions from your target companies
          </p>
        </div>
        <Button size="lg">
          <Play className="w-4 h-4 mr-2" />
          Start Practice Session
        </Button>
      </div>

      {/* Quick Start Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          className={`cursor-pointer transition-all ${
            selectedMode === "ai"
              ? "border-primary ring-2 ring-primary/20"
              : "hover:border-primary/30"
          }`}
          onClick={() => setSelectedMode("ai")}
        >
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-1">AI Mock Interview</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Practice with EDGE in a realistic interview setting. Get instant feedback on your answers.
                </p>
                <div className="flex items-center gap-4">
                  <Button asChild>
                    <Link href="/interviews/ai">
                      <Mic className="w-4 h-4 mr-2" />
                      Start AI Interview
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${
            selectedMode === "company"
              ? "border-primary ring-2 ring-primary/20"
              : "hover:border-primary/30"
          }`}
          onClick={() => setSelectedMode("company")}
        >
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center shrink-0">
                <Building2 className="w-7 h-7 text-success" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-1">Company-Specific Prep</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Practice with real questions reported by scouts from your target companies.
                </p>
                <div className="flex items-center gap-4">
                  <Button variant="secondary">
                    <Building2 className="w-4 h-4 mr-2" />
                    Choose Company
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Practice Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Practice by Category</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {practiceCategories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/interviews/category/${category.id}`}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <category.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground">{category.name}</h4>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium text-foreground">
                        {category.completed}/{category.questions}
                      </p>
                      <div className="w-20 h-1.5 rounded-full bg-muted mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{
                            width: `${(category.completed / category.questions) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Company-Specific Questions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Company Interview Questions</CardTitle>
              <Button variant="ghost" size="sm">
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {companyQuestions.map((company) => (
                  <Link
                    key={company.id}
                    href={`/interviews/company/${company.id}`}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <Building2 className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground">{company.company}</h4>
                      <p className="text-sm text-muted-foreground">{company.role}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium text-foreground">
                        {company.questions} questions
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Updated {company.lastUpdated}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Practice Sessions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Practice Sessions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {recentSessions.map((session) => (
                  <div key={session.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          {session.type.includes("AI") ? (
                            <Bot className="w-5 h-5 text-primary" />
                          ) : (
                            <Video className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">{session.type}</h4>
                          <p className="text-sm text-muted-foreground">{session.company}</p>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {session.date}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-warning" />
                          <span className="font-semibold text-foreground">{session.score}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 p-3 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">{session.feedback}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Performance Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performance Overview</CardTitle>
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
                      strokeDasharray={`${(performanceData.overall / 100) * 352} 352`}
                      className="stroke-primary"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-foreground">
                      {performanceData.overall}%
                    </span>
                    <span className="text-xs text-muted-foreground">Overall</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {performanceData.categories.map((cat) => (
                  <div key={cat.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{cat.name}</span>
                      <span className="font-medium text-foreground">{cat.score}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          cat.score >= 85
                            ? "bg-success"
                            : cat.score >= 75
                            ? "bg-primary"
                            : "bg-warning"
                        }`}
                        style={{ width: `${cat.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                "Use the STAR method for behavioral questions",
                "Quantify your impact with specific metrics",
                "Prepare 3-5 strong portfolio case studies",
                "Practice explaining your design process",
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-primary">{i + 1}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{tip}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Schedule Mock Interview */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Video className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Squad Mock Interview</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Practice with a squad member for realistic feedback
              </p>
              <Button className="w-full">Schedule Session</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
