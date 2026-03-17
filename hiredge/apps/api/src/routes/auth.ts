import { FastifyPluginAsync, FastifyReply } from 'fastify';
import { registerSchema, loginSchema } from '@hiredge/shared';
import { authService, AppError } from '../services/auth.service';
import { env } from '../config/env';
import prisma from '../db/prisma';

const isProduction = env.NODE_ENV === 'production';

function setTokenCookies(reply: FastifyReply, accessToken: string, refreshToken: string) {
  reply.setCookie('access_token', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: 15 * 60, // 15 min
  });
  reply.setCookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

function clearTokenCookies(reply: FastifyReply) {
  reply.clearCookie('access_token', { path: '/' });
  reply.clearCookie('refresh_token', { path: '/' });
}

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const authRateLimit = {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute',
      },
    },
  };

  // POST /auth/register
  fastify.post('/register', authRateLimit, async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error?.issues[0]?.message ?? 'Erreur de validation' },
      });
    }

    try {
      const user = await authService.register(parsed.data);

      const accessToken = fastify.jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        { expiresIn: '15m' },
      );
      const refreshToken = fastify.jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        { expiresIn: '30d' },
      );

      await authService.saveRefreshToken(
        user.id,
        refreshToken,
        request.headers['user-agent'],
        request.ip,
      );

      setTokenCookies(reply, accessToken, refreshToken);

      return reply.status(201).send({
        success: true,
        data: { user, accessToken, refreshToken },
      });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({
          success: false,
          error: { code: err.code, message: err.message },
        });
      }
      throw err;
    }
  });

  // POST /auth/login
  fastify.post('/login', authRateLimit, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error?.issues[0]?.message ?? 'Erreur de validation' },
      });
    }

    try {
      const user = await authService.login(parsed.data);

      const accessToken = fastify.jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        { expiresIn: '15m' },
      );
      const refreshToken = fastify.jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        { expiresIn: '30d' },
      );

      await authService.saveRefreshToken(
        user.id,
        refreshToken,
        request.headers['user-agent'],
        request.ip,
      );

      setTokenCookies(reply, accessToken, refreshToken);

      return reply.send({
        success: true,
        data: { user, accessToken, refreshToken },
      });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({
          success: false,
          error: { code: err.code, message: err.message },
        });
      }
      throw err;
    }
  });

  // POST /auth/refresh
  fastify.post('/refresh', authRateLimit, async (request, reply) => {
    const body = request.body as { refreshToken?: string };
    const refreshToken = body?.refreshToken || request.cookies?.refresh_token;
    if (!refreshToken) {
      return reply.status(400).send({
        success: false,
        error: { code: 'MISSING_TOKEN', message: 'Refresh token requis' },
      });
    }

    try {
      const session = await authService.validateRefreshToken(refreshToken);

      // Revoke old
      await authService.revokeRefreshToken(refreshToken);

      // Issue new tokens
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, email: true, role: true, subscriptionTier: true },
      });

      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'Utilisateur introuvable' },
        });
      }

      const newAccessToken = fastify.jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        { expiresIn: '15m' },
      );
      const newRefreshToken = fastify.jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        { expiresIn: '30d' },
      );

      await authService.saveRefreshToken(
        user.id,
        newRefreshToken,
        request.headers['user-agent'],
        request.ip,
      );

      setTokenCookies(reply, newAccessToken, newRefreshToken);

      return reply.send({
        success: true,
        data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
      });
    } catch (err) {
      if (err instanceof AppError) {
        // On refresh failure, clear cookies
        clearTokenCookies(reply);
        return reply.status(err.statusCode).send({
          success: false,
          error: { code: err.code, message: err.message },
        });
      }
      throw err;
    }
  });

  // POST /auth/logout (authenticated)
  fastify.post('/logout', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const body = request.body as { refreshToken?: string };
    const refreshToken = body?.refreshToken || request.cookies?.refresh_token;

    if (refreshToken) {
      await authService.revokeRefreshToken(refreshToken);
    }

    // Blacklist the current access token
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (token) {
      await authService.blacklistAccessToken(token, 900); // 15 min TTL
    }

    clearTokenCookies(reply);

    return reply.send({ success: true, data: { message: 'Déconnecté avec succès' } });
  });

  // POST /auth/logout-all (authenticated) - revoke all sessions
  fastify.post('/logout-all', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    await authService.revokeAllUserSessions(request.user.id);

    clearTokenCookies(reply);

    return reply.send({ success: true, data: { message: 'Toutes les sessions révoquées' } });
  });

  // GET /auth/me — Get current authenticated user
  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: { id: true, email: true, role: true, subscriptionTier: true, createdAt: true },
    });
    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'Utilisateur introuvable' },
      });
    }
    return reply.send({ success: true, data: user });
  });

  // PUT /auth/password — Change password (authenticated)
  fastify.put('/password', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { currentPassword, newPassword } = request.body as { currentPassword?: string; newPassword?: string };
    if (!currentPassword || !newPassword) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Mot de passe actuel et nouveau mot de passe requis' },
      });
    }
    if (newPassword.length < 8) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Le nouveau mot de passe doit faire au moins 8 caractères' },
      });
    }
    try {
      await authService.changePassword(request.user.id, currentPassword, newPassword);
      return reply.send({ success: true, data: { message: 'Mot de passe modifié avec succès' } });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });

  // DELETE /auth/account — Delete account (authenticated)
  fastify.delete('/account', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      // Blacklist the current access token
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (token) {
        await authService.blacklistAccessToken(token, 900);
      }
      await authService.deleteAccount(request.user.id);
      clearTokenCookies(reply);
      return reply.send({ success: true, data: { message: 'Compte supprimé avec succès' } });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });
};

export default authRoutes;
