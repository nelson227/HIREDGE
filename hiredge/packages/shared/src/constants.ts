// HIREDGE — Constantes partagées

export const APP_NAME = 'HIREDGE';
export const APP_VERSION = '0.1.0';

// Limites
export const SQUAD_MIN_SIZE = 5;
export const SQUAD_MAX_SIZE = 8;
export const MAX_PUSH_PER_DAY = 5;
export const MAX_PUSH_PER_WEEK = 20;
export const MAX_FREE_APPLICATIONS_PER_MONTH = 3;
export const MAX_FREE_SIMULATIONS_PER_MONTH = 1;
export const SCOUT_INACTIVE_MONTHS = 6;
export const SQUAD_INACTIVE_DAYS_NUDGE = 3;
export const SQUAD_INACTIVE_DAYS_CHECK = 7;
export const SQUAD_INACTIVE_DAYS_REPLACE = 14;

// Scoring
export const MATCH_WEIGHTS = {
  semantic: 0.4,
  skills: 0.25,
  experience: 0.15,
  salary: 0.1,
  location: 0.05,
  recency: 0.05,
} as const;

export const MATCH_THRESHOLDS = {
  highMatch: 85,
  goodMatch: 60,
  possible: 40,
} as const;

// Crédits éclaireurs
export const SCOUT_CREDITS = {
  completeQuestionnaire: 50,
  answerQuestion: 20,
  detailedAnswer: 10,
  positiveRating: 15,
  monthlyActiveBonus: 30,
  helpedGetHired: 100,
} as const;

export const SCOUT_BADGE_THRESHOLDS = {
  bronze: 100,
  silver: 300,
  gold: 500,
  platinum: 1000,
} as const;

// Scam detection
export const SCAM_THRESHOLD = 0.6;

// Timing
export const JWT_ACCESS_EXPIRY = '15m';
export const JWT_REFRESH_EXPIRY = '30d';
export const DEFAULT_FOLLOWUP_DAYS = 8;

// Abonnements
export const PRICING = {
  free: {
    applicationsPerMonth: 3,
    simulationsPerMonth: 1,
    scoutAccess: false,
    advancedAnalytics: false,
    price: 0,
  },
  premium: {
    applicationsPerMonth: Infinity,
    simulationsPerMonth: Infinity,
    scoutAccess: true,
    advancedAnalytics: true,
    price: 12.99,
    currency: 'EUR',
  },
} as const;

// Couleurs du design system
export const COLORS = {
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  primaryDark: '#4834D4',
  secondary: '#00CEC9',
  secondaryLight: '#81ECEC',
  accent: '#FD79A8',
  success: '#00B894',
  warning: '#FDCB6E',
  error: '#E17055',
  background: '#FFFFFF',
  backgroundDark: '#0A0A0A',
  surface: '#F8F9FA',
  surfaceDark: '#1A1A2E',
  text: '#2D3436',
  textDark: '#F5F5F5',
  textSecondary: '#636E72',
  border: '#DFE6E9',
  borderDark: '#2D3436',
} as const;

// Application statuses labels
export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyée',
  viewed: 'Vue',
  interview: 'Entretien',
  offer: 'Offre',
  accepted: 'Acceptée',
  rejected: 'Refusée',
};

export const APPLICATION_STATUS_COLORS: Record<string, string> = {
  draft: '#636E72',
  sent: '#6C5CE7',
  viewed: '#00CEC9',
  interview: '#FDCB6E',
  offer: '#00B894',
  accepted: '#00B894',
  rejected: '#E17055',
};
