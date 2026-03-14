import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { storage } from './storage';

function getApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === 'web') return '/api/v1';
  // On a real device, extract the host IP from Expo's debugger connection
  const debuggerHost = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost;
  const hostIp = debuggerHost?.split(':')[0];
  if (hostIp) return `http://${hostIp}:3000/api/v1`;
  return 'http://localhost:3000/api/v1';
}

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach access token
api.interceptors.request.use(async (config) => {
  const token = await storage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Token refresh deduplication
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

// Response interceptor — handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // Wait for the in-flight refresh to complete
        return new Promise((resolve) => {
          addRefreshSubscriber((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshToken = await storage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });

        if (data.success) {
          await storage.setItem('accessToken', data.data.accessToken);
          await storage.setItem('refreshToken', data.data.refreshToken);
          isRefreshing = false;
          onRefreshed(data.data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(originalRequest);
        }
      } catch {
        isRefreshing = false;
        refreshSubscribers = [];
        // Refresh failed — logout and redirect to login
        await storage.deleteItem('accessToken');
        await storage.deleteItem('refreshToken');
        router.replace('/(auth)/login');
      }
    }

    return Promise.reject(error);
  },
);

export default api;
