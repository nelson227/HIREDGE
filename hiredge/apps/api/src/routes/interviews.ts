import { FastifyPluginAsync } from 'fastify';
import { startSimulationSchema } from '@hiredge/shared';
import { interviewSimService } from '../services/interview.service';
import { AppError } from '../services/auth.service';
import { emitToUser } from '../lib/websocket';

const interviewRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  const llmRateLimit = {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute',
      },
    },
  };

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
  fastify.post('/start', llmRateLimit, async (request, reply) => {
    const parsed = startSimulationSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error?.issues[0]?.message ?? 'Erreur de validation' },
      });
    }

    try {
      const result = await interviewSimService.startSimulation(request.user.id, parsed.data);
      emitToUser(request.user.id, 'interview:started', result);
      return reply.status(201).send({ success: true, data: result });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // POST /interviews/:id/respond — Send a response during simulation
  fastify.post('/:id/respond', llmRateLimit, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { response, message } = request.body as { response?: string; message?: string };
    const text = response || message || '';

    if (!text || text.trim().length === 0) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Réponse requise' },
      });
    }

    try {
      const result = await interviewSimService.respondToSimulation(request.user.id, id, text);
      return reply.send({ success: true, data: result });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // POST /interviews/:id/message — Alias for /respond (frontend compatibility)
  fastify.post('/:id/message', llmRateLimit, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { message, response } = request.body as { message?: string; response?: string };
    const text = message || response || '';

    if (!text || text.trim().length === 0) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Message requis' },
      });
    }

    try {
      const result = await interviewSimService.respondToSimulation(request.user.id, id, text);
      return reply.send({ success: true, data: result });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // POST /interviews/:id/end — End a simulation early
  fastify.post('/:id/end', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const simulation = await interviewSimService.getSimulationDetails(request.user.id, id);
      emitToUser(request.user.id, 'interview:completed', simulation);
      return reply.send({ success: true, data: simulation });
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
