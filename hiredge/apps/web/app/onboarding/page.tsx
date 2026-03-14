"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, Send, Bot, User, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { edgeApi, profileApi } from "@/lib/api"

type Message = {
  id: string
  role: "assistant" | "user"
  content: string
}

export default function OnboardingPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [profileReady, setProfileReady] = useState(false)
  const [completionScore, setCompletionScore] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => { scrollToBottom() }, [messages])

  useEffect(() => { startOnboarding() }, [])

  const startOnboarding = async () => {
    setIsTyping(true)
    try {
      const { data } = await edgeApi.chat("Bonjour, je viens de m'inscrire ! Aide-moi à configurer mon profil pour commencer ma recherche d'emploi.")
      if (data.success && data.data) {
        if (data.data.conversationId) setConversationId(data.data.conversationId)
        setMessages([{
          id: Date.now().toString(),
          role: "assistant",
          content: data.data.message || "Bienvenue ! Je suis EDGE, ton assistant IA de recherche d'emploi. Parle-moi de toi : quel métier exerces-tu et quel type de poste recherches-tu ?",
        }])
      }
    } catch {
      setMessages([{
        id: "1",
        role: "assistant",
        content: "Bienvenue ! Je suis EDGE, ton assistant IA de recherche d'emploi. Parle-moi de toi : quel métier exerces-tu et que recherches-tu ?",
      }])
    }
    setIsTyping(false)
  }

  const handleSend = async () => {
    if (!input.trim() || isTyping) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    }
    setMessages(prev => [...prev, userMessage])
    const msg = input
    setInput("")
    setIsTyping(true)

    try {
      const { data } = await edgeApi.chat(msg, conversationId || undefined)
      if (data.success && data.data) {
        if (data.data.conversationId) setConversationId(data.data.conversationId)
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.data.message || "Je prends note !",
        }])
      }
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Désolé, j'ai eu un problème. Peux-tu reformuler ?",
      }])
    }
    setIsTyping(false)

    // Vérifier le score du profil après chaque échange
    try {
      const { data: profileData } = await profileApi.get()
      if (profileData.success && profileData.data) {
        const score = profileData.data.completionScore || 0
        setCompletionScore(score)
        if (score >= 50) setProfileReady(true)
      }
    } catch { /* no-op */ }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">HIREDGE</span>
            </Link>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">Passer</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${
                  message.role === "assistant" ? "bg-primary" : "bg-muted"
                }`}>
                  {message.role === "assistant" ? (
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  ) : (
                    <User className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === "assistant" ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary shrink-0 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            {profileReady && (
              <div className="flex gap-3">
                <div className="w-8 shrink-0" />
                <div className="flex-1 max-w-md">
                  <div className="border border-success/30 bg-success/5 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-success" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Profil prêt !</h3>
                        <p className="text-sm text-muted-foreground">Score de complétion : {completionScore}%</p>
                      </div>
                    </div>
                    <Button className="w-full" asChild>
                      <Link href="/dashboard">Accéder au Dashboard</Link>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-border p-4 bg-card">
            <form onSubmit={(e) => { e.preventDefault(); handleSend() }} className="flex items-center gap-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Décrivez votre profil, vos souhaits..."
                className="flex-1 h-11"
                disabled={isTyping}
              />
              <Button type="submit" size="icon" className="h-11 w-11" disabled={!input.trim() || isTyping}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block w-80 border-l border-border bg-card p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-foreground mb-3">Conseils</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Décrivez votre métier actuel et vos compétences</p>
              <p>Précisez vos préférences : ville, salaire, télétravail</p>
              <p>Mentionnez le type de poste que vous recherchez</p>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-3">Score</h3>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${completionScore}%` }} />
              </div>
              <span className="text-sm font-medium text-foreground">{completionScore}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
