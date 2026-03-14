import prisma from '../db/prisma';
import redis from '../lib/redis';
import { AppError } from './auth.service';
import { matchingService, MatchResult } from './matching.service';

const CACHE_TTL = 300; // 5 minutes

export class JobService {
  async searchJobs(userId: string, filters: {
    query?: string;
    location?: string;
    contractType?: string;
    remote?: boolean;
    salaryMin?: number;
    salaryMax?: number;
    experienceLevel?: string;
    postedAfter?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 200);
    const skip = (page - 1) * limit;

    const where: any = { status: 'ACTIVE' };
    // Build AND conditions so multiple OR clauses don't overwrite each other
    const andConditions: any[] = [];

    if (filters.query) {
      // SQLite: contains translates to LIKE '%…%', case-insensitive for ASCII by default
      andConditions.push({
        OR: [
          { title: { contains: filters.query } },
          { description: { contains: filters.query } },
          { company: { name: { contains: filters.query } } },
        ],
      });
    }

    if (filters.location) {
      // SQLite LIKE is case-insensitive for ASCII — no mode needed
      andConditions.push({ location: { contains: filters.location } });
    }

    if (filters.contractType) {
      // The seed stores English values (FULL_TIME, CONTRACT).
      // Map the French UI labels to all plausible DB equivalents.
      const contractMap: Record<string, string[]> = {
        CDI:        ['FULL_TIME', 'CDI', 'full_time'],
        CDD:        ['CONTRACT', 'CDD', 'PART_TIME', 'part_time'],
        freelance:  ['FREELANCE', 'CONTRACT', 'freelance'],
        stage:      ['INTERNSHIP', 'STAGE', 'stage'],
        alternance: ['ALTERNANCE', 'alternance'],
      };
      const mapped = contractMap[filters.contractType] ?? [filters.contractType];
      andConditions.push({ contractType: { in: mapped } });
    }

    if (filters.remote !== undefined) {
      andConditions.push({ remote: filters.remote });
    }

    if (filters.salaryMin) {
      // Match jobs where max salary is at or above the user's minimum expectation
      andConditions.push({ salaryMax: { gte: filters.salaryMin } });
    }

    if (filters.experienceLevel) {
      // The Job model has no string experienceLevel field — match against title keywords
      const levelKeywords: Record<string, string[]> = {
        junior: ['junior', 'entry', 'graduate'],
        mid:    ['mid', 'intermediate', 'confirmé'],
        senior: ['senior', 'experienced'],
        lead:   ['lead', 'principal', 'staff'],
      };
      const kws = levelKeywords[filters.experienceLevel] ?? [];
      if (kws.length > 0) {
        andConditions.push({ OR: kws.map(k => ({ title: { contains: k } })) });
      }
    }

    if (filters.postedAfter) {
      andConditions.push({ postedAt: { gte: filters.postedAfter } });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: { company: { select: { id: true, name: true, logo: true, industry: true } } },
        orderBy: { postedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.job.count({ where }),
    ]);

    const parsed = jobs.map((j: any) => ({
      ...j,
      requiredSkills: typeof j.requiredSkills === 'string' ? JSON.parse(j.requiredSkills || '[]') : (j.requiredSkills ?? []),
      niceToHave: typeof j.niceToHave === 'string' ? JSON.parse(j.niceToHave || '[]') : (j.niceToHave ?? []),
      benefits: typeof j.benefits === 'string' ? JSON.parse(j.benefits || '[]') : (j.benefits ?? []),
    }));

    // Compute match scores if user is authenticated
    if (userId) {
      const jobDataList = parsed.map((j: any) => ({
        id: j.id,
        title: j.title,
        description: j.description ?? '',
        requiredSkills: j.requiredSkills,
        niceToHave: j.niceToHave,
        salaryMin: j.salaryMin,
        salaryMax: j.salaryMax,
        location: j.location,
        locationCity: j.locationCity,
        locationCountry: j.locationCountry,
        remote: j.remote,
        contractType: j.contractType,
        experienceMin: j.experienceMin,
        experienceMax: j.experienceMax,
        postedAt: j.postedAt,
      }));

      const scores = await matchingService.scoreJobs(userId, jobDataList);

      const enriched = parsed.map((j: any) => {
        const score = scores.get(j.id);
        return {
          ...j,
          matchScore: score?.matchScore ?? 0,
          matchDetails: score?.matchDetails ?? null,
        };
      });

      // Sort by matchScore descending
      enriched.sort((a: any, b: any) => b.matchScore - a.matchScore);

      return {
        jobs: enriched,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    }

    return {
      jobs: parsed,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getJobById(jobId: string, userId?: string) {
    const cacheKey = `job:${jobId}`;
    const cached = await redis.get(cacheKey);
    const job = cached ? JSON.parse(cached) : await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: true,
      },
    });

    if (!job) throw new AppError('JOB_NOT_FOUND', 'Offre introuvable', 404);

    const enriched: any = {
      ...job,
      requiredSkills: typeof job.requiredSkills === 'string' ? JSON.parse(job.requiredSkills || '[]') : (job.requiredSkills ?? []),
      niceToHave: typeof (job as any).niceToHave === 'string' ? JSON.parse((job as any).niceToHave || '[]') : ((job as any).niceToHave ?? []),
      benefits: typeof (job as any).benefits === 'string' ? JSON.parse((job as any).benefits || '[]') : ((job as any).benefits ?? []),
    };

    if (!cached) {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(enriched));
    }

    // Compute match score with LLM refinement for detail page
    if (userId) {
      const matchResult = await matchingService.getCachedOrScore(userId, {
        id: enriched.id,
        title: enriched.title,
        description: enriched.description ?? '',
        requiredSkills: enriched.requiredSkills,
        niceToHave: enriched.niceToHave,
        salaryMin: enriched.salaryMin,
        salaryMax: enriched.salaryMax,
        location: enriched.location,
        locationCity: enriched.locationCity,
        locationCountry: enriched.locationCountry,
        remote: enriched.remote,
        contractType: enriched.contractType,
        experienceMin: enriched.experienceMin,
        experienceMax: enriched.experienceMax,
        postedAt: new Date(enriched.postedAt),
      }, true); // useLLM = true for detail pages

      enriched.matchScore = matchResult.matchScore;
      enriched.matchDetails = matchResult.matchDetails;
      enriched.matchAnalysis = matchResult.matchAnalysis;
      enriched.sellingPoints = matchResult.sellingPoints;
      enriched.gaps = matchResult.gaps;
    }

    return enriched;
  }

  async getMatchedJobs(userId: string, limit: number = 100) {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId },
      include: { skills: true, experiences: true },
    });

    if (!profile) return [];

    // Step 1: Pre-filter — SQL-based fast filtering
    const candidates = await prisma.job.findMany({
      where: {
        status: 'ACTIVE',
        postedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        NOT: {
          applications: { some: { userId } },
        },
      },
      include: {
        company: { select: { id: true, name: true, logo: true, industry: true } },
      },
      orderBy: { postedAt: 'desc' },
      take: 200,
    });

    // Step 2: Score using the matching engine
    const jobDataList = candidates.map((j: any) => ({
      id: j.id,
      title: j.title,
      description: j.description ?? '',
      requiredSkills: typeof j.requiredSkills === 'string' ? JSON.parse(j.requiredSkills || '[]') : (j.requiredSkills ?? []),
      niceToHave: typeof j.niceToHave === 'string' ? JSON.parse(j.niceToHave || '[]') : (j.niceToHave ?? []),
      salaryMin: j.salaryMin,
      salaryMax: j.salaryMax,
      location: j.location,
      locationCity: j.locationCity,
      locationCountry: j.locationCountry,
      remote: j.remote,
      contractType: j.contractType,
      experienceMin: j.experienceMin,
      experienceMax: j.experienceMax,
      postedAt: j.postedAt,
    }));

    const scores = await matchingService.scoreJobs(userId, jobDataList);

    const scored = candidates.map((job: any) => {
      const score = scores.get(job.id);
      return {
        ...job,
        requiredSkills: typeof job.requiredSkills === 'string' ? JSON.parse(job.requiredSkills || '[]') : (job.requiredSkills ?? []),
        niceToHave: typeof job.niceToHave === 'string' ? JSON.parse(job.niceToHave || '[]') : (job.niceToHave ?? []),
        benefits: typeof job.benefits === 'string' ? JSON.parse(job.benefits || '[]') : (job.benefits ?? []),
        matchScore: score?.matchScore ?? 0,
        matchDetails: score?.matchDetails ?? null,
      };
    });

    // Sort by score descending
    scored.sort((a: any, b: any) => b.matchScore - a.matchScore);

    return scored.slice(0, limit);
  }
}

export const jobService = new JobService();
