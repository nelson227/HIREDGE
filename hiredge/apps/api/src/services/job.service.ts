import prisma from '../db/prisma';
import redis from '../lib/redis';
import { MATCH_WEIGHTS } from '@hiredge/shared';
import { AppError } from './auth.service';

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
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const where: any = {
      status: 'ACTIVE',
    };

    if (filters.query) {
      where.OR = [
        { title: { contains: filters.query, mode: 'insensitive' } },
        { description: { contains: filters.query, mode: 'insensitive' } },
        { company: { name: { contains: filters.query, mode: 'insensitive' } } },
      ];
    }

    if (filters.location) {
      where.location = { contains: filters.location, mode: 'insensitive' };
    }

    if (filters.contractType) {
      where.contractType = filters.contractType;
    }

    if (filters.remote !== undefined) {
      where.remote = filters.remote;
    }

    if (filters.salaryMin) {
      where.salaryMax = { gte: filters.salaryMin };
    }

    if (filters.salaryMax) {
      where.salaryMin = { lte: filters.salaryMax };
    }

    if (filters.experienceLevel) {
      where.experienceLevel = filters.experienceLevel;
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

    return {
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getJobById(jobId: string) {
    const cacheKey = `job:${jobId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: true,
      },
    });

    if (!job) throw new AppError('JOB_NOT_FOUND', 'Offre introuvable', 404);

    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(job));
    return job;
  }

  async getMatchedJobs(userId: string, limit: number = 20) {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId },
      include: { skills: true, experiences: true },
    });

    if (!profile) throw new AppError('PROFILE_NOT_FOUND', 'Complétez votre profil pour recevoir des recommandations', 404);

    // Step 1: Pre-filter — SQL-based fast filtering
    const userSkillNames = profile.skills.map((s: any) => s.name.toLowerCase());
    const totalExperienceYears = this.calculateTotalExperience(profile.experiences);

    const candidates = await prisma.job.findMany({
      where: {
        status: 'ACTIVE',
        postedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        // Exclude already-applied jobs
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

    // Step 2: Rule-based scoring
    const scored = candidates.map((job: any) => {
      const jobSkills: string[] = typeof job.requiredSkills === 'string' ? JSON.parse(job.requiredSkills || '[]') : [];
      const skillScore = this.computeSkillOverlap(userSkillNames, jobSkills);
      const experienceScore = this.computeExperienceMatch(totalExperienceYears, job.experienceMin, job.experienceMax);
      const salaryScore = this.computeSalaryMatch(profile.salaryMin, profile.salaryMax, job.salaryMin, job.salaryMax);
      const locationScore = this.computeLocationScore(profile.city, job.location, profile.remotePreference, job.remote);
      const recencyScore = this.computeRecencyBonus(job.postedAt);

      const totalScore =
        skillScore * MATCH_WEIGHTS.skills +
        experienceScore * MATCH_WEIGHTS.experience +
        salaryScore * MATCH_WEIGHTS.salary +
        locationScore * MATCH_WEIGHTS.location +
        recencyScore * MATCH_WEIGHTS.recency;

      return {
        ...job,
        matchScore: Math.round(totalScore * 100),
        matchDetails: {
          skills: Math.round(skillScore * 100),
          experience: Math.round(experienceScore * 100),
          salary: Math.round(salaryScore * 100),
          location: Math.round(locationScore * 100),
          recency: Math.round(recencyScore * 100),
        },
      };
    });

    // Sort by score descending
    scored.sort((a: any, b: any) => b.matchScore - a.matchScore);

    return scored.slice(0, limit);
  }

  private computeSkillOverlap(userSkills: string[], jobSkills: string[]): number {
    if (!jobSkills || jobSkills.length === 0) return 0.5;
    const jobLower = jobSkills.map(s => s.toLowerCase());
    const matches = userSkills.filter(s => jobLower.includes(s)).length;
    return matches / jobLower.length;
  }

  private computeExperienceMatch(userYears: number, minRequired?: number | null, maxRequired?: number | null): number {
    if (!minRequired && !maxRequired) return 0.7;
    if (minRequired && userYears < minRequired) {
      const gap = minRequired - userYears;
      return Math.max(0, 1 - gap * 0.2);
    }
    if (maxRequired && userYears > maxRequired + 5) return 0.5;
    return 1;
  }

  private computeSalaryMatch(
    userMin?: number | null, userMax?: number | null,
    jobMin?: number | null, jobMax?: number | null,
  ): number {
    if (!userMin || !jobMin) return 0.5;
    if (jobMax && userMin > jobMax) return 0.1;
    if (jobMin && userMax && userMax < jobMin) return 0.2;
    return 0.8;
  }

  private computeLocationScore(
    userCity?: string | null, jobLocation?: string | null,
    remotePreference?: string | null, jobRemote?: boolean | null,
  ): number {
    if (jobRemote && (remotePreference === 'REMOTE' || remotePreference === 'HYBRID')) return 1;
    if (!userCity || !jobLocation) return 0.5;
    if (userCity.toLowerCase() === jobLocation.toLowerCase()) return 1;
    return 0.3;
  }

  private computeRecencyBonus(postedAt: Date): number {
    const daysSincePosted = (Date.now() - postedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSincePosted <= 3) return 1;
    if (daysSincePosted <= 7) return 0.8;
    if (daysSincePosted <= 14) return 0.6;
    return 0.3;
  }

  private calculateTotalExperience(experiences: { startDate: Date; endDate: Date | null; current: boolean }[]): number {
    let totalMonths = 0;
    for (const exp of experiences) {
      const end = exp.current ? new Date() : (exp.endDate ?? new Date());
      const months = (end.getTime() - exp.startDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      totalMonths += months;
    }
    return Math.round(totalMonths / 12);
  }
}

export const jobService = new JobService();
