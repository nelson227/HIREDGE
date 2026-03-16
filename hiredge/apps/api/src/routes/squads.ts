import { FastifyPluginAsync } from 'fastify';
import { sendSquadMessageSchema } from '@hiredge/shared';
import { squadService } from '../services/squad.service';
import { AppError } from '../services/auth.service';
import prisma from '../db/prisma';

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
      const squad = await squadService.createSquad(request.user.id, { name, description, industry });
      return reply.status(201).send({ success: true, data: squad });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /squads/mine — Get current user's squad
  fastify.get('/mine', async (request, reply) => {
    try {
      const squad = await squadService.getMySquad(request.user.id);
      return reply.send({ success: true, data: squad });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // POST /squads/join — Join a squad (by code/ID in body)
  fastify.post('/join', async (request, reply) => {
    const { code, squadId } = request.body as { code?: string; squadId?: string };
    const id = code || squadId;
    if (!id) {
      return reply.status(400).send({
        success: false, error: { code: 'VALIDATION_ERROR', message: 'Code ou ID d\'escouade requis' },
      });
    }
    try {
      await squadService.joinSquad(request.user.id, id);
      return reply.send({ success: true, data: { message: 'Vous avez rejoint l\'escouade' } });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // POST /squads/leave — Leave current squad
  fastify.post('/leave', async (request, reply) => {
    try {
      const squad = await squadService.getMySquad(request.user.id);
      if (!squad) {
        return reply.status(404).send({
          success: false, error: { code: 'NO_SQUAD', message: 'Vous n\'êtes dans aucune escouade' },
        });
      }
      await squadService.leaveSquad(request.user.id, squad.id);
      return reply.send({ success: true, data: { message: 'Vous avez quitté l\'escouade' } });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /squads/available — Find squads to join
  fastify.get('/available', async (request, reply) => {
    const { industry } = request.query as { industry?: string };
    try {
      const squads = await squadService.findAvailableSquads(request.user.id, industry);
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
      await squadService.joinSquad(request.user.id, id);
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
      await squadService.leaveSquad(request.user.id, id);
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
      const squad = await squadService.getSquadDetails(request.user.id, id);
      return reply.send({ success: true, data: squad });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /squads/:id/members
  fastify.get('/:id/members', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      // Verify the requesting user is a member of this squad
      const membership = await prisma.squadMember.findFirst({
        where: { squadId: id, userId: request.user.id, isActive: true },
      });
      if (!membership) {
        return reply.status(403).send({
          success: false, error: { code: 'NOT_MEMBER', message: 'Vous n\'êtes pas membre de cette escouade' },
        });
      }

      const members = await prisma.squadMember.findMany({
        where: { squadId: id, isActive: true },
        include: { user: { select: { id: true, email: true } } },
        orderBy: { joinedAt: 'asc' },
      });
      return reply.send({ success: true, data: members });
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
        success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error?.issues[0]?.message ?? 'Erreur de validation' },
      });
    }

    try {
      const message = await squadService.sendMessage(request.user.id, id, {
        content: parsed.data.content,
        type: parsed.data.type,
      });
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
        request.user.id, id, cursor, limit ? parseInt(limit) : undefined,
      );
      return reply.send({ success: true, data: messages });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });
};

export default squadRoutes;
