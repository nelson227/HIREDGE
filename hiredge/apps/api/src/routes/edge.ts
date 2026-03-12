import { FastifyPluginAsync } from 'fastify';
import { edgeChatSchema } from '@hiredge/shared';
import { edgeService } from '../services/edge.service';
import { AppError } from '../services/auth.service';

const edgeRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  // ─── Conversations CRUD ───────────────────────────────────

  // GET /edge/conversations — List user conversations
  fastify.get('/conversations', async (request, reply) => {
    const conversations = await fastify.prisma.edgeConversation.findMany({
      where: { userId: request.user.id },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });
    return reply.send({ success: true, data: conversations });
  });

  // POST /edge/conversations — Create new conversation
  fastify.post('/conversations', async (request, reply) => {
    const conversation = await fastify.prisma.edgeConversation.create({
      data: { userId: request.user.id },
    });
    return reply.send({ success: true, data: conversation });
  });

  // DELETE /edge/conversations/:id — Delete a conversation
  fastify.delete('/conversations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await fastify.prisma.edgeConversation.deleteMany({
      where: { id, userId: request.user.id },
    });
    return reply.send({ success: true, data: { message: 'Conversation supprimée' } });
  });

  // PATCH /edge/conversations/:id — Rename a conversation
  fastify.patch('/conversations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { title } = request.body as { title?: string };
    if (!title || title.length > 200) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Titre invalide (max 200 car.)' } });
    }
    const updated = await fastify.prisma.edgeConversation.updateMany({
      where: { id, userId: request.user.id },
      data: { title },
    });
    if (updated.count === 0) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Conversation introuvable' } });
    }
    return reply.send({ success: true, data: { message: 'Conversation renommée' } });
  });

  // ─── Chat (per-conversation) ──────────────────────────────

  // POST /edge/chat — Send a message to EDGE
  fastify.post('/chat', async (request, reply) => {
    const parsed = edgeChatSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error?.issues[0]?.message ?? 'Erreur de validation' },
      });
    }

    const conversationId = parsed.data.conversationId ?? null;

    try {
      const response = await edgeService.chat(request.user.id, parsed.data.message, parsed.data.imageBase64, conversationId);
      return reply.send({ success: true, data: response });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({
          success: false, error: { code: err.code, message: err.message },
        });
      }
      throw err;
    }
  });

  // GET /edge/history — Get chat history (filtered by conversation)
  fastify.get('/history', async (request, reply) => {
    const { cursor, limit, conversationId } = request.query as { cursor?: string; limit?: string; conversationId?: string };

    const messages = await fastify.prisma.edgeChatMessage.findMany({
      where: {
        userId: request.user.id,
        ...(conversationId ? { conversationId } : {}),
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit) : 50,
    });

    return reply.send({ success: true, data: messages.reverse() });
  });

  // DELETE /edge/history — Clear chat history (for a conversation or all)
  fastify.delete('/history', async (request, reply) => {
    const { conversationId } = request.query as { conversationId?: string };

    await fastify.prisma.edgeChatMessage.deleteMany({
      where: {
        userId: request.user.id,
        ...(conversationId ? { conversationId } : {}),
      },
    });

    return reply.send({ success: true, data: { message: 'Historique effacé' } });
  });
};

export default edgeRoutes;
