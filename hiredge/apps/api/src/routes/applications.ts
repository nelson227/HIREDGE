import { FastifyPluginAsync } from 'fastify';
import { createApplicationSchema, updateApplicationStatusSchema } from '@hiredge/shared';
import { applicationService } from '../services/application.service';
import { AppError } from '../services/auth.service';
import { emitToUser } from '../lib/websocket';

const applicationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  // POST /applications
  fastify.post('/', async (request, reply) => {
    const parsed = createApplicationSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error?.issues[0]?.message ?? 'Erreur de validation' },
      });
    }

    try {
      const application = await applicationService.createApplication(request.user.id, parsed.data);
      emitToUser(request.user.id, 'application:created', application);
      return reply.status(201).send({ success: true, data: application });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({
          success: false, error: { code: err.code, message: err.message },
        });
      }
      throw err;
    }
  });

  // GET /applications
  fastify.get('/', async (request, reply) => {
    const { status, page, limit } = request.query as { status?: string; page?: string; limit?: string };

    try {
      const result = await applicationService.getUserApplications(request.user.id, {
        status,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      });
      return reply.send({ success: true, data: result.applications, pagination: result.pagination });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({
          success: false, error: { code: err.code, message: err.message },
        });
      }
      throw err;
    }
  });

  // GET /applications/stats
  fastify.get('/stats', async (request, reply) => {
    try {
      const stats = await applicationService.getApplicationStats(request.user.id);
      return reply.send({ success: true, data: stats });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({
          success: false, error: { code: err.code, message: err.message },
        });
      }
      throw err;
    }
  });

  // GET /applications/:id
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const application = await applicationService.getApplicationById(request.user.id, id);
      return reply.send({ success: true, data: application });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({
          success: false, error: { code: err.code, message: err.message },
        });
      }
      throw err;
    }
  });

  // PATCH /applications/:id
  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateApplicationStatusSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error?.issues[0]?.message ?? 'Erreur de validation' },
      });
    }

    try {
      const application = await applicationService.updateApplicationStatus(request.user.id, id, parsed.data);
      emitToUser(request.user.id, 'application:status_changed', application);
      return reply.send({ success: true, data: application });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({
          success: false, error: { code: err.code, message: err.message },
        });
      }
      throw err;
    }
  });

  // DELETE /applications/:id
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await applicationService.deleteApplication(request.user.id, id);
      emitToUser(request.user.id, 'application:deleted', { id });
      return reply.send({ success: true, data: { message: 'Candidature supprimée' } });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({
          success: false, error: { code: err.code, message: err.message },
        });
      }
      throw err;
    }
  });
};

export default applicationRoutes;
