import prisma from '../db/prisma';

export class ExportService {
  /**
   * Export applications to CSV format.
   */
  async exportApplicationsCsv(userId: string): Promise<string> {
    const applications = await prisma.application.findMany({
      where: { userId },
      include: { job: { include: { company: true } } },
      orderBy: { appliedAt: 'desc' },
    });

    const headers = [
      'Date',
      'Entreprise',
      'Poste',
      'Localisation',
      'Type de contrat',
      'Salaire min',
      'Salaire max',
      'Statut',
      'Source',
      'Notes',
    ];

    const rows = applications.map((app) => [
      app.appliedAt.toISOString().split('T')[0],
      this.escapeCsv(app.job?.company?.name || 'N/A'),
      this.escapeCsv(app.job?.title || 'N/A'),
      this.escapeCsv(app.job?.location || 'N/A'),
      this.escapeCsv(app.job?.contractType || 'N/A'),
      app.job?.salaryMin?.toString() || '',
      app.job?.salaryMax?.toString() || '',
      app.status,
      this.escapeCsv(app.source || 'manual'),
      this.escapeCsv(app.notes || ''),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    // Add BOM for Excel UTF-8
    return '\ufeff' + csv;
  }

  /**
   * Export applications as structured JSON for PDF generation on the client.
   */
  async exportApplicationsJson(userId: string) {
    const applications = await prisma.application.findMany({
      where: { userId },
      include: { job: { include: { company: true } } },
      orderBy: { appliedAt: 'desc' },
    });

    const profile = await prisma.candidateProfile.findUnique({
      where: { userId },
    });

    const stats = {
      total: applications.length,
      byStatus: {} as Record<string, number>,
      averageResponseDays: 0,
      responseRate: 0,
    };

    let responseDaysTotal = 0;
    let responseDaysCount = 0;
    let responded = 0;

    for (const app of applications) {
      stats.byStatus[app.status] = (stats.byStatus[app.status] || 0) + 1;
      if (app.status !== 'APPLIED' && app.status !== 'PENDING') {
        responded++;
        if (app.updatedAt && app.appliedAt) {
          const days = Math.floor(
            (app.updatedAt.getTime() - app.appliedAt.getTime()) / (1000 * 60 * 60 * 24)
          );
          responseDaysTotal += days;
          responseDaysCount++;
        }
      }
    }

    stats.responseRate = applications.length > 0 ? Math.round((responded / applications.length) * 100) : 0;
    stats.averageResponseDays = responseDaysCount > 0 ? Math.round(responseDaysTotal / responseDaysCount) : 0;

    return {
      profile: {
        name: `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim(),
        title: profile?.title || '',
        exportDate: new Date().toISOString(),
      },
      stats,
      applications: applications.map((app) => ({
        date: app.appliedAt.toISOString().split('T')[0],
        company: app.job?.company?.name || 'N/A',
        title: app.job?.title || 'N/A',
        location: app.job?.location || 'N/A',
        contractType: app.job?.contractType || 'N/A',
        salary: app.job?.salaryMin
          ? `${app.job.salaryMin}€ - ${app.job?.salaryMax || '?'}€`
          : 'N/A',
        status: app.status,
        source: app.source || 'manual',
      })),
    };
  }

  /**
   * Export user profile data (GDPR compliance).
   */
  async exportUserData(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        candidateProfile: {
          include: {
            skills: true,
            experiences: true,
            educations: true,
          },
        },
        applications: { include: { job: true } },
        edgeConversations: { include: { messages: true } },
        notifications: true,
        badges: { include: { badge: true } },
      },
    });

    if (!user) return null;

    // Remove sensitive fields
    const { password, ...safeUser } = user as any;

    return {
      exportDate: new Date().toISOString(),
      user: safeUser,
    };
  }

  private escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}

export const exportService = new ExportService();
