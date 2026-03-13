"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Search,
  Filter,
  Building2,
  MapPin,
  Clock,
  Bookmark,
  BookmarkCheck,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
  TrendingDown,
} from "lucide-react"

const jobs = [
  {
    id: "1",
    title: "Senior Product Designer",
    company: "TechCorp Inc.",
    location: "Remote",
    salary: "$120k - $160k",
    type: "Full-time",
    match: 94,
    posted: "2h ago",
    skills: ["Figma", "Design Systems", "UX Research"],
    strengths: ["5+ years experience", "Design systems expertise"],
    gaps: ["No healthcare industry experience"],
    saved: false,
  },
  {
    id: "2",
    title: "UX Lead",
    company: "StartupXYZ",
    location: "San Francisco, CA",
    salary: "$140k - $180k",
    type: "Full-time",
    match: 91,
    posted: "5h ago",
    skills: ["Leadership", "Prototyping", "User Testing"],
    strengths: ["Leadership experience", "Strong portfolio"],
    gaps: ["Startup environment preferred"],
    saved: true,
  },
  {
    id: "3",
    title: "Design Director",
    company: "DesignCo",
    location: "New York, NY",
    salary: "$160k - $200k",
    type: "Full-time",
    match: 87,
    posted: "1d ago",
    skills: ["Team Management", "Strategy", "Brand Design"],
    strengths: ["Strong design background"],
    gaps: ["Director-level experience preferred"],
    saved: false,
  },
  {
    id: "4",
    title: "Product Designer",
    company: "FinanceApp",
    location: "Remote",
    salary: "$100k - $130k",
    type: "Full-time",
    match: 85,
    posted: "2d ago",
    skills: ["Mobile Design", "Fintech", "Accessibility"],
    strengths: ["Mobile design experience"],
    gaps: ["Fintech experience would help"],
    saved: false,
  },
  {
    id: "5",
    title: "Senior UX Designer",
    company: "HealthTech Solutions",
    location: "Boston, MA",
    salary: "$115k - $145k",
    type: "Full-time",
    match: 82,
    posted: "3d ago",
    skills: ["Healthcare UX", "Accessibility", "Research"],
    strengths: ["Strong UX research skills"],
    gaps: ["Healthcare experience preferred"],
    saved: true,
  },
]

export default function JobsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [savedJobs, setSavedJobs] = useState<string[]>(
    jobs.filter((j) => j.saved).map((j) => j.id)
  )

  const toggleSave = (jobId: string) => {
    setSavedJobs((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    )
  }

  const filteredJobs = jobs.filter(
    (job) =>
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Job Matches</h1>
          <p className="text-muted-foreground mt-1">
            Jobs matched to your profile and preferences
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs..."
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

      {/* AI Summary */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="p-4 lg:p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-foreground">
                <span className="font-semibold">EDGE Analysis: </span>
                {"Based on your profile, I've found 24 active matches. Your top match at TechCorp has an interview process of 4 rounds. I've prepared a complete dossier for you."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job List */}
      <div className="space-y-4">
        {filteredJobs.map((job) => (
          <Card key={job.id} className="hover:border-primary/30 transition-colors">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                {/* Company Logo */}
                <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Building2 className="w-7 h-7 text-muted-foreground" />
                </div>

                {/* Job Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Link
                        href={`/jobs/${job.id}`}
                        className="text-lg font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        {job.title}
                      </Link>
                      <p className="text-muted-foreground">{job.company}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                        job.match >= 90
                          ? "bg-success/10 text-success"
                          : job.match >= 80
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {job.match}% Match
                      </div>
                    </div>
                  </div>

                  {/* Job Details */}
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {job.location}
                    </span>
                    <span>{job.salary}</span>
                    <span>{job.type}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {job.posted}
                    </span>
                  </div>

                  {/* Skills */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {job.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  {/* Strengths & Gaps */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-success mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-success mb-1">Strengths</p>
                        <p className="text-sm text-muted-foreground">{job.strengths.join(", ")}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <TrendingDown className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-warning mb-1">Areas to Address</p>
                        <p className="text-sm text-muted-foreground">{job.gaps.join(", ")}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex lg:flex-col items-center gap-2 shrink-0">
                  <Button asChild>
                    <Link href={`/jobs/${job.id}`}>
                      View Dossier
                      <ArrowUpRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleSave(job.id)}
                    className={savedJobs.includes(job.id) ? "text-primary" : ""}
                  >
                    {savedJobs.includes(job.id) ? (
                      <BookmarkCheck className="w-4 h-4" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
