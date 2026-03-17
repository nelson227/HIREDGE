import axios, { InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { storage } from './storage';
import { updateSocketToken } from './socket';

function getApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === 'web') return '/api/v1';
  const debuggerHost = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost;
  const hostIp = debuggerHost?.split(':')[0];
  if (hostIp) return `http://${hostIp}:3000/api/v1`;
  return 'http://localhost:3000/api/v1';
}

const API_URL = getApiUrl();
console.log('[API] Base URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Request interceptor — attach access token
api.interceptors.request.use(async (config) => {
  const token = await storage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Extend axios config type for retry logic
interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Token refresh deduplication (mutex pattern)
let isRefreshing = false;
let refreshSubscribers: ((success: boolean) => void)[] = [];

function onRefreshDone(success: boolean) {
  refreshSubscribers.forEach(cb => cb(success));
  refreshSubscribers = [];
}

// Response interceptor — handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryConfig | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

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
        const refreshToken = await storage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });

        if (data.success && data.data) {
          await storage.setItem('accessToken', data.data.accessToken);
          await storage.setItem('refreshToken', data.data.refreshToken);
          // Keep WebSocket connected with fresh token
          updateSocketToken(data.data.accessToken);
          isRefreshing = false;
          onRefreshDone(true);
          return api(originalRequest);
        }
      } catch {
        await storage.deleteItem('accessToken');
        await storage.deleteItem('refreshToken');
        isRefreshing = false;
        onRefreshDone(false);
        router.replace('/(auth)/login');
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
    api.post('/auth/login', { email, password }, { timeout: 45000 }),
  register: (data: { email: string; password: string; role?: string; firstName?: string; lastName?: string }) =>
    api.post('/auth/register', data, { timeout: 45000 }),
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
  getCoverLetter: (id: string) => api.get(`/jobs/${id}/cover-letter`),
  getCompanyAnalysis: (id: string) => api.get(`/jobs/${id}/company-analysis`),
};

// ─── Applications ────────────────────────────────────────────────
export const applicationsApi = {
  list: (params?: Record<string, string>) =>
    api.get('/applications', { params }),
  create: (data: { jobId: string; coverLetterContent?: string; coverLetter?: string; cv?: string }) =>
    api.post('/applications', data),
  getById: (id: string) => api.get(`/applications/${id}`),
  updateStatus: (id: string, status: string) =>
    api.patch(`/applications/${id}`, { status }),
  withdraw: (id: string) => api.delete(`/applications/${id}`),
  stats: () => api.get('/applications/stats'),
};

// ─── Profile ─────────────────────────────────────────────────────
export const profileApi = {
  get: () => api.get('/profile'),
  update: (data: any) => api.patch('/profile', data),
  uploadAvatar: (formData: FormData) => {
    return api.post('/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadCv: (formData: FormData) => {
    return api.post('/profile/cv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
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
  getHistory: () => api.get('/interviews/history'),
  start: (data: { type: string; applicationId?: string; jobId?: string; company?: string; jobTitle?: string }) =>
    api.post('/interviews/start', data),
  getById: (id: string) => api.get(`/interviews/${id}`),
  respond: (id: string, message: string) =>
    api.post(`/interviews/${id}/respond`, { message }),
  sendMessage: (id: string, message: string) =>
    api.post(`/interviews/${id}/message`, { message }),
  end: (id: string) => api.post(`/interviews/${id}/end`),
};

// ─── Squad ───────────────────────────────────────────────────────
export const squadApi = {
  getMySquads: () => api.get('/squads/mine'),
  getMySquad: () => api.get('/squads/mine'),
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
  createEvent: (squadId: string, data: { title: string; type: string; scheduledAt: string; duration?: number; link?: string }) =>
    api.post(`/squads/${squadId}/events`, data),
  getEvents: (squadId: string) => api.get(`/squads/${squadId}/events`),
  sendVoice: (squadId: string, audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob as any, 'voice.webm');
    return api.post(`/squads/${squadId}/voice`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  toggleReaction: (squadId: string, messageId: string, emoji: string) =>
    api.post(`/squads/${squadId}/messages/${messageId}/reaction`, { emoji }),
  togglePin: (squadId: string, messageId: string) =>
    api.post(`/squads/${squadId}/messages/${messageId}/pin`),
  toggleImportant: (squadId: string, messageId: string) =>
    api.post(`/squads/${squadId}/messages/${messageId}/important`),
  deleteMessage: (squadId: string, messageId: string, mode: 'FOR_ME' | 'FOR_ALL') =>
    api.delete(`/squads/${squadId}/messages/${messageId}`, { params: { mode } }),
};

// ─── Scouts ──────────────────────────────────────────────────────
export const scoutsApi = {
  list: (company?: string) =>
    api.get('/scouts', { params: { company } }),
  getById: (id: string) => api.get(`/scouts/${id}`),
  askQuestion: (scoutId: string, question: string) =>
    api.post(`/scouts/${scoutId}/questions`, { question }),
  getAnswers: (scoutId: string) => api.get(`/scouts/${scoutId}/answers`),
  getConversations: () => api.get('/scouts/conversations'),
  getConversation: (id: string) => api.get(`/scouts/conversations/${id}`),
  getMessages: (id: string) => api.get(`/scouts/conversations/${id}/messages`),
  sendMessage: (id: string, content: string) =>
    api.post(`/scouts/conversations/${id}/messages`, { content }),
};

// ─── Notifications ───────────────────────────────────────────────
export const notificationsApi = {
  list: (unreadOnly?: boolean) =>
    api.get('/notifications', { params: { unreadOnly } }),
  count: () => api.get('/notifications/count'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

// ─── Payments ────────────────────────────────────────────────────
export const paymentsApi = {
  createCheckout: () => api.post('/payments/create-checkout'),
  createPortal: () => api.post('/payments/portal'),
  getStatus: () => api.get('/payments/status'),
};

export default api;
