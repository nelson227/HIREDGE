"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Sparkles,
  Upload,
  FileText,
  Loader2,
  Check,
  Send,
  ArrowRight,
  AlertCircle,
  X,
  MessageCircle,
} from "lucide-react"
import { profileApi, onboardingApi } from "@/lib/api"
import Link from "next/link"

interface ChatMessage {
  id: string
  role: "assistant" | "user"
  content: string
  suggestedReplies?: string[]
}

export default function OnboardingPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<"choose" | "chat" | "upload" | "uploading" | "done">("choose")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [sessionId, setSessionId] = useState<string>()
  const [error, setError] = useState("")
  const [uploading, setUploading] = useState(false)
  const [parsedData, setParsedData] = useState<any>(null)
  const [dragOver, setDragOver] = useState(false)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Start chat mode — send initial empty message to get greeting
  const startChat = useCallback(async () => {
    setMode("chat")
    setSending(true)
    try {
      const { data } = await onboardingApi.chat("", undefined)
      if (data.success) {
        const resp = data.data
        setSessionId(resp.sessionId)
        setMessages([{
          id: "1",
          role: "assistant",
          content: resp.message,
          suggestedReplies: resp.suggestedReplies,
        }])
        if (resp.completed) {
          setTimeout(() => router.push("/profile"), 2000)
        }
      }
    } catch {
      setError("Erreur de connexion. Réessayez.")
      setMode("choose")
    } finally {
      setSending(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [router])

  const sendMessage = async (text?: string) => {
    const msg = text ?? input.trim()
    if (!msg || sending) return

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: msg,
    }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setSending(true)

    try {
      const { data } = await onboardingApi.chat(msg, sessionId)
      if (data.success) {
        const resp = data.data
        if (resp.sessionId) setSessionId(resp.sessionId)
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: resp.message,
            suggestedReplies: resp.suggestedReplies,
          },
        ])
        if (resp.completed) {
          setMode("done")
          setTimeout(() => router.push("/profile"), 2500)
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, role: "assistant", content: "Désolé, une erreur est survenue. Réessayez votre message." },
      ])
    } finally {
      setSending(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // CV upload handlers
  const handleFileUpload = useCallback(async (file: File) => {
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ]
    if (!validTypes.includes(file.type)) {
      setError("Format non supporté. Veuillez utiliser un fichier PDF ou DOCX.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Le fichier ne doit pas dépasser 5 Mo.")
      return
    }
    setError("")
    setUploading(true)
    setMode("uploading")
    try {
      const { data } = await profileApi.uploadCv(file)
      if (data.success) {
        setParsedData(data.data)
        setMode("done")
      } else {
        setError(data.error?.message || "Erreur lors de l'analyse du CV")
        setMode("choose")
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Erreur lors de l'envoi du CV.")
      setMode("choose")
    } finally {
      setUploading(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileUpload(file)
  }, [handleFileUpload])

  const goToProfile = () => router.push("/profile")

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">HIREDGE</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={goToProfile}>
            Passer
          </Button>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">

          {/* Mode: Choose */}
          {mode === "choose" && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center mb-6">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Bienvenue sur HIREDGE !</h1>
                <p className="text-muted-foreground">Comment souhaitez-vous configurer votre profil ?</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                  <button onClick={() => setError("")} className="ml-auto"><X className="w-4 h-4" /></button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Option 1: Chat conversationnel */}
                <Card
                  className="cursor-pointer transition-all hover:border-primary hover:shadow-lg group"
                  onClick={startChat}
                >
                  <CardContent className="p-8 text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center group-hover:bg-primary/20 text-primary transition-colors">
                      <MessageCircle className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">Discuter avec EDGE</h3>
                      <p className="text-sm text-muted-foreground">
                        Notre IA vous guide pas à pas en conversation pour créer votre profil parfait
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Sparkles className="w-3 h-3" />
                      <span>Recommandé — 2 minutes</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Option 2: Upload CV */}
                <Card
                  className="cursor-pointer transition-all hover:border-primary hover:shadow-lg group"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  <CardContent className="p-8 text-center space-y-4">
                    <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center transition-colors ${
                      dragOver ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-foreground group-hover:bg-secondary"
                    }`}>
                      <Upload className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">Importer mon CV</h3>
                      <p className="text-sm text-muted-foreground">
                        Téléchargez votre CV et votre profil sera rempli automatiquement par l'IA
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <FileText className="w-3 h-3" />
                      <span>PDF ou DOCX, max 5 Mo</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }}
                className="hidden"
              />

              <p className="text-center text-xs text-muted-foreground mt-4">
                Vous pourrez toujours modifier votre profil plus tard.
              </p>
            </div>
          )}

          {/* Mode: Conversational Chat */}
          {mode === "chat" && (
            <Card className="h-[70vh] flex flex-col">
              <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md"
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}

                  {/* Suggested replies */}
                  {messages.length > 0 && messages[messages.length - 1].suggestedReplies && !sending && (
                    <div className="flex flex-wrap gap-2 justify-start">
                      {messages[messages.length - 1].suggestedReplies!.map((reply, i) => (
                        <button
                          key={i}
                          onClick={() => sendMessage(reply)}
                          className="text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  )}

                  {sending && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-border p-4">
                  <div className="flex items-center gap-2">
                    <Input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Votre réponse..."
                      disabled={sending}
                      className="flex-1"
                    />
                    <Button
                      size="icon"
                      onClick={() => sendMessage()}
                      disabled={!input.trim() || sending}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 text-center">
                    Vous pouvez cliquer sur les suggestions ou écrire librement
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mode: Uploading */}
          {mode === "uploading" && (
            <Card>
              <CardContent className="p-12 text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">Analyse de votre CV en cours...</h2>
                  <p className="text-muted-foreground">
                    Notre IA extrait vos informations. Cela peut prendre quelques secondes.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mode: Done */}
          {mode === "done" && (
            <Card>
              <CardContent className="p-8 text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-green-500/10 mx-auto flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Profil configuré !</h2>
                <p className="text-muted-foreground">
                  Votre profil a été créé avec succès. Redirection vers votre tableau de bord...
                </p>
                <Button onClick={goToProfile} className="w-full h-11">
                  <span className="flex items-center gap-2">
                    Voir mon profil
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </Button>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  )
}
