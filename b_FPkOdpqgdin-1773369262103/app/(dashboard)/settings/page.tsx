"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Bell,
  Lock,
  CreditCard,
  User,
  Globe,
  Moon,
  Sun,
  Mail,
  MessageSquare,
  Briefcase,
  Users,
  Shield,
  Trash2,
  LogOut,
  ChevronRight,
  Check,
} from "lucide-react"

const notificationSettings = [
  {
    id: "new_matches",
    label: "New Job Matches",
    description: "Get notified when EDGE finds new jobs matching your profile",
    enabled: true,
  },
  {
    id: "application_updates",
    label: "Application Updates",
    description: "Status changes and responses from employers",
    enabled: true,
  },
  {
    id: "squad_activity",
    label: "Squad Activity",
    description: "Messages and updates from your squad",
    enabled: true,
  },
  {
    id: "interview_reminders",
    label: "Interview Reminders",
    description: "Reminders before scheduled interviews",
    enabled: true,
  },
  {
    id: "weekly_digest",
    label: "Weekly Digest",
    description: "Summary of your job search progress",
    enabled: false,
  },
  {
    id: "marketing",
    label: "Product Updates",
    description: "New features and improvements to HIREDGE",
    enabled: false,
  },
]

const privacySettings = [
  {
    id: "profile_visibility",
    label: "Profile Visibility",
    description: "Allow scouts and squad members to see your profile",
    enabled: true,
  },
  {
    id: "anonymous_mode",
    label: "Anonymous Mode",
    description: "Hide your identity when browsing company insights",
    enabled: false,
  },
  {
    id: "data_sharing",
    label: "Data Sharing",
    description: "Help improve EDGE by sharing anonymized usage data",
    enabled: true,
  },
]

const settingsSections = [
  { id: "account", label: "Account", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy", icon: Shield },
  { id: "preferences", label: "Preferences", icon: Globe },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "security", label: "Security", icon: Lock },
]

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("account")
  const [notifications, setNotifications] = useState(notificationSettings)
  const [privacy, setPrivacy] = useState(privacySettings)
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system")

  const toggleNotification = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, enabled: !n.enabled } : n
    ))
  }

  const togglePrivacy = (id: string) => {
    setPrivacy(privacy.map(p => 
      p.id === id ? { ...p, enabled: !p.enabled } : p
    ))
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:w-64 shrink-0">
          <Card>
            <CardContent className="p-2">
              <nav className="space-y-1">
                {settingsSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      activeSection === section.id
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <section.icon className="w-4 h-4" />
                    {section.label}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Account Section */}
          {activeSection === "account" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>Update your personal details and email</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">First Name</label>
                      <Input defaultValue="Sarah" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Last Name</label>
                      <Input defaultValue="Chen" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Email Address</label>
                    <Input type="email" defaultValue="sarah@example.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Phone Number</label>
                    <Input type="tel" defaultValue="+1 (555) 123-4567" />
                  </div>
                  <Button>Save Changes</Button>
                </CardContent>
              </Card>

              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                  <CardDescription>Irreversible actions for your account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/5">
                    <div>
                      <p className="font-medium text-foreground">Delete Account</p>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete your account and all associated data
                      </p>
                    </div>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Notifications Section */}
          {activeSection === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose what updates you want to receive</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="flex items-center justify-between p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          {notification.id.includes("match") && <Briefcase className="w-5 h-5 text-primary" />}
                          {notification.id.includes("application") && <Mail className="w-5 h-5 text-primary" />}
                          {notification.id.includes("squad") && <Users className="w-5 h-5 text-primary" />}
                          {notification.id.includes("interview") && <Bell className="w-5 h-5 text-primary" />}
                          {notification.id.includes("weekly") && <MessageSquare className="w-5 h-5 text-primary" />}
                          {notification.id.includes("marketing") && <Globe className="w-5 h-5 text-primary" />}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{notification.label}</p>
                          <p className="text-sm text-muted-foreground">{notification.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleNotification(notification.id)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          notification.enabled ? "bg-primary" : "bg-muted"
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 rounded-full bg-background transition-transform ${
                            notification.enabled ? "left-6" : "left-1"
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Privacy Section */}
          {activeSection === "privacy" && (
            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>Control how your data is used and shared</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {privacy.map((setting) => (
                    <div key={setting.id} className="flex items-center justify-between p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Shield className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{setting.label}</p>
                          <p className="text-sm text-muted-foreground">{setting.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => togglePrivacy(setting.id)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          setting.enabled ? "bg-primary" : "bg-muted"
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 rounded-full bg-background transition-transform ${
                            setting.enabled ? "left-6" : "left-1"
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preferences Section */}
          {activeSection === "preferences" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>Customize how HIREDGE looks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { id: "light", label: "Light", icon: Sun },
                      { id: "dark", label: "Dark", icon: Moon },
                      { id: "system", label: "System", icon: Globe },
                    ].map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setTheme(option.id as "light" | "dark" | "system")}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors ${
                          theme === option.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <option.icon className={`w-6 h-6 ${
                          theme === option.id ? "text-primary" : "text-muted-foreground"
                        }`} />
                        <span className={`text-sm font-medium ${
                          theme === option.id ? "text-primary" : "text-foreground"
                        }`}>
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Job Preferences</CardTitle>
                  <CardDescription>Help EDGE find better matches for you</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Preferred Roles</label>
                    <Input defaultValue="Product Designer, UX Lead, Design Director" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Preferred Locations</label>
                    <Input defaultValue="Remote, San Francisco, New York" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Min Salary</label>
                      <Input defaultValue="$120,000" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Max Salary</label>
                      <Input defaultValue="$180,000" />
                    </div>
                  </div>
                  <Button>Save Preferences</Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* Billing Section */}
          {activeSection === "billing" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Current Plan</CardTitle>
                  <CardDescription>Manage your subscription</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">Pro Plan</h3>
                        <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                          Active
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        $29/month · Renews on April 12, 2026
                      </p>
                    </div>
                    <Button variant="outline">Manage Plan</Button>
                  </div>

                  <div className="mt-6 space-y-3">
                    <h4 className="font-medium text-foreground">Plan Features</h4>
                    {[
                      "Unlimited job matches",
                      "AI-generated application dossiers",
                      "Squad access",
                      "Scout insights",
                      "Priority support",
                    ].map((feature) => (
                      <div key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-success" />
                        <span className="text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                  <CardDescription>Manage your payment details</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Visa ending in 4242</p>
                        <p className="text-sm text-muted-foreground">Expires 12/2027</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      Update
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Security Section */}
          {activeSection === "security" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Password</CardTitle>
                  <CardDescription>Change your password</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Current Password</label>
                    <Input type="password" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">New Password</label>
                    <Input type="password" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Confirm New Password</label>
                    <Input type="password" />
                  </div>
                  <Button>Update Password</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Two-Factor Authentication</CardTitle>
                  <CardDescription>Add an extra layer of security</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">2FA Enabled</p>
                        <p className="text-sm text-muted-foreground">Using authenticator app</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Active Sessions</CardTitle>
                  <CardDescription>Manage your logged in devices</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {[
                      { device: "MacBook Pro", location: "San Francisco, CA", current: true },
                      { device: "iPhone 15", location: "San Francisco, CA", current: false },
                    ].map((session, i) => (
                      <div key={i} className="flex items-center justify-between p-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">{session.device}</p>
                            {session.current && (
                              <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-xs font-medium">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{session.location}</p>
                        </div>
                        {!session.current && (
                          <Button variant="ghost" size="sm">
                            <LogOut className="w-4 h-4 mr-2" />
                            Sign Out
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
