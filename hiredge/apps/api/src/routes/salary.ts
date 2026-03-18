import { FastifyPluginAsync } from 'fastify';
import { salaryService } from '../services/salary.service';
import { AppError } from '../services/auth.service';

const salaryRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  // GET /salary/data — Get salary data for a job title/location
  fastify.get('/data', async (request, reply) => {
    const { title, jobFamily, location, experienceLevel } = request.query as {
      title?: string;
      jobFamily?: string;
      location?: string;
      experienceLevel?: string;
    };

    if (!title && !jobFamily) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Le titre du poste ou la famille de métier est requis' },
      });
    }

    try {
      const data = await salaryService.getSalaryData({ title, jobFamily, location });
      return reply.send({ success: true, data });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // POST /salary/contribute — Contribute salary data (validated against market range)
  fastify.post('/contribute', async (request, reply) => {
    const body = request.body as {
      jobTitle: string;
      jobFamily?: string;
      location: string;
      salary: number;
      country?: string;
    };

    if (!body.jobTitle || !body.salary || !body.location) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Titre, localisation et salaire requis' },
      });
    }

    if (body.salary < 0 || body.salary > 1000000) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Le salaire doit être entre 0 et 1 000 000 $' },
      });
    }

    try {
      const result = await salaryService.contributeSalary({
        jobFamily: body.jobFamily || body.jobTitle,
        title: body.jobTitle,
        location: body.location,
        country: body.country,
        salary: body.salary,
      });

      if (!result.accepted) {
        return reply.status(422).send({
          success: false,
          error: { code: 'OUT_OF_RANGE', message: result.message },
        });
      }

      return reply.send({ success: true, data: result });
    } catch (err) {
      throw err;
    }
  });
};

export default salaryRoutes;
