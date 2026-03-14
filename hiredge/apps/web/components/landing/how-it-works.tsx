"use client"

import { Upload, MessageSquare, Target, Rocket } from "lucide-react"

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Importez votre CV",
    description: "Commencez par importer votre CV. Notre IA extrait automatiquement vos compétences, expériences et préférences.",
  },
  {
    number: "02",
    icon: MessageSquare,
    title: "Discutez avec EDGE",
    description: "Conversez avec votre assistant IA pour affiner votre profil et définir le poste idéal.",
  },
  {
    number: "03",
    icon: Target,
    title: "Recevez vos matchs",
    description: "Obtenez des offres sélectionnées avec des scores de compatibilité. Chaque offre accompagnée d'un dossier complet.",
  },
  {
    number: "04",
    icon: Rocket,
    title: "Décrochez votre emploi",
    description: "Postulez en confiance avec des documents générés par l'IA, le soutien de votre escouade et la préparation aux entretiens.",
  },
]

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="py-20 lg:py-32 bg-muted/30">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-balance">
            Comment fonctionne HIREDGE
          </h2>
          <p className="text-lg text-muted-foreground text-pretty">
            Démarrez en quelques minutes. Notre processus simplifié vous accompagne du profil à l'embauche.
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
