"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft,
  Building2,
  MapPin,
  Briefcase,
  DollarSign,
  Clock,
  Users,
  ExternalLink,
  FileText,
  Mail,
  Building,
  UserCheck,
  TrendingUp,
  Star,
  Bot,
  Download,
  Copy,
  Check,
} from "lucide-react"

const tabs = [
  { id: "cv", label: "Adapted CV", icon: FileText },
  { id: "letter", label: "Motivation Letter", icon: Mail },
  { id: "company", label: "Company Analysis", icon: Building },
  { id: "process", label: "Recruitment Process", icon: UserCheck },
  { id: "scouts", label: "Scout Insights", icon: Users },
  { id: "salary", label: "Salary Insights", icon: DollarSign },
]

const jobData = {
  id: "1",
  title: "Senior Product Designer",
  company: "TechCorp Inc.",
  location: "Remote",
  salary: "$120k - $160k",
  type: "Full-time",
  match: 94,
  posted: "2h ago",
  description: "We're looking for a Senior Product Designer to join our design team and help shape the future of our product. You'll work closely with product managers, engineers, and other designers to create intuitive and beautiful user experiences.",
  requirements: [
    "5+ years of product design experience",
    "Strong portfolio demonstrating UX and UI skills",
    "Experience with design systems",
    "Proficiency in Figma",
    "Excellent communication skills",
  ],
}

export default function JobDossierPage() {
  const [activeTab, setActiveTab] = useState("cv")
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Back Button */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Jobs
      </Link>

      {/* Job Header */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-muted flex items-center justify-center shrink-0">
          <Building2 className="w-8 h-8 lg:w-10 lg:h-10 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{jobData.title}</h1>
              <p className="text-lg text-muted-foreground mt-1">{jobData.company}</p>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {jobData.location}
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  {jobData.salary}
                </span>
                <span className="flex items-center gap-1">
                  <Briefcase className="w-4 h-4" />
                  {jobData.type}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Posted {jobData.posted}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-xl bg-success/10 text-success font-semibold">
                {jobData.match}% Match
              </div>
              <Button>
                Apply Now
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Analysis Banner */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <Bot className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">EDGE Analysis</h3>
              <p className="text-muted-foreground">
                {"This position is an excellent match for your profile. Your design systems experience aligns perfectly with their needs. I've prepared all materials below - your adapted CV emphasizes your relevant experience, and the motivation letter highlights your leadership capabilities."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex overflow-x-auto gap-1 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {activeTab === "cv" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Adapted CV</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-1" />
                    Download PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <div className="p-6 rounded-xl bg-muted/50 space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">Sarah Chen</h3>
                      <p className="text-muted-foreground">Senior Product Designer</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Professional Summary</h4>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        Product designer with 6+ years of experience creating user-centered digital products. Specialized in design systems, UX research, and leading cross-functional teams. Proven track record of improving user engagement and conversion rates through data-driven design decisions.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Relevant Experience</h4>
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-foreground">Lead Product Designer</p>
                            <span className="text-xs text-muted-foreground">2021 - Present</span>
                          </div>
                          <p className="text-sm text-primary">DesignStudio</p>
                          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                            <li>• Led design system initiative, reducing design inconsistencies by 60%</li>
                            <li>• Managed team of 4 designers on enterprise product redesign</li>
                            <li>• Improved user onboarding completion rate by 45%</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {["Figma", "Design Systems", "UX Research", "Prototyping", "User Testing", "Accessibility"].map((skill) => (
                          <span key={skill} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "letter" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Motivation Letter</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-1" />
                    Download PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="p-6 rounded-xl bg-muted/50 space-y-4 text-sm leading-relaxed">
                  <p className="text-muted-foreground">Dear Hiring Manager,</p>
                  
                  <p className="text-muted-foreground">
                    {"I am writing to express my strong interest in the Senior Product Designer position at TechCorp Inc. With over 6 years of experience in product design and a passion for creating intuitive user experiences, I am excited about the opportunity to contribute to your team."}
                  </p>

                  <p className="text-muted-foreground">
                    {"In my current role at DesignStudio, I have led the development of a comprehensive design system that has significantly improved team efficiency and product consistency. My experience aligns closely with your requirements, particularly in design systems and cross-functional collaboration."}
                  </p>

                  <p className="text-muted-foreground">
                    {"I am particularly drawn to TechCorp's commitment to innovation and user-centered design. I believe my background in UX research and my ability to translate complex requirements into elegant solutions would make me a valuable addition to your design team."}
                  </p>

                  <p className="text-muted-foreground">
                    Thank you for considering my application. I look forward to discussing how I can contribute to TechCorp Inc.
                  </p>

                  <p className="text-muted-foreground">
                    Best regards,<br />
                    Sarah Chen
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "company" && (
            <Card>
              <CardHeader>
                <CardTitle>Company Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">About TechCorp Inc.</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    TechCorp Inc. is a leading technology company specializing in enterprise software solutions. Founded in 2015, they have grown to over 500 employees across 5 global offices. The company is known for its innovative approach to product development and strong design culture.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-2xl font-bold text-foreground">$50M+</p>
                    <p className="text-sm text-muted-foreground">Annual Revenue</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-2xl font-bold text-foreground">500+</p>
                    <p className="text-sm text-muted-foreground">Employees</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-2xl font-bold text-foreground">4.2/5</p>
                    <p className="text-sm text-muted-foreground">Glassdoor Rating</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-2xl font-bold text-foreground">Series C</p>
                    <p className="text-sm text-muted-foreground">Funding Stage</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">Culture & Values</h4>
                  <div className="flex flex-wrap gap-2">
                    {["Innovation", "Collaboration", "User-First", "Transparency", "Growth Mindset"].map((value) => (
                      <span key={value} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                        {value}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "process" && (
            <Card>
              <CardHeader>
                <CardTitle>Recruitment Process</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { step: 1, title: "Application Review", duration: "1-2 days", description: "Initial screening of your application and portfolio" },
                    { step: 2, title: "Recruiter Call", duration: "30 min", description: "Phone screen with HR to discuss background and expectations" },
                    { step: 3, title: "Portfolio Review", duration: "1 hour", description: "Deep dive into your design work with design manager" },
                    { step: 4, title: "Design Challenge", duration: "Take-home", description: "Practical design exercise related to their product" },
                    { step: 5, title: "Team Interviews", duration: "3-4 hours", description: "Onsite interviews with team members and stakeholders" },
                    { step: 6, title: "Offer", duration: "1-2 days", description: "Final decision and offer negotiation" },
                  ].map((item) => (
                    <div key={item.step} className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-primary">{item.step}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-foreground">{item.title}</h4>
                          <span className="text-xs text-muted-foreground">{item.duration}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "scouts" && (
            <Card>
              <CardHeader>
                <CardTitle>Scout Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    user: "Anonymous Scout",
                    role: "Product Designer at TechCorp",
                    hired: "6 months ago",
                    content: "The design team is really collaborative. They value UX research heavily and give designers a lot of autonomy. The portfolio review was the most important part of my interview.",
                  },
                  {
                    user: "Anonymous Scout",
                    role: "Senior Designer at TechCorp",
                    hired: "1 year ago",
                    content: "Work-life balance is great, fully remote with flexible hours. The design challenge took me about 4 hours. Focus on showing your process, not just final deliverables.",
                  },
                ].map((insight, i) => (
                  <div key={i} className="p-4 rounded-xl bg-muted/50">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{insight.user}</p>
                        <p className="text-xs text-muted-foreground">{insight.role} • Hired {insight.hired}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{insight.content}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activeTab === "salary" && (
            <Card>
              <CardHeader>
                <CardTitle>Salary Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-6 rounded-xl bg-muted/50">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-foreground">Market Range for this Role</h4>
                    <TrendingUp className="w-5 h-5 text-success" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Minimum</span>
                      <span className="font-medium text-foreground">$110,000</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full w-3/4 bg-gradient-to-r from-primary to-success rounded-full" />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Posted Range</span>
                      <span className="font-medium text-primary">$120,000 - $160,000</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Maximum</span>
                      <span className="font-medium text-foreground">$175,000</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-3">Scout-reported Compensation</h4>
                  <div className="space-y-3">
                    {[
                      { level: "Mid-Level", salary: "$95k - $120k", equity: "0.01% - 0.02%" },
                      { level: "Senior", salary: "$120k - $160k", equity: "0.02% - 0.05%" },
                      { level: "Lead", salary: "$150k - $190k", equity: "0.05% - 0.1%" },
                    ].map((item) => (
                      <div key={item.level} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <span className="font-medium text-foreground">{item.level}</span>
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">{item.salary}</p>
                          <p className="text-xs text-muted-foreground">Equity: {item.equity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Compatibility Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center mb-4">
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
                      strokeDasharray={`${(94 / 100) * 352} 352`}
                      className="stroke-success"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-foreground">94%</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Skills Match", score: 96 },
                  { label: "Experience", score: 92 },
                  { label: "Culture Fit", score: 94 },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium text-foreground">{item.score}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Key Strengths</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                "6+ years design experience",
                "Design systems expertise",
                "Strong portfolio",
                "Leadership experience",
              ].map((strength) => (
                <div key={strength} className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-success" />
                  <span className="text-sm text-foreground">{strength}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {jobData.requirements.map((req, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span className="text-muted-foreground">{req}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
