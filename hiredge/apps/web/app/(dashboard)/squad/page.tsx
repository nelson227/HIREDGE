"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Users,
  Send,
  Mic,
  Video,
  Trophy,
  Plus,
  Loader2,
  UserPlus,
  Copy,
  LogOut,
} from "lucide-react"
import { squadApi } from "@/lib/api"

interface SquadMember {
  id: string
  userId: string
  role: string
  joinedAt: string
  user: {
    profile?: {
      firstName: string
      lastName: string
      title?: string
    }
  }
}

interface Squad {
  id: string
  name: string
  code: string
  description?: string
  createdAt: string
  _count: {
    members: number
  }
}

interface Message {
  id: string
  userId: string
  content: string
  type: string
  createdAt: string
  user: {
    profile?: {
      firstName: string
      lastName: string
    }
  }
}

export default function SquadPage() {
  const [squad, setSquad] = useState<Squad | null>(null)
  const [members, setMembers] = useState<SquadMember[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [joinCode, setJoinCode] = useState("")
  const [newSquadName, setNewSquadName] = useState("")
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadSquad()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const loadSquad = async () => {
    try {
      setLoading(true)
      const { data } = await squadApi.getMySquad()
      if (data.success && data.data) {
        setSquad(data.data)
        // Récupérer les membres et messages
        await Promise.all([
          loadMembers(data.data.id),
          loadMessages(data.data.id)
        ])
      }
    } catch (error: any) {
      // 404 = pas de squad, c'est normal
      if (error.response?.status !== 404) {
        console.error("Erreur chargement squad:", error)
      }
    } finally {
      setLoading(false)
    }
  }

  const loadMembers = async (squadId: string) => {
    try {
      const { data } = await squadApi.getMembers(squadId)
      if (data.success) {
        setMembers(data.data)
        // Identifier l'utilisateur courant
        const me = data.data.find((m: SquadMember) => m.role === 'champion') || data.data[0]
        if (me) setCurrentUserId(me.userId)
      }
    } catch (error) {
      console.error("Erreur chargement membres:", error)
    }
  }

  const loadMessages = async (squadId: string) => {
    try {
      const { data } = await squadApi.getMessages(squadId)
      if (data.success) {
        // Inverser pour avoir les plus anciens en premier
        setMessages(data.data.reverse())
      }
    } catch (error) {
      console.error("Erreur chargement messages:", error)
    }
  }

  const handleSend = async () => {
    if (!newMessage.trim() || !squad || sending) return

    const messageContent = newMessage.trim()
    setNewMessage("")
    setSending(true)

    try {
      const { data } = await squadApi.sendMessage(squad.id, messageContent)
      if (data.success) {
        setMessages(prev => [...prev, data.data])
      }
    } catch (error) {
      console.error("Erreur envoi message:", error)
      setNewMessage(messageContent) // Restaurer le message
    } finally {
      setSending(false)
    }
  }

  const handleCreate = async () => {
    if (!newSquadName.trim() || creating) return
    setCreating(true)
    try {
      const { data } = await squadApi.create({ name: newSquadName.trim() })
      if (data.success) {
        setSquad(data.data)
        setShowCreate(false)
        setNewSquadName("")
        await loadMembers(data.data.id)
      }
    } catch (error) {
      console.error("Erreur création squad:", error)
    } finally {
      setCreating(false)
    }
  }

  const handleJoin = async () => {
    if (!joinCode.trim() || joining) return
    setJoining(true)
    try {
      const { data } = await squadApi.join(joinCode.trim())
      if (data.success) {
        await loadSquad()
        setJoinCode("")
      }
    } catch (error: any) {
      console.error("Erreur rejoindre squad:", error)
      alert(error.response?.data?.message || "Code invalide")
    } finally {
      setJoining(false)
    }
  }

  const handleLeave = async () => {
    if (!confirm("Êtes-vous sûr de vouloir quitter cette squad ?")) return
    try {
      await squadApi.leave()
      setSquad(null)
      setMembers([])
      setMessages([])
    } catch (error) {
      console.error("Erreur quitter squad:", error)
    }
  }

  const copyCode = () => {
    if (squad?.code) {
      navigator.clipboard.writeText(squad.code)
    }
  }

  const getInitials = (profile?: { firstName: string; lastName: string }) => {
    if (!profile) return "?"
    return `${profile.firstName?.[0] || ""}${profile.lastName?.[0] || ""}`.toUpperCase()
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("fr-CA", {
      hour: "2-digit",
      minute: "2-digit",
    })
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

  // Pas de squad - afficher les options
  if (!squad) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] p-4">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Rejoindre une Squad</h1>
            <p className="text-muted-foreground">
              Les Squads sont des groupes de max 6 personnes qui se soutiennent dans leur recherche d&apos;emploi.
            </p>
          </div>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Rejoindre avec un code</label>
                <div className="flex gap-2">
                  <Input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="CODE123"
                    maxLength={10}
                  />
                  <Button onClick={handleJoin} disabled={!joinCode.trim() || joining}>
                    {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">ou</span>
                </div>
              </div>

              {showCreate ? (
                <div className="space-y-4">
                  <Input
                    value={newSquadName}
                    onChange={(e) => setNewSquadName(e.target.value)}
                    placeholder="Nom de votre squad"
                    maxLength={50}
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowCreate(false)} className="flex-1">
                      Annuler
                    </Button>
                    <Button onClick={handleCreate} disabled={!newSquadName.trim() || creating} className="flex-1">
                      {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Créer
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" onClick={() => setShowCreate(true)} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Créer une nouvelle Squad
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Afficher la squad
  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="h-16 border-b border-border flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">{squad.name}</h2>
              <p className="text-xs text-muted-foreground">
                {members.length} membre{members.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyCode} title="Copier le code">
              <Copy className="w-4 h-4 mr-2" />
              {squad.code}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLeave} className="text-destructive">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Bienvenue dans votre Squad !</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Commencez à échanger avec vos coéquipiers. Partagez vos progrès, posez des questions, et soutenez-vous mutuellement.
              </p>
            </div>
          ) : (
            messages.map((message) => {
              if (message.type === "system") {
                return (
                  <div key={message.id} className="flex justify-center">
                    <div className="px-3 py-1.5 rounded-full bg-muted text-xs text-muted-foreground">
                      {message.content}
                    </div>
                  </div>
                )
              }

              const isOwn = message.userId === currentUserId
              const initials = getInitials(message.user?.profile)

              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
                >
                  <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${
                    isOwn ? "bg-primary" : "bg-muted"
                  }`}>
                    <span className={`text-xs font-semibold ${
                      isOwn ? "text-primary-foreground" : "text-muted-foreground"
                    }`}>
                      {initials}
                    </span>
                  </div>
                  <div className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
                    {!isOwn && message.user?.profile && (
                      <p className="text-xs text-muted-foreground mb-1">
                        {message.user.profile.firstName} {message.user.profile.lastName}
                      </p>
                    )}
                    <div className={`rounded-2xl px-4 py-2.5 ${
                      isOwn
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}>
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    </div>
                    <p className={`text-xs text-muted-foreground mt-1 ${
                      isOwn ? "text-right" : ""
                    }`}>
                      {formatTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-border shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex items-center gap-3"
          >
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écrivez un message..."
              className="flex-1"
              disabled={sending}
            />
            <Button type="submit" size="icon" disabled={!newMessage.trim() || sending}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="hidden lg:block w-80 border-l border-border overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Squad Members */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Membres ({members.length}/6)</h3>
            <div className="space-y-3">
              {members.map((member) => {
                const isMe = member.userId === currentUserId
                const initials = getInitials(member.user?.profile)
                return (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      isMe ? "bg-primary" : "bg-muted"
                    }`}>
                      <span className={`text-xs font-semibold ${
                        isMe ? "text-primary-foreground" : "text-muted-foreground"
                      }`}>
                        {initials}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {member.user?.profile?.firstName} {member.user?.profile?.lastName}
                        {isMe && " (Vous)"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.user?.profile?.title || member.role}
                      </p>
                    </div>
                    {member.role === "champion" && (
                      <Trophy className="w-4 h-4 text-warning shrink-0" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Invite */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Inviter des membres</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Partagez ce code pour inviter jusqu&apos;à 6 membres :
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-muted rounded-md text-center font-mono">
                  {squad.code}
                </code>
                <Button variant="outline" size="sm" onClick={copyCode}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
