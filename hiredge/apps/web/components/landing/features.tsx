"use client"

import { Bot, FileText, Users, Building2, BarChart3, MessageSquare, Sparkles, Target, Shield } from "lucide-react"

const features = [
  {
    icon: Bot,
    title: "Assistant IA EDGE",
    description: "Votre compagnon IA personnel qui recherche des offres, génère des candidatures, analyse les entreprises et recommande des actions adaptées à votre profil.",
    highlight: true,
  },
  {
    icon: Target,
    title: "Matching intelligent",
    description: "Des scores de compatibilité propulsés par l'IA qui montrent votre adéquation avec chaque poste, en mettant en avant vos forces.",
  },
  {
    icon: FileText,
    title: "Dossiers automatiques",
    description: "Obtenez des dossiers de candidature complets : CV adapté, lettre de motivation, analyse d'entreprise et insights sur le processus de recrutement.",
  },
  {
    icon: Users,
    title: "Escouades de soutien",
    description: "Rejoignez un petit groupe de 5 à 8 candidats au profil similaire. Partagez vos expériences, entraînez-vous aux entretiens et encouragez-vous.",
  },
  {
    icon: Building2,
    title: "Réseau d'éclaireurs",
    description: "Connectez-vous avec des professionnels récemment embauchés qui partagent des informations sur la culture d'entreprise, les processus et les salaires.",
  },
  {
    icon: MessageSquare,
    title: "Préparation entretiens",
    description: "Entraînez-vous avec des simulations d'entretien IA, recevez du feedback sur vos réponses et accédez aux questions fréquentes par entreprise.",
  },
  {
    icon: BarChart3,
    title: "Pipeline de candidatures",
    description: "Suivez toutes vos candidatures dans un tableau Kanban visuel. Ne manquez jamais une relance grâce aux rappels intelligents.",
  },
  {
    icon: Shield,
    title: "Tableau analytique",
    description: "Comprenez la performance de votre recherche avec des statistiques détaillées sur vos candidatures, taux de réponse et probabilités de succès.",
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
            <span>Fonctionnalités</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-balance">
            Tout ce qu'il faut pour décrocher le poste idéal
          </h2>
          <p className="text-lg text-muted-foreground text-pretty">
            HIREDGE combine intelligence artificielle, soutien communautaire et informations exclusives pour vous donner un avantage décisif.
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
