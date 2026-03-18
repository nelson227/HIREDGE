import { Worker, Queue, ConnectionOptions } from 'bullmq';
import redis from '../lib/redis';
import prisma from '../db/prisma';
import { emitToSquad } from '../lib/websocket';
import { env } from '../config/env';
import OpenAI from 'openai';

const connection = redis as unknown as ConnectionOptions;

const isLLMEnabled =
  env.OPENAI_API_KEY.length > 20 &&
  !env.OPENAI_API_KEY.startsWith('sk-...');

const openai = isLLMEnabled
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY, baseURL: 'https://api.groq.com/openai/v1' })
  : null;

export const squadBotQueue = new Queue('squad-bot', { connection });

// ─── Daily boost messages ───
const DAILY_BOOSTS = [
  "Bonjour l'équipe ! 🌅 Nouveau jour, nouvelles opportunités. Qui postule aujourd'hui ?",
  "Salut tout le monde ! 💪 Chaque candidature envoyée vous rapproche du but. On se motive !",
  "Bonjour l'escouade ! 🎯 Partagez vos objectifs du jour. Ensemble on est plus forts.",
  "Hey l'équipe ! ☕ C'est le moment de vérifier vos candidatures en cours et d'envoyer des nouvelles.",
  "Bonne journée les guerriers ! 🔥 N'oubliez pas : la persévérance paie toujours.",
];

// ─── Weekly challenges ───
const WEEKLY_CHALLENGES = [
  "🏆 Défi de la semaine : Envoyer 5 candidatures personnalisées. Qui relève le challenge ?",
  "🏆 Défi de la semaine : Faire 2 simulations d'entretien. La préparation fait la différence !",
  "🏆 Défi de la semaine : Enrichir votre profil avec un nouveau projet ou compétence.",
  "🏆 Défi de la semaine : Contacter un éclaireur pour en apprendre plus sur une entreprise cible.",
  "🏆 Défi de la semaine : Mettre à jour votre CV et votre lettre de motivation.",
];

const BOT_USER_ID = 'system-bot';

// ─── Squad Bot Worker ───
const squadBotWorker = new Worker(
  'squad-bot',
  async (job) => {
    const { type, squadId, memberId, data } = job.data;

    switch (type) {
      case 'daily_boost':
        await sendDailyBoost(squadId);
        break;
      case 'weekly_challenge':
        await sendWeeklyChallenge(squadId);
        break;
      case 'celebrate_application':
        await celebrateAction(squadId, memberId, 'a envoyé une candidature ! 🎉');
        break;
      case 'celebrate_interview':
        await celebrateAction(squadId, memberId, 'a décroché un entretien ! 🎯🔥');
        break;
      case 'celebrate_hired':
        await celebrateAction(squadId, memberId, 'a été embauché(e) ! 🎉🎊🥳 Félicitations !');
        break;
      case 'support_rejection':
        await supportMember(squadId, memberId);
        break;
      case 'nudge_inactive':
        await nudgeInactiveMember(squadId, memberId);
        break;
      case 'friday_retro':
        await sendFridayRetro(squadId);
        break;
      case 'welcome_member':
        await welcomeMember(squadId, memberId, data?.firstName);
        break;
    }
  },
  { connection, concurrency: 3 },
);

async function sendBotMessage(squadId: string, content: string) {
  // Create a system message in the squad chat
  const message = await prisma.squadMessage.create({
    data: {
      squadId,
      userId: BOT_USER_ID,
      content,
      type: 'SYSTEM',
    },
  });
  emitToSquad(squadId, 'squad:message', message);
  return message;
}

async function sendDailyBoost(squadId: string) {
  const msg = DAILY_BOOSTS[Math.floor(Math.random() * DAILY_BOOSTS.length)]!;
  await sendBotMessage(squadId, msg);
}

async function sendWeeklyChallenge(squadId: string) {
  const msg = WEEKLY_CHALLENGES[Math.floor(Math.random() * WEEKLY_CHALLENGES.length)]!;
  await sendBotMessage(squadId, msg);
}

async function celebrateAction(squadId: string, memberId: string, action: string) {
  const member = await prisma.user.findUnique({
    where: { id: memberId },
    include: { candidateProfile: { select: { firstName: true } } },
  });
  const name = member?.candidateProfile?.firstName || 'Un membre';
  await sendBotMessage(squadId, `${name} ${action}`);
}

async function supportMember(squadId: string, memberId: string) {
  const member = await prisma.user.findUnique({
    where: { id: memberId },
    include: { candidateProfile: { select: { firstName: true } } },
  });
  const name = member?.candidateProfile?.firstName || 'Un membre';

  let message: string;
  if (openai) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.8,
        max_tokens: 150,
        messages: [
          {
            role: 'system',
            content: `Tu es le bot animateur d'une escouade de recherche d'emploi. 
Un membre (${name}) vient de recevoir un refus. 
Génère un message de soutien empathique, bienveillant et motivant en 2-3 phrases.
Ne sois pas condescendant. Utilise un émoji ou deux max.`,
          },
          { role: 'user', content: 'Génère le message de soutien.' },
        ],
      });
      message = completion.choices[0]?.message?.content ?? '';
    } catch {
      message = '';
    }
  } else {
    message = '';
  }

  if (!message) {
    const messages = [
      `${name}, un refus n'est pas un échec, c'est un pas de plus vers la bonne opportunité. 💙 On continue ensemble !`,
      `Courage ${name} ! Chaque "non" te rapproche du bon "oui". L'escouade est là pour toi. 🤝`,
      `On pense à toi ${name}. La recherche d'emploi est un marathon et tu es sur la bonne voie. 💪`,
    ];
    message = messages[Math.floor(Math.random() * messages.length)]!;
  }

  await sendBotMessage(squadId, message);
}

async function nudgeInactiveMember(squadId: string, memberId: string) {
  const member = await prisma.user.findUnique({
    where: { id: memberId },
    include: { candidateProfile: { select: { firstName: true } } },
  });
  const name = member?.candidateProfile?.firstName || 'Hey';
  await sendBotMessage(
    squadId,
    `${name}, ça fait quelque temps qu'on ne t'a pas vu(e). Comment ça va ? On est là si tu as besoin. 🙂`,
  );
}

async function sendFridayRetro(squadId: string) {
  // Get this week's squad activity
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const members = await prisma.squadMember.findMany({
    where: { squadId, isActive: true },
    include: {
      user: {
        include: {
          applications: {
            where: { createdAt: { gte: weekAgo } },
            select: { id: true },
          },
          candidateProfile: { select: { firstName: true } },
        },
      },
    },
  });

  const totalApps = members.reduce((sum, m) => sum + m.user.applications.length, 0);
  const topMember = members.sort((a, b) => b.user.applications.length - a.user.applications.length)[0];
  const topName = topMember?.user?.candidateProfile?.firstName || 'Un membre';

  let message = `📊 **Rétrospective de la semaine** :\n`;
  message += `• ${totalApps} candidature(s) envoyée(s) par l'escouade\n`;
  message += `• ${members.length} membres actifs\n`;
  if (totalApps > 0) {
    message += `• 🌟 MVP de la semaine : ${topName} !\n`;
  }
  message += `\nBravo à tous. On continue la semaine prochaine ! 🚀`;

  await sendBotMessage(squadId, message);
}

async function welcomeMember(squadId: string, memberId: string, firstName?: string) {
  const name = firstName || 'un nouveau membre';
  await sendBotMessage(
    squadId,
    `Bienvenue à ${name} dans l'escouade ! 🎉 N'hésitez pas à vous présenter et partager vos objectifs. Ensemble on est plus forts ! 🤝`,
  );
}

// ─── Scheduled task: check for inactive members ───
export async function checkInactiveMembers() {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  const inactiveMembers = await prisma.squadMember.findMany({
    where: {
      isActive: true,
      squad: { status: 'ACTIVE' },
      user: {
        lastActiveAt: { lt: threeDaysAgo },
      },
    },
    select: { squadId: true, userId: true },
  });

  for (const member of inactiveMembers) {
    await squadBotQueue.add('nudge', {
      type: 'nudge_inactive',
      squadId: member.squadId,
      memberId: member.userId,
    });
  }
}

// ─── Schedule daily/weekly squad bot jobs ───
export async function scheduleSquadBotJobs() {
  const activeSquads = await prisma.squad.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true },
  });

  for (const squad of activeSquads) {
    // Daily boost: Mon-Fri at 8:00 (every 24h starting next 8am)
    await squadBotQueue.add(
      `daily-boost-${squad.id}`,
      { type: 'daily_boost', squadId: squad.id },
      {
        repeat: { pattern: '0 8 * * 1-5' }, // Cron: 8am Mon-Fri
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 20 },
      },
    );

    // Weekly challenge: Monday 9:00
    await squadBotQueue.add(
      `weekly-challenge-${squad.id}`,
      { type: 'weekly_challenge', squadId: squad.id },
      {
        repeat: { pattern: '0 9 * * 1' }, // Cron: 9am Monday
        removeOnComplete: { count: 10 },
      },
    );

    // Friday retro: Friday 17:00
    await squadBotQueue.add(
      `friday-retro-${squad.id}`,
      { type: 'friday_retro', squadId: squad.id },
      {
        repeat: { pattern: '0 17 * * 5' }, // Cron: 5pm Friday
        removeOnComplete: { count: 10 },
      },
    );
  }

  // Inactive check: daily at 10:00
  await squadBotQueue.add(
    'check-inactive',
    { type: 'check_inactive' },
    {
      repeat: { pattern: '0 10 * * *' },
      removeOnComplete: { count: 30 },
    },
  );
}

// ─── Error handling ───
squadBotWorker.on('failed', (job, err) => {
  console.error(JSON.stringify({ level: 'error', worker: 'squad-bot', jobId: job?.id, error: err.message }));
});

export { squadBotWorker };
