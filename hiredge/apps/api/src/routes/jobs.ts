import { FastifyPluginAsync } from 'fastify';
import { searchJobsSchema } from '@hiredge/shared';
import { jobService } from '../services/job.service';
import { adzunaService } from '../services/adzuna.service';
import { AppError } from '../services/auth.service';
import OpenAI from 'openai';
import { env } from '../config/env';
import prisma from '../db/prisma';
import redis from '../lib/redis';

const isLLMEnabled =
  env.OPENAI_API_KEY.length > 20 &&
  !env.OPENAI_API_KEY.startsWith('sk-...');

const openai = isLLMEnabled
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY, baseURL: 'https://api.groq.com/openai/v1' })
  : null;

const jobRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /jobs/import — import jobs from Adzuna (auth required)
  fastify.post('/import', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { keywords, location, country, maxPages } = request.body as {
      keywords?: string;
      location?: string;
      country?: string;
      maxPages?: number;
    };

    // Cap maxPages to prevent abuse
    const safeMaxPages = Math.min(Math.max(1, maxPages || 3), 10);

    try {
      const result = await adzunaService.importJobs({
        keywords: keywords || 'developer',
        location: location || 'Montreal',
        country: country || 'canada',
        maxPages: safeMaxPages,
      });

      return reply.send({
        success: true,
        data: result,
        message: `${result.imported} offres importées sur ${result.fetched} récupérées`,
      });
    } catch (err: any) {
      request.log.error(err, 'Import error');
      return reply.status(500).send({
        success: false,
        error: { code: 'IMPORT_ERROR', message: 'Erreur lors de l\'importation des offres' },
      });
    }
  });

  // GET /jobs/search — public, optionalAuthenticate enriches with match scores
  fastify.get('/search', { preHandler: [fastify.optionalAuthenticate] }, async (request, reply) => {
    const parsed = searchJobsSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error?.issues[0]?.message ?? 'Erreur de validation' },
      });
    }

    try {
      const userId = request.user?.id ?? '';
      const result = await jobService.searchJobs(userId, {
        query: parsed.data.q,
        location: parsed.data.location,
        contractType: parsed.data.contract,
        remote: parsed.data.remote === 'remote' ? true : parsed.data.remote === 'onsite' ? false : undefined,
        salaryMin: parsed.data.salaryMin,
        experienceLevel: parsed.data.experienceLevel,
        postedAfter: parsed.data.postedAfter ? new Date(parsed.data.postedAfter) : undefined,
        page: parsed.data.page,
        limit: parsed.data.limit,
      });
      return reply.send({ success: true, data: result.jobs, pagination: result.pagination });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({
          success: false,
          error: { code: err.code, message: err.message },
        });
      }
      throw err;
    }
  });

  // GET /jobs/recommended — auth required
  fastify.get('/recommended', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { limit } = request.query as { limit?: string };
    const parsedLimit = limit ? parseInt(limit, 10) : 20;

    try {
      const jobs = await jobService.getMatchedJobs(request.user.id, Number.isNaN(parsedLimit) ? 20 : Math.min(parsedLimit, 100));
      return reply.send({ success: true, data: jobs });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({
          success: false,
          error: { code: err.code, message: err.message },
        });
      }
      throw err;
    }
  });

  // GET /jobs/:id — public, optionalAuthenticate enriches with match details
  fastify.get('/:id', { preHandler: [fastify.optionalAuthenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user?.id || undefined;

    try {
      const job = await jobService.getJobById(id, userId || undefined);
      return reply.send({ success: true, data: job });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({
          success: false,
          error: { code: err.code, message: err.message },
        });
      }
      throw err;
    }
  });

  // GET /jobs/:id/cover-letter — generate tailored cover letter
  fastify.get('/:id/cover-letter', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.id;

    const cacheKey = `coverletter:${userId}:${id}`;
    const cached = await redis.get(cacheKey);
    if (cached) return reply.send({ success: true, data: JSON.parse(cached) });

    const job = await jobService.getJobById(id, userId);
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId },
      include: { skills: true, experiences: true },
    });

    if (!profile) {
      return reply.status(400).send({
        success: false,
        error: { code: 'NO_PROFILE', message: 'Complète ton profil pour générer une lettre de motivation.' },
      });
    }

    if (!openai) {
      return reply.send({
        success: true,
        data: {
          coverLetter: `Madame, Monsieur,\n\nVotre offre de ${job.title} chez ${job.company?.name || 'votre entreprise'} a retenu toute mon attention.\n\nFort(e) de mon expérience en tant que ${profile.title || 'professionnel'}, je suis convaincu(e) que mes compétences correspondent parfaitement aux exigences du poste.\n\nJe me tiens à votre disposition pour un entretien.\n\nCordialement`,
          generatedAt: new Date().toISOString(),
        },
      });
    }

    const skillsList = profile.skills?.map((s: any) => s.name).join(', ') || 'non renseignées';
    const expList = profile.experiences?.map((e: any) => `${e.title} chez ${e.company} (${e.startDate ? new Date(e.startDate).getFullYear() : '?'}-${e.current ? 'présent' : e.endDate ? new Date(e.endDate).getFullYear() : '?'})`).join('; ') || 'non renseignées';
    const jobSkills = Array.isArray(job.requiredSkills) ? job.requiredSkills.join(', ') : '';

    try {
      const response = await openai.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `Tu es un expert en rédaction de lettres de motivation professionnelles en français. Rédige une lettre de motivation percutante, personnalisée et naturelle. La lettre doit :
- Être adressée à l'entreprise spécifique
- Mettre en avant les compétences du candidat qui correspondent au poste
- Être concise (250-350 mots max)
- Avoir un ton professionnel mais chaleureux
- Ne PAS inventer de compétences ou expériences que le candidat n'a pas
- Commencer directement par "Madame, Monsieur," sans en-tête
- Finir par une formule de politesse simple`,
          },
          {
            role: 'user',
            content: `CANDIDAT:
- Poste actuel: ${profile.title || 'Non renseigné'}
- Compétences: ${skillsList}
- Expériences: ${expList}
- Ville: ${profile.city || 'Non renseignée'}

OFFRE:
- Poste: ${job.title}
- Entreprise: ${job.company?.name || 'Non renseignée'}
- Secteur: ${job.company?.industry || 'Non renseigné'}
- Lieu: ${job.location}
- Compétences requises: ${jobSkills}
- Description: ${(job.description || '').slice(0, 800)}

Rédige la lettre de motivation.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const coverLetter = response.choices[0]?.message?.content?.trim() || '';
      const result = { coverLetter, generatedAt: new Date().toISOString() };

      await redis.setex(cacheKey, 3600, JSON.stringify(result));
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      request.log.error(err, 'Cover letter generation failed');
      return reply.status(500).send({
        success: false,
        error: { code: 'GENERATION_ERROR', message: 'Erreur lors de la génération de la lettre.' },
      });
    }
  });

  // GET /jobs/:id/company-analysis — generate company analysis
  fastify.get('/:id/company-analysis', { preHandler: [fastify.optionalAuthenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const cacheKey = `companyanalysis:${id}`;
    const cached = await redis.get(cacheKey);
    if (cached) return reply.send({ success: true, data: JSON.parse(cached) });

    const job = await jobService.getJobById(id);
    const company = job.company;
    if (!company) {
      return reply.send({
        success: true,
        data: { companyName: 'Entreprise inconnue', analysis: null },
      });
    }

    // Get stats from our DB
    const jobCount = await prisma.job.count({ where: { companyId: company.id, status: 'ACTIVE' } });
    const allJobs = await prisma.job.findMany({
      where: { companyId: company.id },
      select: { title: true, requiredSkills: true, location: true, remote: true, salaryMin: true, salaryMax: true, contractType: true },
      take: 20,
    });

    const topSkills = new Map<string, number>();
    for (const j of allJobs) {
      const skills: string[] = typeof j.requiredSkills === 'string' ? JSON.parse(j.requiredSkills || '[]') : (j.requiredSkills ?? []);
      for (const s of skills) {
        topSkills.set(s, (topSkills.get(s) || 0) + 1);
      }
    }
    const sortedSkills = [...topSkills.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([s]) => s);
    const locations = [...new Set(allJobs.map(j => j.location).filter(Boolean))];
    const hasRemote = allJobs.some(j => j.remote);

    let aiAnalysis: string | null = null;
    if (openai) {
      try {
        const r = await openai.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `Tu es un analyste d'entreprises. Fournis une analyse concise en français d'une entreprise pour aider un candidat à se préparer. Inclus : présentation générale, culture d'entreprise présumée, technologies utilisées, et conseils pour un entretien. Sois factuel, base-toi uniquement sur les données fournies. 200-300 mots max.`,
            },
            {
              role: 'user',
              content: `ENTREPRISE: ${company.name}
Secteur: ${company.industry || 'Non renseigné'}
Localisation: ${company.location || locations.join(', ') || 'Non renseignée'}
Offres actives: ${jobCount}
Technologies/compétences demandées: ${sortedSkills.join(', ') || 'Non disponible'}
Postes types: ${allJobs.slice(0, 5).map(j => j.title).join(', ')}
Télétravail: ${hasRemote ? 'Oui, certains postes' : 'Non mentionné'}

Analyse cette entreprise pour un candidat.`,
            },
          ],
          temperature: 0.5,
          max_tokens: 600,
        });
        aiAnalysis = r.choices[0]?.message?.content?.trim() || null;
      } catch (err) {
        request.log.error(err, 'Company analysis generation failed');
      }
    }

    const result = {
      companyName: company.name,
      industry: company.industry,
      location: company.location || locations[0],
      activeJobCount: jobCount,
      topSkills: sortedSkills,
      locations,
      hasRemote,
      jobTitles: allJobs.slice(0, 8).map(j => j.title),
      analysis: aiAnalysis,
    };

    await redis.setex(cacheKey, 3600, JSON.stringify(result));
    return reply.send({ success: true, data: result });
  });
};

export default jobRoutes;
