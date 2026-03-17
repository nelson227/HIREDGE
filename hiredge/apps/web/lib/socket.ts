import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '') ||
  'http://localhost:8083';

let socket: Socket | null = null;

// Track which squad rooms should be active (for auto-rejoin after reconnect)
const activeSquadRooms = new Set<string>();

export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  // If socket exists but disconnected, just reconnect — don't destroy listeners
  if (socket && !socket.connected) {
    const token = getAccessToken();
    if (token) {
      socket.auth = { token };
      socket.connect();
      return socket;
    }
  }

  // First-time creation
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

  // After reconnect, automatically re-join all active squad rooms
  socket.on('connect', () => {
    activeSquadRooms.forEach((squadId) => {
      socket?.emit('squad:join', squadId);
    });
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
    if (!socket.connected) {
      socket.connect();
    }
  }
}

/**
 * Fully disconnect and destroy the socket.
 * Only call this on logout — NOT on page navigation.
 */
export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  activeSquadRooms.clear();
}

export function joinSquadRoom(squadId: string) {
  activeSquadRooms.add(squadId);
  socket?.emit('squad:join', squadId);
}

export function leaveSquadRoom(squadId: string) {
  activeSquadRooms.delete(squadId);
  socket?.emit('squad:leave', squadId);
}

export function emitTyping(squadId: string) {
  socket?.emit('squad:typing', squadId);
}

export function emitStopTyping(squadId: string) {
  socket?.emit('squad:stop_typing', squadId);
}
