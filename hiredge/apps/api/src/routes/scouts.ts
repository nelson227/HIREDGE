import { FastifyPluginAsync } from 'fastify';
import { scoutService } from '../services/scout.service';
import { AppError } from '../services/auth.service';

const scoutRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  // POST /scouts/register — Register as scout
  fastify.post('/register', async (request, reply) => {
    const body = request.body as {
      companyId: string; department?: string; position?: string;
      yearsAtCompany?: number; isAnonymous?: boolean;
    };
    if (!body.companyId) {
      return reply.status(400).send({
        success: false, error: { code: 'VALIDATION_ERROR', message: 'companyId requis' },
      });
    }

    try {
      const scout = await scoutService.registerAsScout(request.user.userId, body);
      return reply.status(201).send({ success: true, data: scout });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /scouts/profile — Get my scout profile(s)
  fastify.get('/profile', async (request, reply) => {
    try {
      const scouts = await scoutService.getScoutProfile(request.user.userId);
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
      const conversation = await scoutService.startConversation(request.user.userId, scoutId, question);
      return reply.status(201).send({ success: true, data: conversation });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /scouts/conversations — Get all my conversations
  fastify.get('/conversations', async (request, reply) => {
    try {
      const conversations = await scoutService.getConversations(request.user.userId);
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
      const messages = await scoutService.getConversationMessages(request.user.userId, id);
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
      const message = await scoutService.sendMessage(request.user.userId, id, content);
      return reply.status(201).send({ success: true, data: message });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });
};

export default scoutRoutes;
