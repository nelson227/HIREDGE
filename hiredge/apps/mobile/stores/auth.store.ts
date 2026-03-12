import { create } from 'zustand';
import { storage } from '../lib/storage';
import api from '../lib/api';

interface User {
  id: string;
  email: string;
  role: string;
  subscriptionTier?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (!data.success) throw new Error(data.error?.message ?? 'Echec de connexion');

    await storage.setItem('accessToken', data.data.accessToken);
    await storage.setItem('refreshToken', data.data.refreshToken);

    set({ user: data.data.user, isAuthenticated: true });
  },

  register: async (email, password, role = 'candidate') => {
    const { data } = await api.post('/auth/register', { email, password, role });
    if (!data.success) throw new Error(data.error?.message ?? 'Echec d\'inscription');

    await storage.setItem('accessToken', data.data.accessToken);
    await storage.setItem('refreshToken', data.data.refreshToken);

    set({ user: data.data.user, isAuthenticated: true });
  },

  logout: async () => {
    try {
      const refreshToken = await storage.getItem('refreshToken');
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // Silent fail on logout API
    }

    await storage.deleteItem('accessToken');
    await storage.deleteItem('refreshToken');
    set({ user: null, isAuthenticated: false });
  },

  loadSession: async () => {
    try {
      const token = await storage.getItem('accessToken');
      if (!token) {
        set({ isLoading: false });
        return;
      }

      const { data } = await api.get('/profile');
      if (data.success) {
        const profile = data.data;
        set({ user: { id: profile.id, email: profile.email, role: profile.role ?? 'CANDIDATE' }, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
