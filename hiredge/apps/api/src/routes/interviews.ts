import { FastifyPluginAsync } from 'fastify';
import { startSimulationSchema } from '@hiredge/shared';
import { interviewSimService } from '../services/interview.service';
import { speechAnalysisService } from '../services/speech-analysis.service';
import { AppError } from '../services/auth.service';
import { emitToUser } from '../lib/websocket';

const interviewRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  const llmRateLimit = {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute',
      },
    },
  };

  // GET /interviews — List upcoming interviews (scheduled)
  fastify.get('/', async (request, reply) => {
    try {
      const interviews = await interviewSimService.getUpcomingInterviews(request.user.id);
      return reply.send({ success: true, data: interviews });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // POST /interviews/start — Start a new simulation
  fastify.post('/start', llmRateLimit, async (request, reply) => {
    const parsed = startSimulationSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error?.issues[0]?.message ?? 'Erreur de validation' },
      });
    }

    try {
      const result = await interviewSimService.startSimulation(request.user.id, parsed.data);
      emitToUser(request.user.id, 'interview:started', result);
      return reply.status(201).send({ success: true, data: result });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // POST /interviews/:id/respond — Send a response during simulation
  fastify.post('/:id/respond', llmRateLimit, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { response, message, durationSeconds, eyeContactPct, responseTimeMs } = request.body as {
      response?: string; message?: string;
      durationSeconds?: number; eyeContactPct?: number; responseTimeMs?: number;
    };
    const text = response || message || '';

    if (!text || text.trim().length === 0) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Réponse requise' },
      });
    }

    try {
      const result = await interviewSimService.respondToSimulation(request.user.id, id, text, {
        durationSeconds, eyeContactPct, responseTimeMs,
      });
      return reply.send({ success: true, data: result });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // POST /interviews/:id/message — Alias for /respond (frontend compatibility)
  fastify.post('/:id/message', llmRateLimit, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { message, response, durationSeconds, eyeContactPct, responseTimeMs } = request.body as {
      message?: string; response?: string;
      durationSeconds?: number; eyeContactPct?: number; responseTimeMs?: number;
    };
    const text = message || response || '';

    if (!text || text.trim().length === 0) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Message requis' },
      });
    }

    try {
      const result = await interviewSimService.respondToSimulation(request.user.id, id, text, {
        durationSeconds, eyeContactPct, responseTimeMs,
      });
      return reply.send({ success: true, data: result });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // POST /interviews/:id/end — End a simulation early
  fastify.post('/:id/end', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const simulation = await interviewSimService.getSimulationDetails(request.user.id, id);
      emitToUser(request.user.id, 'interview:completed', simulation);
      return reply.send({ success: true, data: simulation });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /interviews/history — Get past simulations
  fastify.get('/history', async (request, reply) => {
    try {
      const simulations = await interviewSimService.getSimulationHistory(request.user.id);
      return reply.send({ success: true, data: simulations });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /interviews/:id — Get simulation details
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const simulation = await interviewSimService.getSimulationDetails(request.user.id, id);
      return reply.send({ success: true, data: simulation });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // POST /interviews/start-stress — Start stress mode simulation (#21)
  fastify.post('/start-stress', llmRateLimit, async (request, reply) => {
    const body = request.body as any;
    try {
      const result = await interviewSimService.startStressSimulation(request.user.id, {
        jobId: body.jobId,
        companyName: body.companyName,
        jobTitle: body.jobTitle,
      });
      return reply.status(201).send({ success: true, data: result });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /interviews/:id/report — Generate full report (#18)
  fastify.get('/:id/report', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const report = await interviewSimService.generateFullReport(request.user.id, id);
      return reply.send({ success: true, data: report });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /interviews/:id/replay — Get annotated replay (#17)
  fastify.get('/:id/replay', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const replay = await interviewSimService.getReplay(request.user.id, id);
      return reply.send({ success: true, data: replay });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // ─── NEW: Performance Analytics ─────────────────────────────────
  // GET /interviews/analytics — User performance dashboard data
  fastify.get('/analytics', async (request, reply) => {
    try {
      const analytics = await speechAnalysisService.getPerformanceAnalytics(request.user.id);
      return reply.send({ success: true, data: analytics });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /interviews/:id/metrics — Detailed session metrics (speech, confidence, per-question)
  fastify.get('/:id/metrics', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const details = await speechAnalysisService.getSessionDetails(request.user.id, id);
      return reply.send({ success: true, data: details });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // POST /interviews/:id/voice — Submit audio response for transcription + analysis
  fastify.post('/:id/voice', {
    config: { rateLimit: { max: 3, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({
          success: false,
          error: { code: 'NO_AUDIO', message: 'Fichier audio requis' },
        });
      }

      const chunks: Buffer[] = [];
      for await (const chunk of data.file) {
        chunks.push(chunk);
      }
      const audioBuffer = Buffer.concat(chunks);

      // Size limit: 25MB
      if (audioBuffer.length > 25 * 1024 * 1024) {
        return reply.status(400).send({
          success: false,
          error: { code: 'FILE_TOO_LARGE', message: 'Fichier audio trop volumineux (max 25MB)' },
        });
      }

      // Transcribe audio via Whisper
      const transcription = await speechAnalysisService.transcribeAudio(audioBuffer);

      // Process as a regular text response with duration metadata
      const result = await interviewSimService.respondToSimulation(request.user.id, id, transcription.text, {
        durationSeconds: transcription.duration,
      });

      return reply.send({
        success: true,
        data: {
          ...result,
          transcription: {
            text: transcription.text,
            duration: transcription.duration,
            segments: transcription.segments,
          },
        },
      });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // POST /interviews/from-url — Generate interview questions from a job listing URL
  fastify.post('/from-url', llmRateLimit, async (request, reply) => {
    const { url, type } = request.body as { url: string; type?: string };

    if (!url || typeof url !== 'string') {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'URL requise' },
      });
    }

    // Basic URL validation
    try { new URL(url); } catch {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_URL', message: 'URL invalide' },
      });
    }

    try {
      const result = await interviewSimService.startFromJobUrl(request.user.id, url, type);
      emitToUser(request.user.id, 'interview:started', result);
      return reply.status(201).send({ success: true, data: result });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });
};

export default interviewRoutes;
