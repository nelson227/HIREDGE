import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8083/api/v1';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Send httpOnly cookies automatically
});

// Extend axios config type for retry logic
interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Response interceptor — handle token refresh via httpOnly cookies
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryConfig | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Refresh token is sent automatically via httpOnly cookie
        const { data } = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });

        if (data.success) {
          // New cookies are set by the server — just retry
          return api(originalRequest);
        }
      } catch {
        // Refresh failed — let the error propagate
        // The dashboard layout auth guard handles redirect to /login
        return Promise.reject(error);
      }
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
};

// ─── Applications ────────────────────────────────────────────────
export const applicationsApi = {
  list: (status?: string) =>
    api.get('/applications', { params: { status } }),
  create: (data: { jobId: string; coverLetter?: string; cv?: string }) =>
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
  getMySquad: () => api.get('/squads/mine'),
  join: (code: string) => api.post('/squads/join', { code }),
  create: (data: { name: string; description?: string }) =>
    api.post('/squads', data),
  leave: () => api.post('/squads/leave'),
  getMembers: (id: string) => api.get(`/squads/${id}/members`),
  sendMessage: (id: string, message: string) =>
    api.post(`/squads/${id}/messages`, { message }),
  getMessages: (id: string, cursor?: string) =>
    api.get(`/squads/${id}/messages`, { params: { cursor } }),
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

export default api;
