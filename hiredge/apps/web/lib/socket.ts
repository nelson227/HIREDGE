import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '') ||
  'http://localhost:8083';

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  const token = getAccessToken();
  if (!token) throw new Error('No auth token');

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
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
