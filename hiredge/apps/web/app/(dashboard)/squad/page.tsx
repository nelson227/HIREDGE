"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Users,
  Send,
  Mic,
  MicOff,
  Video,
  Plus,
  Loader2,
  UserPlus,
  Copy,
  LogOut,
  Target,
  MapPin,
  Calendar,
  Phone as PhoneIcon,
  ChevronLeft,
  Clock,
  X,
  Play,
  Pause,
  Square,
  Reply,
  Pin,
  Star,
  Trash2,
  ChevronDown,
  SmilePlus,
} from "lucide-react"
import { squadApi, authApi } from "@/lib/api"
import { connectSocket, joinSquadRoom, leaveSquadRoom, getSocket, emitTyping, emitStopTyping } from "@/lib/socket"

// ─── Types ───────────────────────────────────────────────────────
interface MemberUser {
  id: string
  email: string
  lastActiveAt?: string | null
  candidateProfile?: {
    firstName: string
    lastName: string
    title?: string
    avatarUrl?: string
  }
}

interface SquadMember {
  id: string
  userId: string
  role: string
  joinedAt: string
  user: MemberUser
}

interface SquadMessage {
  id: string
  squadId: string
  userId: string
  content: string
  type: string
  isPinned?: boolean
  isImportant?: boolean
  deletedForAll?: boolean
  replyToId?: string | null
  replyTo?: {
    id: string
    content: string
    type: string
    user: { candidateProfile?: { firstName: string; lastName: string } }
  } | null
  reactions?: { id: string; emoji: string; userId: string }[]
  createdAt: string
  user: {
    id: string
    candidateProfile?: { firstName: string; lastName: string; avatarUrl?: string }
  }
}

interface SquadEvent {
  id: string
  title: string
  type: string
  scheduledAt: string
  duration: number
  link?: string
  createdBy: { candidateProfile?: { firstName: string; lastName: string } }
}

interface Squad {
  id: string
  name: string
  code?: string
  description?: string
  focus?: string
  jobFamily?: string
  experienceLevel?: string
  locationFilter?: string
  maxMembers: number
  status: string
  createdAt: string
  members?: SquadMember[]
  messages?: SquadMessage[]
  events?: SquadEvent[]
  _count?: { members: number }
}

interface AvailableSquad {
  id: string
  name: string
  focus?: string
  jobFamily?: string
  experienceLevel?: string
  locationFilter?: string
  maxMembers: number
  _count: { members: number }
}

// ─── Helpers ─────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:8083'

function getInitials(profile?: { firstName: string; lastName: string } | null) {
  if (!profile) return "?"
  return `${profile.firstName?.[0] || ""}${profile.lastName?.[0] || ""}`.toUpperCase()
}

function getFullName(profile?: { firstName: string; lastName: string } | null) {
  if (!profile) return "Membre"
  return `${profile.firstName || ""} ${profile.lastName || ""}`.trim()
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })
}

function formatDate(dateString: string) {
  const d = new Date(dateString)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const isTomorrow = d.toDateString() === tomorrow.toDateString()

  if (isToday) return `Aujourd'hui, ${formatTime(dateString)}`
  if (isTomorrow) return `Demain, ${formatTime(dateString)}`
  return d.toLocaleDateString("fr-CA", { weekday: "short", day: "numeric", month: "short" }) + `, ${formatTime(dateString)}`
}

type OnlineStatus = "online" | "away" | "offline"

function getOnlineStatus(lastActiveAt?: string | null): OnlineStatus {
  if (!lastActiveAt) return "offline"
  const diff = Date.now() - new Date(lastActiveAt).getTime()
  if (diff < 5 * 60 * 1000) return "online"
  if (diff < 60 * 60 * 1000) return "away"
  return "offline"
}

function statusColor(status: OnlineStatus) {
  if (status === "online") return "bg-green-500"
  if (status === "away") return "bg-orange-400"
  return "bg-red-400"
}

function countOnline(members: SquadMember[]) {
  return members.filter(m => getOnlineStatus(m.user?.lastActiveAt) === "online").length
}

// ─── Component ───────────────────────────────────────────────────
export default function SquadPage() {
  const [squads, setSquads] = useState<Squad[]>([])
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [members, setMembers] = useState<SquadMember[]>([])
  const [messages, setMessages] = useState<SquadMessage[]>([])
  const [events, setEvents] = useState<SquadEvent[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [joinCode, setJoinCode] = useState("")
  const [newSquadName, setNewSquadName] = useState("")
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [availableSquads, setAvailableSquads] = useState<AvailableSquad[]>([])
  const [loadingAvailable, setLoadingAvailable] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState("")

  const [showEventForm, setShowEventForm] = useState(false)
  const [eventForm, setEventForm] = useState({ title: "", type: "MEETING", scheduledAt: "", duration: 30 })
  const [creatingEvent, setCreatingEvent] = useState(false)

  const [mobileShowChat, setMobileShowChat] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const previousSquadIdRef = useRef<string | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Voice recording
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Message interactions
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState<string | null>(null)
  const [replyTo, setReplyTo] = useState<SquadMessage | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ msgId: string; isOwn: boolean; canDeleteForAll: boolean } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const emojiRef = useRef<HTMLDivElement>(null)

  const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "🎉"]

  const selectedSquad = squads.find(s => s.id === selectedSquadId) || null

  // ─── Data Loading ───────────────────────────────────────────────
  const loadAvailableSquads = useCallback(async () => {
    try {
      setLoadingAvailable(true)
      const { data } = await squadApi.getAvailable()
      if (data.success) setAvailableSquads(data.data || [])
    } catch {
      // silent
    } finally {
      setLoadingAvailable(false)
    }
  }, [])

  const selectSquad = useCallback(async (squadId: string) => {
    setSelectedSquadId(squadId)
    setMobileShowChat(true)

    // Marquer les messages comme lus
    squadApi.markAsRead(squadId).catch(() => {})
    // Réinitialiser le badge unread pour cette squad
    setSquads(prev => prev.map(s => s.id === squadId ? { ...s, unreadCount: 0 } : s))

    try {
      const [membersRes, messagesRes, eventsRes] = await Promise.all([
        squadApi.getMembers(squadId),
        squadApi.getMessages(squadId),
        squadApi.getEvents(squadId),
      ])
      if (membersRes.data?.data) setMembers(membersRes.data.data)
      if (messagesRes.data?.data) setMessages(messagesRes.data.data)
      if (eventsRes.data?.data) setEvents(eventsRes.data.data)
    } catch {
      // silent
    }
  }, [])

  const loadInitial = useCallback(async () => {
    try {
      setLoading(true)
      const [meRes, squadsRes] = await Promise.all([
        authApi.me(),
        squadApi.getMySquads(),
      ])
      if (meRes.data?.data?.id) setCurrentUserId(meRes.data.data.id)

      const mySquads = squadsRes.data?.data || squadsRes.data || []
      const squadList = Array.isArray(mySquads) ? mySquads : [mySquads].filter(Boolean)
      setSquads(squadList)

      if (squadList.length > 0 && squadList[0].id) {
        selectSquad(squadList[0].id)
      } else {
        loadAvailableSquads()
      }
    } catch {
      loadAvailableSquads()
    } finally {
      setLoading(false)
    }
  }, [selectSquad, loadAvailableSquads])

  useEffect(() => {
    loadInitial()
  }, [loadInitial])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ─── WebSocket ──────────────────────────────────────────────────
  useEffect(() => {
    // Use existing socket from layout, or reconnect if needed
    let socket: ReturnType<typeof getSocket> = getSocket()
    if (!socket?.connected) {
      try {
        socket = connectSocket()
      } catch {
        return
      }
    }

    const onNewMessage = (msg: SquadMessage) => {
      // Only add if it's for the currently selected squad and not from us
      if (msg.squadId === selectedSquadId && msg.userId !== currentUserId) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev
          return [...prev, msg]
        })
      }
    }

    const onReaction = (data: { messageId: string; userId: string; action: string; emoji: string }) => {
      setMessages(prev => prev.map(m => {
        if (m.id !== data.messageId) return m
        const reactions = [...(m.reactions || [])]
        if (data.action === 'removed') {
          return { ...m, reactions: reactions.filter(r => !(r.emoji === data.emoji && r.userId === data.userId)) }
        }
        return { ...m, reactions: [...reactions, { id: Date.now().toString(), emoji: data.emoji, userId: data.userId }] }
      }))
    }

    const onPin = (data: { messageId: string; isPinned: boolean }) => {
      setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, isPinned: data.isPinned } : m))
    }

    const onImportant = (data: { messageId: string; isImportant: boolean }) => {
      setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, isImportant: data.isImportant } : m))
    }

    const onDelete = (data: { messageId: string; mode: string }) => {
      if (data.mode === 'FOR_ALL') {
        setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, deletedForAll: true, content: '🚫 Ce message a été supprimé' } : m))
      }
    }

    const onUserTyping = (data: { userId: string }) => {
      if (data.userId !== currentUserId) {
        setTypingUsers(prev => prev.includes(data.userId) ? prev : [...prev, data.userId])
      }
    }

    const onUserStopTyping = (data: { userId: string }) => {
      setTypingUsers(prev => prev.filter(id => id !== data.userId))
    }

    socket.on('squad:new_message', onNewMessage)
    socket.on('squad:reaction', onReaction)
    socket.on('squad:pin', onPin)
    socket.on('squad:important', onImportant)
    socket.on('squad:delete', onDelete)
    socket.on('squad:user_typing', onUserTyping)
    socket.on('squad:user_stop_typing', onUserStopTyping)

    return () => {
      socket?.off('squad:new_message', onNewMessage)
      socket?.off('squad:reaction', onReaction)
      socket?.off('squad:pin', onPin)
      socket?.off('squad:important', onImportant)
      socket?.off('squad:delete', onDelete)
      socket?.off('squad:user_typing', onUserTyping)
      socket?.off('squad:user_stop_typing', onUserStopTyping)
    }
  }, [selectedSquadId, currentUserId])

  // ─── Join/Leave squad rooms ─────────────────────────────────────
  useEffect(() => {
    if (previousSquadIdRef.current) {
      leaveSquadRoom(previousSquadIdRef.current)
    }
    if (selectedSquadId) {
      joinSquadRoom(selectedSquadId)
    }
    previousSquadIdRef.current = selectedSquadId
    setTypingUsers([])
  }, [selectedSquadId])

  // ─── Cleanup squad room on unmount ──────────────────────────────
  useEffect(() => {
    return () => {
      if (previousSquadIdRef.current) {
        leaveSquadRoom(previousSquadIdRef.current)
      }
    }
  }, [])

  // ─── Actions ────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!newMessage.trim() || !selectedSquadId || sending) return
    const content = newMessage.trim()
    const replyId = replyTo?.id
    setNewMessage("")
    setReplyTo(null)
    setSending(true)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    emitStopTyping(selectedSquadId)
    try {
      const { data } = await squadApi.sendMessage(selectedSquadId, content, replyId)
      if (data.success) setMessages(prev => [...prev, data.data])
    } catch {
      setNewMessage(content)
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
        setNewSquadName("")
        setShowCreate(false)
        await loadInitial()
      }
    } catch {
      // silent
    } finally {
      setCreating(false)
    }
  }

  const handleJoinByCode = async () => {
    if (!joinCode.trim() || joining) return
    setJoining(true)
    try {
      await squadApi.join(joinCode.trim())
      setJoinCode("")
      await loadInitial()
    } catch (err: any) {
      setFeedbackMsg(err.response?.data?.error?.message || "Code invalide")
      setTimeout(() => setFeedbackMsg(""), 3000)
    } finally {
      setJoining(false)
    }
  }

  const handleJoinSquad = async (squadId: string) => {
    try {
      setJoining(true)
      await squadApi.joinById(squadId)
      await loadInitial()
    } catch (err: any) {
      setFeedbackMsg(err.response?.data?.error?.message || "Impossible de rejoindre")
      setTimeout(() => setFeedbackMsg(""), 3000)
    } finally {
      setJoining(false)
    }
  }

  const handleLeave = async (squadId: string) => {
    if (!confirm("Quitter cette escouade ?")) return
    try {
      await squadApi.leave(squadId)
      const remaining = squads.filter(s => s.id !== squadId)
      setSquads(remaining)
      if (selectedSquadId === squadId) {
        if (remaining.length > 0) {
          selectSquad(remaining[0].id)
        } else {
          setSelectedSquadId(null)
          setMembers([])
          setMessages([])
          setEvents([])
          setMobileShowChat(false)
          loadAvailableSquads()
        }
      }
    } catch {
      // silent
    }
  }

  const handleCreateEvent = async () => {
    if (!eventForm.title || !eventForm.scheduledAt || !selectedSquadId || creatingEvent) return
    setCreatingEvent(true)
    try {
      const { data } = await squadApi.createEvent(selectedSquadId, eventForm)
      if (data.success) {
        setEvents(prev => [...prev, data.data].sort(
          (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
        ))
        setShowEventForm(false)
        setEventForm({ title: "", type: "MEETING", scheduledAt: "", duration: 30 })
        const msgRes = await squadApi.getMessages(selectedSquadId)
        if (msgRes.data?.data) setMessages(msgRes.data.data)
      }
    } catch {
      // silent
    } finally {
      setCreatingEvent(false)
    }
  }

  const copyCode = (code?: string) => {
    if (code) navigator.clipboard.writeText(code)
  }

  // ─── Voice Recording ──────────────────────────────────────────
  const startRecording = async () => {
    if (!selectedSquadId) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4' })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType })
        if (blob.size < 1000) return // skip if too short

        try {
          const { data } = await squadApi.sendVoice(selectedSquadId!, blob)
          if (data.success) setMessages(prev => [...prev, data.data])
        } catch {}
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
    } catch {
      // Microphone permission denied
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    setRecordingTime(0)
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.ondataavailable = null
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop())
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    setRecordingTime(0)
  }

  const formatRecordingTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  // ─── Message Actions ────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpenId(null)
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setEmojiPickerMsgId(null)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!selectedSquadId) return
    setEmojiPickerMsgId(null)
    try {
      const { data } = await squadApi.toggleReaction(selectedSquadId, messageId, emoji)
      if (data.success) {
        setMessages(prev => prev.map(m => {
          if (m.id !== messageId) return m
          const reactions = [...(m.reactions || [])]
          if (data.data.action === 'removed') {
            return { ...m, reactions: reactions.filter(r => !(r.emoji === emoji && r.userId === currentUserId)) }
          }
          return { ...m, reactions: [...reactions, { id: Date.now().toString(), emoji, userId: currentUserId! }] }
        }))
      }
    } catch {}
  }

  const handlePin = async (messageId: string) => {
    if (!selectedSquadId) return
    setMenuOpenId(null)
    try {
      const { data } = await squadApi.togglePin(selectedSquadId, messageId)
      if (data.success) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isPinned: data.data.isPinned } : m))
      }
    } catch {}
  }

  const handleImportant = async (messageId: string) => {
    if (!selectedSquadId) return
    setMenuOpenId(null)
    try {
      const { data } = await squadApi.toggleImportant(selectedSquadId, messageId)
      if (data.success) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isImportant: data.data.isImportant } : m))
      }
    } catch {}
  }

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
    setMenuOpenId(null)
  }

  const handleReply = (msg: SquadMessage) => {
    setReplyTo(msg)
    setMenuOpenId(null)
  }

  const openDeleteDialog = (msg: SquadMessage) => {
    const isOwn = msg.userId === currentUserId
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    const canDeleteForAll = isOwn && new Date(msg.createdAt).getTime() > oneHourAgo
    setDeleteDialog({ msgId: msg.id, isOwn, canDeleteForAll })
    setMenuOpenId(null)
  }

  const confirmDelete = async (mode: 'FOR_ME' | 'FOR_ALL') => {
    if (!selectedSquadId || !deleteDialog) return
    try {
      const { data } = await squadApi.deleteMessage(selectedSquadId, deleteDialog.msgId, mode)
      if (data.success) {
        if (mode === 'FOR_ALL') {
          setMessages(prev => prev.map(m => m.id === deleteDialog.msgId ? { ...m, deletedForAll: true, content: '🚫 Ce message a été supprimé' } : m))
        } else {
          setMessages(prev => prev.filter(m => m.id !== deleteDialog.msgId))
        }
      }
    } catch {}
    setDeleteDialog(null)
  }

  // ─── Calls (Jitsi — nouvel onglet) ─────────────────────────────
  const startCall = async () => {
    if (!selectedSquadId || !selectedSquad) return
    const ts = Date.now().toString(36)
    const safeName = selectedSquad.name.replace(/[^a-zA-Z0-9]/g, "").substring(0, 20)
    const roomName = `hiredge-${safeName}-${selectedSquadId.substring(0, 8)}-${ts}`
    const callUrl = `https://meet.jit.si/${roomName}`

    window.open(callUrl, "_blank", "noopener,noreferrer")

    try {
      const { data } = await squadApi.sendMessage(
        selectedSquadId,
        `📞 Appel démarré — Rejoignez : ${callUrl}`
      )
      if (data.success) setMessages(prev => [...prev, data.data])
    } catch {}
  }

  const joinCallFromLink = (callUrl: string) => {
    window.open(callUrl, "_blank", "noopener,noreferrer")
  }

  function getLastMessage(sq: Squad): string {
    const msgs = sq.messages
    if (!msgs || msgs.length === 0) return "Aucun message"
    const last = msgs[0] as any
    const name = last.user?.candidateProfile?.firstName || ""
    const text = last.content || ""
    const preview = `${name}: ${text}`
    return preview.length > 60 ? preview.substring(0, 60) + "…" : preview
  }

  function getLastMessageTime(sq: Squad): string {
    const msgs = sq.messages
    if (!msgs || msgs.length === 0) return ""
    return formatTime(msgs[0].createdAt)
  }

  // ─── Loading ────────────────────────────────────────────────────
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

  // ─── No Squads View ─────────────────────────────────────────────
  if (squads.length === 0 && !mobileShowChat) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] p-4">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Rejoindre une Escouade</h1>
            <p className="text-muted-foreground">
              Les Escouades sont des groupes de recherche d&apos;emploi. Rejoignez jusqu&apos;à 5 escouades.
            </p>
          </div>

          {feedbackMsg && (
            <div className="bg-destructive/10 text-destructive text-sm px-4 py-2 rounded-lg">{feedbackMsg}</div>
          )}

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
                  <Button onClick={handleJoinByCode} disabled={!joinCode.trim() || joining}>
                    {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">ou</span>
                </div>
              </div>

              {showCreate ? (
                <div className="space-y-4">
                  <Input value={newSquadName} onChange={(e) => setNewSquadName(e.target.value)} placeholder="Nom de votre escouade" maxLength={50} />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowCreate(false)} className="flex-1">Annuler</Button>
                    <Button onClick={handleCreate} disabled={!newSquadName.trim() || creating} className="flex-1">
                      {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Créer
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" onClick={() => setShowCreate(true)} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />Créer une Escouade
                </Button>
              )}
            </CardContent>
          </Card>

          {loadingAvailable ? (
            <div className="text-center py-4"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /></div>
          ) : availableSquads.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-center">Escouades disponibles</h2>
              <p className="text-sm text-muted-foreground text-center">EDGE a trouvé des escouades qui correspondent à votre profil</p>
              {availableSquads.map((sq) => (
                <Card key={sq.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{sq.name}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{sq._count.members}/{sq.maxMembers}</span>
                          {sq.jobFamily && <span className="flex items-center gap-1"><Target className="w-3 h-3" />{sq.jobFamily}</span>}
                          {sq.locationFilter && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{sq.locationFilter}</span>}
                        </div>
                      </div>
                      <Button size="sm" onClick={() => handleJoinSquad(sq.id)} disabled={joining}>
                        {joining ? <Loader2 className="w-3 h-3 animate-spin" /> : "Rejoindre"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── Main Layout: Squad List + Chat + Members Sidebar ───────────
  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {feedbackMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-destructive/10 text-destructive text-sm px-4 py-2 rounded-lg z-50">
          {feedbackMsg}
        </div>
      )}

      {/* ── Left Panel: Squad List (WhatsApp-style) ───────────── */}
      <div className={`w-80 border-r border-border flex flex-col bg-background ${mobileShowChat ? "hidden lg:flex" : "flex"}`}>
        <div className="h-16 border-b border-border flex items-center justify-between px-4 shrink-0">
          <h2 className="font-semibold text-lg text-foreground">Escouades</h2>
          <Button variant="ghost" size="icon" onClick={() => { setShowCreate(true); setSelectedSquadId(null); setMobileShowChat(false) }}>
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {squads.map((sq) => {
            const isActive = sq.id === selectedSquadId
            const memberCount = sq._count?.members ?? sq.members?.length ?? 0
            const onlineCount = sq.members ? countOnline(sq.members) : 0
            const unread = (sq as any).unreadCount || 0

            return (
              <button
                key={sq.id}
                onClick={() => selectSquad(sq.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                  isActive ? "bg-primary/5 border-l-2 border-primary" : ""
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm text-foreground truncate">{sq.name}</p>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="text-xs text-muted-foreground">{getLastMessageTime(sq)}</span>
                      {unread > 0 && !isActive && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground px-1.5">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{getLastMessage(sq)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {memberCount} membre{memberCount > 1 ? "s" : ""}
                    {onlineCount > 0 && <span className="text-green-500"> · {onlineCount} en ligne</span>}
                  </p>
                </div>
              </button>
            )
          })}

          <div className="p-4 space-y-2">
            <div className="flex gap-2">
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Code d'invitation..."
                className="text-sm"
                maxLength={10}
              />
              <Button size="sm" onClick={handleJoinByCode} disabled={!joinCode.trim() || joining}>
                {joining ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Center: Chat Area ─────────────────────────────────── */}
      <div className={`flex-1 flex flex-col ${!mobileShowChat ? "hidden lg:flex" : "flex"}`}>
        {!selectedSquad ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Sélectionnez une escouade</p>
              <p className="text-sm mt-1">Choisissez une conversation dans la liste</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-border flex items-center justify-between px-4 lg:px-6 shrink-0">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setMobileShowChat(false)} className="lg:hidden">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground text-sm">{selectedSquad.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {members.length} membre{members.length > 1 ? "s" : ""}
                    {countOnline(members) > 0 && ` · ${countOnline(members)} en ligne`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => startCall()} title="Démarrer un appel">
                  <Video className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setShowEventForm(true)} title="Planifier un événement">
                  <Calendar className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => copyCode(selectedSquad.code)} title="Copier le code" className="hidden sm:flex">
                  <Copy className="w-3 h-3 mr-1" />{selectedSquad.code}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleLeave(selectedSquad.id)} className="text-destructive hover:text-destructive" title="Quitter">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Event Creation */}
            {showEventForm && (
              <div className="border-b border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">
                    {eventForm.type === "CALL" ? "Planifier un appel" : eventForm.type === "MEETING" ? "Planifier une réunion" : "Planifier un événement"}
                  </h3>
                  <Button variant="ghost" size="icon" onClick={() => setShowEventForm(false)} className="h-6 w-6">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input placeholder="Titre" value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} />
                  <Input type="datetime-local" value={eventForm.scheduledAt} onChange={e => setEventForm({ ...eventForm, scheduledAt: e.target.value })} />
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={eventForm.type}
                    onChange={e => setEventForm({ ...eventForm, type: e.target.value })}
                  >
                    <option value="MEETING">Réunion vidéo</option>
                    <option value="CALL">Appel</option>
                    <option value="REVIEW">Revue CV / Lettre</option>
                  </select>
                  <div className="flex gap-2">
                    <Input type="number" placeholder="Durée (min)" value={eventForm.duration} onChange={e => setEventForm({ ...eventForm, duration: parseInt(e.target.value) || 30 })} className="w-28" />
                    <Button onClick={handleCreateEvent} disabled={!eventForm.title || !eventForm.scheduledAt || creatingEvent} className="flex-1">
                      {creatingEvent ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calendar className="w-4 h-4 mr-2" />}
                      Créer
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Users className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <h3 className="font-semibold mb-2">Bienvenue dans votre Escouade !</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Commencez à échanger. Partagez vos progrès, posez des questions, et soutenez-vous mutuellement.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  if (msg.type === "SYSTEM" || msg.type === "system") {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <div className="px-3 py-1.5 rounded-full bg-muted text-xs text-muted-foreground max-w-sm text-center">
                          {msg.content}
                        </div>
                      </div>
                    )
                  }

                  const callMatch = msg.content.match(/(https:\/\/[^\s]+daily\.co[^\s]+|https:\/\/meet\.jit\.si\/\S+)/)
                  if (callMatch && msg.content.startsWith("📞")) {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <div className="px-4 py-3 rounded-xl bg-primary/5 border border-primary/20 max-w-sm text-center space-y-2">
                          <p className="text-xs text-muted-foreground">
                            {msg.userId === currentUserId ? "Vous avez" : getFullName(msg.user?.candidateProfile) + " a"} démarré un appel
                          </p>
                          <p className="text-[10px] text-muted-foreground">{formatTime(msg.createdAt)}</p>
                          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => joinCallFromLink(callMatch[0])}>
                            <PhoneIcon className="w-3.5 h-3.5" />Rejoindre l&apos;appel
                          </Button>
                        </div>
                      </div>
                    )
                  }

                  if (msg.deletedForAll) {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <div className="px-3 py-1.5 rounded-full bg-muted text-xs text-muted-foreground/60 italic">
                          🚫 Ce message a été supprimé
                        </div>
                      </div>
                    )
                  }

                  const isOwn = msg.userId === currentUserId
                  const profile = msg.user?.candidateProfile
                  const initials = getInitials(profile)
                  const isVoice = msg.type === "VOICE" || msg.type === "voice"
                  const isHovered = hoveredMsgId === msg.id
                  const groupedReactions = (msg.reactions || []).reduce<Record<string, string[]>>((acc, r) => {
                    ;(acc[r.emoji] ??= []).push(r.userId)
                    return acc
                  }, {})

                  return (
                    <div
                      key={msg.id}
                      id={`msg-${msg.id}`}
                      className={`group relative flex gap-2.5 transition-colors duration-1000 ${isOwn ? "flex-row-reverse" : ""}`}
                      onMouseEnter={() => setHoveredMsgId(msg.id)}
                      onMouseLeave={() => { if (menuOpenId !== msg.id && emojiPickerMsgId !== msg.id) setHoveredMsgId(null) }}
                    >
                      <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold overflow-hidden ${
                        isOwn ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        {profile?.avatarUrl ? (
                          <img src={profile.avatarUrl.startsWith('data:') ? profile.avatarUrl : `${API_BASE}${profile.avatarUrl}`} alt="" className="w-full h-full object-cover" />
                        ) : initials}
                      </div>
                      <div className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
                        {!isOwn && profile && (
                          <p className="text-xs font-medium text-muted-foreground mb-1">{getFullName(profile)}</p>
                        )}

                        {/* Reply preview (quoted message) — clickable to scroll */}
                        {msg.replyTo && (
                          <div
                            onClick={() => {
                              const el = document.getElementById(`msg-${msg.replyTo!.id}`)
                              if (el) {
                                el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                el.classList.add('bg-primary/10')
                                setTimeout(() => el.classList.remove('bg-primary/10'), 2000)
                              }
                            }}
                            className={`text-xs border-l-2 border-primary/50 pl-2.5 mb-1 py-1.5 pr-2 rounded-lg cursor-pointer hover:brightness-95 transition-all max-w-full ${isOwn ? "bg-primary/20 ml-auto" : "bg-muted"}`}
                          >
                            <span className="font-semibold text-primary/80 block">{getFullName(msg.replyTo.user?.candidateProfile)}</span>
                            <p className="text-muted-foreground truncate mt-0.5">{msg.replyTo.type === "VOICE" ? "🎙️ Message vocal" : msg.replyTo.content}</p>
                          </div>
                        )}

                        {/* Message bubble + hover actions wrapper */}
                        <div className="relative">
                        {/* Hover actions: emoji (left) + menu arrow (right) */}
                        {isHovered && (
                          <div className={`absolute -top-3 ${isOwn ? "right-0" : "left-0"} flex items-center gap-0.5 z-10`}>
                            <button
                              onClick={() => { setEmojiPickerMsgId(msg.id); setMenuOpenId(null) }}
                              className="p-1 rounded-full bg-background border border-border shadow-sm hover:bg-muted transition-colors"
                              title="Réagir"
                            >
                              <SmilePlus className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                            <button
                              onClick={() => { setMenuOpenId(msg.id); setEmojiPickerMsgId(null) }}
                              className="p-1 rounded-full bg-background border border-border shadow-sm hover:bg-muted transition-colors"
                              title="Plus"
                            >
                              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                          </div>
                        )}

                        {/* Emoji Picker */}
                        {emojiPickerMsgId === msg.id && (
                          <div
                            ref={emojiRef}
                            className={`absolute ${isOwn ? "right-0" : "left-0"} -top-12 z-20 bg-background border border-border rounded-xl shadow-lg p-1.5 flex gap-0.5`}
                          >
                            {QUICK_EMOJIS.map(e => (
                              <button
                                key={e}
                                onClick={() => handleReaction(msg.id, e)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-base"
                              >
                                {e}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Context Menu */}
                        {menuOpenId === msg.id && (
                          <div
                            ref={menuRef}
                            className={`absolute ${isOwn ? "right-0" : "left-0"} top-0 z-20 bg-background border border-border rounded-xl shadow-lg py-1.5 min-w-[180px]`}
                          >
                            <button onClick={() => handleReply(msg)} className="flex items-center gap-3 w-full px-3 py-2 text-sm hover:bg-muted transition-colors">
                              <Reply className="w-4 h-4 text-muted-foreground" /> Répondre
                            </button>
                            <button onClick={() => handleCopyMessage(msg.content)} className="flex items-center gap-3 w-full px-3 py-2 text-sm hover:bg-muted transition-colors">
                              <Copy className="w-4 h-4 text-muted-foreground" /> Copier
                            </button>
                            <button onClick={() => { setEmojiPickerMsgId(msg.id); setMenuOpenId(null) }} className="flex items-center gap-3 w-full px-3 py-2 text-sm hover:bg-muted transition-colors">
                              <SmilePlus className="w-4 h-4 text-muted-foreground" /> Réagir
                            </button>
                            <button onClick={() => handlePin(msg.id)} className="flex items-center gap-3 w-full px-3 py-2 text-sm hover:bg-muted transition-colors">
                              <Pin className="w-4 h-4 text-muted-foreground" /> {msg.isPinned ? "Désépingler" : "Épingler"}
                            </button>
                            <button onClick={() => handleImportant(msg.id)} className="flex items-center gap-3 w-full px-3 py-2 text-sm hover:bg-muted transition-colors">
                              <Star className="w-4 h-4 text-muted-foreground" /> {msg.isImportant ? "Retirer important" : "Marquer comme important"}
                            </button>
                            <div className="border-t border-border my-1" />
                            <button onClick={() => openDeleteDialog(msg)} className="flex items-center gap-3 w-full px-3 py-2 text-sm hover:bg-muted transition-colors text-destructive">
                              <Trash2 className="w-4 h-4" /> Supprimer
                            </button>
                          </div>
                        )}

                        {/* Message bubble */}
                        <div className={`rounded-2xl px-4 py-2.5 ${
                          isVoice
                            ? (isOwn ? "bg-primary/15 text-foreground rounded-br-md" : "bg-slate-100 dark:bg-slate-800 border border-border text-foreground rounded-bl-md")
                            : (isOwn ? "bg-primary text-primary-foreground rounded-br-md" : "bg-slate-100 dark:bg-slate-800 border border-border text-foreground rounded-bl-md")
                        }`}>
                          {isVoice ? (
                            <div className="flex items-center gap-2 min-w-[200px]">
                              <Mic className="w-4 h-4 shrink-0 opacity-60" />
                              <audio controls preload="metadata" className="h-8 w-full">
                                <source src={`${process.env.NEXT_PUBLIC_API_URL || ''}/squads/${selectedSquadId}/voice/${msg.id}`} />
                              </audio>
                            </div>
                          ) : (
                            <p className="text-sm leading-relaxed">{msg.content}</p>
                          )}
                        </div>
                        </div>{/* end relative wrapper for bubble + hover actions */}

                        {/* Badges: pinned / important */}
                        {(msg.isPinned || msg.isImportant) && (
                          <div className={`flex items-center gap-1.5 mt-0.5 ${isOwn ? "justify-end" : ""}`}>
                            {msg.isPinned && <Pin className="w-3 h-3 text-muted-foreground" />}
                            {msg.isImportant && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                          </div>
                        )}

                        {/* Reactions */}
                        {Object.keys(groupedReactions).length > 0 && (
                          <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? "justify-end" : ""}`}>
                            {Object.entries(groupedReactions).map(([emoji, userIds]) => (
                              <button
                                key={emoji}
                                onClick={() => handleReaction(msg.id, emoji)}
                                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
                                  userIds.includes(currentUserId || "") ? "bg-primary/10 border-primary/30" : "bg-muted border-border hover:bg-muted/80"
                                }`}
                              >
                                <span>{emoji}</span>
                                {userIds.length > 1 && <span className="text-muted-foreground">{userIds.length}</span>}
                              </button>
                            ))}
                          </div>
                        )}

                        <p className={`text-[10px] text-muted-foreground mt-1 ${isOwn ? "text-right" : ""}`}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Delete confirmation dialog */}
            {deleteDialog && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteDialog(null)}>
                <div className="bg-background rounded-xl shadow-xl p-5 max-w-sm w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
                  <h3 className="font-semibold text-foreground">Supprimer le message ?</h3>
                  <div className="space-y-2">
                    <button onClick={() => confirmDelete('FOR_ME')} className="w-full text-left px-4 py-2.5 rounded-lg hover:bg-muted transition-colors text-sm">
                      🗑️ Supprimer pour moi
                    </button>
                    {deleteDialog.canDeleteForAll && (
                      <button onClick={() => confirmDelete('FOR_ALL')} className="w-full text-left px-4 py-2.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors text-sm">
                        🚫 Supprimer pour tous
                      </button>
                    )}
                    {deleteDialog.isOwn && !deleteDialog.canDeleteForAll && (
                      <p className="text-xs text-muted-foreground px-4">Ce message a plus d&apos;une heure. Vous ne pouvez le supprimer que pour vous.</p>
                    )}
                  </div>
                  <Button variant="ghost" onClick={() => setDeleteDialog(null)} className="w-full">Annuler</Button>
                </div>
              </div>
            )}

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div className="px-4 py-1 text-xs text-muted-foreground italic">
                {typingUsers.length === 1
                  ? `${members.find(m => m.userId === typingUsers[0])?.user?.candidateProfile?.firstName || 'Quelqu\'un'} est en train d'écrire...`
                  : 'Plusieurs personnes écrivent...'}
              </div>
            )}

            {/* Reply preview bar */}
            {replyTo && (
              <div className="px-3 pt-2 pb-0 border-t border-border bg-muted/30">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border-l-2 border-primary">
                  <Reply className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-primary">{getFullName(replyTo.user?.candidateProfile)}</p>
                    <p className="text-xs text-muted-foreground truncate">{replyTo.type === "VOICE" ? "🎙️ Message vocal" : replyTo.content}</p>
                  </div>
                  <button onClick={() => setReplyTo(null)} className="shrink-0 p-1 hover:bg-muted rounded">
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>
            )}

            {/* Message Input */}
            <div className={`p-3 border-t border-border shrink-0 ${replyTo ? "pt-1 border-t-0" : ""}`}>
              {isRecording ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20">
                    <div className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
                    <span className="text-sm font-medium text-destructive">Enregistrement</span>
                    <span className="text-sm text-muted-foreground">{formatRecordingTime(recordingTime)}</span>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={cancelRecording} className="shrink-0 text-muted-foreground" title="Annuler">
                    <X className="w-5 h-5" />
                  </Button>
                  <Button type="button" size="icon" onClick={stopRecording} className="shrink-0 bg-destructive hover:bg-destructive/90" title="Envoyer">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); handleSend() }} className="flex items-center gap-2">
                  <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground" onClick={startRecording} title="Enregistrer un message vocal">
                    <Mic className="w-5 h-5" />
                  </Button>
                <Input
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value)
                    if (selectedSquadId && e.target.value.trim()) {
                      emitTyping(selectedSquadId)
                      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
                      typingTimeoutRef.current = setTimeout(() => {
                        if (selectedSquadId) emitStopTyping(selectedSquadId)
                      }, 2000)
                    }
                  }}
                  placeholder="Écrire un message..."
                  className="flex-1"
                  disabled={sending}
                />
                <Button type="submit" size="icon" disabled={!newMessage.trim() || sending} className="shrink-0">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </form>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Right Sidebar: Members + Events ───────────────────── */}
      {selectedSquad && (
        <div className="hidden xl:flex w-72 border-l border-border flex-col overflow-y-auto">
          <div className="p-5 space-y-6">
            {/* Members */}
            <div>
              <h3 className="font-semibold text-foreground text-sm mb-4">Membres</h3>
              <div className="space-y-3">
                {members.map((member) => {
                  const isMe = member.userId === currentUserId
                  const profile = member.user?.candidateProfile
                  const initials = getInitials(profile)
                  const status = getOnlineStatus(member.user?.lastActiveAt)

                  return (
                    <div key={member.id} className="flex items-center gap-3">
                      <div className="relative">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold overflow-hidden ${
                          isMe ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}>
                          {profile?.avatarUrl ? (
                            <img src={profile.avatarUrl.startsWith('data:') ? profile.avatarUrl : `${API_BASE}${profile.avatarUrl}`} alt="" className="w-full h-full object-cover" />
                          ) : initials}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background ${statusColor(status)}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {getFullName(profile)}{isMe && " (Vous)"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {profile?.title || (member.role === "LEADER" ? "Leader" : "Membre")}
                        </p>
                      </div>
                      <div className={`w-2.5 h-2.5 rounded-full ${statusColor(status)}`}
                        title={status === "online" ? "En ligne" : status === "away" ? "Absent" : "Hors ligne"}
                      />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Invite */}
            <div>
              <h3 className="font-semibold text-foreground text-sm mb-2">Inviter</h3>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-muted rounded-md text-center text-sm font-mono">{selectedSquad.code}</code>
                <Button variant="outline" size="sm" onClick={() => copyCode(selectedSquad.code)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Upcoming Events */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground text-sm">Événements</h3>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowEventForm(true)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {events.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun événement planifié</p>
              ) : (
                <div className="space-y-2">
                  {events.map((evt) => (
                    <div key={evt.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/50">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        {evt.type === "CALL" ? <PhoneIcon className="w-4 h-4 text-primary" /> : evt.type === "REVIEW" ? <Target className="w-4 h-4 text-primary" /> : <Video className="w-4 h-4 text-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{evt.title}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />{formatDate(evt.scheduledAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}