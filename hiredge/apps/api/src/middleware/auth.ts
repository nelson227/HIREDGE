import { FastifyRequest, FastifyReply } from 'fastify';
import prisma from '../db/prisma';
import redis from '../lib/redis';

const USER_CACHE_TTL = 300; // 5 minutes

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  subscriptionTier: string;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; email: string; role: string };
    user: AuthUser;
  }
}

async function getUserFromCacheOrDb(userId: string): Promise<AuthUser | null> {
  const cacheKey = `auth:user:${userId}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    // Redis unavailable, fall through to DB
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, subscriptionTier: true },
  });

  if (user) {
    try {
      await redis.set(cacheKey, JSON.stringify(user), 'EX', USER_CACHE_TTL);
    } catch {
      // Redis unavailable, continue without cache
    }
  }

  return user;
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Try Authorization header first, then fall back to httpOnly cookie
    if (!request.headers.authorization && request.cookies?.access_token) {
      request.headers.authorization = `Bearer ${request.cookies.access_token}`;
    }

    const decoded = await request.jwtVerify<{ sub: string; email: string; role: string }>();

    const user = await getUserFromCacheOrDb(decoded.sub);

    if (!user) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Utilisateur introuvable' } });
    }

    request.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      subscriptionTier: user.subscriptionTier,
    };
  } catch {
    return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Token invalide ou expiré' } });
  }
}

export async function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply);
    if (reply.sent) return;

    if (!roles.includes(request.user.role)) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Accès interdit' } });
    }
  };
}
