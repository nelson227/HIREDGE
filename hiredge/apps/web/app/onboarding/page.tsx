"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, Upload, Send, Bot, User, FileText, Briefcase, MapPin, Target, CheckCircle2 } from "lucide-react"
import Link from "next/link"

type Message = {
  id: string
  role: "assistant" | "user"
  content: string
}

const initialMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: "Hi! I'm EDGE, your personal AI job search companion. I'm here to help you find your dream job. Let's start by getting to know you better. First, could you upload your CV so I can understand your background?",
  },
]

const onboardingSteps = [
  { id: "cv", label: "Upload CV", icon: Upload },
  { id: "profile", label: "Profile", icon: User },
  { id: "preferences", label: "Preferences", icon: Target },
  { id: "ready", label: "Ready", icon: CheckCircle2 },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [cvUploaded, setCvUploaded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleFileUpload = async () => {
    setCvUploaded(true)
    setIsTyping(true)
    
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: "assistant",
      content: "Great! I've analyzed your CV. I can see you have experience as a Product Designer with 5 years in tech companies. I've extracted your skills including UX research, prototyping, and design systems. Does this sound accurate?",
    }])
    setIsTyping(false)
    setStep(1)
  }

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsTyping(true)

    await new Promise(resolve => setTimeout(resolve, 1500))

    let response = ""
    if (step === 1) {
      response = "Perfect! Now let's talk about what you're looking for. What type of role are you interested in? And do you have any location preferences - are you open to remote work, or looking for a specific city?"
      setStep(2)
    } else if (step === 2) {
      response = "Noted! I'm looking for Senior Product Designer or UX Lead roles, with a preference for remote positions. What's your target salary range, and are there any specific industries or company sizes you're interested in?"
      setStep(3)
    } else if (step === 3) {
      response = "Excellent! I've completed your profile. Based on everything you've shared, I'd say your profile is 85% ready for job matching. I've already found 24 potential matches for you! Ready to explore your personalized dashboard?"
      setStep(3)
    }

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: "assistant",
      content: response,
    }])
    setIsTyping(false)
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
            
            {/* Progress Steps */}
            <div className="hidden md:flex items-center gap-4">
              {onboardingSteps.map((s, i) => (
                <div key={s.id} className="flex items-center">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                    i < step ? "bg-success/10 text-success" :
                    i === step ? "bg-primary/10 text-primary" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    <s.icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{s.label}</span>
                  </div>
                  {i < onboardingSteps.length - 1 && (
                    <div className={`w-8 h-px mx-2 ${i < step ? "bg-success" : "bg-border"}`} />
                  )}
                </div>
              ))}
            </div>

            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">Skip for now</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
              >
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
                  message.role === "assistant"
                    ? "bg-muted text-foreground"
                    : "bg-primary text-primary-foreground"
                }`}>
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))}

            {/* CV Upload Card */}
            {step === 0 && !cvUploaded && (
              <div className="flex gap-3">
                <div className="w-8 shrink-0" />
                <div className="flex-1 max-w-md">
                  <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer bg-card">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">Upload your CV</h3>
                    <p className="text-sm text-muted-foreground mb-4">PDF, DOC, or DOCX up to 10MB</p>
                    <Button onClick={handleFileUpload}>
                      <Upload className="w-4 h-4 mr-2" />
                      Choose File
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Typing Indicator */}
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

            {/* Ready Card */}
            {step === 3 && messages.length > 4 && (
              <div className="flex gap-3">
                <div className="w-8 shrink-0" />
                <div className="flex-1 max-w-md">
                  <div className="border border-success/30 bg-success/5 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-success" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Profile Ready!</h3>
                        <p className="text-sm text-muted-foreground">85% completion score</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-primary" />
                        <span className="text-sm text-foreground">24 job matches</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="text-sm text-foreground">Remote preferred</span>
                      </div>
                    </div>
                    <Button className="w-full" asChild>
                      <Link href="/dashboard">Go to Dashboard</Link>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          {step > 0 && (
            <div className="border-t border-border p-4 bg-card">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSend()
                }}
                className="flex items-center gap-3"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 h-11"
                  disabled={isTyping}
                />
                <Button type="submit" size="icon" className="h-11 w-11" disabled={!input.trim() || isTyping}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          )}
        </div>

        {/* Right Sidebar - Context Panel */}
        <div className="hidden lg:block w-80 border-l border-border bg-card p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-foreground mb-3">Profile Progress</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">CV Analysis</span>
                <span className={step > 0 ? "text-success" : "text-muted-foreground"}>
                  {step > 0 ? "Complete" : "Pending"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Profile Details</span>
                <span className={step > 1 ? "text-success" : "text-muted-foreground"}>
                  {step > 1 ? "Complete" : "Pending"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Job Preferences</span>
                <span className={step > 2 ? "text-success" : "text-muted-foreground"}>
                  {step > 2 ? "Complete" : "Pending"}
                </span>
              </div>
            </div>
          </div>

          {cvUploaded && (
            <div>
              <h3 className="font-semibold text-foreground mb-3">Extracted Skills</h3>
              <div className="flex flex-wrap gap-2">
                {["UX Research", "Prototyping", "Figma", "Design Systems", "User Testing", "Wireframing"].map((skill) => (
                  <span key={skill} className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="font-semibold text-foreground mb-3">Quick Tips</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Be specific about your role preferences</p>
              <p>Mention salary expectations when asked</p>
              <p>Share your preferred company culture</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
