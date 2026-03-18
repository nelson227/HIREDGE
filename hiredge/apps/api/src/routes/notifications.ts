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

  // ─── FCM Push Notification Token Management (#15) ─────────

  // POST /notifications/fcm/register — Register FCM token
  fastify.post('/fcm/register', async (request, reply) => {
    const { token, device } = request.body as { token: string; device?: string };
    if (!token) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Token FCM requis' } });
    }
    try {
      const { fcmService } = await import('../services/fcm.service');
      await fcmService.registerToken(request.user.id, token, device);
      return reply.send({ success: true, data: { message: 'Token FCM enregistré' } });
    } catch (err) {
      throw err;
    }
  });

  // DELETE /notifications/fcm/token — Remove FCM token
  fastify.delete('/fcm/token', async (request, reply) => {
    const { token } = request.body as { token: string };
    if (!token) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Token FCM requis' } });
    }
    try {
      const { fcmService } = await import('../services/fcm.service');
      await fcmService.removeToken(token);
      return reply.send({ success: true, data: { message: 'Token FCM supprimé' } });
    } catch (err) {
      throw err;
    }
  });
};

export default notificationRoutes;
