import { FastifyPluginAsync } from 'fastify';
import { dailyService } from '../services/daily.service';
import { AppError } from '../services/auth.service';

const videoRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  // POST /video/room — Create a video room
  fastify.post('/room', async (request, reply) => {
    const { name, expiryMinutes } = request.body as { name?: string; expiryMinutes?: number };
    try {
      const room = await dailyService.createRoom({ name, expiryMinutes });
      return reply.status(201).send({ success: true, data: room });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // POST /video/token — Create a meeting token for a room
  fastify.post('/token', async (request, reply) => {
    const { roomName, userId } = request.body as { roomName: string; userId?: string };
    if (!roomName) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Nom du room requis' },
      });
    }
    try {
      const token = await dailyService.createToken(roomName, { userName: userId || request.user.id });
      return reply.send({ success: true, data: { token } });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // DELETE /video/room/:name — Delete a room
  fastify.delete('/room/:name', async (request, reply) => {
    const { name } = request.params as { name: string };
    try {
      await dailyService.deleteRoom(name);
      return reply.send({ success: true, message: 'Room supprimé' });
    } catch (err) {
      throw err;
    }
  });
};

export default videoRoutes;
