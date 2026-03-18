import { FastifyPluginAsync } from 'fastify';
import { exportService } from '../services/export.service';
import { AppError } from '../services/auth.service';
import OpenAI from 'openai';
import { env } from '../config/env';

const isLLMEnabled =
  env.OPENAI_API_KEY.length > 20 &&
  !env.OPENAI_API_KEY.startsWith('sk-...');

const openai = isLLMEnabled
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY, baseURL: 'https://api.groq.com/openai/v1' })
  : null;

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
        ? Math.round(simulations.reduce((sum: number, s: { score: number | null }) => sum + (s.score ?? 0), 0) / simulations.length)
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
      // Load jobs and candidate profile in parallel
      const [jobs, profile] = await Promise.all([
        fastify.prisma.job.findMany({
          where: { id: { in: jobIds } },
          include: { company: true },
        }),
        fastify.prisma.candidateProfile.findUnique({
          where: { userId: request.user.id },
          include: { skills: true },
        }),
      ]);

      const candidateSkills = (profile?.skills || []).map((s: { name: string }) => s.name.toLowerCase());
      const candidateLocation = profile?.city?.toLowerCase() || '';
      const candidateExperience = profile?.yearsExperience || 0;
      const candidateSalaryMin = profile?.salaryMin || 0;
      const candidateSalaryMax = profile?.salaryMax || 0;

      const comparison = jobs.map((job: any) => {
        const jobSkills: string[] = (() => {
          try { return JSON.parse(job.requiredSkills || '[]'); } catch { return []; }
        })();
        const jobSkillsLower = jobSkills.map((s: string) => s.toLowerCase());

        // Skills overlap score (40%)
        const matchingSkills = candidateSkills.filter((s: string) =>
          jobSkillsLower.some((js: string) => js.includes(s) || s.includes(js))
        );
        const skillScore = jobSkillsLower.length > 0
          ? Math.min(100, Math.round((matchingSkills.length / jobSkillsLower.length) * 100))
          : 50;

        // Salary alignment (25%)
        let salaryScore = 50;
        if (job.salaryMin && candidateSalaryMin) {
          if (job.salaryMax >= candidateSalaryMin && job.salaryMin <= candidateSalaryMax) {
            salaryScore = 90;
          } else if (job.salaryMax >= candidateSalaryMin * 0.9) {
            salaryScore = 70;
          } else {
            salaryScore = 30;
          }
        }

        // Location match (20%)
        let locationScore = 50;
        if (candidateLocation) {
          const jobLoc = (job.location || '').toLowerCase();
          if (jobLoc.includes(candidateLocation) || candidateLocation.includes(jobLoc.split(',')[0]?.trim() || '')) {
            locationScore = 100;
          } else if (job.remote) {
            locationScore = 80;
          } else {
            locationScore = 20;
          }
        } else if (job.remote) {
          locationScore = 80;
        }

        // Experience match (15%)
        let experienceScore = 50;
        if (job.experienceMin != null) {
          if (candidateExperience >= job.experienceMin && (!job.experienceMax || candidateExperience <= job.experienceMax + 2)) {
            experienceScore = 100;
          } else if (candidateExperience >= job.experienceMin - 1) {
            experienceScore = 70;
          } else {
            experienceScore = 30;
          }
        }

        const matchScore = Math.round(
          skillScore * 0.4 + salaryScore * 0.25 + locationScore * 0.2 + experienceScore * 0.15
        );

        return {
          id: job.id,
          title: job.title,
          company: job.company?.name ?? 'N/A',
          location: job.location,
          contractType: job.contractType,
          salary: { min: job.salaryMin, max: job.salaryMax, currency: job.salaryCurrency },
          remote: job.remote,
          skills: jobSkills,
          postedAt: job.postedAt,
          source: job.source,
          matchScore,
          matchingSkills: matchingSkills.length,
          totalRequiredSkills: jobSkillsLower.length,
        };
      });

      // Sort by match score descending
      comparison.sort((a: { matchScore: number }, b: { matchScore: number }) => b.matchScore - a.matchScore);

      // Generate pros/cons/recommendation via LLM (if available)
      let enrichedJobs: any[] = comparison;
      let recommendation = '';

      if (openai && comparison.length > 0) {
        try {
          const jobSummaries = comparison.map((j: any, i: number) =>
            `${i + 1}. ${j.title} chez ${j.company} — Match: ${j.matchScore}%, Salaire: ${j.salary.min || '?'}-${j.salary.max || '?'} ${j.salary.currency || 'CAD'}, Lieu: ${j.location || 'N/A'}, Remote: ${j.remote ? 'Oui' : 'Non'}, Contrat: ${j.contractType}, Skills: ${j.skills.join(', ') || 'N/A'}`
          ).join('\n');

          const candidateSummary = `Profil: ${profile?.title || 'Candidat'}, ${candidateExperience} ans d'exp, Compétences: ${candidateSkills.join(', ')}, Lieu: ${candidateLocation || 'N/A'}, Salaire souhaité: ${candidateSalaryMin}-${candidateSalaryMax} ${profile?.salaryCurrency || 'CAD'}`;

          const response = await openai.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            temperature: 0.5,
            max_tokens: 800,
            messages: [
              {
                role: 'system',
                content: `Tu es un conseiller en carrière expert. Analyse ces offres pour un candidat.\nPour CHAQUE offre donne 2-3 avantages et 1-2 inconvénients.\nPuis une recommandation finale.\nRéponds UNIQUEMENT en JSON valide:\n{"jobs":[{"id":"...","pros":["..."],"cons":["..."]}],"recommendation":"..."}`,
              },
              {
                role: 'user',
                content: `${candidateSummary}\n\nOffres:\n${jobSummaries}`,
              },
            ],
          });

          const content = response.choices[0]?.message?.content?.trim() || '';
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.jobs && Array.isArray(parsed.jobs)) {
              enrichedJobs = comparison.map((job: any) => {
                const llmJob = parsed.jobs.find((j: any) => j.id === job.id);
                return { ...job, pros: llmJob?.pros || [], cons: llmJob?.cons || [] };
              });
            }
            recommendation = parsed.recommendation || '';
          }
        } catch (llmErr) {
          // LLM failure is non-blocking
          console.error('LLM compare enrichment failed:', llmErr);
        }
      }

      return reply.send({
        success: true,
        data: { jobs: enrichedJobs, recommendation },
      });
    } catch (err) {
      throw err;
    }
  });
};

export default analyticsRoutes;
