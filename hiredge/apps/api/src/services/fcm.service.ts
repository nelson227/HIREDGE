import prisma from '../db/prisma';
import { config } from '../config/env';

const FCM_API_URL = 'https://fcm.googleapis.com/fcm/send';

export class FcmService {
  private serverKey: string;

  constructor() {
    this.serverKey = config.fcm.serverKey;
  }

  private get isConfigured(): boolean {
    return this.serverKey.length > 10;
  }

  /**
   * Register a device token for push notifications.
   */
  async registerToken(userId: string, token: string, device: string = 'web') {
    return prisma.fcmToken.upsert({
      where: { token },
      create: { userId, token, device },
      update: { userId, device },
    });
  }

  /**
   * Remove a device token.
   */
  async removeToken(token: string) {
    return prisma.fcmToken.deleteMany({ where: { token } });
  }

  /**
   * Send push notification to a user (all their devices).
   */
  async sendToUser(userId: string, notification: {
    title: string;
    body: string;
    data?: Record<string, string>;
    icon?: string;
  }): Promise<{ sent: number; failed: number }> {
    const tokens = await prisma.fcmToken.findMany({
      where: { userId },
      select: { token: true },
    });

    if (tokens.length === 0 || !this.isConfigured) {
      return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    for (const { token } of tokens) {
      try {
        const response = await fetch(FCM_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `key=${this.serverKey}`,
          },
          body: JSON.stringify({
            to: token,
            notification: {
              title: notification.title,
              body: notification.body,
              icon: notification.icon || '/icon-192.png',
            },
            data: notification.data || {},
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            sent++;
          } else {
            failed++;
            // Remove invalid token
            if (result.results?.[0]?.error === 'NotRegistered') {
              await this.removeToken(token);
            }
          }
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return { sent, failed };
  }

  /**
   * Send push notification integrated with our notification system.
   * Checks user preferences before sending.
   */
  async sendSmartPush(userId: string, type: string, notification: {
    title: string;
    body: string;
    actionUrl?: string;
  }) {
    // Check user notification preferences
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId },
      select: { notificationPrefs: true },
    });

    const prefs = (profile?.notificationPrefs ?? {}) as Record<string, boolean>;

    // Map notification types to preference keys
    const prefMap: Record<string, string> = {
      'JOB_MATCH': 'new_matches',
      'APPLICATION_UPDATE': 'application_updates',
      'SQUAD_MESSAGE': 'squad_activity',
      'INTERVIEW_REMINDER': 'interview_reminders',
      'WEEKLY_DIGEST': 'weekly_digest',
    };

    const prefKey = prefMap[type];
    if (prefKey && prefs[prefKey] === false) {
      return { sent: 0, failed: 0, reason: 'user_opted_out' };
    }

    // Check daily limit (max 5 push/day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pushCount = await prisma.notification.count({
      where: { userId, createdAt: { gte: today } },
    });

    if (pushCount >= 5 && type !== 'INTERVIEW_REMINDER') {
      return { sent: 0, failed: 0, reason: 'daily_limit_reached' };
    }

    return this.sendToUser(userId, {
      title: notification.title,
      body: notification.body,
      data: { url: notification.actionUrl || '/' },
    });
  }
}

export const fcmService = new FcmService();
