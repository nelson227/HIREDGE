import prisma from '../db/prisma';

export class CollectiveService {
  /**
   * Feed collective intelligence when an application status changes.
   * Aggregates anonymous data per company: response rate, process duration, etc.
   */
  async onApplicationStatusChange(applicationId: string, newStatus: string) {
    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: { include: { company: true } } },
    });
    if (!app?.job?.companyId) return;

    const companyId = app.job.companyId;

    // Update response rate insight
    if (['VIEWED', 'INTERVIEW_SCHEDULED', 'OFFERED', 'REJECTED'].includes(newStatus)) {
      await this.updateInsight(companyId, 'response_rate', async () => {
        const total = await prisma.application.count({
          where: { job: { companyId } },
        });
        const responded = await prisma.application.count({
          where: {
            job: { companyId },
            status: { in: ['VIEWED', 'INTERVIEW_SCHEDULED', 'OFFERED', 'REJECTED'] },
          },
        });
        return {
          total,
          responded,
          rate: total > 0 ? responded / total : 0,
        };
      });
    }

    // Update interview conversion rate
    if (newStatus === 'INTERVIEW_SCHEDULED' || newStatus === 'OFFERED') {
      await this.updateInsight(companyId, 'interview_rate', async () => {
        const applied = await prisma.application.count({
          where: { job: { companyId } },
        });
        const interviews = await prisma.application.count({
          where: { job: { companyId }, status: { in: ['INTERVIEW_SCHEDULED', 'OFFERED'] } },
        });
        return {
          applied,
          interviews,
          rate: applied > 0 ? interviews / applied : 0,
        };
      });
    }

    // Track average process duration (from APPLIED to latest status)
    if (['OFFERED', 'REJECTED'].includes(newStatus)) {
      await this.updateInsight(companyId, 'process_duration', async () => {
        const completedApps = await prisma.application.findMany({
          where: {
            job: { companyId },
            status: { in: ['OFFERED', 'REJECTED'] },
          },
          select: { createdAt: true, updatedAt: true },
        });
        if (completedApps.length === 0) return { avgDays: 0, count: 0 };

        const totalDays = completedApps.reduce((sum, a) => {
          const days = (a.updatedAt.getTime() - a.createdAt.getTime()) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0);
        return {
          avgDays: Math.round(totalDays / completedApps.length),
          count: completedApps.length,
        };
      });
    }
  }

  /**
   * Feed collective intelligence with salary data observed from job postings.
   */
  async onJobIndexed(jobId: string) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { company: true },
    });
    if (!job?.companyId || (!job.salaryMin && !job.salaryMax)) return;

    await this.updateInsight(job.companyId, 'salary_range', async () => {
      const jobs = await prisma.job.findMany({
        where: { companyId: job.companyId, salaryMin: { not: null } },
        select: { salaryMin: true, salaryMax: true, title: true },
      });
      const mins = jobs.map(j => j.salaryMin!).filter(Boolean);
      const maxs = jobs.map(j => j.salaryMax!).filter(Boolean);
      return {
        minObserved: mins.length > 0 ? Math.min(...mins) : null,
        maxObserved: maxs.length > 0 ? Math.max(...maxs) : null,
        avgMin: mins.length > 0 ? Math.round(mins.reduce((a, b) => a + b, 0) / mins.length) : null,
        avgMax: maxs.length > 0 ? Math.round(maxs.reduce((a, b) => a + b, 0) / maxs.length) : null,
        sampleSize: jobs.length,
      };
    });
  }

  /**
   * Feed collective intelligence with top requested skills per company.
   */
  async updateTopSkills(companyId: string) {
    const jobs = await prisma.job.findMany({
      where: { companyId, status: 'ACTIVE' },
      select: { requiredSkills: true },
    });

    const skillCounts: Record<string, number> = {};
    for (const job of jobs) {
      try {
        const skills: string[] = JSON.parse(job.requiredSkills || '[]');
        for (const skill of skills) {
          const key = skill.toLowerCase().trim();
          skillCounts[key] = (skillCounts[key] || 0) + 1;
        }
      } catch { /* skip malformed JSON */ }
    }

    const topSkills = Object.entries(skillCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([skill, count]) => ({ skill, count }));

    await this.updateInsight(companyId, 'top_skills', async () => topSkills);
  }

  /**
   * Get the collective intelligence card for a company.
   */
  async getCompanyCard(companyId: string) {
    const insights = await prisma.collectiveInsight.findMany({
      where: { companyId },
    });

    const card: Record<string, any> = {};
    for (const insight of insights) {
      try {
        card[insight.insightType] = JSON.parse(insight.contentJson);
      } catch {
        card[insight.insightType] = insight.contentJson;
      }
    }
    return card;
  }

  /**
   * Get aggregated industry insights.
   */
  async getIndustryInsights() {
    const companies = await prisma.company.findMany({
      select: { id: true, industry: true },
      where: { industry: { not: null } },
    });

    const byIndustry: Record<string, string[]> = {};
    for (const c of companies) {
      if (c.industry) {
        if (!byIndustry[c.industry]) byIndustry[c.industry] = [];
        byIndustry[c.industry]!.push(c.id);
      }
    }

    const result: Record<string, any> = {};
    for (const [industry, companyIds] of Object.entries(byIndustry)) {
      const jobs = await prisma.job.findMany({
        where: { companyId: { in: companyIds }, status: 'ACTIVE' },
        select: { salaryMin: true, salaryMax: true },
      });
      const salaries = jobs.filter(j => j.salaryMin).map(j => j.salaryMin!);
      result[industry] = {
        jobCount: jobs.length,
        companyCount: companyIds.length,
        avgSalary: salaries.length > 0 ? Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length) : null,
      };
    }
    return result;
  }

  // ─── Private helpers ───

  private async updateInsight(companyId: string, insightType: string, computeFn: () => Promise<any>) {
    const content = await computeFn();
    const contentJson = JSON.stringify(content);

    const existing = await prisma.collectiveInsight.findFirst({
      where: { companyId, insightType },
    });

    if (existing) {
      await prisma.collectiveInsight.update({
        where: { id: existing.id },
        data: {
          contentJson,
          sourceCount: { increment: 1 },
          confidenceScore: Math.min(1, existing.confidenceScore + 0.05),
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.collectiveInsight.create({
        data: {
          companyId,
          insightType,
          contentJson,
          sourceCount: 1,
          confidenceScore: 0.3,
        },
      });
    }
  }
}

export const collectiveService = new CollectiveService();
