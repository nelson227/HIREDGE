import { FastifyPluginAsync } from 'fastify';
import { exportService } from '../services/export.service';
import { AppError } from '../services/auth.service';

const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  // GET /analytics/personal — Personal analytics dashboard (#22)
  fastify.get('/personal', async (request, reply) => {
    try {
      const userId = request.user.id;

      // Applications stats
      const applications = await fastify.prisma.application.findMany({
        where: { userId },
        select: { status: true, createdAt: true, updatedAt: true },
      });

      const total = applications.length;
      const byStatus: Record<string, number> = {};
      let responded = 0;
      let responseDaysSum = 0;
      let responseDaysCount = 0;
      const weeklyData: Record<string, number> = {};

      for (const app of applications) {
        byStatus[app.status] = (byStatus[app.status] || 0) + 1;
        if (app.status !== 'APPLIED' && app.status !== 'PENDING') {
          responded++;
          if (app.updatedAt && app.createdAt) {
            const days = Math.floor((app.updatedAt.getTime() - app.createdAt.getTime()) / (86400000));
            responseDaysSum += days;
            responseDaysCount++;
          }
        }
        // Weekly aggregate
        const weekKey = new Date(app.createdAt).toISOString().slice(0, 10);
        weeklyData[weekKey] = (weeklyData[weekKey] || 0) + 1;
      }

      // Interview stats
      const simulations = await fastify.prisma.interviewSimulation.findMany({
        where: { userId, status: 'COMPLETED' },
        select: { score: true },
      });
      const avgSimScore = simulations.length > 0
        ? Math.round(simulations.reduce((sum, s) => sum + (s.score ?? 0), 0) / simulations.length)
        : 0;

      // Streaks
      const streak = await fastify.prisma.streak.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      });

      return reply.send({
        success: true,
        data: {
          applications: {
            total,
            byStatus,
            responseRate: total > 0 ? Math.round((responded / total) * 100) : 0,
            averageResponseDays: responseDaysCount > 0 ? Math.round(responseDaysSum / responseDaysCount) : 0,
            weeklyChart: Object.entries(weeklyData).map(([date, count]) => ({ date, count })).slice(-30),
          },
          simulations: {
            total: simulations.length,
            averageScore: avgSimScore,
          },
          streak: {
            current: streak?.currentStreak ?? 0,
            longest: streak?.longestStreak ?? 0,
          },
          insights: {
            interviewConversionRate: (byStatus['INTERVIEW'] ?? 0) > 0
              ? Math.round(((byStatus['INTERVIEW'] ?? 0) / total) * 100) + '%'
              : '0%',
            offerConversionRate: (byStatus['OFFER'] ?? 0) > 0
              ? Math.round(((byStatus['OFFER'] ?? 0) / total) * 100) + '%'
              : '0%',
          },
        },
      });
    } catch (err) {
      throw err;
    }
  });

  // GET /analytics/export/csv — Export applications as CSV (#23)
  fastify.get('/export/csv', async (request, reply) => {
    try {
      const csv = await exportService.exportApplicationsCsv(request.user.id);
      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', 'attachment; filename="hiredge-applications.csv"');
      return reply.send(csv);
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /analytics/export/json — Export applications as JSON (for PDF rendering) (#23)
  fastify.get('/export/json', async (request, reply) => {
    try {
      const data = await exportService.exportApplicationsJson(request.user.id);
      return reply.send({ success: true, data });
    } catch (err) {
      throw err;
    }
  });

  // POST /analytics/compare — Compare multiple job offers side-by-side (#24)
  fastify.post('/compare', async (request, reply) => {
    const { jobIds } = request.body as { jobIds: string[] };
    if (!jobIds || jobIds.length < 2 || jobIds.length > 5) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Fournir entre 2 et 5 IDs d\'offres' },
      });
    }

    try {
      const jobs = await fastify.prisma.job.findMany({
        where: { id: { in: jobIds } },
        include: { company: true },
      });

      const comparison = jobs.map((job) => ({
        id: job.id,
        title: job.title,
        company: job.company?.name ?? 'N/A',
        location: job.location,
        contractType: job.contractType,
        salary: { min: job.salaryMin, max: job.salaryMax },
        remote: job.remote,
        skills: (() => { try { return JSON.parse(job.requiredSkills || '[]'); } catch { return []; } })(),
        postedAt: job.postedAt,
        source: job.source,
      }));

      return reply.send({ success: true, data: { jobs: comparison } });
    } catch (err) {
      throw err;
    }
  });
};

export default analyticsRoutes;
