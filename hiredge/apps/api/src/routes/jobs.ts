import { FastifyPluginAsync } from 'fastify';
import { searchJobsSchema } from '@hiredge/shared';
import { jobService } from '../services/job.service';
import { AppError } from '../services/auth.service';

const jobRoutes: FastifyPluginAsync = async (fastify) => {
  // All job routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // GET /jobs/search
  fastify.get('/search', async (request, reply) => {
    const parsed = searchJobsSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error?.issues[0]?.message ?? 'Erreur de validation' },
      });
    }

    try {
      const result = await jobService.searchJobs(request.user.id, {
        query: parsed.data.q,
        location: parsed.data.location,
        contractType: parsed.data.contract,
        remote: parsed.data.remote === 'remote' ? true : parsed.data.remote === 'onsite' ? false : undefined,
        page: parsed.data.page,
        limit: parsed.data.limit,
      });
      return reply.send({ success: true, data: result.jobs, pagination: result.pagination });
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

  // GET /jobs/recommended
  fastify.get('/recommended', async (request, reply) => {
    const { limit } = request.query as { limit?: string };

    try {
      const jobs = await jobService.getMatchedJobs(request.user.id, limit ? parseInt(limit) : 20);
      return reply.send({ success: true, data: jobs });
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

  // GET /jobs/:id
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const job = await jobService.getJobById(id);
      return reply.send({ success: true, data: job });
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
};

export default jobRoutes;
