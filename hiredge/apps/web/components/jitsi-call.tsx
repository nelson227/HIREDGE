"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react"

declare global {
  interface Window {
    JitsiMeetExternalAPI: any
  }
}

interface JitsiCallProps {
  roomName: string
  displayName: string
  audioOnly: boolean
  onClose: () => void
}

function loadJitsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.JitsiMeetExternalAPI) {
      resolve()
      return
    }
    const existing = document.getElementById("jitsi-api-script")
    if (existing) {
      existing.addEventListener("load", () => resolve())
      existing.addEventListener("error", () => reject(new Error("Failed to load Jitsi")))
      return
    }
    const script = document.createElement("script")
    script.id = "jitsi-api-script"
    script.src = "https://meet.jit.si/external_api.js"
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Jitsi"))
    document.head.appendChild(script)
  })
}

export default function JitsiCall({ roomName, displayName, audioOnly, onClose }: JitsiCallProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<any>(null)
  const [muted, setMuted] = useState(false)
  const [videoOff, setVideoOff] = useState(audioOnly)
  const [ready, setReady] = useState(false)

  const cleanup = useCallback(() => {
    if (apiRef.current) {
      try { apiRef.current.dispose() } catch {}
      apiRef.current = null
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        await loadJitsiScript()
        if (!mounted || !containerRef.current) return

        const api = new window.JitsiMeetExternalAPI("meet.jit.si", {
          roomName,
          parentNode: containerRef.current,
          width: "100%",
          height: "100%",
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: audioOnly,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            toolbarButtons: [
              "microphone", "camera", "desktop", "chat",
              "raisehand", "participants-pane", "tileview", "hangup",
            ],
            hideConferenceSubject: true,
            disableInviteFunctions: true,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            TOOLBAR_ALWAYS_VISIBLE: true,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
            MOBILE_APP_PROMO: false,
            HIDE_INVITE_MORE_HEADER: true,
          },
          userInfo: {
            displayName,
          },
        })

        apiRef.current = api

        api.addListener("readyToClose", () => {
          if (mounted) onClose()
        })

        api.addListener("videoConferenceJoined", () => {
          if (mounted) setReady(true)
        })

        api.addListener("audioMuteStatusChanged", ({ muted: m }: { muted: boolean }) => {
          if (mounted) setMuted(m)
        })

        api.addListener("videoMuteStatusChanged", ({ muted: m }: { muted: boolean }) => {
          if (mounted) setVideoOff(m)
        })
      } catch {
        // Fallback: open in new tab
        window.open(`https://meet.jit.si/${encodeURIComponent(roomName)}`, "_blank")
        onClose()
      }
    }

    init()

    return () => {
      mounted = false
      cleanup()
    }
  }, [roomName, displayName, audioOnly, onClose, cleanup])

  const toggleMute = () => apiRef.current?.executeCommand("toggleAudio")
  const toggleVideo = () => apiRef.current?.executeCommand("toggleVideo")
  const hangup = () => { cleanup(); onClose() }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Call controls bar */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-border bg-muted/50 shrink-0">
        <p className="text-sm font-medium text-foreground">
          {audioOnly ? "Appel vocal" : "Appel vidéo"} en cours
          {!ready && <span className="text-muted-foreground ml-2">— Connexion...</span>}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleMute} title={muted ? "Activer micro" : "Couper micro"}>
            {muted ? <MicOff className="w-4 h-4 text-destructive" /> : <Mic className="w-4 h-4" />}
          </Button>
          {!audioOnly && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleVideo} title={videoOff ? "Activer caméra" : "Couper caméra"}>
              {videoOff ? <VideoOff className="w-4 h-4 text-destructive" /> : <Video className="w-4 h-4" />}
            </Button>
          )}
          <Button variant="destructive" size="sm" className="h-8 gap-1.5" onClick={hangup}>
            <PhoneOff className="w-3.5 h-3.5" />Raccrocher
          </Button>
        </div>
      </div>

      {/* Jitsi iframe container */}
      <div ref={containerRef} className="flex-1" />
    </div>
  )
}
