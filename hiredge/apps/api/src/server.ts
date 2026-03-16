import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { env } from './config/env';
import prisma from './db/prisma';
import { authenticate, optionalAuthenticate } from './middleware/auth';
import { initializeWebSocket } from './lib/websocket';
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import jobRoutes from './routes/jobs';
import applicationRoutes from './routes/applications';
import squadRoutes from './routes/squads';
import scoutRoutes from './routes/scouts';
import edgeRoutes from './routes/edge';
import interviewRoutes from './routes/interviews';
import notificationRoutes from './routes/notifications';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: typeof authenticate;
    optionalAuthenticate: typeof optionalAuthenticate;
    prisma: typeof prisma;
  }
}

async function buildServer() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
    trustProxy: true,
    bodyLimit: 10 * 1024 * 1024, // 10MB for image uploads
  });

  // Plugins
  const corsOrigins = env.NODE_ENV === 'production'
    ? (env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',').map(s => s.trim()) : ['https://hiredge.app', 'https://www.hiredge.app'])
    : true;
  
  await app.register(cors, {
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(cookie);

  await app.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  await app.register(rateLimit, {
    global: false,
  });

  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max
    },
  });

  await app.register(fastifyStatic, {
    root: path.join(process.cwd(), 'uploads'),
    prefix: '/uploads/',
    decorateReply: true,
  });

  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: '15m' },
  });

  // Decorators
  app.decorate('authenticate', authenticate);
  app.decorate('optionalAuthenticate', optionalAuthenticate);
  app.decorate('prisma', prisma);

  // Root
  app.get('/', async () => ({
    name: 'HIREDGE API',
    version: '0.1.0',
    docs: '/api/v1',
    health: '/health',
  }));

  // Health check
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  }));

  // Register routes
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(profileRoutes, { prefix: '/api/v1/profile' });
  await app.register(jobRoutes, { prefix: '/api/v1/jobs' });
  await app.register(applicationRoutes, { prefix: '/api/v1/applications' });
  await app.register(squadRoutes, { prefix: '/api/v1/squads' });
  await app.register(scoutRoutes, { prefix: '/api/v1/scouts' });
  await app.register(edgeRoutes, { prefix: '/api/v1/edge' });
  await app.register(interviewRoutes, { prefix: '/api/v1/interviews' });
  await app.register(notificationRoutes, { prefix: '/api/v1/notifications' });

  // Global error handler
  app.setErrorHandler((error: any, request, reply) => {
    app.log.error(error);

    const statusCode = error.statusCode ?? 500;
    // In production, only expose messages for client errors (4xx), never for server errors
    const safeMessage = statusCode >= 500
      ? 'Erreur interne du serveur'
      : (error.statusCode ? error.message : 'Requête invalide');
    reply.status(statusCode).send({
      success: false,
      error: {
        code: error.code ?? 'INTERNAL_ERROR',
        message: safeMessage,
      },
    });
  });

  return app;
}

async function start() {
  const app = await buildServer();

  try {
    // Initialize Socket.IO on Fastify's internal HTTP server BEFORE listening
    initializeWebSocket(app.server);

    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`🚀 HIREDGE API + WebSocket running on port ${env.PORT}`);
  } catch (err: unknown) {
    app.log.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

start();

export { buildServer };
