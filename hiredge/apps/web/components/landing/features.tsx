"use client"

import { Bot, FileText, Users, Building2, BarChart3, MessageSquare, Sparkles, Target, Shield } from "lucide-react"

const features = [
  {
    icon: Bot,
    title: "AI Assistant EDGE",
    description: "Your personal AI companion that searches jobs, generates applications, analyzes companies, and recommends actions tailored to your profile.",
    highlight: true,
  },
  {
    icon: Target,
    title: "Smart Job Matching",
    description: "AI-powered compatibility scores that show how well you match each role, highlighting your strengths and areas to address.",
  },
  {
    icon: FileText,
    title: "Auto-Generated Dossiers",
    description: "Get complete application packages instantly: adapted CV, motivation letter, company analysis, and recruitment process insights.",
  },
  {
    icon: Users,
    title: "Support Squads",
    description: "Join small groups of 5-8 candidates with similar profiles. Share experiences, practice interviews, and encourage each other.",
  },
  {
    icon: Building2,
    title: "Scout Network",
    description: "Connect with recently hired professionals who share insider knowledge about company culture, hiring processes, and real salaries.",
  },
  {
    icon: MessageSquare,
    title: "Interview Prep",
    description: "Practice with AI mock interviews, get feedback on your answers, and access frequently asked questions for specific companies.",
  },
  {
    icon: BarChart3,
    title: "Application Pipeline",
    description: "Track all your applications in a visual Kanban board. Never miss a follow-up with smart reminders and status updates.",
  },
  {
    icon: Shield,
    title: "Analytics Dashboard",
    description: "Understand your job search performance with detailed stats on applications, response rates, and success probability.",
  },
]

export function LandingFeatures() {
  return (
    <section id="features" className="py-20 lg:py-32">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            <span>Platform Features</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-balance">
            Everything you need to land your dream job
          </h2>
          <p className="text-lg text-muted-foreground text-pretty">
            HIREDGE combines AI intelligence, community support, and insider knowledge to give you an unfair advantage in your job search.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className={`group p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg hover:border-primary/30 ${
                feature.highlight
                  ? "md:col-span-2 lg:col-span-2 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20"
                  : "bg-card border-border hover:bg-card/80"
              }`}
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 ${
                feature.highlight ? "bg-primary" : "bg-primary/10 group-hover:bg-primary/20"
              } transition-colors`}>
                <feature.icon className={`w-6 h-6 ${feature.highlight ? "text-primary-foreground" : "text-primary"}`} />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
