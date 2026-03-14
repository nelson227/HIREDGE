"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  ArrowLeft,
  Bot,
  Briefcase,
  Code,
  Loader2,
  MessageSquare,
  Mic,
  Users,
  Zap,
} from "lucide-react"
import Link from "next/link"
import { interviewsApi } from "@/lib/api"

const interviewTypes = [
  {
    type: "RH",
    label: "Entretien RH",
    description: "Questions sur votre parcours, motivations et soft skills",
    icon: Users,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    type: "TECHNICAL",
    label: "Technique",
    description: "Questions techniques sur vos compétences et cas pratiques",
    icon: Code,
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    type: "BEHAVIORAL",
    label: "Comportemental",
    description: "Mises en situation et méthode STAR",
    icon: MessageSquare,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    type: "CASE_STUDY",
    label: "Étude de cas",
    description: "Résolution de problèmes et analyse stratégique",
    icon: Briefcase,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
]

export default function InterviewStartPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const applicationId = searchParams.get("applicationId") || undefined
  const [starting, setStarting] = useState<string | null>(null)

  const handleStart = async (type: string) => {
    setStarting(type)
    try {
      const { data } = await interviewsApi.start({ type, applicationId })
      if (data.success && data.data?.id) {
        router.push(`/interviews`)
      } else {
        router.push("/interviews")
      }
    } catch {
      router.push("/interviews")
    } finally {
      setStarting(null)
    }
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/interviews"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux entretiens
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Simulation d&apos;entretien
            </h1>
            <p className="text-muted-foreground">
              Choisissez le type d&apos;entretien pour commencer votre entraînement avec EDGE
            </p>
          </div>
        </div>
      </div>

      {/* Interview Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {interviewTypes.map((item) => {
          const Icon = item.icon
          const isStarting = starting === item.type
          return (
            <Card
              key={item.type}
              className="hover:border-primary/30 transition-all cursor-pointer group"
              onClick={() => !starting && handleStart(item.type)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl ${item.bg} flex items-center justify-center shrink-0`}
                  >
                    <Icon className={`w-7 h-7 ${item.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                      {item.label}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {item.description}
                    </p>
                    <Button
                      disabled={!!starting}
                      variant={isStarting ? "default" : "outline"}
                      size="sm"
                    >
                      {isStarting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Démarrage...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Démarrer
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Tips */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Mic className="w-5 h-5 text-primary" />
            Conseils pour réussir
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Utilisez la méthode STAR (Situation, Tâche, Action, Résultat) pour structurer vos réponses</li>
            <li>Préparez des exemples concrets de vos expériences passées</li>
            <li>Soyez précis et évitez les réponses trop génériques</li>
            <li>N&apos;hésitez pas à demander des clarifications sur les questions</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
