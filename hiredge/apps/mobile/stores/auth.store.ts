import { create } from 'zustand';
import { storage } from '../lib/storage';
import api, { authApi, profileApi } from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';

interface User {
  id: string;
  email: string;
  role: string;
  subscriptionTier?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
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
    const { data } = await authApi.login(email, password);
    if (!data.success) throw new Error(data.error?.message ?? 'Echec de connexion');

    await storage.setItem('accessToken', data.data.accessToken);
    await storage.setItem('refreshToken', data.data.refreshToken);

    set({ user: data.data.user, isAuthenticated: true });

    // Connect WebSocket after login
    try { await connectSocket(); } catch {}
  },

  register: async (email, password, role = 'candidate') => {
    const { data } = await api.post('/auth/register', { email, password, role });
    if (!data.success) throw new Error(data.error?.message ?? 'Echec d\'inscription');

    await storage.setItem('accessToken', data.data.accessToken);
    await storage.setItem('refreshToken', data.data.refreshToken);

    set({ user: data.data.user, isAuthenticated: true });

    // Connect WebSocket after register
    try { await connectSocket(); } catch {}
  },

  logout: async () => {
    try {
      const refreshToken = await storage.getItem('refreshToken');
      await authApi.logout();
    } catch {
      // Silent fail on logout API
    }

    disconnectSocket();
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

      // Dual check: profile + auth/me for redundancy (like web)
      const [profileRes, meRes] = await Promise.all([
        profileApi.get().catch(() => null),
        authApi.me().catch(() => null),
      ]);

      const profile = profileRes?.data?.success ? profileRes.data.data : null;
      const me = meRes?.data?.success ? meRes.data.data : null;

      if (profile || me) {
        set({
          user: {
            id: profile?.id || me?.id || '',
            email: profile?.user?.email || me?.email || '',
            role: me?.role || profile?.role || 'CANDIDATE',
            firstName: profile?.firstName || me?.candidateProfile?.firstName || '',
            lastName: profile?.lastName || me?.candidateProfile?.lastName || '',
            avatarUrl: profile?.avatarUrl || me?.candidateProfile?.avatarUrl || null,
          },
          isAuthenticated: true,
          isLoading: false,
        });

        // Connect WebSocket on session restore
        try { await connectSocket(); } catch {}
      } else {
        // Auth failed — clean up
        await storage.deleteItem('accessToken');
        await storage.deleteItem('refreshToken');
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
