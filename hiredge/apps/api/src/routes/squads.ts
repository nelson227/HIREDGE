import { FastifyPluginAsync } from 'fastify';
import { sendSquadMessageSchema } from '@hiredge/shared';
import { squadService } from '../services/squad.service';
import { AppError } from '../services/auth.service';

const squadRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  // POST /squads — Create a squad
  fastify.post('/', async (request, reply) => {
    const { name, description, industry } = request.body as { name: string; description?: string; industry?: string };
    if (!name || name.length < 3) {
      return reply.status(400).send({
        success: false, error: { code: 'VALIDATION_ERROR', message: 'Nom d\'escouade requis (min 3 caractères)' },
      });
    }

    try {
      const squad = await squadService.createSquad(request.user.userId, { name, description, industry });
      return reply.status(201).send({ success: true, data: squad });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /squads/mine — Get current user's squad
  fastify.get('/mine', async (request, reply) => {
    try {
      const squad = await squadService.getMySquad(request.user.userId);
      return reply.send({ success: true, data: squad });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /squads/available — Find squads to join
  fastify.get('/available', async (request, reply) => {
    const { industry } = request.query as { industry?: string };
    try {
      const squads = await squadService.findAvailableSquads(request.user.userId, industry);
      return reply.send({ success: true, data: squads });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // POST /squads/:id/join
  fastify.post('/:id/join', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await squadService.joinSquad(request.user.userId, id);
      return reply.send({ success: true, data: { message: 'Vous avez rejoint l\'escouade' } });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // POST /squads/:id/leave
  fastify.post('/:id/leave', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await squadService.leaveSquad(request.user.userId, id);
      return reply.send({ success: true, data: { message: 'Vous avez quitté l\'escouade' } });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /squads/:id
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const squad = await squadService.getSquadDetails(request.user.userId, id);
      return reply.send({ success: true, data: squad });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // POST /squads/:id/messages
  fastify.post('/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = sendSquadMessageSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
      });
    }

    try {
      const message = await squadService.sendMessage(request.user.userId, id, parsed.data);
      return reply.status(201).send({ success: true, data: message });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /squads/:id/messages
  fastify.get('/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { cursor, limit } = request.query as { cursor?: string; limit?: string };

    try {
      const messages = await squadService.getMessages(
        request.user.userId, id, cursor, limit ? parseInt(limit) : undefined,
      );
      return reply.send({ success: true, data: messages });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });
};

export default squadRoutes;
