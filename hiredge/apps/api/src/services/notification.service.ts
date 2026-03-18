import prisma from '../db/prisma';
import redis from '../lib/redis';
import { AppError } from './auth.service';
import { emitToUser } from '../lib/websocket';

const MAX_PUSH_PER_DAY = 5;
const MAX_PUSH_PER_WEEK = 20;
const QUIET_HOURS_START = 22; // 10pm
const QUIET_HOURS_END = 8;   // 8am

const PRIORITY_MAP: Record<string, number> = {
  INTERVIEW_REMINDER: 0,     // CRITICAL — always sent
  OFFER_RECEIVED: 0,
  APPLICATION_UPDATE: 1,     // HIGH
  JOB_MATCH: 2,              // MEDIUM
  SQUAD_MESSAGE: 3,          // LOW
  SCOUT_REPLY: 2,
  FOLLOW_UP: 4,              // LOWEST
  WEEKLY_DIGEST: 4,
  MOTIVATIONAL: 5,
};

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
      data: { read: true, readAt: new Date() },
    });

    emitToUser(userId, 'notification:read', { id: notificationId });
  }

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });

    emitToUser(userId, 'notification:all_read', {});
  }

  async createNotification(userId: string, data: {
    type: string;
    title: string;
    body: string;
    actionUrl?: string;
    metadata?: any;
  }) {
    // Anti-spam: check daily limit (except CRITICAL)
    const priority = PRIORITY_MAP[data.type] ?? 3;
    if (priority > 0) {
      const shouldSend = await this.checkLimits(userId, data.type);
      if (!shouldSend) return null; // Silently drop low-priority notifications over limit
    }

    // Quiet hours: defer non-critical notifications
    if (priority > 0 && this.isQuietHours()) {
      // Store for later delivery (next morning)
      const notification = await prisma.notification.create({
        data: {
          userId,
          type: data.type,
          title: data.title,
          body: data.body,
          actionUrl: data.actionUrl,
          metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
          read: false,
        },
      });
      // Don't emit WebSocket during quiet hours (will be seen on next app open)
      return notification;
    }

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

    // Real-time notification via WebSocket
    emitToUser(userId, 'notification:new', notification);

    // Track daily count
    await this.incrementDailyCount(userId);

    return notification;
  }

  async deleteNotification(userId: string, notificationId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notification) throw new AppError('NOTIFICATION_NOT_FOUND', 'Notification introuvable', 404);

    await prisma.notification.delete({ where: { id: notificationId } });
  }

  // ─── Anti-spam helpers ───

  private isQuietHours(): boolean {
    const hour = new Date().getHours();
    return hour >= QUIET_HOURS_START || hour < QUIET_HOURS_END;
  }

  private async checkLimits(userId: string, type: string): Promise<boolean> {
    const dailyKey = `notif:daily:${userId}:${new Date().toISOString().slice(0, 10)}`;
    const weeklyKey = `notif:weekly:${userId}:${this.getWeekKey()}`;

    const [dailyCount, weeklyCount] = await Promise.all([
      redis.get(dailyKey).then(v => parseInt(v || '0')),
      redis.get(weeklyKey).then(v => parseInt(v || '0')),
    ]);

    if (dailyCount >= MAX_PUSH_PER_DAY) return false;
    if (weeklyCount >= MAX_PUSH_PER_WEEK) return false;

    return true;
  }

  private async incrementDailyCount(userId: string) {
    const dailyKey = `notif:daily:${userId}:${new Date().toISOString().slice(0, 10)}`;
    const weeklyKey = `notif:weekly:${userId}:${this.getWeekKey()}`;

    await Promise.all([
      redis.incr(dailyKey).then(() => redis.expire(dailyKey, 86400)),
      redis.incr(weeklyKey).then(() => redis.expire(weeklyKey, 604800)),
    ]);
  }

  private getWeekKey(): string {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${weekNum}`;
  }
}

export const notificationService = new NotificationService();
