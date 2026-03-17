import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { updateSocketToken } from './socket';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8083/api/v1';

// ─── Token Manager ───────────────────────────────────────────────
// Stores tokens in memory + localStorage to work on Safari/iOS
// where cross-origin httpOnly cookies are blocked by ITP.
let accessToken: string | null = null;

function isBrowser() {
  return typeof window !== 'undefined';
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function saveTokens(access: string, refresh: string) {
  accessToken = access;
  if (isBrowser()) {
    try { localStorage.setItem('refreshToken', refresh); } catch {}
  }
}

export function clearTokens() {
  accessToken = null;
  if (isBrowser()) {
    try { localStorage.removeItem('refreshToken'); } catch {}
  }
}

function getRefreshToken(): string | null {
  if (!isBrowser()) return null;
  try { return localStorage.getItem('refreshToken'); } catch { return null; }
}

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Keep cookies as fallback for same-origin / Chrome
});

// Request interceptor — inject Authorization header if we have a token
api.interceptors.request.use((config) => {
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Extend axios config type for retry logic
interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Mutex to prevent parallel refresh attempts
let isRefreshing = false;
let refreshSubscribers: ((success: boolean) => void)[] = [];

function onRefreshDone(success: boolean) {
  refreshSubscribers.forEach((cb) => cb(success));
  refreshSubscribers = [];
}

// Response interceptor — handle token refresh
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryConfig | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      // If already refreshing, wait for the result
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshSubscribers.push((success: boolean) => {
            if (success) {
              resolve(api(originalRequest));
            } else {
              reject(error);
            }
          });
        });
      }

      isRefreshing = true;

      try {
        // Send refreshToken in body (works even when cookies are blocked)
        const storedRefresh = getRefreshToken();
        const { data } = await axios.post(
          `${API_URL}/auth/refresh`,
          storedRefresh ? { refreshToken: storedRefresh } : {},
          { withCredentials: true },
        );

        if (data.success && data.data) {
          saveTokens(data.data.accessToken, data.data.refreshToken);
          // Keep WebSocket connected with fresh token
          updateSocketToken(data.data.accessToken);
          isRefreshing = false;
          onRefreshDone(true);
          return api(originalRequest);
        }
      } catch {
        clearTokens();
        isRefreshing = false;
        onRefreshDone(false);
        return Promise.reject(error);
      }

      isRefreshing = false;
      onRefreshDone(false);
    }

    return Promise.reject(error);
  },
);

// ─── Auth ────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/password', { currentPassword, newPassword }),
  deleteAccount: (password: string) => api.delete('/auth/account', { data: { password } }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),
  verifyEmail: (token: string) => api.post('/auth/verify-email', { token }),
  resendVerification: () => api.post('/auth/resend-verification'),
};

// ─── EDGE AI ─────────────────────────────────────────────────────
export const edgeApi = {
  getConversations: () => api.get('/edge/conversations'),
  createConversation: () => api.post('/edge/conversations'),
  deleteConversation: (id: string) => api.delete(`/edge/conversations/${id}`),
  renameConversation: (id: string, title: string) =>
    api.patch(`/edge/conversations/${id}`, { title }),
  chat: (message: string, conversationId?: string, imageBase64?: string) =>
    api.post('/edge/chat', { message, conversationId, imageBase64 }),
  getHistory: (conversationId?: string, cursor?: string, limit?: number) =>
    api.get('/edge/history', {
      params: { conversationId, cursor, limit },
    }),
};

// ─── Jobs ────────────────────────────────────────────────────────
export interface JobSearchParams {
  q?: string;
  location?: string;
  contract?: string;
  remote?: 'remote' | 'onsite' | 'hybrid';
  salaryMin?: number;
  experienceLevel?: string;
  postedAfter?: string;
  page?: number;
  limit?: number;
}

export const jobsApi = {
  search: (params: JobSearchParams = {}) =>
    api.get('/jobs/search', { params }),
  getRecommended: (limit?: number) =>
    api.get('/jobs/recommended', { params: { limit } }),
  getById: (id: string) => api.get(`/jobs/${id}`),
  getCoverLetter: (id: string, regenerate?: boolean) => api.get(`/jobs/${id}/cover-letter`, { params: regenerate ? { regenerate: 'true' } : undefined }),
  getCompanyAnalysis: (id: string) => api.get(`/jobs/${id}/company-analysis`),
};

// ─── Applications ────────────────────────────────────────────────
export const applicationsApi = {
  list: (status?: string) =>
    api.get('/applications', { params: { status } }),
  create: (data: { jobId: string; coverLetterContent?: string; coverLetter?: string; cv?: string }) =>
    api.post('/applications', data),
  getById: (id: string) => api.get(`/applications/${id}`),
  updateStatus: (id: string, status: string) =>
    api.patch(`/applications/${id}`, { status }),
  withdraw: (id: string) => api.delete(`/applications/${id}`),
};

// ─── Profile ─────────────────────────────────────────────────────
export const profileApi = {
  get: () => api.get('/profile'),
  update: (data: any) => api.patch('/profile', data),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadCv: (file: File) => {
    const formData = new FormData();
    formData.append('cv', file);
    return api.post('/profile/cv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000, // 60s — AI parsing can take time
    });
  },
  downloadCv: () => api.get('/profile/cv/download', { responseType: 'blob' }),
  addSkill: (data: { name: string; level: string; yearsOfExperience?: number }) =>
    api.post('/profile/skills', data),
  removeSkill: (skillId: string) =>
    api.delete(`/profile/skills/${skillId}`),
  addExperience: (data: any) =>
    api.post('/profile/experiences', data),
  removeExperience: (expId: string) =>
    api.delete(`/profile/experiences/${expId}`),
  addEducation: (data: any) =>
    api.post('/profile/educations', data),
  removeEducation: (eduId: string) =>
    api.delete(`/profile/educations/${eduId}`),
};

// ─── Interviews ──────────────────────────────────────────────────
export const interviewsApi = {
  list: (params?: Record<string, string>) => api.get('/interviews', { params }),
  start: (data: { type: string; applicationId?: string; jobId?: string }) =>
    api.post('/interviews/start', data),
  getById: (id: string) => api.get(`/interviews/${id}`),
  sendMessage: (id: string, message: string) =>
    api.post(`/interviews/${id}/message`, { message }),
  end: (id: string) => api.post(`/interviews/${id}/end`),
};

// ─── Squad ───────────────────────────────────────────────────────
export const squadApi = {
  getMySquads: () => api.get('/squads/mine'),
  getMySquad: () => api.get('/squads/mine'), // legacy compat
  getDetails: (id: string) => api.get(`/squads/${id}`),
  join: (code: string) => api.post('/squads/join', { code }),
  joinById: (squadId: string) => api.post(`/squads/${squadId}/join`),
  create: (data: { name: string; description?: string }) =>
    api.post('/squads', data),
  leave: (squadId: string) => api.post('/squads/leave', { squadId }),
  getMembers: (id: string) => api.get(`/squads/${id}/members`),
  sendMessage: (id: string, message: string, replyToId?: string) =>
    api.post(`/squads/${id}/messages`, { content: message, replyToId }),
  getMessages: (id: string, cursor?: string) =>
    api.get(`/squads/${id}/messages`, { params: { cursor } }),
  getSuggestions: (jobId: string) =>
    api.get('/squads/suggestions', { params: { jobId } }),
  dismiss: () => api.post('/squads/dismiss'),
  getAvailable: (filters?: { industry?: string; jobFamily?: string; experienceLevel?: string }) =>
    api.get('/squads/available', { params: filters }),
  // Events
  createEvent: (squadId: string, data: { title: string; type: string; scheduledAt: string; duration?: number; link?: string }) =>
    api.post(`/squads/${squadId}/events`, data),
  getEvents: (squadId: string) => api.get(`/squads/${squadId}/events`),
  // Voice
  sendVoice: (squadId: string, audioBlob: Blob) => {
    const formData = new FormData()
    formData.append('audio', audioBlob, 'voice.webm')
    return api.post(`/squads/${squadId}/voice`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  // Message actions
  toggleReaction: (squadId: string, messageId: string, emoji: string) =>
    api.post(`/squads/${squadId}/messages/${messageId}/reaction`, { emoji }),
  togglePin: (squadId: string, messageId: string) =>
    api.post(`/squads/${squadId}/messages/${messageId}/pin`),
  toggleImportant: (squadId: string, messageId: string) =>
    api.post(`/squads/${squadId}/messages/${messageId}/important`),
  deleteMessage: (squadId: string, messageId: string, mode: 'FOR_ME' | 'FOR_ALL') =>
    api.delete(`/squads/${squadId}/messages/${messageId}`, { params: { mode } }),
  markAsRead: (squadId: string) =>
    api.patch(`/squads/${squadId}/read`),
};

// ─── Scouts ──────────────────────────────────────────────────────
export const scoutsApi = {
  list: (company?: string) =>
    api.get('/scouts', { params: { company } }),
  getById: (id: string) => api.get(`/scouts/${id}`),
  askQuestion: (scoutId: string, question: string) =>
    api.post(`/scouts/${scoutId}/questions`, { question }),
  getAnswers: (scoutId: string) => api.get(`/scouts/${scoutId}/answers`),
};

// ─── Notifications ───────────────────────────────────────────────
export const notificationsApi = {
  list: (unreadOnly?: boolean) =>
    api.get('/notifications', { params: { unreadOnly } }),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

// ─── Admin ───────────────────────────────────────────────────────
export const adminApi = {
  verifyAccess: (email: string, password: string) =>
    api.post('/admin/verify-access', { email, password }),
  getStats: () => api.get('/admin/stats'),
  listUsers: (params?: { page?: number; limit?: number; search?: string; role?: string; subscriptionTier?: string; sortBy?: string; sortOrder?: string }) =>
    api.get('/admin/users', { params }),
  getUserDetail: (id: string) => api.get(`/admin/users/${id}`),
  updateUserRole: (id: string, role: string) =>
    api.patch(`/admin/users/${id}/role`, { role }),
  updateUserSubscription: (id: string, subscriptionTier: string) =>
    api.patch(`/admin/users/${id}/subscription`, { subscriptionTier }),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
};

// ─── Payments ────────────────────────────────────────────────────
export const paymentsApi = {
  createCheckout: () => api.post('/payments/create-checkout'),
  createPortal: () => api.post('/payments/portal'),
  getStatus: () => api.get('/payments/status'),
};

export default api;
