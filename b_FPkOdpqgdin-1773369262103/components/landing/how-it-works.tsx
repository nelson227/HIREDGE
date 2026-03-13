"use client"

import { Upload, MessageSquare, Target, Rocket } from "lucide-react"

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Upload Your CV",
    description: "Start by uploading your resume. Our AI extracts your skills, experience, and preferences automatically.",
  },
  {
    number: "02",
    icon: MessageSquare,
    title: "Chat with EDGE",
    description: "Have a conversation with your AI assistant to refine your profile and understand your ideal role.",
  },
  {
    number: "03",
    icon: Target,
    title: "Get Matched",
    description: "Receive curated job matches with compatibility scores. Each comes with a complete application dossier.",
  },
  {
    number: "04",
    icon: Rocket,
    title: "Land Your Job",
    description: "Apply confidently with AI-crafted materials, squad support, and interview prep to help you succeed.",
  },
]

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="py-20 lg:py-32 bg-muted/30">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-balance">
            How HIREDGE Works
          </h2>
          <p className="text-lg text-muted-foreground text-pretty">
            Get started in minutes. Our streamlined process takes you from profile to placement.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-full w-full h-px bg-border -translate-x-1/2 z-0" />
              )}

              <div className="relative z-10 text-center">
                {/* Step Number */}
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-card border border-border shadow-sm mb-6">
                  <div className="text-center">
                    <span className="block text-xs font-semibold text-primary mb-1">{step.number}</span>
                    <step.icon className="w-8 h-8 text-foreground mx-auto" />
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
