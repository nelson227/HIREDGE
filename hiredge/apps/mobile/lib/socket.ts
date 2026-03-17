import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { storage } from './storage';

function getSocketUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, '');
  }
  if (Platform.OS === 'web') return '';
  const debuggerHost = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost;
  const hostIp = debuggerHost?.split(':')[0];
  if (hostIp) return `http://${hostIp}:3000`;
  return 'http://localhost:3000';
}

const SOCKET_URL = getSocketUrl();

let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket> {
  if (socket?.connected) return socket;

  // Clean up old disconnected socket if any
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  const token = await storage.getItem('accessToken');
  if (!token) throw new Error('No auth token');

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });

  // On reconnect attempts, always use the latest token
  socket.on('reconnect_attempt', async () => {
    const freshToken = await storage.getItem('accessToken');
    if (freshToken && socket) {
      socket.auth = { token: freshToken };
    }
  });

  return new Promise((resolve, reject) => {
    socket!.on('connect', () => resolve(socket!));
    socket!.on('connect_error', (err) => reject(err));
  });
}

export function getSocket(): Socket | null {
  return socket;
}

// Update socket auth token (call after token refresh)
export function updateSocketToken(newToken: string) {
  if (socket) {
    socket.auth = { token: newToken };
    if (!socket.connected) {
      socket.connect();
    }
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

// Squad helpers
export function joinSquadRoom(squadId: string) {
  socket?.emit('squad:join', squadId);
}

export function leaveSquadRoom(squadId: string) {
  socket?.emit('squad:leave', squadId);
}

export function sendSquadMessage(squadId: string, content: string) {
  socket?.emit('squad:message', { squadId, content });
}

export function emitTyping(squadId: string) {
  socket?.emit('squad:typing', squadId);
}

export function emitStopTyping(squadId: string) {
  socket?.emit('squad:stop_typing', squadId);
}
