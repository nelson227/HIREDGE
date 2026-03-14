import { Worker, Queue, ConnectionOptions } from 'bullmq';
import redis from '../lib/redis';
import prisma from '../db/prisma';
import { emitToUser } from '../lib/websocket';

const connection = redis as unknown as ConnectionOptions;

// ─── Queues ───
export const matchingQueue = new Queue('matching', { connection });
export const notificationQueue = new Queue('notifications', { connection });
export const contentQueue = new Queue('content-generation', { connection });

// ─── Matching Worker ───
// Recalculates job recommendations for a user
const matchingWorker = new Worker(
  'matching',
  async (job) => {
    const { userId } = job.data;

    const user = await prisma.candidateProfile.findUnique({
      where: { userId },
      include: { skills: true, experiences: true },
    });
    if (!user) return;

    // Get recent active jobs
    const jobs = await prisma.job.findMany({
      where: {
        status: 'ACTIVE',
        postedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      include: { company: true },
      take: 200,
    });

    const userSkills = new Set(user.skills.map((s: { name: string }) => s.name.toLowerCase()));

    const scored = jobs.map((j: any) => {
      const requiredSkills: string[] = typeof j.requiredSkills === 'string' ? JSON.parse(j.requiredSkills || '[]') : (j.requiredSkills ?? []);
      const matchedSkills = requiredSkills.filter((s) => userSkills.has(s.toLowerCase()));
      const skillScore = requiredSkills.length > 0 ? matchedSkills.length / requiredSkills.length : 0;

      // Recency bonus
      const daysSincePosted = (Date.now() - j.postedAt.getTime()) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 1 - daysSincePosted / 30);

      const matchScore = Math.round((skillScore * 0.65 + recencyScore * 0.15 + 0.2) * 100);

      return { jobId: j.id, matchScore };
    });

    // Store top matches in Redis cache (24h TTL)
    const topMatches = scored.sort((a: any, b: any) => b.matchScore - a.matchScore).slice(0, 50);
    await redis.set(
      `user:${userId}:matches`,
      JSON.stringify(topMatches),
      'EX',
      86400
    );

    // If high match found, queue notification
    const highMatches = topMatches.filter((m: any) => m.matchScore >= 80);
    if (highMatches.length > 0) {
      await notificationQueue.add('job-match', {
        userId,
        jobIds: highMatches.slice(0, 3).map((m: any) => m.jobId),
      });
    }
  },
  { connection, concurrency: 5 }
);

// ─── Notification Worker ───
const notificationWorker = new Worker(
  'notifications',
  async (job) => {
    if (job.name === 'job-match') {
      const { userId, jobIds } = job.data;
      const jobs = await prisma.job.findMany({
        where: { id: { in: jobIds } },
        include: { company: true },
        take: 3,
      });

      const title = jobs.length === 1
        ? `Nouvelle offre : ${jobs[0]?.title ?? ''}`
        : `${jobs.length} nouvelles offres correspondent à ton profil`;

      const notification = await prisma.notification.create({
        data: {
          userId,
          type: 'JOB_MATCH',
          title,
          body: jobs.map((j: any) => `${j.title} · ${j.company?.name ?? ''}`).join('\n'),
        },
      });

      emitToUser(userId, 'notification', notification);
    }

    if (job.name === 'application-update') {
      const { userId, applicationId, newStatus } = job.data;
      const app = await prisma.application.findUnique({
        where: { id: applicationId },
        include: { job: { include: { company: true } } },
      });
      if (!app) return;

      const statusLabels: Record<string, string> = {
        VIEWED: 'consultée',
        INTERVIEW_SCHEDULED: 'entretien programmé',
        OFFERED: 'offre reçue 🎉',
        REJECTED: 'refusée',
      };

      const notification = await prisma.notification.create({
        data: {
          userId,
          type: 'APPLICATION_UPDATE',
          title: `Candidature ${statusLabels[newStatus] ?? 'mise à jour'}`,
          body: `${app.job.title} chez ${app.job.company?.name ?? 'l\'entreprise'}`,
        },
      });

      emitToUser(userId, 'notification', notification);
    }

    if (job.name === 'interview-reminder') {
      const { userId, simulationId } = job.data;
      const notification = await prisma.notification.create({
        data: {
          userId,
          type: 'INTERVIEW_REMINDER',
          title: 'N\'oublie pas ta simulation !',
          body: 'Continue ta préparation d\'entretien pour rester au top 💪',
        },
      });

      emitToUser(userId, 'notification', notification);
    }
  },
  { connection, concurrency: 3 }
);

// ─── Error handling ───
matchingWorker.on('failed', (job, err) => {
  console.error(JSON.stringify({ level: 'error', worker: 'matching', jobId: job?.id, error: err.message }));
});

notificationWorker.on('failed', (job, err) => {
  console.error(JSON.stringify({ level: 'error', worker: 'notifications', jobId: job?.id, error: err.message }));
});

export { matchingWorker, notificationWorker };

// ─── Graceful shutdown ───
const shutdown = async () => {
  await Promise.allSettled([
    matchingWorker.close(),
    notificationWorker.close(),
  ]);
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
