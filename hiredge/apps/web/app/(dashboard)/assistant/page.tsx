"use client"

import { useState, useEffect, useRef, useCallback } from "react"
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
  Paperclip,
  X,
  Download,
  FileDown,
  Mic,
  MicOff,
} from "lucide-react"
import { edgeApi } from "@/lib/api"
import { cn } from "@/lib/utils"

interface Attachment {
  type: "image" | "document"
  name: string
  uri?: string       // data URL for images
  content?: string   // text content for documents
}

interface ChatAction {
  type: string
  documentType?: string
  data?: any
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: string
  attachment?: Attachment
  actions?: ChatAction[]
  suggestedFollowups?: string[]
}

interface Conversation {
  id: string
  title: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count: { messages: number }
}

// PDF.js loader (CDN)
let pdfJsLib: any = null
async function loadPdfJs() {
  if (pdfJsLib) return pdfJsLib
  if (typeof window === "undefined") return null
  try {
    const script = document.createElement("script")
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
    await new Promise<void>((resolve, reject) => {
      script.onload = () => resolve()
      script.onerror = () => reject(new Error("Failed to load PDF.js"))
      document.head.appendChild(script)
    })
    const w = window as any
    w.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
    pdfJsLib = w.pdfjsLib
    return pdfJsLib
  } catch {
    return null
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
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
  const [attachment, setAttachment] = useState<Attachment | null>(null)
  const [isProcessingFile, setIsProcessingFile] = useState(false)
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null)
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
    if ((!text && !attachment) || isLoading) return

    setInput("")
    const currentAttachment = attachment
    setAttachment(null)
    setIsLoading(true)

    // Build final message with attachment context
    let finalMessage = text || ""
    let imageBase64: string | undefined

    if (currentAttachment) {
      if (currentAttachment.type === "document" && currentAttachment.content) {
        finalMessage = `[📄 Document joint : ${currentAttachment.name}]\n\n${currentAttachment.content}\n\n---\n${text}`
      } else if (currentAttachment.type === "image" && currentAttachment.uri) {
        imageBase64 = currentAttachment.uri
        if (!text) finalMessage = `Analyse cette image : ${currentAttachment.name}`
      }
    }

    // Add user message optimistically
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: text || (currentAttachment?.type === "image" ? "📷 Image envoyée" : "📄 Document envoyé"),
      createdAt: new Date().toISOString(),
      attachment: currentAttachment ?? undefined,
    }
    setMessages((prev) => [...prev, userMessage])

    try {
      const { data } = await edgeApi.chat(finalMessage, currentConversation || undefined, imageBase64)
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
          actions: data.data.actions,
          suggestedFollowups: data.data.suggestedFollowups,
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

  // Extract text from PDF
  const extractPdfText = async (file: File): Promise<string> => {
    const lib = await loadPdfJs()
    if (!lib) throw new Error("PDF.js not available")
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await lib.getDocument({ data: arrayBuffer }).promise
    const pages: string[] = []
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map((item: any) => item.str).join(" ")
      pages.push(pageText)
    }
    return pages.join("\n\n")
  }

  // Handle file upload (images, PDF, text files)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""

    const isImage = file.type.startsWith("image/")
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    const isDocx = file.name.toLowerCase().endsWith(".doc") || file.name.toLowerCase().endsWith(".docx")

    if (isImage) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setAttachment({ type: "image", name: file.name, uri: ev.target?.result as string })
      }
      reader.readAsDataURL(file)
    } else if (isPdf) {
      setIsProcessingFile(true)
      try {
        const text = await extractPdfText(file)
        if (!text.trim()) {
          alert("Ce PDF ne contient pas de texte extractible (peut-être un scan/image).")
          setIsProcessingFile(false)
          return
        }
        setAttachment({ type: "document", name: file.name, content: text.slice(0, 12000) })
      } catch {
        alert("Impossible de lire ce PDF. Essaie un autre fichier.")
      } finally {
        setIsProcessingFile(false)
      }
    } else if (isDocx) {
      alert("Les fichiers .doc/.docx ne sont pas encore supportés en lecture. Convertis-le en PDF ou .txt.")
    } else {
      // Text-based files: .txt, .md, .json, .csv
      const reader = new FileReader()
      reader.onload = (ev) => {
        const content = ev.target?.result as string
        setAttachment({ type: "document", name: file.name, content: content.slice(0, 12000) })
      }
      reader.readAsText(file)
    }
  }

  // Download generated document as PDF
  const handleDownloadPDF = async (action: ChatAction) => {
    if (downloadingFormat) return
    setDownloadingFormat("pdf")
    try {
      const { jsPDF } = await import("jspdf")
      const doc = new jsPDF()
      const margin = 20
      const contentWidth = doc.internal.pageSize.getWidth() - margin * 2
      const content = action.data?.content || action.data?.text || "Aucun contenu"
      doc.setFontSize(11)
      const lines = doc.splitTextToSize(content, contentWidth)
      let y = 25
      for (const line of lines) {
        if (y > 275) { doc.addPage(); y = 20 }
        doc.text(line, margin, y)
        y += 5.5
      }
      downloadBlob(doc.output("blob"), "document-edge.pdf")
    } catch {
      alert("Erreur lors de la génération du PDF.")
    } finally {
      setDownloadingFormat(null)
    }
  }

  // Download generated document as Word
  const handleDownloadWord = async (action: ChatAction) => {
    if (downloadingFormat) return
    setDownloadingFormat("word")
    try {
      const { Document, Packer, Paragraph, TextRun } = await import("docx")
      const content = action.data?.content || action.data?.text || "Aucun contenu"
      const paragraphs = content.split("\n").map(
        (line: string) => new Paragraph({ children: [new TextRun({ text: line, size: 22, font: "Calibri" })], spacing: { after: 120 } })
      )
      const docFile = new Document({ sections: [{ children: paragraphs }] })
      const blob = await Packer.toBlob(docFile)
      downloadBlob(blob, "document-edge.docx")
    } catch {
      alert("Erreur lors de la génération du Word.")
    } finally {
      setDownloadingFormat(null)
    }
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
                  <div className="max-w-[80%]">
                    {/* Attachment preview in message */}
                    {message.attachment?.type === "image" && message.attachment.uri && (
                      <img
                        src={message.attachment.uri}
                        alt={message.attachment.name}
                        className="max-w-[200px] rounded-xl mb-1 border"
                      />
                    )}
                    {message.attachment?.type === "document" && (
                      <div className="flex items-center gap-2 bg-primary/10 rounded-lg px-3 py-2 mb-1 border border-primary/20">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold text-primary truncate">
                          {message.attachment.name}
                        </span>
                      </div>
                    )}
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-3",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    {/* Download buttons for generated documents */}
                    {message.role === "assistant" && message.actions?.some((a) => a.type === "DOWNLOAD_DOCUMENT") && (
                      <div className="flex gap-2 mt-2">
                        {message.actions!.filter((a) => a.type === "DOWNLOAD_DOCUMENT").map((action, i) => (
                          <div key={i} className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadPDF(action)}
                              disabled={!!downloadingFormat}
                              className="gap-1.5 bg-red-500 hover:bg-red-600 text-white border-red-500 hover:border-red-600"
                            >
                              {downloadingFormat === "pdf" ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <FileDown className="w-3.5 h-3.5" />
                              )}
                              PDF
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadWord(action)}
                              disabled={!!downloadingFormat}
                              className="gap-1.5 bg-blue-700 hover:bg-blue-800 text-white border-blue-700 hover:border-blue-800"
                            >
                              {downloadingFormat === "word" ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <FileDown className="w-3.5 h-3.5" />
                              )}
                              Word
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Suggested follow-ups */}
                    {message.role === "assistant" && message.suggestedFollowups && message.suggestedFollowups.length > 0 && message.id === messages[messages.length - 1]?.id && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {message.suggestedFollowups.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => sendMessage(s)}
                            className="text-xs px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors font-medium"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
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

        {/* Attachment preview bar */}
        {isProcessingFile && (
          <div className="px-4 py-2 border-t bg-primary/5 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-xs font-semibold text-primary">Extraction du texte…</span>
          </div>
        )}
        {attachment && (
          <div className="px-4 py-2 border-t bg-primary/5 flex items-center gap-2">
            {attachment.type === "image" && attachment.uri ? (
              <img src={attachment.uri} alt="" className="w-10 h-10 rounded-md object-cover" />
            ) : (
              <FileText className="w-5 h-5 text-primary" />
            )}
            <span className="flex-1 text-xs font-semibold text-primary truncate">
              {attachment.name}
            </span>
            <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => setAttachment(null)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t">
          <div className="max-w-3xl mx-auto flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.json,.csv,.pdf,.doc,.docx,image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isProcessingFile}
              title="Importer un document ou une image"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Écris ton message..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button onClick={() => sendMessage()} disabled={(!input.trim() && !attachment) || isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-1.5 max-w-3xl mx-auto">
            ↵ Entrée pour envoyer · 📎 PDF, images, documents texte
          </p>
        </div>
      </div>
    </div>
  )
}
