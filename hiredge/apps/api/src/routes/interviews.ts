import { FastifyPluginAsync } from 'fastify';
import { startSimulationSchema } from '@hiredge/shared';
import { interviewSimService } from '../services/interview.service';
import { AppError } from '../services/auth.service';

const interviewRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  // GET /interviews — List upcoming interviews (scheduled)
  fastify.get('/', async (request, reply) => {
    try {
      const interviews = await interviewSimService.getUpcomingInterviews(request.user.id);
      return reply.send({ success: true, data: interviews });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // POST /interviews/start — Start a new simulation
  fastify.post('/start', async (request, reply) => {
    const parsed = startSimulationSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error?.issues[0]?.message ?? 'Erreur de validation' },
      });
    }

    try {
      const result = await interviewSimService.startSimulation(request.user.id, parsed.data);
      return reply.status(201).send({ success: true, data: result });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // POST /interviews/:id/respond — Send a response during simulation
  fastify.post('/:id/respond', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { response } = request.body as { response: string };

    if (!response || response.trim().length === 0) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Réponse requise' },
      });
    }

    try {
      const result = await interviewSimService.respondToSimulation(request.user.id, id, response);
      return reply.send({ success: true, data: result });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /interviews/history — Get past simulations
  fastify.get('/history', async (request, reply) => {
    try {
      const simulations = await interviewSimService.getSimulationHistory(request.user.id);
      return reply.send({ success: true, data: simulations });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /interviews/:id — Get simulation details
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const simulation = await interviewSimService.getSimulationDetails(request.user.id, id);
      return reply.send({ success: true, data: simulation });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });
};

export default interviewRoutes;
