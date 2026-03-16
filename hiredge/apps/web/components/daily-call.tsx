"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PhoneOff, Maximize2, Minimize2 } from "lucide-react"

interface DailyCallProps {
  roomUrl: string
  onClose: () => void
}

export default function DailyCall({ roomUrl, onClose }: DailyCallProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`relative bg-black ${expanded ? "fixed inset-0 z-50" : "h-[400px]"}`}>
      <iframe
        src={roomUrl}
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        className="w-full h-full border-0"
      />
      <div className="absolute top-3 right-3 flex gap-2">
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white border-0"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>
        <Button
          variant="destructive"
          size="icon"
          className="h-8 w-8"
          onClick={onClose}
        >
          <PhoneOff className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
