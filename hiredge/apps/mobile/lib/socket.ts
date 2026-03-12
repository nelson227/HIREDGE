import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket> {
  if (socket?.connected) return socket;

  const token = await SecureStore.getItemAsync('accessToken');
  if (!token) throw new Error('No auth token');

  socket = io(API_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  return new Promise((resolve, reject) => {
    socket!.on('connect', () => resolve(socket!));
    socket!.on('connect_error', (err) => reject(err));
  });
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
