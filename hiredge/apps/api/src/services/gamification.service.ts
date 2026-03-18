import prisma from '../db/prisma';
import { notificationService } from './notification.service';

/**
 * Gamification Service — Badges & Streaks
 * Uses Badge, UserBadge, Streak models from Prisma schema.
 */

// ─── Default badges to seed ───
export const DEFAULT_BADGES = [
  // Application milestones
  { code: 'first_app', name: 'Premier Pas', description: 'Envoyer sa première candidature', icon: '🚀', category: 'APPLICATION', threshold: 1 },
  { code: 'app_10', name: 'Lancé', description: 'Envoyer 10 candidatures', icon: '📨', category: 'APPLICATION', threshold: 10 },
  { code: 'app_50', name: 'Acharné', description: 'Envoyer 50 candidatures', icon: '💪', category: 'APPLICATION', threshold: 50 },
  { code: 'app_100', name: 'Machine de Guerre', description: 'Envoyer 100 candidatures', icon: '🔥', category: 'APPLICATION', threshold: 100 },

  // Interview milestones
  { code: 'first_interview', name: 'En Finale', description: 'Obtenir son premier entretien', icon: '🎯', category: 'INTERVIEW', threshold: 1 },
  { code: 'interview_5', name: 'Habitué', description: 'Passer 5 entretiens', icon: '🎤', category: 'INTERVIEW', threshold: 5 },

  // Simulation milestones
  { code: 'first_sim', name: 'Entraîné', description: 'Compléter sa première simulation', icon: '🎭', category: 'SIMULATION', threshold: 1 },
  { code: 'sim_10', name: 'Préparé', description: 'Compléter 10 simulations', icon: '🏋️', category: 'SIMULATION', threshold: 10 },

  // Streak milestones
  { code: 'streak_3', name: 'Régulier', description: '3 jours d\'activité consécutifs', icon: '⚡', category: 'STREAK', threshold: 3 },
  { code: 'streak_7', name: 'Déterminé', description: '7 jours d\'activité consécutifs', icon: '🔥', category: 'STREAK', threshold: 7 },
  { code: 'streak_30', name: 'Infatigable', description: '30 jours d\'activité consécutifs', icon: '👑', category: 'STREAK', threshold: 30 },

  // Squad milestones
  { code: 'joined_squad', name: 'Coéquipier', description: 'Rejoindre une escouade', icon: '🤝', category: 'SQUAD', threshold: 1 },

  // Success
  { code: 'first_offer', name: 'Jackpot', description: 'Recevoir sa première offre', icon: '🎉', category: 'SUCCESS', threshold: 1 },

  // Scout
  { code: 'bronze_scout', name: 'Scout Bronze', description: 'Atteindre 100 crédits éclaireur', icon: '🥉', category: 'SCOUT', threshold: 100 },
  { code: 'silver_scout', name: 'Scout Argent', description: 'Atteindre 300 crédits éclaireur', icon: '🥈', category: 'SCOUT', threshold: 300 },
  { code: 'gold_scout', name: 'Scout Or', description: 'Atteindre 500 crédits éclaireur', icon: '🥇', category: 'SCOUT', threshold: 500 },
];

export class GamificationService {
  /** Seed default badges in DB (idempotent) */
  async seedBadges() {
    for (const badge of DEFAULT_BADGES) {
      await prisma.badge.upsert({
        where: { code: badge.code },
        create: badge,
        update: {},
      });
    }
  }

  /** Update user's daily streak */
  async updateStreak(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const streak = await prisma.streak.findUnique({ where: { userId } });

    if (!streak) {
      await prisma.streak.create({
        data: { userId, currentStreak: 1, longestStreak: 1, lastActiveDate: today },
      });
      return;
    }

    const lastActive = new Date(streak.lastActiveDate);
    lastActive.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return; // Already active today

    let newStreak: number;
    if (diffDays === 1) {
      // Consecutive day
      newStreak = streak.currentStreak + 1;
    } else {
      // Streak broken
      newStreak = 1;
    }

    const longestStreak = Math.max(streak.longestStreak, newStreak);

    await prisma.streak.update({
      where: { userId },
      data: { currentStreak: newStreak, longestStreak, lastActiveDate: today },
    });

    // Check streak badges
    await this.checkStreakBadges(userId, newStreak);
  }

  /** Check and award badges based on a specific event */
  async checkApplicationBadges(userId: string) {
    const count = await prisma.application.count({ where: { userId } });
    const thresholds = [
      { count: 1, code: 'first_app' },
      { count: 10, code: 'app_10' },
      { count: 50, code: 'app_50' },
      { count: 100, code: 'app_100' },
    ];
    for (const t of thresholds) {
      if (count >= t.count) await this.awardBadge(userId, t.code);
    }
  }

  async checkInterviewBadges(userId: string) {
    const count = await prisma.application.count({
      where: { userId, status: 'INTERVIEW_SCHEDULED' },
    });
    if (count >= 1) await this.awardBadge(userId, 'first_interview');
    if (count >= 5) await this.awardBadge(userId, 'interview_5');
  }

  async checkOfferBadge(userId: string) {
    const count = await prisma.application.count({
      where: { userId, status: 'OFFERED' },
    });
    if (count >= 1) await this.awardBadge(userId, 'first_offer');
  }

  async checkSimulationBadges(userId: string) {
    const count = await prisma.interviewSimulation.count({ where: { userId } });
    if (count >= 1) await this.awardBadge(userId, 'first_sim');
    if (count >= 10) await this.awardBadge(userId, 'sim_10');
  }

  async checkSquadBadge(userId: string) {
    await this.awardBadge(userId, 'joined_squad');
  }

  async checkScoutBadges(userId: string) {
    const scout = await prisma.scout.findFirst({ where: { userId } });
    if (!scout) return;
    if (scout.creditBalance >= 100) await this.awardBadge(userId, 'bronze_scout');
    if (scout.creditBalance >= 300) await this.awardBadge(userId, 'silver_scout');
    if (scout.creditBalance >= 500) await this.awardBadge(userId, 'gold_scout');
  }

  /** Get all badges for a user (earned + unearned) */
  async getUserBadges(userId: string) {
    const allBadges = await prisma.badge.findMany({ orderBy: { category: 'asc' } });
    const earnedBadges = await prisma.userBadge.findMany({
      where: { userId },
      select: { badgeId: true, earnedAt: true },
    });
    const earnedMap = new Map(earnedBadges.map((b) => [b.badgeId, b.earnedAt]));

    return allBadges.map((badge) => ({
      ...badge,
      earned: earnedMap.has(badge.id),
      earnedAt: earnedMap.get(badge.id) ?? null,
    }));
  }

  /** Get user streak info */
  async getUserStreak(userId: string) {
    const streak = await prisma.streak.findUnique({ where: { userId } });
    return streak ?? { currentStreak: 0, longestStreak: 0, lastActiveDate: null };
  }

  // ─── Private ───

  private async checkStreakBadges(userId: string, currentStreak: number) {
    if (currentStreak >= 3) await this.awardBadge(userId, 'streak_3');
    if (currentStreak >= 7) await this.awardBadge(userId, 'streak_7');
    if (currentStreak >= 30) await this.awardBadge(userId, 'streak_30');
  }

  /** Award a badge (idempotent — won't duplicate) */
  private async awardBadge(userId: string, badgeCode: string) {
    const badge = await prisma.badge.findUnique({ where: { code: badgeCode } });
    if (!badge) return;

    const existing = await prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
    });
    if (existing) return; // Already awarded

    await prisma.userBadge.create({
      data: { userId, badgeId: badge.id },
    });

    // Notify user of new badge
    await notificationService.createNotification(userId, {
      type: 'SQUAD_ACTIVITY',
      title: `Nouveau badge : ${badge.icon} ${badge.name}`,
      body: badge.description,
      metadata: { badgeCode },
    }).catch(() => {});
  }
}

export const gamificationService = new GamificationService();
