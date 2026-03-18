import { Worker, Queue, ConnectionOptions } from 'bullmq';
import redis from '../lib/redis';
import prisma from '../db/prisma';
import { notificationService } from '../services/notification.service';
import { contentQueue } from './index';

const connection = redis as unknown as ConnectionOptions;

export const followUpQueue = new Queue('follow-up', { connection });

// ─── Follow-Up Worker ───
const followUpWorker = new Worker(
  'follow-up',
  async (job) => {
    const { type } = job.data;

    switch (type) {
      case 'check_follow_ups':
        await processFollowUpReminders();
        break;
      case 'check_pre_interview':
        await processPreInterviewBriefs();
        break;
      case 'send_follow_up':
        await sendFollowUp(job.data.reminderId);
        break;
    }
  },
  { connection, concurrency: 3 },
);

/**
 * Check pending follow-up reminders and send due ones.
 */
async function processFollowUpReminders() {
  const dueReminders = await prisma.followUpReminder.findMany({
    where: {
      status: 'PENDING',
      scheduledFor: { lte: new Date() },
    },
    include: {
      user: {
        include: {
          candidateProfile: { select: { firstName: true } },
        },
      },
    },
    take: 50,
  });

  for (const reminder of dueReminders) {
    if (reminder.type === 'FOLLOW_UP' && reminder.applicationId) {
      const app = await prisma.application.findUnique({
        where: { id: reminder.applicationId },
        include: { job: { include: { company: true } } },
      });
      if (!app) continue;

      const daysSince = Math.floor(
        (Date.now() - app.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Create notification
      await notificationService.createNotification(reminder.userId, {
        type: 'FOLLOW_UP',
        title: `Relance pour ${app.job.title}`,
        body: `Ça fait ${daysSince} jours que tu as postulé chez ${app.job.company?.name ?? 'l\'entreprise'}. C'est le bon moment pour une relance !`,
        actionUrl: `/applications`,
        metadata: { applicationId: app.id, jobId: app.jobId },
      });

      // Queue content generation for follow-up email
      await contentQueue.add('follow-up-email', {
        type: 'follow_up_email',
        userId: reminder.userId,
        jobId: app.jobId,
        data: { daysSinceApply: daysSince },
      });
    }

    // Mark as sent
    await prisma.followUpReminder.update({
      where: { id: reminder.id },
      data: { status: 'SENT', sentAt: new Date() },
    });
  }
}

/**
 * Check for interviews scheduled tomorrow and send J-1 briefs.
 */
async function processPreInterviewBriefs() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const startOfTomorrow = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
  const endOfTomorrow = new Date(startOfTomorrow.getTime() + 24 * 60 * 60 * 1000);

  const apps = await prisma.application.findMany({
    where: {
      interviewDate: {
        gte: startOfTomorrow,
        lt: endOfTomorrow,
      },
      status: { in: ['INTERVIEW_SCHEDULED', 'APPLIED', 'SENT', 'VIEWED'] },
    },
    include: {
      user: {
        include: {
          candidateProfile: { select: { firstName: true } },
        },
      },
      job: { include: { company: true } },
    },
  });

  for (const app of apps) {
    const firstName = app.user.candidateProfile?.firstName || 'Candidat';
    const companyName = app.job.company?.name || 'l\'entreprise';
    const time = app.interviewDate
      ? app.interviewDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      : '';

    // Send J-1 notification
    await notificationService.createNotification(app.userId, {
      type: 'INTERVIEW_REMINDER',
      title: `Entretien demain ! 🎯`,
      body: `${firstName}, ton entretien chez ${companyName} est demain${time ? ` à ${time}` : ''}. Prépare-toi avec une simulation !`,
      actionUrl: `/interviews`,
      metadata: {
        applicationId: app.id,
        jobId: app.jobId,
        companyId: app.job.companyId,
      },
    });

    // Queue company brief generation
    if (app.job.companyId) {
      await contentQueue.add('company-brief', {
        type: 'company_brief',
        userId: app.userId,
        data: { companyId: app.job.companyId },
      });
    }
  }
}

/**
 * Auto-schedule follow-up reminders when applications are sent.
 * Called from application creation.
 */
export async function scheduleFollowUp(userId: string, applicationId: string, daysAfter: number = 7) {
  const scheduledFor = new Date(Date.now() + daysAfter * 24 * 60 * 60 * 1000);

  await prisma.followUpReminder.create({
    data: {
      userId,
      applicationId,
      type: 'FOLLOW_UP',
      scheduledFor,
      message: `Relance automatique - ${daysAfter} jours après candidature`,
    },
  });
}

// ─── Schedule periodic checks ───
export async function scheduleFollowUpJobs() {
  // Check follow-ups every hour
  await followUpQueue.add(
    'check-follow-ups',
    { type: 'check_follow_ups' },
    {
      repeat: { pattern: '0 * * * *' }, // Every hour
      removeOnComplete: { count: 50 },
    },
  );

  // Check pre-interview briefs daily at 18:00 (J-1 evening)
  await followUpQueue.add(
    'check-pre-interview',
    { type: 'check_pre_interview' },
    {
      repeat: { pattern: '0 18 * * *' }, // 6pm daily
      removeOnComplete: { count: 30 },
    },
  );
}

// ─── Error handling ───
followUpWorker.on('failed', (job, err) => {
  console.error(JSON.stringify({ level: 'error', worker: 'follow-up', jobId: job?.id, error: err.message }));
});

export { followUpWorker };
