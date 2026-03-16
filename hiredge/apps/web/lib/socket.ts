import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '') ||
  'http://localhost:8083';

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  // Clean up old disconnected socket if any
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  const token = getAccessToken();
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
  socket.on('reconnect_attempt', () => {
    const freshToken = getAccessToken();
    if (freshToken && socket) {
      socket.auth = { token: freshToken };
    }
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

// Update socket auth token (call after token refresh)
export function updateSocketToken(newToken: string) {
  if (socket) {
    socket.auth = { token: newToken };
    // If disconnected, reconnect with the new token
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

export function joinSquadRoom(squadId: string) {
  socket?.emit('squad:join', squadId);
}

export function leaveSquadRoom(squadId: string) {
  socket?.emit('squad:leave', squadId);
}

export function emitTyping(squadId: string) {
  socket?.emit('squad:typing', squadId);
}

export function emitStopTyping(squadId: string) {
  socket?.emit('squad:stop_typing', squadId);
}
