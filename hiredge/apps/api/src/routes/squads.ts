import { FastifyPluginAsync } from 'fastify';
import { sendSquadMessageSchema } from '@hiredge/shared';
import { squadService } from '../services/squad.service';
import { squadMatchingService } from '../services/squad-matching.service';
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

  // GET /squads/mine — Get current user's squads (multi-squad)
  fastify.get('/mine', async (request, reply) => {
    try {
      const squads = await squadService.getMySquads(request.user.id);
      return reply.send({ success: true, data: squads });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /squads/suggestions — Get AI-matched squad suggestions for a job application
  fastify.get('/suggestions', async (request, reply) => {
    const { jobId } = request.query as { jobId?: string };
    if (!jobId) {
      return reply.status(400).send({
        success: false, error: { code: 'VALIDATION_ERROR', message: 'jobId requis' },
      });
    }

    try {
      const shouldSuggest = await squadMatchingService.shouldSuggestSquad(request.user.id);
      if (!shouldSuggest) {
        return reply.send({ success: true, data: { show: false, squads: [] } });
      }
      const squads = await squadMatchingService.findMatchingSquads(request.user.id, jobId);
      return reply.send({ success: true, data: { show: true, squads } });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // POST /squads/dismiss — Dismiss squad suggestion (cooldown)
  fastify.post('/dismiss', async (request, reply) => {
    try {
      await squadMatchingService.dismissSuggestion(request.user.id);
      return reply.send({ success: true, data: { message: 'Suggestion ignorée' } });
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

  // POST /squads/leave — Leave a specific squad (body: { squadId })
  fastify.post('/leave', async (request, reply) => {
    const { squadId } = request.body as { squadId?: string };
    try {
      if (squadId) {
        await squadService.leaveSquad(request.user.id, squadId);
      } else {
        // Legacy: leave first squad
        const squad = await squadService.getMySquad(request.user.id);
        if (!squad) {
          return reply.status(404).send({
            success: false, error: { code: 'NO_SQUAD', message: 'Vous n\'êtes dans aucune escouade' },
          });
        }
        await squadService.leaveSquad(request.user.id, squad.id);
      }
      return reply.send({ success: true, data: { message: 'Vous avez quitté l\'escouade' } });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /squads/available — Find squads to join
  fastify.get('/available', async (request, reply) => {
    const { industry, jobFamily, experienceLevel } = request.query as { industry?: string; jobFamily?: string; experienceLevel?: string };
    try {
      const squads = await squadService.findAvailableSquads(request.user.id, { industry, jobFamily, experienceLevel });
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
        include: { user: { select: { id: true, email: true, lastActiveAt: true, candidateProfile: { select: { firstName: true, lastName: true, title: true, avatarUrl: true } } } } },
        orderBy: { joinedAt: 'asc' },
      });
      return reply.send({ success: true, data: members });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // ─── Events ──────────────────────────────────────────────────────

  // POST /squads/:id/events — Create an event
  fastify.post('/:id/events', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { title?: string; type?: string; scheduledAt?: string; duration?: number; link?: string };
    if (!body.title || !body.scheduledAt) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'title et scheduledAt requis' } });
    }
    try {
      const event = await squadService.createEvent(request.user.id, id, {
        title: body.title,
        type: body.type || 'MEETING',
        scheduledAt: body.scheduledAt,
        duration: body.duration,
        link: body.link,
      });
      return reply.status(201).send({ success: true, data: event });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /squads/:id/events — List upcoming events
  fastify.get('/:id/events', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const events = await squadService.getEvents(request.user.id, id);
      return reply.send({ success: true, data: events });
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
