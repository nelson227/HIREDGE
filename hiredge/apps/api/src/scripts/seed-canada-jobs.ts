/**
 * Script de seed : récupère des offres d'emploi canadiennes réelles
 * depuis des APIs publiques gratuites sans clé.
 *
 * Sources :
 *  1. RemoteOK     — https://remoteok.com/api (JSON, no auth)
 *  2. Remotive     — https://remotive.com/api/remote-jobs (JSON, no auth)
 *  3. Arbeitnow    — https://arbeitnow.com/api/job-board-api (JSON, no auth)
 *
 * Usage : npx tsx src/scripts/seed-canada-jobs.ts
 */

import prisma from '../db/prisma';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; HiredgeBot/1.0)',
  'Accept': 'application/json',
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface NormalizedJob {
  title: string;
  companyName: string;
  location: string;
  locationCity: string;
  locationCountry: string;
  description: string;
  url: string;
  contractType: string;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  requiredSkills: string[];
  source: string;
  externalId: string;
  postedAt: Date;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractSkills(text: string): string[] {
  const SKILLS = [
    'JavaScript','TypeScript','Python','Java','Go','Rust','C#','C++','Ruby','PHP','Swift','Kotlin',
    'React','Vue','Angular','Next.js','Nuxt','Svelte','React Native','Flutter','Expo',
    'Node.js','Express','Fastify','NestJS','Django','FastAPI','Spring','Laravel','Rails',
    'PostgreSQL','MySQL','MongoDB','Redis','SQLite','Elasticsearch','DynamoDB',
    'AWS','Azure','GCP','Docker','Kubernetes','Terraform','CI/CD','GitHub Actions',
    'GraphQL','REST API','gRPC','WebSockets',
    'Machine Learning','AI','LLM','OpenAI','TensorFlow','PyTorch',
    'Figma','UX','Product Management','Agile','Scrum',
  ];
  const lower = text.toLowerCase();
  return SKILLS.filter(s => lower.includes(s.toLowerCase())).slice(0, 10);
}

function isCanadaRelated(text: string): boolean {
  const lower = text.toLowerCase();
  return /\bcanada\b|\bcanadian\b|\btoronto\b|\bvancouver\b|\bmontréal\b|\bmontreal\b|\bcalgary\b|\bottawa\b|\bedmonton\b|\bquebec\b|\bwinnipeg\b|\bhalifax\b/.test(lower);
}

function parseSalary(text: string): { min: number | null; max: number | null; currency: string } {
  const cad = text.match(/\$?\s*(\d[\d,]*)\s*(?:k|000)?\s*[-–]\s*\$?\s*(\d[\d,]*)\s*(?:k|000)?/i);
  if (cad && cad[1] && cad[2]) {
    let min = parseInt(cad[1].replace(/,/g, ''));
    let max = parseInt(cad[2].replace(/,/g, ''));
    if (min < 1000) min *= 1000;
    if (max < 1000) max *= 1000;
    return { min, max, currency: 'CAD' };
  }
  return { min: null, max: null, currency: 'CAD' };
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return res.json();
}

// ── Scrapers ──────────────────────────────────────────────────────────────────

async function fetchRemoteOK(): Promise<NormalizedJob[]> {
  console.log('[RemoteOK] Fetching...');
  try {
    const data: any[] = await fetchJson('https://remoteok.com/api');
    // First item is legal notice
    const jobs = data.filter(j => j.id && j.position);

    return jobs.map(j => {
      const salary = parseSalary(`${j.salary_min ?? ''} - ${j.salary_max ?? ''}`);
      const isCanada = isCanadaRelated(`${j.location ?? ''} ${j.description ?? ''} ${j.tags?.join(' ') ?? ''}`);
      return {
        title: j.position,
        companyName: j.company || 'Unknown',
        location: j.location || 'Remote',
        locationCity: isCanada ? (j.location || 'Remote') : 'Remote',
        locationCountry: 'Canada',
        description: stripHtml(j.description || ''),
        url: j.url || `https://remoteok.com/remote-jobs/${j.id}`,
        contractType: 'FULL_TIME',
        remote: true,
        salaryMin: j.salary_min && parseInt(j.salary_min) > 0 ? parseInt(j.salary_min) : salary.min,
        salaryMax: j.salary_max && parseInt(j.salary_max) > 0 ? parseInt(j.salary_max) : salary.max,
        salaryCurrency: 'CAD',
        requiredSkills: extractSkills(`${j.position} ${j.description ?? ''} ${j.tags?.join(' ') ?? ''}`),
        source: 'remoteok',
        externalId: String(j.id),
        postedAt: j.date && !isNaN(j.date) ? new Date(Number(j.date) * 1000) : new Date(),
      };
    }).filter(j => j.title && j.companyName !== 'Unknown');
  } catch (e: any) {
    console.error('[RemoteOK] Erreur:', e.message);
    return [];
  }
}

async function fetchRemotive(): Promise<NormalizedJob[]> {
  console.log('[Remotive] Fetching...');
  try {
    const data = await fetchJson('https://remotive.com/api/remote-jobs?limit=100');
    const jobs: any[] = data.jobs ?? [];

    return jobs.map(j => {
      const salary = parseSalary(j.salary ?? '');
      return {
        title: j.title,
        companyName: j.company_name || 'Unknown',
        location: j.candidate_required_location || 'Remote',
        locationCity: 'Remote',
        locationCountry: 'Canada',
        description: stripHtml(j.description || ''),
        url: j.url,
        contractType: j.job_type === 'contract' ? 'CONTRACT' : 'FULL_TIME',
        remote: true,
        salaryMin: salary.min,
        salaryMax: salary.max,
        salaryCurrency: 'CAD',
        requiredSkills: extractSkills(`${j.title} ${j.description ?? ''} ${j.tags?.join(' ') ?? ''}`),
        source: 'remotive',
        externalId: String(j.id),
        postedAt: j.publication_date ? new Date(j.publication_date) : new Date(),
      };
    }).filter(j => j.title && j.companyName !== 'Unknown');
  } catch (e: any) {
    console.error('[Remotive] Erreur:', e.message);
    return [];
  }
}

async function fetchArbeitnow(): Promise<NormalizedJob[]> {
  console.log('[Arbeitnow] Fetching...');
  try {
    const data = await fetchJson('https://arbeitnow.com/api/job-board-api');
    const jobs: any[] = data.data ?? [];

    return jobs.map(j => {
      const salary = parseSalary(j.salary ?? '');
      return {
        title: j.title,
        companyName: j.company_name || 'Unknown',
        location: j.location || 'Remote',
        locationCity: j.location || 'Remote',
        locationCountry: isCanadaRelated(j.location ?? '') ? 'Canada' : 'Remote',
        description: stripHtml(j.description || ''),
        url: j.url,
        contractType: j.job_types?.includes('Contract') ? 'CONTRACT' : 'FULL_TIME',
        remote: j.remote ?? false,
        salaryMin: salary.min,
        salaryMax: salary.max,
        salaryCurrency: 'CAD',
        requiredSkills: extractSkills(`${j.title} ${j.description ?? ''} ${j.tags?.join(' ') ?? ''}`),
        source: 'arbeitnow',
        externalId: j.slug || String(j.title).replace(/\s+/g, '-'),
        postedAt: j.created_at && !isNaN(j.created_at) ? new Date(Number(j.created_at) * 1000) : new Date(),
      };
    }).filter(j => j.title && j.companyName !== 'Unknown');
  } catch (e: any) {
    console.error('[Arbeitnow] Erreur:', e.message);
    return [];
  }
}

// Indeed Canada RSS
async function fetchIndeedCanadaRSS(keyword: string): Promise<NormalizedJob[]> {
  console.log(`[Indeed CA] Fetching RSS: ${keyword}`);
  try {
    const url = `https://ca.indeed.com/rss?q=${encodeURIComponent(keyword)}&l=Canada&sort=date&limit=25`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/rss+xml, text/xml, */*',
      },
    });
    if (!res.ok) return [];
    const xml = await res.text();

    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
    return items.map((item, idx) => {
      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
        ?? item.match(/<title>(.*?)<\/title>/)?.[1] ?? '';
      const company = item.match(/<source[^>]*>(.*?)<\/source>/)?.[1]
        ?? item.match(/<author>(.*?)<\/author>/)?.[1] ?? 'Entreprise';
      const link = item.match(/<link>(.*?)<\/link>/)?.[1]
        ?? item.match(/<guid[^>]*>(.*?)<\/guid>/)?.[1] ?? '';
      const desc = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]>/)?.[1]
        ?? item.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? '';
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
      const location = item.match(/<location>(.*?)<\/location>/)?.[1]
        ?? item.match(/([A-Z][a-z]+,\s*[A-Z]{2})/)?.[1] ?? 'Canada';

      const salary = parseSalary(desc);
      const idMatch = link.match(/jk=([a-z0-9]+)/i);

      return {
        title: stripHtml(title).replace(/\s+/, ' ').trim(),
        companyName: stripHtml(company).trim() || 'Entreprise',
        location,
        locationCity: location.split(',')[0]?.trim() || 'Canada',
        locationCountry: 'Canada',
        description: stripHtml(desc).slice(0, 2000),
        url: link,
        contractType: detectContractType(title + ' ' + desc),
        remote: isRemote(title + ' ' + desc),
        salaryMin: salary.min,
        salaryMax: salary.max,
        salaryCurrency: 'CAD',
        requiredSkills: extractSkills(title + ' ' + desc),
        source: 'indeed-ca',
        externalId: idMatch?.[1] ?? `indeed-${keyword}-${idx}`,
        postedAt: pubDate ? new Date(pubDate) : new Date(),
      };
    }).filter(j => j.title.length > 2);
  } catch (e: any) {
    console.error('[Indeed CA] Erreur:', e.message);
    return [];
  }
}

function detectContractType(text: string): string {
  const lower = text.toLowerCase();
  if (/\bcontract\b|\bfreelance\b|\bconsultant\b/.test(lower)) return 'CONTRACT';
  if (/\bpart.time\b|\bpart time\b/.test(lower)) return 'PART_TIME';
  if (/\binternship\b|\bstage\b/.test(lower)) return 'INTERNSHIP';
  return 'FULL_TIME';
}

function isRemote(text: string): boolean {
  return /\bremote\b|\btélétravail\b|\bhybrid\b/.test(text.toLowerCase());
}

// ── DB Upsert ─────────────────────────────────────────────────────────────────

async function upsertJob(job: NormalizedJob): Promise<boolean> {
  if (!job.title || !job.companyName) return false;

  // 1. Upsert company
  let company = await prisma.company.findFirst({
    where: { name: { equals: job.companyName } },
  });

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: job.companyName,
        location: job.location,
        industry: 'Technology',
      },
    });
  }

  // 2. Skip if already exists
  if (job.externalId) {
    const existing = await prisma.job.findFirst({
      where: { externalId: job.externalId, source: job.source },
    });
    if (existing) return false;
  }

  // 3. Create job
  await prisma.job.create({
    data: {
      title: job.title,
      companyId: company.id,
      description: job.description,
      location: job.location,
      locationCity: job.locationCity,
      locationCountry: job.locationCountry,
      remote: job.remote,
      contractType: job.contractType,
      salaryMin: job.salaryMin && job.salaryMin > 0 ? job.salaryMin : null,
      salaryMax: job.salaryMax && job.salaryMax > 0 ? job.salaryMax : null,
      salaryCurrency: job.salaryCurrency,
      requiredSkills: JSON.stringify(job.requiredSkills),
      source: job.source,
      externalId: job.externalId,
      sourceUrl: job.url,
      status: 'ACTIVE',
      postedAt: job.postedAt instanceof Date && !isNaN(job.postedAt.getTime()) ? job.postedAt : new Date(),
    },
  });
  return true;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🍁 Démarrage du seed des offres canadiennes...\n');

  const INDEED_KEYWORDS = [
    'software developer', 'frontend developer', 'backend developer',
    'data engineer', 'product manager', 'UX designer', 'DevOps engineer',
  ];

  // Fetch toutes les sources en parallèle
  const [remoteOkJobs, remotiveJobs, arbeitnow] = await Promise.all([
    fetchRemoteOK(),
    fetchRemotive(),
    fetchArbeitnow(),
  ]);

  // Indeed Canada (séquentiel pour éviter le rate limit)
  const indeedJobs: NormalizedJob[] = [];
  for (const kw of INDEED_KEYWORDS) {
    const jobs = await fetchIndeedCanadaRSS(kw);
    indeedJobs.push(...jobs);
    await new Promise(r => setTimeout(r, 1000)); // 1s entre chaque requête
  }

  const allJobs = [...remoteOkJobs, ...remotiveJobs, ...arbeitnow, ...indeedJobs];
  console.log(`\n📦 Total récupéré : ${allJobs.length} offres`);
  console.log(`  - RemoteOK  : ${remoteOkJobs.length}`);
  console.log(`  - Remotive  : ${remotiveJobs.length}`);
  console.log(`  - Arbeitnow : ${arbeitnow.length}`);
  console.log(`  - Indeed CA : ${indeedJobs.length}\n`);

  // Déduplique par externalId+source
  const seen = new Set<string>();
  const unique = allJobs.filter(j => {
    const key = `${j.source}:${j.externalId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`🔍 Après déduplication : ${unique.length} offres\n`);

  // Insert en DB
  let created = 0;
  let skipped = 0;
  for (const job of unique) {
    const inserted = await upsertJob(job);
    if (inserted) created++; else skipped++;
  }

  const total = await prisma.job.count();
  console.log(`\n✅ Terminé !`);
  console.log(`  - Créées    : ${created}`);
  console.log(`  - Ignorées  : ${skipped} (déjà en base)`);
  console.log(`  - Total DB  : ${total} offres`);

  await prisma.$disconnect();
}

main().catch(async e => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
