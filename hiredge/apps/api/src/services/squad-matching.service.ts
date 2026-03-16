import prisma from '../db/prisma';
import { SQUAD_LIMITS } from '@hiredge/shared';

// ─── Job Family Detection ────────────────────────────────────────
// Maps common job title keywords to standardized families
const JOB_FAMILY_PATTERNS: [RegExp, string][] = [
  [/data\s*(analyst|analytics|science|scientist|engineer)/i, 'data-analytics'],
  [/business\s*intelligence|bi\s*(analyst|developer)/i, 'data-analytics'],
  [/machine\s*learning|ml\s*engineer|deep\s*learning|ai\s*engineer/i, 'ai-ml'],
  [/software\s*(engineer|developer|dev)|full\s*stack|fullstack|backend|frontend/i, 'software-engineering'],
  [/web\s*(developer|dev)|react|angular|vue|node\.?js/i, 'software-engineering'],
  [/devops|sre|site\s*reliability|cloud\s*(engineer|architect)/i, 'devops-cloud'],
  [/cybersecurity|security\s*(analyst|engineer)|infosec|soc\s*analyst/i, 'cybersecurity'],
  [/product\s*(manager|owner)|scrum\s*master|agile/i, 'product-management'],
  [/project\s*manager|chef\s*de\s*projet/i, 'project-management'],
  [/ux|ui|design|designer|ux\/ui/i, 'design'],
  [/marketing|growth|seo|sem|content\s*(manager|strategist)/i, 'marketing'],
  [/sales|account\s*(manager|executive)|business\s*develop/i, 'sales'],
  [/human\s*resources|hr\s*(manager|partner)|recruteur|recruiter|talent/i, 'human-resources'],
  [/finance|comptab|accounting|controller|audit/i, 'finance'],
  [/support|help\s*desk|customer\s*success|customer\s*service/i, 'customer-support'],
  [/qa|quality\s*assurance|test|tester|automation/i, 'qa-testing'],
  [/network|réseau|system\s*admin|sysadmin|infrastructure/i, 'infrastructure'],
  [/consultant|conseil/i, 'consulting'],
  [/analyste|analyst/i, 'analyst'],
];

// ─── Experience Level Detection ──────────────────────────────────
function detectExperienceLevel(job: { title: string; experienceMin?: number | null; experienceMax?: number | null }): string {
  const title = job.title.toLowerCase();

  if (/\b(junior|jr\.?|débutant|entry[\s-]?level|intern|stage|stagiaire)\b/i.test(title)) return 'junior';
  if (/\b(senior|sr\.?|lead|principal|staff|architect|directeur|head|vp)\b/i.test(title)) return 'senior';

  // Fallback to experience years
  const minExp = job.experienceMin ?? 0;
  if (minExp <= 2) return 'junior';
  if (minExp >= 5) return 'senior';
  return 'mid';
}

// ─── Job Family Detection ────────────────────────────────────────
function detectJobFamily(title: string): string {
  for (const [pattern, family] of JOB_FAMILY_PATTERNS) {
    if (pattern.test(title)) return family;
  }
  return 'general';
}

// ─── Location Normalization ──────────────────────────────────────
function normalizeLocation(job: { location?: string | null; locationCity?: string | null; locationCountry?: string | null; remote?: boolean }): string {
  if (job.remote) return 'remote';
  if (job.locationCity) return job.locationCity.toLowerCase().trim();
  if (job.location) return job.location.toLowerCase().trim();
  if (job.locationCountry) return job.locationCountry.toLowerCase().trim();
  return 'general';
}

// ─── Squad Name Generator ────────────────────────────────────────
const FAMILY_LABELS: Record<string, string> = {
  'data-analytics': 'Data Analytics',
  'ai-ml': 'IA & Machine Learning',
  'software-engineering': 'Développement Logiciel',
  'devops-cloud': 'DevOps & Cloud',
  'cybersecurity': 'Cybersécurité',
  'product-management': 'Product Management',
  'project-management': 'Gestion de Projet',
  'design': 'UX/UI Design',
  'marketing': 'Marketing',
  'sales': 'Ventes & Développement',
  'human-resources': 'Ressources Humaines',
  'finance': 'Finance & Comptabilité',
  'customer-support': 'Support Client',
  'qa-testing': 'QA & Testing',
  'infrastructure': 'Infrastructure & Réseaux',
  'consulting': 'Conseil',
  'analyst': 'Analyse',
  'general': 'Recherche d\'emploi',
};

function capitalizeLocation(loc: string): string {
  if (loc === 'remote') return 'Remote';
  return loc.split(/[\s-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

async function generateSquadName(jobFamily: string, location: string): Promise<string> {
  const label = FAMILY_LABELS[jobFamily] || jobFamily;
  const locLabel = capitalizeLocation(location);

  // Count existing squads for this family to generate a sequential number
  const existingCount = await prisma.squad.count({
    where: { jobFamily },
  });

  const number = String(existingCount + 1).padStart(2, '0');
  return `${label} — ${locLabel} #${number}`;
}

function generateFocus(jobFamily: string, location: string): string {
  const label = FAMILY_LABELS[jobFamily] || jobFamily;
  const locLabel = capitalizeLocation(location);
  if (location === 'remote') {
    return `Postes ${label} en télétravail`;
  }
  return `Postes ${label} à ${locLabel}`;
}

// ─── Main Matching Logic ─────────────────────────────────────────
export class SquadMatchingService {

  /**
   * After a user applies to a job, find or create compatible squads.
   * Returns array of suggested squads (max 3).
   */
  async findMatchingSquads(userId: string, jobId: string): Promise<any[]> {
    // 1. Load job details
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return [];

    // 2. Derive matching attributes
    const jobFamily = detectJobFamily(job.title);
    const experienceLevel = detectExperienceLevel(job);
    const location = normalizeLocation(job);

    // 3. Check multi-squad limit
    const activeCount = await prisma.squadMember.count({
      where: { userId, isActive: true, squad: { status: { in: ['FORMING', 'ACTIVE'] } } },
    });
    if (activeCount >= SQUAD_LIMITS.MAX_SQUADS_PER_USER) return [];

    // 4. Search for FORMING or ACTIVE squads with available space
    const compatibleSquads = await prisma.squad.findMany({
      where: {
        status: { in: ['FORMING', 'ACTIVE'] },
        jobFamily,
        // Match by experience level (exact or null)
        OR: [
          { experienceLevel },
          { experienceLevel: null },
        ],
        // Exclude squads user is already in
        members: { none: { userId } },
      },
      include: {
        _count: { select: { members: true } },
        members: {
          take: 3,
          include: {
            user: {
              select: {
                candidateProfile: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // 5. Filter by available space and prefer location match
    const withSpace = compatibleSquads.filter((s: any) => s._count.members < s.maxMembers);

    // Sort: location match first, then by member count (more members = more active)
    const sorted = withSpace.sort((a: any, b: any) => {
      const aLocMatch = a.locationFilter === location ? 1 : 0;
      const bLocMatch = b.locationFilter === location ? 1 : 0;
      if (aLocMatch !== bLocMatch) return bLocMatch - aLocMatch;
      return b._count.members - a._count.members;
    });

    const results = sorted.slice(0, 3);

    // 6. If no compatible squad found, auto-create one
    if (results.length === 0) {
      const newSquad = await this.createMatchingSquad(jobFamily, experienceLevel, location);
      return [{ ...newSquad, _count: { members: 0 }, isNew: true }];
    }

    return results;
  }

  /**
   * Create a new squad for a job family/experience/location combo
   */
  private async createMatchingSquad(jobFamily: string, experienceLevel: string, location: string) {
    const crypto = await import('crypto');
    let code = crypto.randomBytes(3).toString('hex').toUpperCase();
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.squad.findUnique({ where: { code } });
      if (!exists) break;
      code = crypto.randomBytes(3).toString('hex').toUpperCase();
    }

    const name = await generateSquadName(jobFamily, location);
    const focus = generateFocus(jobFamily, location);

    return prisma.squad.create({
      data: {
        code,
        name,
        focus,
        jobFamily,
        experienceLevel,
        locationFilter: location,
        maxMembers: SQUAD_LIMITS.MAX_MEMBERS,
        status: 'FORMING',
      },
      include: {
        _count: { select: { members: true } },
      },
    });
  }

  /**
   * Check if we should show squad suggestions (respects cooldown & preferences)
   */
  async shouldSuggestSquad(userId: string): Promise<boolean> {
    // 1. Check multi-squad limit
    const activeCount = await prisma.squadMember.count({
      where: { userId, isActive: true, squad: { status: { in: ['FORMING', 'ACTIVE'] } } },
    });
    if (activeCount >= SQUAD_LIMITS.MAX_SQUADS_PER_USER) return false;

    // 2. Check user preference
    const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
    if (!profile) return false;
    if (profile.escouadePreference === 'DISABLED') return false;

    // 3. Check cooldown (dismissed recently)
    if (profile.escouadeDismissedAt) {
      const hoursSinceDismissal = (Date.now() - profile.escouadeDismissedAt.getTime()) / (1000 * 60 * 60);
      const appsSinceDismissal = profile.applicationsSinceDismissal;

      // Requires 24h OR 3 new applications since dismissal
      if (hoursSinceDismissal < SQUAD_LIMITS.COOLDOWN_HOURS && appsSinceDismissal < SQUAD_LIMITS.COOLDOWN_APPLICATIONS) {
        return false;
      }
    }

    // 4. If preference is OCCASIONAL, only suggest every 3rd application
    if (profile.escouadePreference === 'OCCASIONAL') {
      const totalApps = await prisma.application.count({ where: { userId } });
      if (totalApps % 3 !== 0) return false;
    }

    return true;
  }

  /**
   * Record that user dismissed the squad suggestion
   */
  async dismissSuggestion(userId: string): Promise<void> {
    await prisma.candidateProfile.update({
      where: { userId },
      data: {
        escouadeDismissedAt: new Date(),
        applicationsSinceDismissal: 0,
      },
    });
  }

  /**
   * Increment counter of applications since last dismissal
   */
  async incrementApplicationsSinceDismissal(userId: string): Promise<void> {
    await prisma.candidateProfile.updateMany({
      where: { userId, escouadeDismissedAt: { not: null } },
      data: { applicationsSinceDismissal: { increment: 1 } },
    });
  }
}

export const squadMatchingService = new SquadMatchingService();
