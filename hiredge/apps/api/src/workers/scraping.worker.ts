import { Queue, Worker, Job, ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../db/prisma';
import { contentQueue } from './index';
import OpenAI from 'openai';
import { env } from '../config/env';

const redisInstance = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });
const connection = redisInstance as unknown as ConnectionOptions;

const isLLMEnabled =
  env.OPENAI_API_KEY.length > 20 &&
  !env.OPENAI_API_KEY.startsWith('sk-...');

const openai = isLLMEnabled
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY, baseURL: 'https://api.groq.com/openai/v1' })
  : null;

// ─── Queues ──────────────────────────────────────────────
export const scrapingQueue = new Queue('scraping', { connection });

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

  try {
    // Step 1: Fetch raw data
    const rawJobs = await fetchJobsFromSource(source, keywords, location);

    // Step 2: Normalize
    const normalized = rawJobs.map(normalizeJob);

    // Step 3: Deduplicate
    const deduped = await deduplicateJobs(normalized);

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

    return { source, fetched: rawJobs.length, stored: created };

  } catch (error: any) {
    console.error(JSON.stringify({ level: 'error', worker: 'scraping', source, error: error.message }));
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
    console.error(JSON.stringify({ level: 'error', worker: 'content-generation', type, error: error.message }));
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
  switch (source) {
    case 'pole-emploi':
      return fetchFranceTravail(keywords, location);
    case 'indeed-fr':
      return fetchJSearch(keywords, location, 'indeed');
    case 'linkedin-jobs':
      return fetchJSearch(keywords, location, 'linkedin');
    case 'welcometothejungle':
      return fetchAdzuna(keywords, location);
    case 'hellowork':
      return fetchAdzuna(keywords, location);
    case 'apec':
      return fetchFranceTravail(keywords, location);
    default:
      return [];
  }
}

/**
 * France Travail (ex Pôle Emploi) API — offres d'emploi.
 * Uses OAuth client_credentials flow.
 */
async function fetchFranceTravail(keywords: string, location: string): Promise<RawJob[]> {
  const clientId = process.env.FRANCE_TRAVAIL_CLIENT_ID;
  const clientSecret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET;
  if (!clientId || !clientSecret) return [];

  try {
    // Get access token
    const tokenRes = await fetch('https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'api_offresdemploiv2 o2dsoffre',
      }),
    });
    if (!tokenRes.ok) return [];
    const tokenData = await tokenRes.json();

    // Search jobs
    const params = new URLSearchParams({
      motsCles: keywords,
      commune: location === 'Remote' ? '' : location,
      range: '0-49',
    });

    const res = await fetch(`https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search?${params}`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!res.ok) return [];
    const data = await res.json();

    return (data.resultats || []).map((item: any) => ({
      title: item.intitule || '',
      company: item.entreprise?.nom || 'Non précisé',
      location: item.lieuTravail?.libelle || location,
      description: item.description || '',
      url: item.origineOffre?.urlOrigine || `https://candidat.francetravail.fr/offres/recherche/detail/${item.id}`,
      salary: item.salaire?.libelle || '',
      contractType: item.typeContrat || 'CDI',
      source: 'france-travail',
      externalId: `ft-${item.id}`,
    }));
  } catch (e: any) {
    console.error(JSON.stringify({ level: 'error', scraper: 'france-travail', error: e.message }));
    return [];
  }
}

/**
 * JSearch API (RapidAPI) — aggregates Indeed, LinkedIn, Glassdoor.
 */
async function fetchJSearch(keywords: string, location: string, filter?: string): Promise<RawJob[]> {
  const apiKey = process.env.JSEARCH_API_KEY;
  if (!apiKey) return [];

  try {
    const query = `${keywords} in ${location}, France`;
    const params = new URLSearchParams({
      query,
      page: '1',
      num_pages: '1',
      country: 'fr',
      date_posted: 'week',
    });

    const res = await fetch(`https://jsearch.p.rapidapi.com/search?${params}`, {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
      },
    });
    if (!res.ok) return [];
    const data = await res.json();

    return (data.data || []).map((item: any) => ({
      title: item.job_title || '',
      company: item.employer_name || 'Non précisé',
      location: item.job_city ? `${item.job_city}, ${item.job_country}` : location,
      description: item.job_description || '',
      url: item.job_apply_link || item.job_google_link || '',
      salary: item.job_min_salary
        ? `${item.job_min_salary} - ${item.job_max_salary} ${item.job_salary_currency || 'EUR'}`
        : '',
      contractType: item.job_employment_type === 'FULLTIME' ? 'CDI' : item.job_employment_type || 'CDI',
      source: filter || 'jsearch',
      externalId: `js-${item.job_id}`,
    }));
  } catch (e: any) {
    console.error(JSON.stringify({ level: 'error', scraper: 'jsearch', error: e.message }));
    return [];
  }
}

/**
 * Adzuna API — job search aggregator.
 */
async function fetchAdzuna(keywords: string, location: string): Promise<RawJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];

  try {
    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      what: keywords,
      where: location,
      results_per_page: '50',
      content_type: 'application/json',
      max_days_old: '14',
    });

    const res = await fetch(`https://api.adzuna.com/v1/api/jobs/fr/search/1?${params}`);
    if (!res.ok) return [];
    const data = await res.json();

    return (data.results || []).map((item: any) => ({
      title: item.title || '',
      company: item.company?.display_name || 'Non précisé',
      location: item.location?.display_name || location,
      description: item.description || '',
      url: item.redirect_url || '',
      salary: item.salary_min
        ? `${Math.round(item.salary_min)} - ${Math.round(item.salary_max || item.salary_min)} EUR`
        : '',
      contractType: item.contract_type || 'CDI',
      source: 'adzuna',
      externalId: `adz-${item.id}`,
    }));
  } catch (e: any) {
    console.error(JSON.stringify({ level: 'error', scraper: 'adzuna', error: e.message }));
    return [];
  }
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
    requiredSkills: JSON.stringify(skillPatterns.filter(s => desc.includes(s))),
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

  const prompt = buildCoverLetterPrompt(user, job, data);

  if (openai) {
    const completion = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1000,
      messages: [
        { role: 'system', content: 'Tu es un expert en rédaction de lettres de motivation en français. Écris de manière naturelle, pas robotique. Ne commence jamais par "Madame, Monsieur" de façon générique. Adapte chaque lettre au poste spécifique.' },
        { role: 'user', content: prompt },
      ],
    });
    return completion.choices[0]?.message?.content ?? `Lettre de motivation pour ${job.title}`;
  }

  return `Lettre de motivation générée pour ${job.title} chez ${data?.companyName ?? 'entreprise'}`;
}

async function adaptCV(userId: string, jobId: string, data: any): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { candidateProfile: { include: { skills: true, experiences: true, educations: true } } },
  });
  const job = await prisma.job.findUnique({ where: { id: jobId } });

  if (!user || !job) throw new Error('User or job not found');

  if (openai) {
    const profile = user.candidateProfile;
    const skills = profile?.skills?.map((s: any) => `${s.name} (${s.level})`).join(', ') ?? '';
    const experiences = profile?.experiences?.map((e: any) =>
      `${e.title} chez ${e.company} (${e.startDate?.toISOString().slice(0, 7)} — ${e.current ? 'present' : e.endDate?.toISOString().slice(0, 7) ?? 'N/A'}): ${e.description ?? ''}`
    ).join('\n') ?? '';
    const educations = profile?.educations?.map((e: any) =>
      `${e.degree} en ${e.field ?? 'N/A'} à ${e.institution}`
    ).join('\n') ?? '';

    const requiredSkills = (() => { try { return JSON.parse(job.requiredSkills || '[]').join(', '); } catch { return ''; } })();

    const completion = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.5,
      max_tokens: 1500,
      messages: [
        {
          role: 'system',
          content: `Tu es un expert en adaptation de CV. Adapte le CV du candidat pour le poste mentionné.
Mets en avant les compétences et expériences les plus pertinentes.
N'invente JAMAIS de compétences ou d'expériences que le candidat n'a pas.
Réorganise et reformule pour maximiser l'impact.
Retourne le CV adapté en texte structuré (pas de markdown).`,
        },
        {
          role: 'user',
          content: `PROFIL:\nNom: ${profile?.firstName ?? ''} ${profile?.lastName ?? ''}\nTitre: ${profile?.title ?? ''}\nCompétences: ${skills}\nExpériences:\n${experiences}\nFormation:\n${educations}\n\nPOSTE CIBLÉ:\nTitre: ${job.title}\nCompétences demandées: ${requiredSkills}\nDescription: ${job.description?.substring(0, 500) ?? ''}\n\nAdapte le CV pour ce poste.`,
        },
      ],
    });
    return completion.choices[0]?.message?.content ?? `CV adapté pour ${job.title}`;
  }

  return `CV adapté pour ${job.title}`;
}

async function generateFollowUpEmail(userId: string, jobId: string, data: any): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { candidateProfile: { select: { firstName: true, lastName: true, title: true } } },
  });
  const job = await prisma.job.findUnique({ where: { id: jobId }, include: { company: true } });

  if (!user || !job) throw new Error('User or job not found');

  if (openai) {
    const profile = user.candidateProfile;
    const daysSinceApply = data?.daysSinceApply ?? 7;
    const completion = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.6,
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content: `Tu es un expert en communication professionnelle. Génère un email de relance professionnel mais humain.
L'email doit être court (max 150 mots), poli et montrer un intérêt sincère.
Ne sois pas insistant. Mentionne le poste et l'entreprise. Termine par une note positive.`,
        },
        {
          role: 'user',
          content: `Candidat: ${profile?.firstName ?? ''} ${profile?.lastName ?? ''} (${profile?.title ?? ''})\nPoste: ${job.title}\nEntreprise: ${job.company?.name ?? ''}\nJours depuis candidature: ${daysSinceApply}\n\nGénère un email de relance.`,
        },
      ],
    });
    return completion.choices[0]?.message?.content ?? `Email de relance pour ${job.title}`;
  }

  return `Email de relance pour candidature ${jobId}`;
}

async function generateCompanyBrief(companyId: string): Promise<string> {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new Error('Company not found');

  // Get collective insights for this company
  const insights = await prisma.collectiveInsight.findMany({
    where: { companyId },
  });
  const insightData = insights.map(i => `${i.insightType}: ${i.contentJson}`).join('\n');

  // Get recent job postings
  const recentJobs = await prisma.job.findMany({
    where: { companyId, status: 'ACTIVE' },
    select: { title: true, contractType: true, salaryMin: true, salaryMax: true },
    take: 5,
  });
  const jobsList = recentJobs.map(j => `${j.title} (${j.contractType}, ${j.salaryMin ?? '?'}-${j.salaryMax ?? '?'}€)`).join('\n');

  if (openai) {
    const completion = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.5,
      max_tokens: 800,
      messages: [
        {
          role: 'system',
          content: `Tu es un analyste d'entreprises pour HIREDGE. Génère un brief concis et utile pour un candidat.
Inclus : présentation, culture, processus de recrutement probable, conseils pour postuler.
Base-toi UNIQUEMENT sur les données fournies. Ne fabrique pas d'informations.`,
        },
        {
          role: 'user',
          content: `Entreprise: ${company.name}\nSecteur: ${company.industry ?? 'Non renseigné'}\nTaille: ${company.sizeRange ?? 'Non renseigné'}\nSite: ${company.website ?? 'Non renseigné'}\nNote Glassdoor: ${company.glassdoorRating ?? 'N/A'}\n\nInsights collectifs:\n${insightData || 'Pas encore de données'}\n\nPostes ouverts:\n${jobsList || 'Aucun poste récent'}\n\nGénère un brief entreprise.`,
        },
      ],
    });
    return completion.choices[0]?.message?.content ?? `Brief: ${company.name}`;
  }

  return `Brief entreprise: ${company.name} — ${company.industry ?? 'secteur non renseigné'}, ${company.sizeRange ?? 'taille non renseignée'}. ${recentJobs.length} postes ouverts.`;
}

function buildCoverLetterPrompt(user: any, job: any, data: any): string {
  const profile = user.candidateProfile;
  const skills = profile?.skills?.map((s: any) => s.name).join(', ') ?? '';
  const experiences = profile?.experiences?.map((e: any) => `${e.title} chez ${e.company}`).join(', ') ?? '';

  return `
Tu es un expert en rédaction de lettres de motivation en français.

CANDIDAT:
- Nom: ${profile?.firstName ?? ''} ${profile?.lastName ?? ''}
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
}

// ─── Event handlers ──────────────────────────────────────

scrapingWorker.on('failed', (job, err) => {
  console.error(JSON.stringify({ level: 'error', worker: 'scraping', jobId: job?.id, error: err.message }));
});

contentWorker.on('failed', (job, err) => {
  console.error(JSON.stringify({ level: 'error', worker: 'content-generation', jobId: job?.id, error: err.message }));
});

export { scrapingWorker, contentWorker };

// ─── Graceful shutdown ───
const shutdown = async () => {
  await Promise.allSettled([
    scrapingWorker.close(),
    contentWorker.close(),
  ]);
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
