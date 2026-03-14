import prisma from '../db/prisma';
import { AppError } from './auth.service';

export class NotificationService {
  async getUserNotifications(userId: string, unreadOnly: boolean = false, limit: number = 50) {
    const where: any = { userId };
    if (unreadOnly) where.read = false;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return notifications;
  }

  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, read: false },
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notification) throw new AppError('NOTIFICATION_NOT_FOUND', 'Notification introuvable', 404);

    await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async createNotification(userId: string, data: {
    type: string;
    title: string;
    body: string;
    actionUrl?: string;
    metadata?: any;
  }) {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: data.type,
        title: data.title,
        body: data.body,
        actionUrl: data.actionUrl,
        metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
      },
    });

    return notification;
  }

  async deleteNotification(userId: string, notificationId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notification) throw new AppError('NOTIFICATION_NOT_FOUND', 'Notification introuvable', 404);

    await prisma.notification.delete({ where: { id: notificationId } });
  }
}

export const notificationService = new NotificationService();
