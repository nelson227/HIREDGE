"use client"

import { TrendingUp, Users, Briefcase, Clock } from "lucide-react"

const stats = [
  {
    icon: TrendingUp,
    value: "3x",
    label: "Faster job placement",
    description: "compared to traditional search",
  },
  {
    icon: Users,
    value: "50K+",
    label: "Active candidates",
    description: "supporting each other",
  },
  {
    icon: Briefcase,
    value: "85%",
    label: "Success rate",
    description: "within 3 months",
  },
  {
    icon: Clock,
    value: "10hrs",
    label: "Saved weekly",
    description: "on applications",
  },
]

export function LandingStats() {
  return (
    <section className="py-16 border-y border-border bg-muted/30">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
                <stat.icon className="w-6 h-6 text-primary" />
              </div>
              <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">{stat.value}</div>
              <div className="text-sm font-medium text-foreground mb-1">{stat.label}</div>
              <div className="text-xs text-muted-foreground">{stat.description}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
