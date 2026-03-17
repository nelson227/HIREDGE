import prisma from '../db/prisma';
import { AppError } from './auth.service';
import { squadMatchingService } from './squad-matching.service';

export class ApplicationService {
  async createApplication(userId: string, data: {
    jobId: string;
    coverLetterContent?: string;
    cvVersion?: string;
    notes?: string;
  }) {
    // Check subscription limits
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('USER_NOT_FOUND', 'Utilisateur introuvable', 404);

    // Enforce FREE tier limit: 50 applications max
    if (user.subscriptionTier !== 'PREMIUM') {
      const applicationCount = await prisma.application.count({ where: { userId } });
      if (applicationCount >= 50) {
        throw new AppError(
          'APPLICATION_LIMIT_REACHED',
          'Vous avez atteint la limite de 50 candidatures. Passez en Premium pour des candidatures illimitées.',
          403,
        );
      }
    }

    // Check if already applied
    const existing = await prisma.application.findFirst({
      where: { userId: userId, jobId: data.jobId },
    });
    if (existing) {
      throw new AppError('ALREADY_APPLIED', 'Vous avez déjà postulé à cette offre', 409);
    }

    // Check job exists
    const job = await prisma.job.findUnique({ where: { id: data.jobId } });
    if (!job) throw new AppError('JOB_NOT_FOUND', 'Offre introuvable', 404);

    const application = await prisma.application.create({
      data: {
        userId: userId,
        jobId: data.jobId,
        status: 'APPLIED',
        coverLetterContent: data.coverLetterContent ?? null,
        notes: data.notes ?? null,
      },
      include: {
        job: {
          include: { company: { select: { id: true, name: true, logo: true } } },
        },
      },
    });

    // Post-application: increment counter for squad cooldown tracking
    await squadMatchingService.incrementApplicationsSinceDismissal(userId).catch(() => {});

    // Check if we should suggest squads
    let squadSuggestions = null;
    try {
      const shouldSuggest = await squadMatchingService.shouldSuggestSquad(userId);
      if (shouldSuggest) {
        const squads = await squadMatchingService.findMatchingSquads(userId, data.jobId);
        if (squads.length > 0) {
          squadSuggestions = squads;
        }
      }
    } catch {
      // Non-blocking: squad suggestion failure should never block application creation
    }

    return { ...application, squadSuggestions };
  }

  async getUserApplications(userId: string, filters: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const where: any = { userId: userId };
    if (filters.status) {
      where.status = filters.status;
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          job: {
            include: { company: { select: { id: true, name: true, logo: true } } },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.application.count({ where }),
    ]);

    return {
      applications,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getApplicationById(userId: string, applicationId: string) {
    const application = await prisma.application.findFirst({
      where: { id: applicationId, userId: userId },
      include: {
        job: { include: { company: true } },
      },
    });

    if (!application) throw new AppError('APPLICATION_NOT_FOUND', 'Candidature introuvable', 404);
    return application;
  }

  async updateApplicationStatus(userId: string, applicationId: string, data: {
    status: string;
    notes?: string;
    interviewDate?: string;
    followUpDate?: string;
  }) {
    const application = await prisma.application.findFirst({
      where: { id: applicationId, userId: userId },
    });
    if (!application) throw new AppError('APPLICATION_NOT_FOUND', 'Candidature introuvable', 404);

    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: data.status as any,
        notes: data.notes ?? application.notes,
        interviewDate: data.interviewDate ? new Date(data.interviewDate) : undefined,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
      },
      include: {
        job: {
          include: { company: { select: { id: true, name: true, logo: true } } },
        },
      },
    });

    return updated;
  }

  async deleteApplication(userId: string, applicationId: string) {
    const application = await prisma.application.findFirst({
      where: { id: applicationId, userId: userId },
    });
    if (!application) throw new AppError('APPLICATION_NOT_FOUND', 'Candidature introuvable', 404);

    if (application.status !== 'DRAFT') {
      throw new AppError('CANNOT_DELETE', 'Seules les candidatures en brouillon peuvent être supprimées', 400);
    }

    await prisma.application.delete({ where: { id: applicationId } });
  }

  async getApplicationStats(userId: string) {
    const stats = await prisma.application.groupBy({
      by: ['status'],
      where: { userId },
      _count: { id: true },
    });

    const total = stats.reduce((sum: number, s: any) => sum + s._count.id, 0);

    return {
      total,
      byStatus: Object.fromEntries(stats.map((s: any) => [s.status, s._count.id])),
      responseRate: await this.calculateResponseRate(userId),
    };
  }

  private async calculateResponseRate(userId: string): Promise<number> {
    const total = await prisma.application.count({
      where: { userId, status: { not: 'DRAFT' } },
    });
    if (total === 0) return 0;

    const responded = await prisma.application.count({
      where: {
        userId,
        status: { in: ['INTERVIEW_SCHEDULED', 'OFFER_RECEIVED', 'ACCEPTED', 'REJECTED'] as any[] },
      },
    });

    return Math.round((responded / total) * 100);
  }
}

export const applicationService = new ApplicationService();
