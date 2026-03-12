import { FastifyPluginAsync } from 'fastify';
import { edgeChatSchema } from '@hiredge/shared';
import { edgeService } from '../services/edge.service';
import { AppError } from '../services/auth.service';

const edgeRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  // POST /edge/chat — Send a message to EDGE
  fastify.post('/chat', async (request, reply) => {
    const parsed = edgeChatSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error?.issues[0]?.message ?? 'Erreur de validation' },
      });
    }

    try {
      const response = await edgeService.chat(request.user.id, parsed.data.message);
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

  // GET /edge/history — Get chat history
  fastify.get('/history', async (request, reply) => {
    const { cursor, limit } = request.query as { cursor?: string; limit?: string };

    const messages = await fastify.prisma.edgeChatMessage.findMany({
      where: {
        userId: request.user.id,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit) : 50,
    });

    return reply.send({ success: true, data: messages.reverse() });
  });

  // DELETE /edge/history — Clear chat history
  fastify.delete('/history', async (request, reply) => {
    await fastify.prisma.edgeChatMessage.deleteMany({
      where: { userId: request.user.id },
    });

    return reply.send({ success: true, data: { message: 'Historique effacé' } });
  });
};

export default edgeRoutes;
