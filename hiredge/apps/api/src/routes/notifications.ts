import { FastifyPluginAsync } from 'fastify';
import { notificationService } from '../services/notification.service';
import { AppError } from '../services/auth.service';

const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  // GET /notifications
  fastify.get('/', async (request, reply) => {
    const { unreadOnly, limit } = request.query as { unreadOnly?: string; limit?: string };
    try {
      const parsedLimit = limit ? parseInt(limit, 10) : undefined;
      const safeLimit = parsedLimit && !isNaN(parsedLimit) ? Math.min(parsedLimit, 100) : undefined;
      const notifications = await notificationService.getUserNotifications(
        request.user.id,
        unreadOnly === 'true',
        safeLimit,
      );
      return reply.send({ success: true, data: notifications });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /notifications/count
  fastify.get('/count', async (request, reply) => {
    const count = await notificationService.getUnreadCount(request.user.id);
    return reply.send({ success: true, data: { unread: count } });
  });

  // PATCH /notifications/:id/read
  fastify.patch('/:id/read', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await notificationService.markAsRead(request.user.id, id);
      return reply.send({ success: true, data: { message: 'Notification lue' } });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // PATCH /notifications/read-all
  fastify.patch('/read-all', async (request, reply) => {
    await notificationService.markAllAsRead(request.user.id);
    return reply.send({ success: true, data: { message: 'Toutes les notifications lues' } });
  });

  // DELETE /notifications/:id
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await notificationService.deleteNotification(request.user.id, id);
      return reply.send({ success: true, data: { message: 'Notification supprimée' } });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });
};

export default notificationRoutes;
