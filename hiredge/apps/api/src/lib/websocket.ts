import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import prisma from '../db/prisma';

let io: Server;

export function initializeWebSocket(httpServer: HTTPServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Auth middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const payload = jwt.verify(token, config.jwt.secret) as { userId: string };
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user) return next(new Error('User not found'));
      (socket as any).userId = user.id;
      (socket as any).user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId as string;

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Join squad room
    socket.on('squad:join', async (squadId: string) => {
      const member = await prisma.squadMember.findFirst({
        where: { squadId, userId, status: { in: ['ACTIVE', 'LEADER'] } },
      });
      if (!member) {
        socket.emit('error', { message: 'Not a member of this squad' });
        return;
      }
      socket.join(`squad:${squadId}`);
      socket.to(`squad:${squadId}`).emit('squad:member_online', { userId });
    });

    socket.on('squad:leave', (squadId: string) => {
      socket.leave(`squad:${squadId}`);
    });

    // Squad message
    socket.on('squad:message', async (data: { squadId: string; content: string }) => {
      const { squadId, content } = data;
      if (!content?.trim()) return;

      const member = await prisma.squadMember.findFirst({
        where: { squadId, userId, status: { in: ['ACTIVE', 'LEADER'] } },
      });
      if (!member) return;

      const message = await prisma.squadMessage.create({
        data: {
          squadId,
          userId,
          content: content.trim(),
          type: 'TEXT',
        },
        include: {
          user: { select: { id: true, fullName: true } },
        },
      });

      io.to(`squad:${squadId}`).emit('squad:new_message', message);
    });

    // Typing indicators
    socket.on('squad:typing', (squadId: string) => {
      socket.to(`squad:${squadId}`).emit('squad:user_typing', { userId });
    });

    socket.on('squad:stop_typing', (squadId: string) => {
      socket.to(`squad:${squadId}`).emit('squad:user_stop_typing', { userId });
    });

    socket.on('disconnect', () => {
      // Broadcast offline to relevant rooms
    });
  });

  return io;
}

// Helper to send notifications from anywhere in the backend
export function emitToUser(userId: string, event: string, data: any) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

export function emitToSquad(squadId: string, event: string, data: any) {
  if (io) {
    io.to(`squad:${squadId}`).emit(event, data);
  }
}

export function getIO(): Server | undefined {
  return io;
}
