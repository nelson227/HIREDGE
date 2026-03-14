// ============================================================
// HIREDGE — Types partagés (Backend + Mobile)
// ============================================================

// --- Rôles & Auth ---
export type UserRole = 'CANDIDATE' | 'SCOUT' | 'RECRUITER' | 'ADMIN';
export type SubscriptionTier = 'FREE' | 'PREMIUM';
export type AuthProvider = 'email' | 'google' | 'apple';

// --- Profil ---
export type RemotePreference = 'REMOTE' | 'HYBRID' | 'ONSITE';
export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
export type ContractType = 'CDI' | 'CDD' | 'freelance' | 'stage' | 'alternance';

// --- Candidatures ---
export type ApplicationStatus =
  | 'DRAFT'
  | 'SENT'
  | 'VIEWED'
  | 'INTERVIEW_SCHEDULED'
  | 'OFFER_RECEIVED'
  | 'ACCEPTED'
  | 'REJECTED';

// --- Escouades ---
export type SquadStatus = 'FORMING' | 'ACTIVE' | 'DISSOLVED';
export type SquadMemberRole = 'MEMBER' | 'CHAMPION';
export type SquadMessageType = 'text' | 'voice' | 'system' | 'celebration';

// --- Éclaireurs ---
export type ScoutStatus = 'PENDING' | 'ACTIVE' | 'PROBATION' | 'SUSPENDED';

// --- Simulations d'entretien ---
export type InterviewType = 'RH' | 'TECHNICAL' | 'BEHAVIORAL' | 'CASE_STUDY';

// --- Notifications ---
export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low' | 'lowest';
export type NotificationChannel = 'push' | 'email' | 'in_app';

// --- Émotions / Ton ---
export type MoodType = 'neutral' | 'happy' | 'frustrated' | 'anxious' | 'discouraged';

// --- Agent EDGE ---
export type IntentType =
  | 'SEARCH_JOBS'
  | 'PREPARE_APPLICATION'
  | 'CHECK_STATUS'
  | 'INTERVIEW_PREP'
  | 'SALARY_ADVICE'
  | 'EMOTIONAL_SUPPORT'
  | 'SQUAD_INFO'
  | 'SCOUT_REQUEST'
  | 'GENERAL_ADVICE'
  | 'SMALL_TALK'
  | 'ACCOUNT_SETTINGS'
  | 'OTHER';

// --- Interfaces ---

export interface User {
  id: string;
  email: string;
  role: UserRole;
  subscriptionTier: SubscriptionTier;
  createdAt: string;
  lastActiveAt: string;
}

export interface CandidateProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  title: string;
  bio: string | null;
  locationCity: string | null;
  locationCountry: string | null;
  remotePreference: RemotePreference;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  yearsExperience: number;
  preparationScore: number;
  skills: Skill[];
  experiences: Experience[];
  education: Education[];
  updatedAt: string;
}

export interface Skill {
  id: string;
  name: string;
  level: SkillLevel;
  years: number;
}

export interface Experience {
  id: string;
  companyName: string;
  title: string;
  startDate: string;
  endDate: string | null;
  description: string;
  isCurrent: boolean;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  year: number;
}

export interface Job {
  id: string;
  title: string;
  company: Company;
  description: string;
  requirements: string[];
  niceToHave: string[];
  benefits: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  locationCity: string;
  locationCountry: string;
  remoteType: RemotePreference;
  contractType: ContractType;
  sourceUrl: string;
  sourcePlatform: string;
  postedAt: string;
  isActive: boolean;
  isGhost: boolean;
  isScam: boolean;
}

export interface JobMatch extends Job {
  matchScore: number;
  matchDetails: {
    strengths: string[];
    gaps: string[];
    hireProbability: number;
  };
  hasScout: boolean;
  scoutCount: number;
}

export interface Company {
  id: string;
  name: string;
  website: string | null;
  logoUrl: string | null;
  industry: string | null;
  sizeRange: string | null;
  glassdoorRating: number | null;
  cultureSummary: string | null;
  avgRecruitmentDurationDays: number | null;
  avgResponseRate: number | null;
}

export interface Application {
  id: string;
  candidateId: string;
  jobId: string;
  job: Job;
  status: ApplicationStatus;
  matchScore: number;
  coverLetterText: string | null;
  cvVersionUrl: string | null;
  companyAnalysis: Record<string, unknown> | null;
  sentAt: string | null;
  nextFollowupDate: string | null;
  rejectionReason: string | null;
  notes: string | null;
  createdAt: string;
}

export interface Squad {
  id: string;
  name: string;
  domain: string;
  level: string;
  status: SquadStatus;
  members: SquadMember[];
  createdAt: string;
}

export interface SquadMember {
  id: string;
  candidateId: string;
  firstName: string;
  title: string;
  locationCity: string;
  locationCountry: string;
  isActive: boolean;
  lastActiveAt: string;
  role: SquadMemberRole;
  isSelf?: boolean;
}

export interface SquadMessage {
  id: string;
  squadId: string;
  senderId: string;
  senderName: string;
  contentText: string | null;
  contentAudioUrl: string | null;
  messageType: SquadMessageType;
  createdAt: string;
}

export interface Scout {
  id: string;
  anonymousAlias: string;
  companyId: string;
  companyName: string;
  isVerified: boolean;
  credits: number;
  ratingAvg: number;
  hiredDate: string;
}

export interface ScoutConversation {
  id: string;
  scoutAlias: string;
  companyName: string;
  jobTitle: string;
  messages: ScoutMessage[];
  createdAt: string;
}

export interface ScoutMessage {
  id: string;
  senderType: 'scout' | 'candidate';
  content: string;
  createdAt: string;
}

export interface InterviewSimulation {
  id: string;
  jobId: string;
  type: InterviewType;
  durationSeconds: number;
  score: number;
  transcript: { role: string; content: string }[];
  analysis: SimulationAnalysis;
  createdAt: string;
}

export interface SimulationAnalysis {
  overallScore: number;
  strengths: string[];
  improvements: string[];
  fillerWordsCount: number;
  averageResponseLength: number;
  starMethodUsed: boolean;
  topQuestions: string[];
  recommendations: string[];
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  sentAt: string;
  readAt: string | null;
}

export interface PersonalStats {
  totalApplications: number;
  byStatus: Record<ApplicationStatus, number>;
  responseRate: number;
  avgResponseDays: number;
  interviewConversionRate: number;
  simulationsCompleted: number;
  simulationAvgScore: number;
  weeklyApplications: { week: string; count: number }[];
}

export interface EdgeMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  actions?: EdgeAction[];
  suggestedFollowups?: string[];
}

export interface EdgeAction {
  type:
    | 'SHOW_JOBS'
    | 'SHOW_APPLICATION'
    | 'START_INTERVIEW_SIM'
    | 'SHOW_DASHBOARD'
    | 'NAVIGATE'
    | 'TRIGGER_AGENT';
  payload: Record<string, unknown>;
}

// --- API Response Wrapper ---
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}
