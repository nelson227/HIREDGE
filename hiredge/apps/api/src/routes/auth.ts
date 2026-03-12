import { FastifyPluginAsync } from 'fastify';
import { registerSchema, loginSchema } from '@hiredge/shared';
import { authService, AppError } from '../services/auth.service';
import prisma from '../db/prisma';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /auth/register
  fastify.post('/register', async (request, reply) => {
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
  fastify.post('/login', async (request, reply) => {
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
  fastify.post('/refresh', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken?: string };
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

      return reply.send({
        success: true,
        data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
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

  // POST /auth/logout (authenticated)
  fastify.post('/logout', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken?: string };

    if (refreshToken) {
      await authService.revokeRefreshToken(refreshToken);
    }

    // Blacklist the current access token
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (token) {
      await authService.blacklistAccessToken(token, 900); // 15 min TTL
    }

    return reply.send({ success: true, data: { message: 'Déconnecté avec succès' } });
  });

  // POST /auth/logout-all (authenticated) - revoke all sessions
  fastify.post('/logout-all', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    await authService.revokeAllUserSessions(request.user.id);

    return reply.send({ success: true, data: { message: 'Toutes les sessions révoquées' } });
  });
};

export default authRoutes;
