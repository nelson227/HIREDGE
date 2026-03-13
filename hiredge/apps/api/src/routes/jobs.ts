import { FastifyPluginAsync } from 'fastify';
import { searchJobsSchema } from '@hiredge/shared';
import { jobService } from '../services/job.service';
import { adzunaService } from '../services/adzuna.service';
import { AppError } from '../services/auth.service';

const jobRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /jobs/import — import jobs from Adzuna
  fastify.post('/import', async (request, reply) => {
    const { keywords, location, country, maxPages } = request.body as {
      keywords?: string;
      location?: string;
      country?: string;
      maxPages?: number;
    };

    try {
      const result = await adzunaService.importJobs({
        keywords: keywords || 'developer',
        location: location || 'Montreal',
        country: country || 'canada',
        maxPages: maxPages || 3,
      });

      return reply.send({
        success: true,
        data: result,
        message: `${result.imported} offres importées sur ${result.fetched} récupérées`,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: 'IMPORT_ERROR', message: err.message },
      });
    }
  });

  // GET /jobs/search — public (no auth needed to browse jobs)
  fastify.get('/search', async (request, reply) => {
    const parsed = searchJobsSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error?.issues[0]?.message ?? 'Erreur de validation' },
      });
    }

    try {
      const userId = (request as any).user?.id;
      const result = await jobService.searchJobs(userId ?? '', {
        query: parsed.data.q,
        location: parsed.data.location,
        contractType: parsed.data.contract,
        remote: parsed.data.remote === 'remote' ? true : parsed.data.remote === 'onsite' ? false : undefined,
        salaryMin: parsed.data.salaryMin,
        experienceLevel: parsed.data.experienceLevel,
        postedAfter: parsed.data.postedAfter ? new Date(parsed.data.postedAfter) : undefined,
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

  // GET /jobs/recommended — auth required
  fastify.get('/recommended', { preHandler: [fastify.authenticate] }, async (request, reply) => {
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
