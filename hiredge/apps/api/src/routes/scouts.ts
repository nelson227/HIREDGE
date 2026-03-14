import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { scoutService } from '../services/scout.service';
import { AppError } from '../services/auth.service';
import prisma from '../db/prisma';

const scoutRegisterSchema = z.object({
  companyId: z.string().uuid('companyId invalide'),
  department: z.string().max(200).optional(),
  position: z.string().max(200).optional(),
  yearsAtCompany: z.number().int().min(0).max(50).optional(),
  isAnonymous: z.boolean().optional(),
});

const scoutRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  // GET /scouts — List scouts (optionally by company)
  fastify.get('/', async (request, reply) => {
    const { company } = request.query as { company?: string };
    try {
      if (company) {
        const scouts = await scoutService.findScoutsForCompany(company);
        return reply.send({ success: true, data: scouts });
      }
      // List all active scouts with company info
      const scouts = await prisma.scout.findMany({
        where: { status: 'ACTIVE' },
        include: { company: { select: { id: true, name: true, industry: true, logo: true } } },
        take: 50,
        orderBy: { trustScore: 'desc' },
      });
      return reply.send({ success: true, data: scouts });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /scouts/:id — Get a scout by ID
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const scout = await prisma.scout.findUnique({
        where: { id },
        include: { company: { select: { id: true, name: true, industry: true, logo: true } } },
      });
      if (!scout) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Éclaireur introuvable' } });
      }
      return reply.send({ success: true, data: scout });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // POST /scouts/register — Register as scout
  fastify.post('/register', async (request, reply) => {
    const parsed = scoutRegisterSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error?.issues[0]?.message ?? 'Erreur de validation' },
      });
    }

    try {
      const scout = await scoutService.registerAsScout(request.user.id, parsed.data);
      return reply.status(201).send({ success: true, data: scout });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /scouts/profile — Get my scout profile(s)
  fastify.get('/profile', async (request, reply) => {
    try {
      const scouts = await scoutService.getScoutProfile(request.user.id);
      return reply.send({ success: true, data: scouts });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /scouts/company/:companyId — Find scouts for a company
  fastify.get('/company/:companyId', async (request, reply) => {
    const { companyId } = request.params as { companyId: string };
    try {
      const scouts = await scoutService.findScoutsForCompany(companyId);
      return reply.send({ success: true, data: scouts });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // POST /scouts/:scoutId/conversations — Start a conversation
  fastify.post('/:scoutId/conversations', async (request, reply) => {
    const { scoutId } = request.params as { scoutId: string };
    const { question } = request.body as { question: string };
    if (!question || question.trim().length < 10) {
      return reply.status(400).send({
        success: false, error: { code: 'VALIDATION_ERROR', message: 'Question requise (min 10 caractères)' },
      });
    }

    try {
      const conversation = await scoutService.startConversation(request.user.id, scoutId, question);
      return reply.status(201).send({ success: true, data: conversation });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // POST /scouts/:scoutId/questions — Alias for starting a conversation (frontend compat)
  fastify.post('/:scoutId/questions', async (request, reply) => {
    const { scoutId } = request.params as { scoutId: string };
    const { question } = request.body as { question: string };
    if (!question || question.trim().length < 10) {
      return reply.status(400).send({
        success: false, error: { code: 'VALIDATION_ERROR', message: 'Question requise (min 10 caractères)' },
      });
    }

    try {
      const conversation = await scoutService.startConversation(request.user.id, scoutId, question);
      return reply.status(201).send({ success: true, data: conversation });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /scouts/:scoutId/answers — Get conversations with a specific scout (frontend compat)
  fastify.get('/:scoutId/answers', async (request, reply) => {
    const { scoutId } = request.params as { scoutId: string };
    try {
      const conversations = await scoutService.getConversations(request.user.id);
      // Filter to conversations involving this scout
      const filtered = conversations.filter((c: any) => c.scoutId === scoutId);
      return reply.send({ success: true, data: filtered });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /scouts/conversations — Get all my conversations
  fastify.get('/conversations', async (request, reply) => {
    try {
      const conversations = await scoutService.getConversations(request.user.id);
      return reply.send({ success: true, data: conversations });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /scouts/conversations/:id/messages — Get conversation messages
  fastify.get('/conversations/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const messages = await scoutService.getConversationMessages(request.user.id, id);
      return reply.send({ success: true, data: messages });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // POST /scouts/conversations/:id/messages — Send a message
  fastify.post('/conversations/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { content } = request.body as { content: string };
    if (!content || content.trim().length === 0) {
      return reply.status(400).send({
        success: false, error: { code: 'VALIDATION_ERROR', message: 'Contenu requis' },
      });
    }

    try {
      const message = await scoutService.sendMessage(request.user.id, id, content);
      return reply.status(201).send({ success: true, data: message });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });
};

export default scoutRoutes;
