import { FastifyPluginAsync } from 'fastify';
import { updateProfileSchema, addSkillSchema, addExperienceSchema } from '@hiredge/shared';
import { profileService } from '../services/profile.service';
import { cvService } from '../services/cv.service';
import { AppError } from '../services/auth.service';
import { gamificationService } from '../services/gamification.service';
import path from 'path';

const profileRoutes: FastifyPluginAsync = async (fastify) => {
  // All profile routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // GET /profile
  fastify.get('/', async (request, reply) => {
    try {
      const profile = await profileService.getProfile(request.user.id);
      return reply.send({ success: true, data: profile });
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

  // PATCH /profile
  fastify.patch('/', async (request, reply) => {
    const parsed = updateProfileSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error?.issues[0]?.message ?? 'Erreur de validation' },
      });
    }

    try {
      const profile = await profileService.updateProfile(request.user.id, parsed.data);
      return reply.send({ success: true, data: profile });
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

  // POST /profile/skills
  fastify.post('/skills', async (request, reply) => {
    const parsed = addSkillSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error?.issues[0]?.message ?? 'Erreur de validation' },
      });
    }

    try {
      const skill = await profileService.addSkill(request.user.id, parsed.data);
      return reply.status(201).send({ success: true, data: skill });
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

  // DELETE /profile/skills/:id
  fastify.delete('/skills/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await profileService.removeSkill(request.user.id, id);
      return reply.send({ success: true, data: { message: 'Compétence supprimée' } });
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

  // POST /profile/experiences
  fastify.post('/experiences', async (request, reply) => {
    const parsed = addExperienceSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error?.issues[0]?.message ?? 'Erreur de validation' },
      });
    }

    try {
      const experience = await profileService.addExperience(request.user.id, {
        company: parsed.data.company,
        title: parsed.data.title,
        description: parsed.data.description,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate ?? undefined,
        current: parsed.data.current,
      });
      return reply.status(201).send({ success: true, data: experience });
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

  // DELETE /profile/experiences/:id
  fastify.delete('/experiences/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await profileService.removeExperience(request.user.id, id);
      return reply.send({ success: true, data: { message: 'Expérience supprimée' } });
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

  // POST /profile/educations
  fastify.post('/educations', async (request, reply) => {
    const body = request.body as {
      institution: string; degree: string; field?: string;
      startDate: string; endDate?: string; current?: boolean;
    };

    if (!body.institution || !body.degree || !body.startDate) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Institution, diplôme et date de début requis' },
      });
    }

    try {
      const education = await profileService.addEducation(request.user.id, body);
      return reply.status(201).send({ success: true, data: education });
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

  // DELETE /profile/educations/:id
  fastify.delete('/educations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await profileService.removeEducation(request.user.id, id);
      return reply.send({ success: true, data: { message: 'Formation supprimée' } });
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

  // POST /profile/avatar — Upload profile picture
  fastify.post('/avatar', async (request, reply) => {
    try {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({
          success: false,
          error: { code: 'NO_FILE', message: 'Aucun fichier envoyé' },
        });
      }

      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedMimes.includes(data.mimetype)) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_FORMAT', message: 'Format non supporté. Utilisez JPG, PNG ou WebP.' },
        });
      }

      const buffer = await data.toBuffer();
      if (buffer.length > 10 * 1024 * 1024) {
        return reply.status(400).send({
          success: false,
          error: { code: 'FILE_TOO_LARGE', message: 'Le fichier est trop volumineux.' },
        });
      }

      const avatarUrl = await profileService.uploadAvatar(request.user.id, buffer, data.mimetype);
      return reply.send({ success: true, data: { avatarUrl } });
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

  // POST /profile/cv — Upload and parse CV (PDF or DOCX)
  fastify.post('/cv', async (request, reply) => {
    try {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({
          success: false,
          error: { code: 'NO_FILE', message: 'Aucun fichier envoyé' },
        });
      }

      const allowedMimes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
      ];

      if (!allowedMimes.includes(data.mimetype)) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_FORMAT', message: 'Format non supporté. Utilisez PDF ou DOCX.' },
        });
      }

      const buffer = await data.toBuffer();

      // 5MB max for CV
      if (buffer.length > 5 * 1024 * 1024) {
        return reply.status(400).send({
          success: false,
          error: { code: 'FILE_TOO_LARGE', message: 'Le fichier ne doit pas dépasser 5 Mo.' },
        });
      }

      const result = await cvService.uploadAndParse(
        request.user.id,
        buffer,
        data.mimetype,
        data.filename,
      );

      return reply.send({
        success: true,
        data: result,
      });
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

  // GET /profile/cv/download — Download the user's CV file
  fastify.get('/cv/download', async (request, reply) => {
    try {
      // Try serving from DB first (persistent across Railway deploys)
      const cvData = await cvService.getCvData(request.user.id);
      if (cvData) {
        return reply
          .type(cvData.mimeType)
          .header('Content-Disposition', 'inline; filename="cv.pdf"')
          .send(cvData.data);
      }

      // Fallback: try filesystem (works if same deploy as upload)
      const cvPath = await cvService.getCvPath(request.user.id);
      if (!cvPath) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NO_CV', message: 'Aucun CV trouvé' },
        });
      }

      const absolutePath = path.join(process.cwd(), cvPath);
      return reply.sendFile(path.basename(absolutePath), path.dirname(absolutePath));
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

  // ─── Gamification endpoints ───

  // GET /profile/badges
  fastify.get('/badges', async (request, reply) => {
    const badges = await gamificationService.getUserBadges(request.user.id);
    return reply.send({ success: true, data: badges });
  });

  // GET /profile/streak
  fastify.get('/streak', async (request, reply) => {
    const streak = await gamificationService.getUserStreak(request.user.id);
    return reply.send({ success: true, data: streak });
  });

  // ─── GDPR data export ───

  // GET /profile/export — Full RGPD data export
  fastify.get('/export', async (request, reply) => {
    const userId = request.user.id;

    const [user, profile, applications, conversations, edgeConversations, edgeMessages, notifications, squadMemberships, scouts, badges, streak] = await Promise.all([
      fastify.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true, subscriptionTier: true, createdAt: true, updatedAt: true },
      }),
      fastify.prisma.candidateProfile.findUnique({
        where: { userId },
        include: { skills: true, experiences: true, educations: true, languages: true },
      }),
      fastify.prisma.application.findMany({
        where: { userId },
        include: { job: { select: { title: true, company: { select: { name: true } } } } },
      }),
      fastify.prisma.scoutConversation.findMany({
        where: { candidateId: userId },
        include: { messages: { select: { senderType: true, content: true, createdAt: true } } },
      }),
      fastify.prisma.edgeConversation.findMany({
        where: { userId },
        select: { id: true, title: true, createdAt: true },
      }),
      fastify.prisma.edgeChatMessage.findMany({
        where: { userId },
        select: { role: true, content: true, createdAt: true, conversationId: true },
        orderBy: { createdAt: 'asc' },
      }),
      fastify.prisma.notification.findMany({
        where: { userId },
        select: { type: true, title: true, body: true, readAt: true, createdAt: true },
      }),
      fastify.prisma.squadMember.findMany({
        where: { userId },
        include: { squad: { select: { name: true, status: true } } },
      }),
      fastify.prisma.scout.findMany({
        where: { userId },
        include: { company: { select: { name: true } } },
      }),
      gamificationService.getUserBadges(userId),
      gamificationService.getUserStreak(userId),
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      user,
      profile,
      applications: applications.map((a: any) => ({
        jobTitle: a.job?.title,
        company: a.job?.company?.name,
        status: a.status,
        appliedAt: a.createdAt,
        updatedAt: a.updatedAt,
        notes: a.notes,
      })),
      scoutConversations: conversations,
      edgeConversations: edgeConversations.map((c: any) => ({
        ...c,
        messages: edgeMessages.filter((m: any) => m.conversationId === c.id),
      })),
      notifications,
      squads: squadMemberships,
      scoutProfiles: scouts,
      gamification: { badges, streak },
    };

    reply.header('Content-Type', 'application/json');
    reply.header('Content-Disposition', `attachment; filename="hiredge-export-${userId.slice(0, 8)}.json"`);
    return reply.send(exportData);
  });
};

export default profileRoutes;
