import { FastifyPluginAsync } from 'fastify';
import { onboardingService } from '../services/onboarding.service';
import { AppError } from '../services/auth.service';

const onboardingRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  const llmRateLimit = {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  };

  // POST /onboarding/chat — Conversational onboarding step
  fastify.post('/chat', llmRateLimit, async (request, reply) => {
    const { message, step } = request.body as { message?: string; step?: string };
    try {
      const result = await onboardingService.processStep(request.user.id, message || '', step);
      return reply.send({ success: true, data: result });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /onboarding/status — Get current onboarding progress
  fastify.get('/status', async (request, reply) => {
    try {
      const profile = await fastify.prisma.candidateProfile.findUnique({
        where: { userId: request.user.id },
        select: {
          firstName: true,
          lastName: true,
          title: true,
          city: true,
          country: true,
          experienceYears: true,
          skills: { select: { name: true } },
          onboardingCompleted: true,
        },
      });

      const completedFields = [
        profile?.firstName,
        profile?.title,
        profile?.city,
        profile?.experienceYears,
        (profile?.skills?.length ?? 0) > 0,
      ].filter(Boolean).length;

      return reply.send({
        success: true,
        data: {
          isComplete: profile?.onboardingCompleted ?? false,
          progress: Math.round((completedFields / 5) * 100),
          profile,
        },
      });
    } catch (err) {
      throw err;
    }
  });
};

export default onboardingRoutes;
