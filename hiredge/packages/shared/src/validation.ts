import { z } from 'zod';

// --- Auth Schemas ---
export const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z
    .string()
    .min(8, 'Minimum 8 caractères')
    .regex(/[A-Z]/, 'Au moins une majuscule')
    .regex(/[0-9]/, 'Au moins un chiffre'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['CANDIDATE', 'SCOUT', 'RECRUITER']).default('CANDIDATE'),
  locale: z.enum(['fr', 'en', 'es']).default('fr'),
});

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email invalide'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z
    .string()
    .min(8, 'Minimum 8 caractères')
    .regex(/[A-Z]/, 'Au moins une majuscule')
    .regex(/[0-9]/, 'Au moins un chiffre'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

// --- Profile Schemas ---
export const notificationPrefsSchema = z.object({
  new_matches: z.boolean(),
  application_updates: z.boolean(),
  squad_activity: z.boolean(),
  interview_reminders: z.boolean(),
  weekly_digest: z.boolean(),
  marketing: z.boolean(),
}).partial();

export const privacyPrefsSchema = z.object({
  profile_visibility: z.boolean(),
  anonymous_mode: z.boolean(),
  data_sharing: z.boolean(),
}).partial();

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  title: z.string().max(200).optional(),
  bio: z.string().max(2000).optional(),
  city: z.string().max(100).optional(),
  country: z.string().length(2).optional(),
  remotePreference: z.enum(['REMOTE', 'HYBRID', 'ONSITE']).optional(),
  salaryMin: z.number().positive().optional(),
  salaryMax: z.number().positive().optional(),
  salaryCurrency: z.string().length(3).default('EUR').optional(),
  yearsExperience: z.number().min(0).max(50).optional(),
  notificationPrefs: notificationPrefsSchema.optional(),
  privacyPrefs: privacyPrefsSchema.optional(),
});

export const addSkillSchema = z.object({
  name: z.string().min(1).max(100),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
  yearsOfExperience: z.number().min(0).max(50).optional(),
});

export const addExperienceSchema = z.object({
  company: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
  description: z.string().max(5000).optional(),
  current: z.boolean().default(false),
  location: z.string().max(200).optional(),
});

export const addEducationSchema = z.object({
  institution: z.string().min(1).max(200),
  degree: z.string().min(1).max(200),
  field: z.string().min(1).max(200),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  current: z.boolean().default(false),
});

// --- Job Schemas ---
export const searchJobsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  minMatch: z.coerce.number().min(0).max(100).default(50),
  sort: z.enum(['match_desc', 'date_desc', 'salary_desc']).default('match_desc'),
  remote: z.enum(['REMOTE', 'HYBRID', 'ONSITE']).optional(),
  contract: z.enum(['CDI', 'CDD', 'freelance', 'stage', 'alternance']).optional(),
  location: z.string().optional(),
  q: z.string().optional(),
  salaryMin: z.coerce.number().min(0).optional(),
  experienceLevel: z.enum(['junior', 'mid', 'senior', 'lead']).optional(),
  postedAfter: z.string().optional(),
});

// --- Application Schemas ---
export const createApplicationSchema = z.object({
  jobId: z.string().uuid(),
  coverLetterContent: z.string().max(10000).optional(),
  notes: z.string().max(5000).optional(),
});

export const updateApplicationSchema = z.object({
  coverLetterContent: z.string().max(10000).optional(),
  notes: z.string().max(5000).optional(),
});

export const updateApplicationStatusSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'INTERVIEW_SCHEDULED', 'OFFER_RECEIVED', 'ACCEPTED', 'REJECTED']),
  interviewDate: z.string().datetime().optional(),
  notes: z.string().max(5000).optional(),
});

// --- Squad Schemas ---
export const sendSquadMessageSchema = z.object({
  content: z.string().min(1).max(5000),
  type: z.enum(['TEXT', 'VOICE', 'SYSTEM']).default('TEXT'),
  replyToId: z.string().uuid().optional(),
});

// --- Scout Schemas ---
export const scoutQuestionnaireSchema = z.object({
  recruitmentProcess: z.string().min(10).max(5000),
  cultureDescription: z.string().min(10).max(2000),
  managerPreferences: z.string().min(10).max(2000),
  redFlags: z.string().min(10).max(2000),
  salaryRange: z.string().min(5).max(500),
  workEnvironment: z.string().min(10).max(2000),
  adviceForCandidates: z.string().min(10).max(2000),
});

export const sendScoutMessageSchema = z.object({
  content: z.string().min(1).max(5000),
});

// --- Interview Simulation Schemas ---
export const startSimulationSchema = z.object({
  jobId: z.string().uuid(),
  type: z.enum(['RH', 'TECHNICAL', 'BEHAVIORAL', 'CASE_STUDY']),
});

export const simulationMessageSchema = z.object({
  content: z.string().min(1).max(10000),
});

// --- Edge Chat Schema ---
export const edgeChatSchema = z.object({
  message: z.string().min(1).max(15000),
  imageBase64: z.string().max(5_000_000).optional(), // base64 encoded image data (max ~3.7MB)
  conversationId: z.string().optional(), // links message to a conversation session
});

// --- Notification Preferences ---
export const notificationPreferencesSchema = z.object({
  pushEnabled: z.boolean().default(true),
  emailEnabled: z.boolean().default(true),
  quietHoursStart: z.string().default('22:00'),
  quietHoursEnd: z.string().default('08:00'),
  maxPushPerDay: z.number().min(0).max(20).default(5),
});

// Type inference helpers
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AddSkillInput = z.infer<typeof addSkillSchema>;
export type AddExperienceInput = z.infer<typeof addExperienceSchema>;
export type SearchJobsInput = z.infer<typeof searchJobsSchema>;
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type EdgeChatInput = z.infer<typeof edgeChatSchema>;
export type StartSimulationInput = z.infer<typeof startSimulationSchema>;
