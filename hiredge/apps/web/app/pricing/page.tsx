"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, Check, ArrowLeft } from "lucide-react"
import { paymentsApi } from "@/lib/api"

const FREE_FEATURES = [
  "50 candidatures maximum",
  "Recommandations d'emploi IA",
  "1 simulation d'entretien / semaine",
  "Participation aux escouades",
  "Notifications d'offres",
]

const PREMIUM_FEATURES = [
  "Candidatures illimitées",
  "Matching IA avancé",
  "Lettres de motivation personnalisées illimitées",
  "Simulations d'entretien illimitées",
  "Accès aux éclaireurs d'entreprise",
  "Analyse salariale détaillée",
  "Support prioritaire",
]

export default function PricingPage() {
  const [isLoading, setIsLoading] = useState(false)

  const handleUpgrade = async () => {
    setIsLoading(true)
    try {
      const { data } = await paymentsApi.createCheckout()
      if (data.success && data.data?.url) {
        window.location.href = data.data.url
      }
    } catch {
      alert("Erreur lors de la création de la session de paiement.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />
          Retour au tableau de bord
        </Link>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-foreground">HIREDGE</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Choisissez votre plan
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Commencez gratuitement et passez en Premium quand vous êtes prêt à accélérer votre recherche d'emploi.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Free Plan */}
          <div className="rounded-2xl border border-border p-8 bg-card">
            <h3 className="text-lg font-semibold text-foreground mb-1">Gratuit</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-bold text-foreground">0 $</span>
              <span className="text-muted-foreground">/ mois</span>
            </div>
            <ul className="space-y-3 mb-8">
              {FREE_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full" disabled>
              Plan actuel
            </Button>
          </div>

          {/* Premium Plan */}
          <div className="rounded-2xl border-2 border-primary p-8 bg-card relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
              Recommandé
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Premium</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-bold text-foreground">19,99 $</span>
              <span className="text-muted-foreground">/ mois</span>
            </div>
            <ul className="space-y-3 mb-8">
              {PREMIUM_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button className="w-full" onClick={handleUpgrade} disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Chargement...
                </span>
              ) : (
                "Passer en Premium"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
