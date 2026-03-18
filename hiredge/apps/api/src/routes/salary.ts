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

  // POST /salary/negotiate — Launch a salary negotiation simulation
  fastify.post('/negotiate', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const body = request.body as {
      jobTitle: string;
      company: string;
      currentOffer: number;
      targetSalary: number;
      context?: string;
    };

    if (!body.jobTitle || !body.currentOffer) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Titre du poste et offre actuelle requis' },
      });
    }

    try {
      const result = await salaryService.simulateNegotiation(request.user.id, {
        jobTitle: body.jobTitle,
        companyName: body.company,
        currentOffer: body.currentOffer,
        targetSalary: body.targetSalary,
        message: body.context || `Je souhaite négocier pour le poste de ${body.jobTitle}`,
      });
      return reply.send({ success: true, data: result });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // POST /salary/contribute — Contribute salary data (collective intelligence)
  fastify.post('/contribute', async (request, reply) => {
    const body = request.body as {
      jobTitle: string;
      location: string;
      salary: number;
      company?: string;
    };

    if (!body.jobTitle || !body.salary || !body.location) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Titre, localisation et salaire requis' },
      });
    }

    try {
      const result = await salaryService.contributeSalary({
        jobFamily: body.jobTitle,
        title: body.jobTitle,
        location: body.location,
        salaryMin: body.salary,
        salaryMax: body.salary,
      });
      return reply.send({ success: true, data: result });
    } catch (err) {
      throw err;
    }
  });
};

export default salaryRoutes;
