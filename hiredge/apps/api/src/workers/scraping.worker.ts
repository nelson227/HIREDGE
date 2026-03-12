import { Queue, Worker, Job, ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../db/prisma';

const redisInstance = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });
const connection = redisInstance as unknown as ConnectionOptions;

// ─── Queues ──────────────────────────────────────────────
export const scrapingQueue = new Queue('scraping', { connection });
export const contentQueue = new Queue('content-generation', { connection });

// ─── Sources de scraping ─────────────────────────────────
const SCRAPING_SOURCES = [
  { name: 'indeed-fr', url: 'https://fr.indeed.com', priority: 1, intervalHours: 4 },
  { name: 'welcometothejungle', url: 'https://www.welcometothejungle.com', priority: 1, intervalHours: 6 },
  { name: 'pole-emploi', url: 'https://candidat.pole-emploi.fr', priority: 1, intervalHours: 6 },
  { name: 'apec', url: 'https://www.apec.fr', priority: 2, intervalHours: 24 },
  { name: 'hellowork', url: 'https://www.hellowork.com', priority: 2, intervalHours: 6 },
  { name: 'linkedin-jobs', url: 'https://www.linkedin.com/jobs', priority: 2, intervalHours: 12 },
];

// ─── Scraping Worker ─────────────────────────────────────
const scrapingWorker = new Worker('scraping', async (job: Job) => {
  const { source, keywords, location } = job.data;

  console.log(`[Scraping] Lancement pour ${source} — keywords: ${keywords}, location: ${location}`);

  try {
    // Step 1: Fetch raw data
    const rawJobs = await fetchJobsFromSource(source, keywords, location);
    console.log(`[Scraping] ${rawJobs.length} offres brutes récupérées de ${source}`);

    // Step 2: Normalize
    const normalized = rawJobs.map(normalizeJob);

    // Step 3: Deduplicate
    const deduped = await deduplicateJobs(normalized);
    console.log(`[Scraping] ${deduped.length} offres après déduplication`);

    // Step 4: Enrich + Scam detection
    const enriched = deduped.map(enrichJob).filter(j => j.scamScore < 0.6);

    // Step 5: Store in DB
    let created = 0;
    for (const job of enriched) {
      const existing = await prisma.job.findFirst({
        where: { externalId: job.externalId, source: job.source },
      });
      if (!existing) {
        await prisma.job.create({ data: job });
        created++;
      }
    }

    console.log(`[Scraping] ${created} nouvelles offres indexées depuis ${source}`);
    return { source, fetched: rawJobs.length, stored: created };

  } catch (error: any) {
    console.error(`[Scraping] Erreur pour ${source}:`, error.message);
    throw error;
  }
}, {
  connection,
  concurrency: 3,
  limiter: { max: 10, duration: 60000 }, // 10 jobs/min
});

// ─── Content Generation Worker ───────────────────────────
const contentWorker = new Worker('content-generation', async (job: Job) => {
  const { type, userId, jobId, data } = job.data;

  console.log(`[Content] Génération ${type} pour user ${userId}`);

  try {
    switch (type) {
      case 'cover_letter': {
        const result = await generateCoverLetter(userId, jobId, data);
        return { type, content: result };
      }
      case 'cv_adaptation': {
        const result = await adaptCV(userId, jobId, data);
        return { type, content: result };
      }
      case 'follow_up_email': {
        const result = await generateFollowUpEmail(userId, jobId, data);
        return { type, content: result };
      }
      case 'company_brief': {
        const result = await generateCompanyBrief(data.companyId);
        return { type, content: result };
      }
      default:
        throw new Error(`Type de contenu inconnu: ${type}`);
    }
  } catch (error: any) {
    console.error(`[Content] Erreur génération ${type}:`, error.message);
    throw error;
  }
}, {
  connection,
  concurrency: 5,
});

// ─── Helpers scraping ────────────────────────────────────

interface RawJob {
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  salary?: string;
  contractType?: string;
  source: string;
  externalId: string;
}

async function fetchJobsFromSource(source: string, keywords: string, location: string): Promise<RawJob[]> {
  // NOTE: En production, chaque source a un scraper spécialisé (Puppeteer / API)
  // Ici placeholder pour la structure. Chaque scraper sera un module séparé.
  const jobs: RawJob[] = [];

  // Simulated scraping structure
  // En vrai: await scrapers[source].scrape({ keywords, location });
  console.log(`[Scraper:${source}] Scraping pour "${keywords}" à "${location}"`);

  return jobs;
}

function normalizeJob(raw: RawJob): any {
  return {
    title: normalizeTitle(raw.title),
    description: raw.description,
    location: normalizeLocation(raw.location),
    source: raw.source,
    externalId: raw.externalId,
    externalUrl: raw.url,
    contractType: normalizeContractType(raw.contractType),
    salaryMin: parseSalaryMin(raw.salary),
    salaryMax: parseSalaryMax(raw.salary),
    remote: detectRemote(raw.title, raw.description, raw.location),
    status: 'ACTIVE',
    postedAt: new Date(),
    scamScore: 0,
  };
}

function normalizeTitle(title: string): string {
  return title
    .replace(/\s*\(H\/F\)\s*/gi, '')
    .replace(/\s*\(F\/H\)\s*/gi, '')
    .replace(/Sr\.\s*/gi, 'Senior ')
    .replace(/Jr\.\s*/gi, 'Junior ')
    .trim();
}

function normalizeLocation(location: string): string {
  return location
    .replace(/\s*\(\d+\)\s*/, '')
    .replace(/Île-de-France/i, 'Paris')
    .trim();
}

function normalizeContractType(ct?: string): string {
  if (!ct) return 'CDI';
  const lower = ct.toLowerCase();
  if (lower.includes('cdi')) return 'CDI';
  if (lower.includes('cdd')) return 'CDD';
  if (lower.includes('freelance') || lower.includes('indépendant')) return 'FREELANCE';
  if (lower.includes('stage')) return 'STAGE';
  if (lower.includes('alternance') || lower.includes('apprentissage')) return 'ALTERNANCE';
  return 'CDI';
}

function parseSalaryMin(salary?: string): number | null {
  if (!salary) return null;
  const matches = salary.match(/(\d[\d\s]*)/g);
  if (!matches?.length) return null;
  return parseInt(matches[0].replace(/\s/g, ''));
}

function parseSalaryMax(salary?: string): number | null {
  if (!salary) return null;
  const matches = salary.match(/(\d[\d\s]*)/g);
  if (!matches || matches.length < 2) return null;
  return parseInt(matches[1]!.replace(/\s/g, ''));
}

function detectRemote(title: string, desc: string, loc: string): boolean {
  const combined = `${title} ${desc} ${loc}`.toLowerCase();
  return /\b(remote|télétravail|full remote|100% remote)\b/.test(combined);
}

async function deduplicateJobs(jobs: any[]): Promise<any[]> {
  const seen = new Map<string, any>();
  for (const job of jobs) {
    const key = `${job.title.toLowerCase().replace(/\s+/g, '')}|${(job.companyName || '').toLowerCase()}|${job.location?.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.set(key, job);
    }
  }
  return Array.from(seen.values());
}

function enrichJob(job: any): any {
  // Détection de scam simplifiée
  let scamScore = 0;
  if (!job.companyName) scamScore += 0.3;
  if (job.description && job.description.length < 100) scamScore += 0.2;
  if (job.salaryMin && job.salaryMin > 200000) scamScore += 0.4;

  // Extraction des skills (simple regex, en prod = NER model)
  const skillPatterns = [
    'javascript', 'typescript', 'python', 'java', 'react', 'node.js',
    'sql', 'docker', 'kubernetes', 'aws', 'azure', 'git', 'agile',
    'figma', 'photoshop', 'excel', 'marketing', 'management',
  ];
  const desc = (job.description || '').toLowerCase();
  const requiredSkills = skillPatterns.filter(s => desc.includes(s));

  return {
    ...job,
    scamScore,
    requiredSkills,
    qualityScore: Math.max(0, 1 - scamScore) * (job.description?.length > 200 ? 1 : 0.7),
  };
}

// ─── Helpers content generation ──────────────────────────

async function generateCoverLetter(userId: string, jobId: string, data: any): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { candidateProfile: { include: { skills: true, experiences: true } } },
  });
  const job = await prisma.job.findUnique({ where: { id: jobId } });

  if (!user || !job) throw new Error('User or job not found');

  // En production: appel OpenAI / Anthropic avec prompt optimisé (cf. PROMPTS.md)
  // Ici, structure du pipeline avec placeholder
  const prompt = buildCoverLetterPrompt(user, job, data);

  // TODO: const response = await openai.chat.completions.create({ ... });
  // return humanize(response.choices[0].message.content);

  return `Lettre de motivation générée pour ${job.title} chez ${data?.companyName ?? 'entreprise'}`;
}

async function adaptCV(userId: string, jobId: string, data: any): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { candidateProfile: { include: { skills: true, experiences: true, educations: true } } },
  });
  const job = await prisma.job.findUnique({ where: { id: jobId } });

  if (!user || !job) throw new Error('User or job not found');

  // TODO: Appel LLM pour adapter le CV aux compétences recherchées
  return `CV adapté pour ${job.title}`;
}

async function generateFollowUpEmail(userId: string, jobId: string, data: any): Promise<string> {
  // TODO: Appel LLM pour générer un email de relance
  return `Email de relance pour candidature ${jobId}`;
}

async function generateCompanyBrief(companyId: string): Promise<string> {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new Error('Company not found');

  // TODO: Appel LLM + données scraping pour brief entreprise
  return `Brief entreprise: ${company.name}`;
}

function buildCoverLetterPrompt(user: any, job: any, data: any): string {
  const profile = user.candidateProfile;
  const skills = profile?.skills?.map((s: any) => s.name).join(', ') ?? '';
  const experiences = profile?.experiences?.map((e: any) => `${e.title} chez ${e.company}`).join(', ') ?? '';

  return `
Tu es un expert en rédaction de lettres de motivation en français.

CANDIDAT:
- Nom: ${user.firstName} ${user.lastName}
- Titre: ${profile?.title ?? 'N/A'}
- Compétences: ${skills}
- Expériences: ${experiences}

OFFRE:
- Poste: ${job.title}
- Entreprise: ${data?.companyName ?? 'N/A'}
- Description: ${job.description?.substring(0, 500) ?? 'N/A'}

Génère une lettre de motivation personnalisée, professionnelle mais naturelle.
Maximum 300 mots. Mentionne 2-3 compétences pertinentes. Ne pas inventer d'expériences.
  `.trim();
}

// ─── Scheduler pour le scraping automatique ──────────────

export async function scheduleScrapingJobs() {
  for (const source of SCRAPING_SOURCES) {
    const keywords = ['développeur', 'marketing', 'data analyst', 'product manager', 'designer'];
    const locations = ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Remote'];

    for (const kw of keywords) {
      for (const loc of locations) {
        await scrapingQueue.add(
          `scrape-${source.name}`,
          { source: source.name, keywords: kw, location: loc },
          {
            repeat: { every: source.intervalHours * 3600000 },
            priority: source.priority,
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 50 },
          }
        );
      }
    }
  }
  console.log('[Scheduler] Jobs de scraping planifiés');
}

// ─── Event handlers ──────────────────────────────────────

scrapingWorker.on('completed', (job) => {
  console.log(`[Scraping] Job ${job.id} terminé avec succès`);
});

scrapingWorker.on('failed', (job, err) => {
  console.error(`[Scraping] Job ${job?.id} échoué:`, err.message);
});

contentWorker.on('completed', (job) => {
  console.log(`[Content] Job ${job.id} terminé avec succès`);
});

contentWorker.on('failed', (job, err) => {
  console.error(`[Content] Job ${job?.id} échoué:`, err.message);
});

export { scrapingWorker, contentWorker };
