"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles } from "lucide-react"

export function LandingCTA() {
  return (
    <section className="py-20 lg:py-32 bg-foreground text-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background/10 text-background text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            <span>Commencez gratuitement</span>
          </div>

          {/* Headline */}
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-balance">
            Prêt à trouver le poste idéal ?
          </h2>

          {/* Description */}
          <p className="text-lg text-background/70 mb-10 max-w-xl mx-auto text-pretty">
            Rejoignez les candidats qui utilisent déjà HIREDGE pour accélérer leur recherche d'emploi. Aucune carte bancaire requise.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" variant="secondary" asChild className="px-8 h-12 text-base bg-background text-foreground hover:bg-background/90">
              <Link href="/signup">
                Créer un compte
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="px-8 h-12 text-base border-background/30 text-background hover:bg-background/10">
              <Link href="/login">Se connecter</Link>
            </Button>
          </div>

          {/* Trust Signal */}
          <p className="mt-8 text-sm text-background/50">
            Votre compagnon IA pour une recherche d'emploi plus efficace
          </p>
        </div>
      </div>
    </section>
  )
}
