"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Users,
  Send,
  Mic,
  Calendar,
  Video,
  Trophy,
  MessageSquare,
  ChevronRight,
  Plus,
} from "lucide-react"

const squadMembers = [
  { id: "1", name: "Sarah Chen", initials: "SC", role: "Product Designer", status: "online", isYou: true },
  { id: "2", name: "Alex Martinez", initials: "AM", role: "UX Designer", status: "online" },
  { id: "3", name: "Emma Thompson", initials: "ET", role: "Product Designer", status: "offline" },
  { id: "4", name: "Marcus Rodriguez", initials: "MR", role: "UI Designer", status: "online" },
  { id: "5", name: "Jessica Lee", initials: "JL", role: "Design Lead", status: "offline" },
  { id: "6", name: "David Kim", initials: "DK", role: "UX Researcher", status: "away" },
]

type Message = {
  id: string
  userId: string
  userName: string
  userInitials: string
  content: string
  time: string
  type: "text" | "voice" | "system"
}

const initialMessages: Message[] = [
  {
    id: "1",
    userId: "2",
    userName: "Alex Martinez",
    userInitials: "AM",
    content: "Hey everyone! Just wanted to share - I had my final interview with Google yesterday! 🎉",
    time: "10:30 AM",
    type: "text",
  },
  {
    id: "2",
    userId: "3",
    userName: "Emma Thompson",
    userInitials: "ET",
    content: "That's amazing Alex! How did it go?",
    time: "10:32 AM",
    type: "text",
  },
  {
    id: "3",
    userId: "2",
    userName: "Alex Martinez",
    userInitials: "AM",
    content: "Really well I think! The system design round was tough but I prepared using the tips David shared last week. Should hear back in a few days.",
    time: "10:35 AM",
    type: "text",
  },
  {
    id: "4",
    userId: "system",
    userName: "System",
    userInitials: "",
    content: "Marcus Rodriguez shared interview questions for Stripe",
    time: "11:00 AM",
    type: "system",
  },
  {
    id: "5",
    userId: "4",
    userName: "Marcus Rodriguez",
    userInitials: "MR",
    content: "Just got the Stripe interview questions doc ready. It has all the questions I got asked across 4 rounds. Check the squad resources!",
    time: "11:05 AM",
    type: "text",
  },
]

const upcomingEvents = [
  {
    id: "1",
    title: "Weekly Check-in",
    time: "Today, 4:00 PM",
    type: "video",
  },
  {
    id: "2",
    title: "Mock Interview: Sarah",
    time: "Tomorrow, 2:00 PM",
    type: "video",
  },
  {
    id: "3",
    title: "Resume Review Session",
    time: "Fri, 3:00 PM",
    type: "video",
  },
]

const squadStats = [
  { label: "Applications Sent", value: 48 },
  { label: "Interviews Landed", value: 12 },
  { label: "Offers Received", value: 3 },
]

export default function SquadPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [newMessage, setNewMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = () => {
    if (!newMessage.trim()) return

    const message: Message = {
      id: Date.now().toString(),
      userId: "1",
      userName: "Sarah Chen",
      userInitials: "SC",
      content: newMessage,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: "text",
    }

    setMessages((prev) => [...prev, message])
    setNewMessage("")
  }

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
              <h2 className="font-semibold text-foreground">Design Squad Alpha</h2>
              <p className="text-xs text-muted-foreground">6 members • 4 online</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Video className="w-4 h-4 mr-2" />
              Start Call
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => {
            if (message.type === "system") {
              return (
                <div key={message.id} className="flex justify-center">
                  <div className="px-3 py-1.5 rounded-full bg-muted text-xs text-muted-foreground">
                    {message.content}
                  </div>
                </div>
              )
            }

            const isOwn = message.userId === "1"

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
                    {message.userInitials}
                  </span>
                </div>
                <div className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
                  {!isOwn && (
                    <p className="text-xs text-muted-foreground mb-1">{message.userName}</p>
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
                    {message.time}
                  </p>
                </div>
              </div>
            )
          })}
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
            <Button variant="outline" size="icon" type="button">
              <Mic className="w-4 h-4" />
            </Button>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!newMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="hidden lg:block w-80 border-l border-border overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Squad Members */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Squad Members</h3>
            <div className="space-y-3">
              {squadMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-3">
                  <div className="relative">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      member.isYou ? "bg-primary" : "bg-muted"
                    }`}>
                      <span className={`text-xs font-semibold ${
                        member.isYou ? "text-primary-foreground" : "text-muted-foreground"
                      }`}>
                        {member.initials}
                      </span>
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
                      member.status === "online"
                        ? "bg-success"
                        : member.status === "away"
                        ? "bg-warning"
                        : "bg-muted-foreground"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {member.name} {member.isYou && "(You)"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Squad Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Trophy className="w-4 h-4 text-warning" />
                Squad Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {squadStats.map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{stat.label}</span>
                    <span className="font-semibold text-foreground">{stat.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Upcoming Events</h3>
              <Button variant="ghost" size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    {event.type === "video" ? (
                      <Video className="w-4 h-4 text-primary" />
                    ) : (
                      <Calendar className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground">{event.time}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <MessageSquare className="w-4 h-4 mr-2" />
                Share Interview Question
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Mock Interview
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
