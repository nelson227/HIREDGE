import { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { adminService } from '../services/admin.service';
import { requireRole } from '../middleware/auth';
import { AppError } from '../services/auth.service';
import { env } from '../config/env';

// Admin panel credentials from environment variables
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /admin/verify-access — Admin panel login (no ADMIN role preHandler)
  fastify.post('/verify-access', async (request, reply) => {
    const { email, password } = request.body as { email?: string; password?: string };
    if (!email || !password) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Email et mot de passe requis' } });
    }
    if (email !== ADMIN_EMAIL) {
      return reply.status(401).send({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Identifiants admin invalides' } });
    }
    const valid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!valid) {
      return reply.status(401).send({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Identifiants admin invalides' } });
    }
    const adminToken = jwt.sign({ adminAccess: true, email }, env.JWT_SECRET, { expiresIn: '2h' });
    return reply.send({ success: true, data: { adminToken } });
  });

  // All other admin routes require ADMIN role
  fastify.addHook('preHandler', requireRole('ADMIN'));

  // GET /admin/stats — Platform statistics
  fastify.get('/stats', async (_request, reply) => {
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
  fastify.get('/users', async (request, reply) => {
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
  fastify.get('/users/:id', async (request, reply) => {
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
  fastify.patch('/users/:id/role', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { role } = request.body as { role: string };

    if (!role) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Le rôle est requis' } });
    }

    try {
      const user = await adminService.updateUserRole(id, role);
      return reply.send({ success: true, data: user });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });

  // PATCH /admin/users/:id/subscription — Change subscription tier
  fastify.patch('/users/:id/subscription', async (request, reply) => {
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
  fastify.delete('/users/:id', async (request, reply) => {
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
};

export default adminRoutes;
