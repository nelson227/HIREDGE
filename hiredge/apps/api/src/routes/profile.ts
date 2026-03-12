import { FastifyPluginAsync } from 'fastify';
import { updateProfileSchema, addSkillSchema, addExperienceSchema } from '@hiredge/shared';
import { profileService } from '../services/profile.service';
import { AppError } from '../services/auth.service';

const profileRoutes: FastifyPluginAsync = async (fastify) => {
  // All profile routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // GET /profile
  fastify.get('/', async (request, reply) => {
    try {
      const profile = await profileService.getProfile(request.user.userId);
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
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
      });
    }

    try {
      const profile = await profileService.updateProfile(request.user.userId, parsed.data);
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
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
      });
    }

    try {
      const skill = await profileService.addSkill(request.user.userId, parsed.data);
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
      await profileService.removeSkill(request.user.userId, id);
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
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
      });
    }

    try {
      const experience = await profileService.addExperience(request.user.userId, parsed.data);
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
      await profileService.removeExperience(request.user.userId, id);
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
      const education = await profileService.addEducation(request.user.userId, body);
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
      await profileService.removeEducation(request.user.userId, id);
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
};

export default profileRoutes;
