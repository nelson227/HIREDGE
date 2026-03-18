import { FastifyPluginAsync } from 'fastify';
import jwt from 'jsonwebtoken';
import { adminService } from '../services/admin.service';
import { requireRole } from '../middleware/auth';
import { AppError } from '../services/auth.service';
import { env } from '../config/env';
import prisma from '../db/prisma';
import redis from '../lib/redis';

// Admin panel credentials from environment variables
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /admin/verify-access — Public route (no auth required)
  fastify.post('/verify-access', async (request, reply) => {
    const { email, password } = request.body as { email?: string; password?: string };
    if (!email || !password) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Email et mot de passe requis' } });
    }
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return reply.status(401).send({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Identifiants admin invalides' } });
    }

    // Auto-restore ADMIN role if the admin user exists but lost their role
    const adminUser = await prisma.user.findUnique({ where: { email } });
    if (adminUser && adminUser.role !== 'ADMIN') {
      await prisma.user.update({ where: { id: adminUser.id }, data: { role: 'ADMIN' } });
      // Invalidate Redis cache so the auth middleware picks up the new role immediately
      try { await redis.del(`auth:user:${adminUser.id}`); } catch {}
    }

    const adminToken = jwt.sign({ adminAccess: true, email }, env.JWT_SECRET, { expiresIn: '2h' });
    return reply.send({ success: true, data: { adminToken } });
  });

  // All other admin routes require ADMIN role — isolated in a sub-scope
  // so the preHandler hook does NOT apply to /verify-access
  await fastify.register(async (protectedScope) => {
    protectedScope.addHook('preHandler', requireRole('ADMIN'));

    // GET /admin/stats — Platform statistics
    protectedScope.get('/stats', async (_request, reply) => {
    try {
      const stats = await adminService.getStats();
      return reply.send({ success: true, data: stats });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });

    // GET /admin/users — List users with pagination/filters
    protectedScope.get('/users', async (request, reply) => {
    const { page, limit, search, role, subscriptionTier, sortBy, sortOrder } = request.query as {
      page?: string;
      limit?: string;
      search?: string;
      role?: string;
      subscriptionTier?: string;
      sortBy?: string;
      sortOrder?: string;
    };

    try {
      const result = await adminService.listUsers({
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        search,
        role,
        subscriptionTier,
        sortBy,
        sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
      });
      return reply.send({ success: true, data: result.users, pagination: result.pagination });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });

    // GET /admin/users/:id — User details
    protectedScope.get('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const user = await adminService.getUserDetail(id);
      return reply.send({ success: true, data: user });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });

    // PATCH /admin/users/:id/role — Change user role
    protectedScope.patch('/users/:id/role', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { role } = request.body as { role: string };

    if (!role) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Le rôle est requis' } });
    }

    try {
      const user = await adminService.updateUserRole(id, role, request.user.id);
      return reply.send({ success: true, data: user });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });

    // PATCH /admin/users/:id/subscription — Change subscription tier
    protectedScope.patch('/users/:id/subscription', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { subscriptionTier } = request.body as { subscriptionTier: string };

    if (!subscriptionTier) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: "L'abonnement est requis" } });
    }

    try {
      const user = await adminService.updateUserSubscription(id, subscriptionTier);
      return reply.send({ success: true, data: user });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });

    // DELETE /admin/users/:id — Delete user account
    protectedScope.delete('/users/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        await adminService.deleteUser(id);
        return reply.send({ success: true, data: { message: 'Utilisateur supprimé' } });
      } catch (err) {
        if (err instanceof AppError) {
          return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
        }
        throw err;
      }
    });
  }); // end protectedScope register
};

export default adminRoutes;
