"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Bot, Users, Building2, Sparkles } from "lucide-react"

export function LandingHero() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/10 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            <span>Propulsé par l'IA</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6 text-balance">
            Ne cherchez plus jamais un emploi{" "}
            <span className="text-primary">seul</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto text-pretty leading-relaxed">
            Votre compagnon IA EDGE vous aide à découvrir des opportunités, créer des candidatures percutantes et préparer vos entretiens avec le soutien de la communauté.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button size="lg" asChild className="px-8 h-12 text-base">
              <Link href="/signup">
                Commencer gratuitement
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="px-8 h-12 text-base">
              <Link href="#how-it-works">Comment ça marche</Link>
            </Button>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border">
              <Bot className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Matching IA</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Escouades de soutien</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Infos exclusives</span>
            </div>
          </div>
        </div>

        {/* Hero Visual */}
        <div className="mt-16 lg:mt-24 relative">
          <div className="relative mx-auto max-w-5xl">
            {/* Browser Mockup */}
            <div className="rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
              {/* Browser Top Bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-warning/60" />
                  <div className="w-3 h-3 rounded-full bg-success/60" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="w-full max-w-md mx-auto h-7 rounded-md bg-background border border-border flex items-center px-3">
                    <span className="text-xs text-muted-foreground">app.hiredge.ai</span>
                  </div>
                </div>
              </div>

              {/* Dashboard Preview */}
              <div className="p-6 bg-background">
                <div className="grid grid-cols-12 gap-6">
                  {/* Sidebar */}
                  <div className="col-span-3 hidden md:block">
                    <div className="space-y-2">
                      {["Tableau de bord", "Mes offres", "Candidatures", "Assistant IA", "Escouade", "Analytiques"].map((item, i) => (
                        <div
                          key={item}
                          className={`px-3 py-2 rounded-lg text-sm font-medium ${
                            i === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="col-span-12 md:col-span-9 space-y-6">
                    {/* Welcome Card */}
                    <div className="p-6 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shrink-0">
                          <Bot className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground mb-1">Bonjour 👋</h3>
                          <p className="text-sm text-muted-foreground">
                            {"J'ai trouvé de nouvelles offres qui correspondent à votre profil. Découvrez-les !"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Job Cards Preview */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {[
                        { company: "Entreprise A", role: "Designer Produit Senior", match: 94 },
                        { company: "Entreprise B", role: "Lead UX", match: 91 },
                      ].map((job) => (
                        <div key={job.company} className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="px-2 py-1 rounded-full bg-success/10 text-success text-xs font-semibold">
                              {job.match}% Compatible
                            </div>
                          </div>
                          <h4 className="font-semibold text-foreground mb-1">{job.role}</h4>
                          <p className="text-sm text-muted-foreground">{job.company}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -right-4 top-1/4 hidden lg:block">
              <div className="p-4 rounded-xl border border-border bg-card shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Activité Escouade</p>
                    <p className="text-xs text-muted-foreground">Un membre a partagé des conseils d'entretien</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
