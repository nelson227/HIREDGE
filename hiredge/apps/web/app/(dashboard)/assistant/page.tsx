"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Send,
  Plus,
  MessageSquare,
  Trash2,
  Sparkles,
  Bot,
  User,
  Image as ImageIcon,
  Loader2,
  ChevronLeft,
  Search,
  Briefcase,
  FileText,
  Target,
  Users,
  LogIn,
} from "lucide-react"
import { edgeApi } from "@/lib/api"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: string
}

interface Conversation {
  id: string
  title: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count: { messages: number }
}

const quickActions = [
  { icon: Search, label: "Chercher des offres", prompt: "Cherche des offres d'emploi qui correspondent à mon profil" },
  { icon: FileText, label: "Générer CV", prompt: "Aide-moi à créer ou améliorer mon CV" },
  { icon: Target, label: "Préparer entretien", prompt: "Je veux préparer un entretien d'embauche" },
  { icon: Briefcase, label: "Analyser entreprise", prompt: "Donne-moi des informations sur une entreprise" },
  { icon: Users, label: "Conseils Squad", prompt: "Comment puis-je utiliser mon Squad efficacement ?" },
]

export default function AssistantPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [authError, setAuthError] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const skipNextLoadRef = useRef(false) // Skip loading when we just sent a message

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [])

  // Load messages when conversation changes (only if not skipped)
  useEffect(() => {
    if (skipNextLoadRef.current) {
      skipNextLoadRef.current = false
      return
    }
    if (currentConversation) {
      loadMessages(currentConversation)
    } else {
      setMessages([])
    }
  }, [currentConversation])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const loadConversations = async () => {
    try {
      setIsLoadingConversations(true)
      setAuthError(false)
      const { data } = await edgeApi.getConversations()
      if (data.success) {
        setConversations(data.data)
        // Only auto-select if no conversation is currently selected
        if (!currentConversation) {
          const active = data.data.find((c: Conversation) => c.isActive)
          if (active) {
            setCurrentConversation(active.id)
          }
        }
      }
    } catch (error: any) {
      console.error("Failed to load conversations:", error)
      if (error.response?.status === 401) {
        setAuthError(true)
      }
    } finally {
      setIsLoadingConversations(false)
    }
  }

  const loadMessages = async (conversationId: string) => {
    try {
      const { data } = await edgeApi.getHistory(conversationId, undefined, 100)
      if (data.success) {
        // Messages come in reverse order (newest first), so reverse them
        setMessages(data.data.reverse())
      }
    } catch (error) {
      console.error("Failed to load messages:", error)
    }
  }

  const createNewConversation = async () => {
    try {
      const { data } = await edgeApi.createConversation()
      if (data.success) {
        setConversations([data.data, ...conversations])
        setCurrentConversation(data.data.id)
        setMessages([])
      }
    } catch (error) {
      console.error("Failed to create conversation:", error)
    }
  }

  const deleteConversation = async (id: string) => {
    try {
      await edgeApi.deleteConversation(id)
      setConversations(conversations.filter((c) => c.id !== id))
      if (currentConversation === id) {
        setCurrentConversation(null)
        setMessages([])
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error)
    }
  }

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim()
    if (!text || isLoading) return

    setInput("")
    setIsLoading(true)

    // Add user message optimistically
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])

    try {
      const { data } = await edgeApi.chat(text, currentConversation || undefined)
      if (data.success) {
        // Update conversation ID if new
        if (data.data.conversationId) {
          const newConvId = data.data.conversationId
          
          if (!currentConversation) {
            // Add new conversation to list optimistically
            const newConv: Conversation = {
              id: newConvId,
              title: text.slice(0, 30) + (text.length > 30 ? '...' : ''),
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              _count: { messages: 1 }
            }
            setConversations(prev => [newConv, ...prev])
            // Skip loading messages since we already have them locally
            skipNextLoadRef.current = true
          }
          setCurrentConversation(newConvId)
          
          // Refresh conversations list after a short delay to get the real title
          setTimeout(() => loadConversations(), 1000)
        }

        // Add assistant response
        const assistantMessage: Message = {
          id: `response-${Date.now()}`,
          role: "assistant",
          content: data.data.message,
          createdAt: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, assistantMessage])
      }
    } catch (error: any) {
      console.error("Failed to send message:", error)
      // Show error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: error.response?.data?.error?.message || "Désolé, une erreur s'est produite. Réessaie.",
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result as string
      setIsLoading(true)

      // Add placeholder message
      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        role: "user",
        content: "📷 Image envoyée",
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMessage])

      try {
        const { data } = await edgeApi.chat(
          "Analyse cette image",
          currentConversation || undefined,
          base64
        )
        if (data.success) {
          if (data.data.conversationId && !currentConversation) {
            skipNextLoadRef.current = true
            setCurrentConversation(data.data.conversationId)
            loadConversations()
          }

          const assistantMessage: Message = {
            id: `response-${Date.now()}`,
            role: "assistant",
            content: data.data.message,
            createdAt: new Date().toISOString(),
          }
          setMessages((prev) => [...prev, assistantMessage])
        }
      } catch (error) {
        console.error("Failed to analyze image:", error)
      } finally {
        setIsLoading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  // Show auth error state
  if (authError) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Connexion requise</h2>
            <p className="text-muted-foreground mb-6">
              Tu dois te connecter pour accéder à EDGE, ton assistant IA.
            </p>
            <Button asChild className="w-full">
              <Link href="/login">Se connecter</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Sidebar - Conversations */}
      <div
        className={cn(
          "w-72 border-r bg-muted/30 flex flex-col transition-all duration-300",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full absolute lg:relative"
        )}
      >
        <div className="p-4 border-b">
          <Button onClick={createNewConversation} className="w-full gap-2" disabled={authError}>
            <Plus className="w-4 h-4" />
            Nouvelle conversation
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {isLoadingConversations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucune conversation
              </p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-lg cursor-pointer group",
                    currentConversation === conv.id
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  )}
                  onClick={() => setCurrentConversation(conv.id)}
                >
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <span className="flex-1 truncate text-sm">{conv.title}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteConversation(conv.id)
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-14 border-b flex items-center px-4 gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">EDGE</h2>
              <p className="text-xs text-muted-foreground">Ton assistant IA</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Salut ! Je suis EDGE 👋</h3>
              <p className="text-muted-foreground text-center max-w-md mb-8">
                Ton compagnon IA pour ta recherche d'emploi. Je peux t'aider à trouver des offres, 
                préparer tes entretiens, optimiser ton CV et bien plus !
              </p>
              
              {/* Quick Actions */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 max-w-2xl">
                {quickActions.map((action) => (
                  <Card
                    key={action.label}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => sendMessage(action.prompt)}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <action.icon className="w-5 h-5 text-primary shrink-0" />
                      <span className="text-sm font-medium">{action.label}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-3",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="max-w-3xl mx-auto flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <ImageIcon className="w-4 h-4" />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Écris ton message..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button onClick={() => sendMessage()} disabled={!input.trim() || isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
