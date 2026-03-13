"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  User,
  Mail,
  MapPin,
  Briefcase,
  Link as LinkIcon,
  FileText,
  Upload,
  Edit3,
  Check,
  X,
  Plus,
  Trash2,
  ExternalLink,
} from "lucide-react"

const initialProfile = {
  firstName: "Sarah",
  lastName: "Chen",
  email: "sarah@example.com",
  phone: "+1 (555) 123-4567",
  location: "San Francisco, CA",
  headline: "Senior Product Designer",
  bio: "Product designer with 6+ years of experience creating user-centered digital products. Specialized in design systems, UX research, and leading cross-functional teams.",
  website: "https://sarahchen.design",
  linkedin: "https://linkedin.com/in/sarahchen",
  github: "https://github.com/sarahchen",
}

const initialSkills = [
  "Figma",
  "Design Systems",
  "UX Research",
  "Prototyping",
  "User Testing",
  "Wireframing",
  "Accessibility",
  "Design Thinking",
]

const initialExperience = [
  {
    id: "1",
    title: "Lead Product Designer",
    company: "DesignStudio",
    location: "San Francisco, CA",
    startDate: "2021",
    endDate: "Present",
    description: "Led design system initiative and managed team of 4 designers.",
  },
  {
    id: "2",
    title: "Senior UX Designer",
    company: "TechStartup",
    location: "Remote",
    startDate: "2019",
    endDate: "2021",
    description: "Redesigned core product experience, improving engagement by 45%.",
  },
  {
    id: "3",
    title: "Product Designer",
    company: "DigitalAgency",
    location: "New York, NY",
    startDate: "2017",
    endDate: "2019",
    description: "Worked on multiple client projects across fintech and healthcare.",
  },
]

const initialEducation = [
  {
    id: "1",
    degree: "Master of Design",
    school: "Stanford University",
    year: "2017",
  },
  {
    id: "2",
    degree: "Bachelor of Fine Arts",
    school: "Rhode Island School of Design",
    year: "2015",
  },
]

export default function ProfilePage() {
  const [profile, setProfile] = useState(initialProfile)
  const [skills, setSkills] = useState(initialSkills)
  const [experience] = useState(initialExperience)
  const [education] = useState(initialEducation)
  const [isEditingBio, setIsEditingBio] = useState(false)
  const [newSkill, setNewSkill] = useState("")
  const [editedBio, setEditedBio] = useState(profile.bio)

  const handleSaveBio = () => {
    setProfile({ ...profile, bio: editedBio })
    setIsEditingBio(false)
  }

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()])
      setNewSkill("")
    }
  }

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((skill) => skill !== skillToRemove))
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground mt-1">
            Manage your professional profile and preferences
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Download CV
          </Button>
          <Button>
            <Upload className="w-4 h-4 mr-2" />
            Update CV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Basic Information</CardTitle>
              <Button variant="ghost" size="sm">
                <Edit3 className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-6">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-24 h-24 rounded-2xl bg-primary flex items-center justify-center">
                    <span className="text-3xl font-bold text-primary-foreground">
                      {profile.firstName[0]}{profile.lastName[0]}
                    </span>
                  </div>
                  <button className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-muted/80 transition-colors">
                    <Upload className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Info */}
                <div className="flex-1 space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      {profile.firstName} {profile.lastName}
                    </h2>
                    <p className="text-muted-foreground">{profile.headline}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground">{profile.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground">{profile.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <LinkIcon className="w-4 h-4 text-muted-foreground" />
                      <a href={profile.website} className="text-primary hover:underline">
                        {profile.website.replace("https://", "")}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground">6+ years experience</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bio Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>About Me</CardTitle>
              {!isEditingBio ? (
                <Button variant="ghost" size="sm" onClick={() => setIsEditingBio(true)}>
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsEditingBio(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                  <Button size="sm" onClick={handleSaveBio}>
                    <Check className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {isEditingBio ? (
                <textarea
                  value={editedBio}
                  onChange={(e) => setEditedBio(e.target.value)}
                  className="w-full min-h-[120px] p-3 rounded-lg border border-border bg-background text-foreground text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              ) : (
                <p className="text-muted-foreground leading-relaxed">{profile.bio}</p>
              )}
            </CardContent>
          </Card>

          {/* Experience Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Experience</CardTitle>
              <Button variant="ghost" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {experience.map((exp) => (
                  <div key={exp.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                          <Briefcase className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">{exp.title}</h4>
                          <p className="text-sm text-primary">{exp.company}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {exp.startDate} - {exp.endDate} · {exp.location}
                          </p>
                          <p className="text-sm text-muted-foreground mt-2">{exp.description}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0">
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Education Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Education</CardTitle>
              <Button variant="ghost" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {education.map((edu) => (
                  <div key={edu.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                          <User className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">{edu.degree}</h4>
                          <p className="text-sm text-primary">{edu.school}</p>
                          <p className="text-xs text-muted-foreground mt-1">{edu.year}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0">
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Profile Completion */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile Completion</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center mb-4">
                <div className="relative w-24 h-24">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      strokeWidth="6"
                      fill="none"
                      className="stroke-muted"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      strokeWidth="6"
                      fill="none"
                      strokeDasharray={`${(85 / 100) * 251} 251`}
                      className="stroke-success"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-foreground">85%</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Add portfolio link", done: true },
                  { label: "Complete work history", done: true },
                  { label: "Add certifications", done: false },
                  { label: "Set job preferences", done: true },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      item.done ? "bg-success" : "bg-muted"
                    }`}>
                      {item.done && <Check className="w-3 h-3 text-success-foreground" />}
                    </div>
                    <span className={item.done ? "text-muted-foreground line-through" : "text-foreground"}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Skills Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {skills.map((skill) => (
                  <div
                    key={skill}
                    className="group flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium"
                  >
                    {skill}
                    <button
                      onClick={() => handleRemoveSkill(skill)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add skill..."
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddSkill()}
                  className="flex-1"
                />
                <Button size="icon" onClick={handleAddSkill} disabled={!newSkill.trim()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Social Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Social Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "LinkedIn", url: profile.linkedin, icon: "LI" },
                { label: "GitHub", url: profile.github, icon: "GH" },
                { label: "Website", url: profile.website, icon: "WB" },
              ].map((link) => (
                <div key={link.label} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-muted-foreground">{link.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{link.label}</p>
                    <a
                      href={link.url}
                      className="text-xs text-primary hover:underline truncate block"
                    >
                      {link.url.replace("https://", "")}
                    </a>
                  </div>
                  <Button variant="ghost" size="icon">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
