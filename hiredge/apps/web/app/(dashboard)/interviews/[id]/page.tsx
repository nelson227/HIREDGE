"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Mic, MicOff, Send, StopCircle, ArrowLeft, Loader2,
  TrendingUp, AlertTriangle, Zap, Brain, MessageSquare,
  BarChart3, Clock, Volume2
} from "lucide-react"
import { interviewsApi } from "@/lib/api"

interface Message {
  role: "interviewer" | "candidate"
  content: string
  phase?: string
  timestamp?: string
  evaluation?: any
  speechAnalysis?: any
  confidence?: any
}

interface SessionData {
  id: string
  type: string
  status: string
  character?: { name: string; role: string; company: string }
  company?: string
  companyName?: string
  messages?: Message[]
  transcriptJson?: string
  config?: any
  score?: number
  analysis?: any
}

export default function InterviewSessionPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [session, setSession] = useState<SessionData | null>(null)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [lastAnalysis, setLastAnalysis] = useState<any>(null)
  const [responseStartTime, setResponseStartTime] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const loadSession = useCallback(async () => {
    if (!id) return
    try {
      const { data } = await interviewsApi.getById(id)
      const sim = data.data
      // Parse messages from transcriptJson if needed
      if (sim.transcriptJson && !sim.messages) {
        sim.messages = JSON.parse(sim.transcriptJson)
      }
      // Parse config
      if (sim.config && typeof sim.config === 'string') {
        sim.config = JSON.parse(sim.config)
      }
      setSession(sim)
    } catch {
      router.push('/interviews')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => { loadSession() }, [loadSession])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [session?.messages?.length])

  // Track when user starts typing (for response time)
  useEffect(() => {
    if (input.length === 1 && !responseStartTime) {
      setResponseStartTime(Date.now())
    }
  }, [input, responseStartTime])

  // ─── Send text response ─────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || sending || !id) return
    setSending(true)
    const responseTimeMs = responseStartTime ? Date.now() - responseStartTime : 0
    try {
      const { data } = await interviewsApi.sendMessage(id, input.trim(), { responseTimeMs })
      const result = data.data
      setLastAnalysis({
        speech: result.speechAnalysis,
        confidence: result.confidence,
        evaluation: result.evaluation,
      })
      setInput("")
      setResponseStartTime(null)
      await loadSession()
    } catch (err) {
      console.error('Send failed:', err)
    } finally {
      setSending(false)
    }
  }

  // ─── Voice recording ────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      audioChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await sendVoiceResponse(blob)
      }

      recorder.start(1000)
      mediaRecorderRef.current = recorder
      setIsRecording(true)
      setRecordingTime(0)
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(t => t + 1)
      }, 1000)
    } catch {
      alert("Impossible d'accéder au microphone. Vérifie les permissions.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current)
    }
    setIsRecording(false)
  }

  const sendVoiceResponse = async (blob: Blob) => {
    if (!id) return
    setSending(true)
    try {
      const { data } = await interviewsApi.sendVoice(id, blob)
      const result = data.data
      setLastAnalysis({
        speech: result.speechAnalysis,
        confidence: result.confidence,
        evaluation: result.evaluation,
        transcription: result.transcription,
      })
      await loadSession()
    } catch (err) {
      console.error('Voice send failed:', err)
    } finally {
      setSending(false)
    }
  }

  const handleEnd = async () => {
    if (!id || !confirm("Terminer la simulation ?")) return
    try {
      await interviewsApi.end(id)
      await loadSession()
    } catch {}
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Chargement de la session...</span>
      </div>
    )
  }

  if (!session) return null

  const messages = session.messages ?? []
  const character = session.config?.character ?? session.character
  const isFinished = session.status === 'COMPLETED'
  const questionCount = messages.filter(m => m.role === 'interviewer').length
  const totalQuestions = session.config?.totalQuestions ?? 6

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/interviews')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
              🎭
            </div>
            <div>
              <h2 className="font-semibold">{character?.name ?? 'Recruteur IA'}</h2>
              <p className="text-sm text-muted-foreground">
                {character?.role} · {session.companyName ?? character?.company ?? session.type}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress */}
          <div className="text-sm text-muted-foreground">
            Q {Math.min(questionCount, totalQuestions)}/{totalQuestions}
          </div>
          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${Math.min((questionCount / totalQuestions) * 100, 100)}%` }}
            />
          </div>
          {!isFinished && (
            <Button variant="destructive" size="sm" onClick={handleEnd}>
              <StopCircle className="h-4 w-4 mr-1" /> Terminer
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main chat area */}
        <div className="lg:col-span-2">
          <Card className="h-[65vh] flex flex-col">
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'candidate' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'candidate'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}>
                    {msg.role === 'interviewer' && (
                      <div className="text-xs font-medium mb-1 opacity-70">
                        {character?.name ?? 'Recruteur'}
                        {msg.phase && (
                          <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${
                            msg.phase === 'WARMUP' ? 'bg-cyan-100 text-cyan-700' :
                            msg.phase === 'CORE' ? 'bg-blue-100 text-blue-700' :
                            msg.phase === 'WRAP_UP' ? 'bg-amber-100 text-amber-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {msg.phase}
                          </span>
                        )}
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </CardContent>

            {/* Input area */}
            {!isFinished ? (
              <div className="border-t p-4">
                <div className="flex items-end gap-2">
                  {/* Voice button */}
                  <Button
                    variant={isRecording ? "destructive" : "outline"}
                    size="icon"
                    className="shrink-0"
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={sending}
                  >
                    {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>

                  {isRecording ? (
                    <div className="flex-1 flex items-center gap-3 bg-destructive/10 rounded-lg px-4 py-3">
                      <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                      <span className="text-sm text-destructive font-medium">
                        Enregistrement... {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
                      </span>
                      <Button size="sm" variant="destructive" onClick={stopRecording} className="ml-auto">
                        <StopCircle className="h-4 w-4 mr-1" /> Envoyer
                      </Button>
                    </div>
                  ) : (
                    <>
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Tape ta réponse ici..."
                        className="flex-1 resize-none border rounded-lg px-3 py-2 text-sm min-h-[40px] max-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary/50"
                        rows={1}
                        disabled={sending}
                      />
                      <Button
                        size="icon"
                        className="shrink-0"
                        onClick={handleSend}
                        disabled={!input.trim() || sending}
                      >
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="border-t p-4 bg-green-50 dark:bg-green-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎉</span>
                    <span className="font-medium">Simulation terminée — Score: {session.score}/100</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => router.push(`/interviews/${id}/replay`)}>
                      <MessageSquare className="h-4 w-4 mr-1" /> Transcript
                    </Button>
                    <Button size="sm" onClick={() => router.push(`/interviews/${id}/analytics`)}>
                      <BarChart3 className="h-4 w-4 mr-1" /> Analytics
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right sidebar: Real-time metrics */}
        <div className="space-y-4">
          {/* Confidence Score */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" /> Score de Confiance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className={`text-4xl font-bold ${
                  (lastAnalysis?.confidence?.score ?? 0) >= 70 ? 'text-green-600' :
                  (lastAnalysis?.confidence?.score ?? 0) >= 50 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {lastAnalysis?.confidence?.score ?? '—'}
                </div>
                <div className="flex-1">
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        (lastAnalysis?.confidence?.score ?? 0) >= 70 ? 'bg-green-500' :
                        (lastAnalysis?.confidence?.score ?? 0) >= 50 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${lastAnalysis?.confidence?.score ?? 0}%` }}
                    />
                  </div>
                </div>
              </div>
              {lastAnalysis?.confidence?.breakdown && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(lastAnalysis.confidence.breakdown).map(([key, val]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-muted-foreground capitalize">{key}</span>
                      <span className="font-medium">{val as number}%</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Speech Analysis */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-blue-500" /> Analyse Vocale
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Débit</span>
                <span className={`text-sm font-medium ${
                  (lastAnalysis?.speech?.wordsPerMinute ?? 0) >= 130 &&
                  (lastAnalysis?.speech?.wordsPerMinute ?? 0) <= 170
                    ? 'text-green-600' : 'text-amber-600'
                }`}>
                  {lastAnalysis?.speech?.wordsPerMinute ?? '—'} mots/min
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Mots de remplissage</span>
                <span className={`text-sm font-medium ${
                  (lastAnalysis?.speech?.fillerCount ?? 0) <= 2
                    ? 'text-green-600' : 'text-amber-600'
                }`}>
                  {lastAnalysis?.speech?.fillerCount ?? 0}
                  {lastAnalysis?.speech?.fillerWords?.length > 0 && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({lastAnalysis.speech.fillerWords.slice(0, 2).join(', ')})
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Score contenu</span>
                <div className="flex gap-1">
                  {lastAnalysis?.evaluation?.score && (
                    ['relevance', 'depth', 'structure', 'specificity', 'communication'].map(dim => {
                      const val = lastAnalysis.evaluation.score[dim] ?? 0
                      return (
                        <div key={dim} title={dim} className={`w-5 h-5 rounded text-[10px] flex items-center justify-center font-medium ${
                          val >= 4 ? 'bg-green-100 text-green-700' :
                          val >= 3 ? 'bg-blue-100 text-blue-700' :
                          val >= 2 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {val}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          {lastAnalysis?.confidence?.tips?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-500" /> Conseils
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {lastAnalysis.confidence.tips.map((tip: string, i: number) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-2">
                      <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" /> Session
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="text-2xl font-bold">{messages.filter(m => m.role === 'candidate').length}</div>
                <div className="text-xs text-muted-foreground">Réponses</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{session.type}</div>
                <div className="text-xs text-muted-foreground">Type</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
