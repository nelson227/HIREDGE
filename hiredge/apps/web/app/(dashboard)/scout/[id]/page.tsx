"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft,
  Building2,
  Clock,
  Users,
  Star,
  Send,
  MessageSquare,
  Shield,
  Loader2,
} from "lucide-react"
import { scoutsApi } from "@/lib/api"
import { connectSocket } from "@/lib/socket"

interface Scout {
  id: string
  companyId: string
  department?: string
  position?: string
  yearsAtCompany?: number
  trustScore: number
  isAnonymous: boolean
  anonymousAlias?: string
  status: string
  company?: {
    id: string
    name: string
    industry?: string
    logo?: string
  }
}

interface Answer {
  id: string
  content: string
  createdAt: string
}

export default function ScoutDetailPage() {
  const params = useParams()
  const router = useRouter()
  const scoutId = params.id as string

  const [scout, setScout] = useState<Scout | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [question, setQuestion] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadScout()
  }, [scoutId])

  useEffect(() => {
    let socket: ReturnType<typeof connectSocket> | null = null
    try { socket = connectSocket() } catch { return }
    if (!socket) return

    const onNewAnswer = () => loadAnswers()
    socket.on("scout:new_answer", onNewAnswer)
    return () => { socket!.off("scout:new_answer", onNewAnswer) }
  }, [scoutId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [answers])

  const loadScout = async () => {
    try {
      setLoading(true)
      const { data } = await scoutsApi.getById(scoutId)
      if (data.success) {
        setScout(data.data)
        await loadAnswers()
      } else {
        setError("Éclaireur introuvable")
      }
    } catch {
      setError("Impossible de charger le profil de l'éclaireur")
    } finally {
      setLoading(false)
    }
  }

  const loadAnswers = async () => {
    try {
      const { data } = await scoutsApi.getAnswers(scoutId)
      if (data.success) {
        setAnswers(data.data || [])
      }
    } catch {
      // silently fail
    }
  }

  const handleAskQuestion = async () => {
    const trimmed = question.trim()
    if (!trimmed || sending) return

    try {
      setSending(true)
      await scoutsApi.askQuestion(scoutId, trimmed)
      setQuestion("")
      await loadAnswers()
    } catch {
      setError("Impossible d'envoyer votre question. Réessayez.")
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error && !scout) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button variant="outline" onClick={() => router.push("/scouts")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour aux éclaireurs
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => router.push("/scouts")}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Retour
      </Button>

      {/* Scout Profile Card */}
      {scout && (
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl">
                  {scout.isAnonymous ? "Éclaireur Anonyme" : scout.anonymousAlias || "Éclaireur"}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <Building2 className="w-4 h-4" />
                  <span>{scout.company?.name || "Entreprise"}</span>
                  {scout.department && (
                    <>
                      <span>·</span>
                      <span>{scout.department}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  {scout.yearsAtCompany != null && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {scout.yearsAtCompany} an{scout.yearsAtCompany > 1 ? "s" : ""} dans l&apos;entreprise
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-yellow-500" />
                    Score de confiance: {scout.trustScore}/100
                  </span>
                  <span className="flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" />
                    {scout.status === "VERIFIED" ? "Vérifié" : "En attente"}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Q&A Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Questions & Réponses
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {answers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aucune question posée. Soyez le premier à poser une question !
            </p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {answers.map((answer) => (
                <div key={answer.id} className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm text-foreground">{answer.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(answer.createdAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Ask Question */}
          <div className="flex gap-2 pt-2 border-t">
            <Input
              placeholder="Posez votre question à l'éclaireur..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAskQuestion()}
              disabled={sending}
            />
            <Button onClick={handleAskQuestion} disabled={sending || !question.trim()}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground space-y-2">
          <p>💡 Les éclaireurs partagent anonymement leur expérience de recrutement.</p>
          <p>Posez des questions sur le processus de recrutement, la culture d&apos;entreprise ou les salaires.</p>
          <p>Leurs réponses sont anonymisées pour protéger leur identité.</p>
        </CardContent>
      </Card>
    </div>
  )
}
