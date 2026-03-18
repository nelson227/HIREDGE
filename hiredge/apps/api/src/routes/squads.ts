import { FastifyPluginAsync } from 'fastify';
import { sendSquadMessageSchema } from '@hiredge/shared';
import { squadService } from '../services/squad.service';
import { squadMatchingService } from '../services/squad-matching.service';
import { AppError } from '../services/auth.service';
import { emitToSquad } from '../lib/websocket';
import { notificationService } from '../services/notification.service';
import prisma from '../db/prisma';
import path from 'path';
import fs from 'fs/promises';

const squadRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  // Helper : notifier les membres inactifs d'une squad lors d'un nouveau message
  async function notifySquadMembersOfMessage(squadId: string, senderId: string, senderName: string, messagePreview: string) {
    const members = await prisma.squadMember.findMany({
      where: { squadId, isActive: true, userId: { not: senderId } },
      select: { userId: true },
    });
    const squad = await prisma.squad.findUnique({ where: { id: squadId }, select: { name: true } });
    const truncated = messagePreview.length > 60 ? messagePreview.slice(0, 60) + '…' : messagePreview;
    for (const m of members) {
      notificationService.createNotification(m.userId, {
        type: 'SQUAD_MESSAGE',
        title: `💬 ${senderName} — ${squad?.name ?? 'Escouade'}`,
        body: truncated,
        actionUrl: `/squad?id=${squadId}`,
        metadata: { squadId },
      }).catch(() => {});
    }
  }

  // POST /squads — Create a squad
  fastify.post('/', async (request, reply) => {
    const { name, description, industry } = request.body as { name: string; description?: string; industry?: string };
    if (!name || name.length < 3) {
      return reply.status(400).send({
        success: false, error: { code: 'VALIDATION_ERROR', message: 'Nom d\'escouade requis (min 3 caractères)' },
      });
    }

    try {
      const squad = await squadService.createSquad(request.user.id, { name, description, industry });
      return reply.status(201).send({ success: true, data: squad });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /squads/mine — Get current user's squads (multi-squad) with unread counts
  fastify.get('/mine', async (request, reply) => {
    try {
      const squads = await squadService.getMySquads(request.user.id);

      // Calculer les messages non lus pour chaque squad
      const squadsWithUnread = await Promise.all(
        (squads as any[]).map(async (squad) => {
          const membership = await prisma.squadMember.findFirst({
            where: { squadId: squad.id, userId: request.user.id, isActive: true },
            select: { lastReadAt: true },
          });
          const lastReadAt = membership?.lastReadAt ?? new Date(0);
          const unreadCount = await prisma.squadMessage.count({
            where: {
              squadId: squad.id,
              createdAt: { gt: lastReadAt },
              userId: { not: request.user.id },
              deletedForAll: false,
            },
          });
          return { ...squad, unreadCount };
        })
      );

      return reply.send({ success: true, data: squadsWithUnread });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /squads/suggestions — Get AI-matched squad suggestions for a job application
  fastify.get('/suggestions', async (request, reply) => {
    const { jobId } = request.query as { jobId?: string };
    if (!jobId) {
      return reply.status(400).send({
        success: false, error: { code: 'VALIDATION_ERROR', message: 'jobId requis' },
      });
    }

    try {
      const shouldSuggest = await squadMatchingService.shouldSuggestSquad(request.user.id);
      if (!shouldSuggest) {
        return reply.send({ success: true, data: { show: false, squads: [] } });
      }
      const squads = await squadMatchingService.findMatchingSquads(request.user.id, jobId);
      return reply.send({ success: true, data: { show: true, squads } });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // POST /squads/dismiss — Dismiss squad suggestion (cooldown)
  fastify.post('/dismiss', async (request, reply) => {
    try {
      await squadMatchingService.dismissSuggestion(request.user.id);
      return reply.send({ success: true, data: { message: 'Suggestion ignorée' } });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // POST /squads/join — Join a squad (by code/ID in body)
  fastify.post('/join', async (request, reply) => {
    const { code, squadId } = request.body as { code?: string; squadId?: string };
    const id = code || squadId;
    if (!id) {
      return reply.status(400).send({
        success: false, error: { code: 'VALIDATION_ERROR', message: 'Code ou ID d\'escouade requis' },
      });
    }
    try {
      await squadService.joinSquad(request.user.id, id);
      return reply.send({ success: true, data: { message: 'Vous avez rejoint l\'escouade' } });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // POST /squads/leave — Leave a specific squad (body: { squadId })
  fastify.post('/leave', async (request, reply) => {
    const { squadId } = request.body as { squadId?: string };
    try {
      if (squadId) {
        await squadService.leaveSquad(request.user.id, squadId);
      } else {
        // Legacy: leave first squad
        const squad = await squadService.getMySquad(request.user.id);
        if (!squad) {
          return reply.status(404).send({
            success: false, error: { code: 'NO_SQUAD', message: 'Vous n\'êtes dans aucune escouade' },
          });
        }
        await squadService.leaveSquad(request.user.id, squad.id);
      }
      return reply.send({ success: true, data: { message: 'Vous avez quitté l\'escouade' } });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /squads/available — Find squads to join
  fastify.get('/available', async (request, reply) => {
    const { industry, jobFamily, experienceLevel } = request.query as { industry?: string; jobFamily?: string; experienceLevel?: string };
    try {
      const squads = await squadService.findAvailableSquads(request.user.id, { industry, jobFamily, experienceLevel });
      return reply.send({ success: true, data: squads });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // POST /squads/:id/join
  fastify.post('/:id/join', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await squadService.joinSquad(request.user.id, id);
      return reply.send({ success: true, data: { message: 'Vous avez rejoint l\'escouade' } });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // POST /squads/:id/leave
  fastify.post('/:id/leave', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await squadService.leaveSquad(request.user.id, id);
      return reply.send({ success: true, data: { message: 'Vous avez quitté l\'escouade' } });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /squads/:id
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const squad = await squadService.getSquadDetails(request.user.id, id);
      return reply.send({ success: true, data: squad });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /squads/:id/members
  fastify.get('/:id/members', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const membership = await prisma.squadMember.findFirst({
        where: { squadId: id, userId: request.user.id, isActive: true },
      });
      if (!membership) {
        return reply.status(403).send({
          success: false, error: { code: 'NOT_MEMBER', message: 'Vous n\'êtes pas membre de cette escouade' },
        });
      }

      const members = await prisma.squadMember.findMany({
        where: { squadId: id, isActive: true },
        include: { user: { select: { id: true, email: true, lastActiveAt: true, candidateProfile: { select: { firstName: true, lastName: true, title: true, avatarUrl: true } } } } },
        orderBy: { joinedAt: 'asc' },
      });
      return reply.send({ success: true, data: members });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // ─── Events ──────────────────────────────────────────────────────

  // POST /squads/:id/events — Create an event
  fastify.post('/:id/events', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { title?: string; type?: string; scheduledAt?: string; duration?: number; link?: string };
    if (!body.title || !body.scheduledAt) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'title et scheduledAt requis' } });
    }
    try {
      const event = await squadService.createEvent(request.user.id, id, {
        title: body.title,
        type: body.type || 'MEETING',
        scheduledAt: body.scheduledAt,
        duration: body.duration,
        link: body.link,
      });

      // Notifier tous les membres de la squad (sauf le créateur)
      const members = await prisma.squadMember.findMany({
        where: { squadId: id, isActive: true, userId: { not: request.user.id } },
        select: { userId: true },
      });
      const squad = await prisma.squad.findUnique({ where: { id }, select: { name: true } });
      const typeLabels: Record<string, string> = { MEETING: 'réunion', CALL: 'appel', WORKSHOP: 'atelier', EVENT: 'événement' };
      const typeLabel = typeLabels[body.type || 'MEETING'] || 'événement';
      for (const m of members) {
        notificationService.createNotification(m.userId, {
          type: 'SQUAD_EVENT',
          title: `Nouvel ${typeLabel} planifié 📅`,
          body: `${body.title} — ${squad?.name ?? 'votre escouade'}`,
          actionUrl: `/squad?id=${id}`,
        }).catch(() => {});
      }

      return reply.status(201).send({ success: true, data: event });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /squads/:id/events — List upcoming events
  fastify.get('/:id/events', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const events = await squadService.getEvents(request.user.id, id);
      return reply.send({ success: true, data: events });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // ─── Voice Messages ───────────────────────────────────────────────

  // POST /squads/:id/voice — Upload voice message
  fastify.post('/:id/voice', async (request, reply) => {
    const { id } = request.params as { id: string };

    // Verify membership
    const membership = await prisma.squadMember.findFirst({
      where: { squadId: id, userId: request.user.id, isActive: true },
    });
    if (!membership) {
      return reply.status(403).send({ success: false, error: { code: 'NOT_MEMBER', message: 'Vous n\'êtes pas membre de cette escouade' } });
    }

    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ success: false, error: { code: 'NO_FILE', message: 'Aucun fichier audio envoyé' } });
    }

    const allowedMimes = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'];
    if (!allowedMimes.includes(data.mimetype)) {
      return reply.status(400).send({ success: false, error: { code: 'INVALID_FORMAT', message: 'Format audio non supporté' } });
    }

    const buffer = await data.toBuffer();
    if (buffer.length > 2 * 1024 * 1024) {
      return reply.status(400).send({ success: false, error: { code: 'FILE_TOO_LARGE', message: 'Le fichier audio ne doit pas dépasser 2 Mo' } });
    }

    try {
      const ext = data.mimetype === 'audio/webm' ? '.webm' : data.mimetype === 'audio/ogg' ? '.ogg' : data.mimetype === 'audio/mp4' ? '.m4a' : data.mimetype === 'audio/mpeg' ? '.mp3' : '.wav';
      const filename = `${request.user.id}_${Date.now()}${ext}`;

      // Best-effort disk write — may fail on Railway (ephemeral filesystem)
      try {
        const voiceDir = path.join(process.cwd(), 'uploads', 'voice', id);
        await fs.mkdir(voiceDir, { recursive: true });
        await fs.writeFile(path.join(voiceDir, filename), buffer);
      } catch { /* ignore — DB is the source of truth */ }

      const voiceUrl = `/uploads/voice/${id}/${filename}`;

      // Create message with VOICE type — store binary in DB for persistence
      const message = await prisma.squadMessage.create({
        data: {
          squadId: id,
          userId: request.user.id,
          content: voiceUrl,
          type: 'VOICE',
          audioData: buffer,
          audioMimeType: data.mimetype,
        },
        include: {
          user: { select: { id: true, candidateProfile: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
          replyTo: { select: { id: true, content: true, user: { select: { candidateProfile: { select: { firstName: true } } } } } },
        },
      });

      emitToSquad(id, 'squad:new_message', message);
      notifySquadMembersOfMessage(id, request.user.id, (message as any).user?.candidateProfile?.firstName ?? 'Un membre', '🎙️ Message vocal').catch(() => {});
      return reply.status(201).send({ success: true, data: message });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /squads/:id/voice/:messageId — Stream voice from DB
  fastify.get('/:id/voice/:messageId', async (request, reply) => {
    const { id, messageId } = request.params as { id: string; messageId: string };

    // Verify membership
    const membership = await prisma.squadMember.findFirst({
      where: { squadId: id, userId: request.user.id, isActive: true },
    });
    if (!membership) {
      return reply.status(403).send({ success: false, error: { code: 'NOT_MEMBER', message: 'Accès refusé' } });
    }

    const message = await prisma.squadMessage.findFirst({
      where: { id: messageId, squadId: id, type: 'VOICE' },
      select: { audioData: true, audioMimeType: true, content: true },
    });

    if (!message) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Message vocal introuvable' } });
    }

    // Serve from DB if available
    if (message.audioData) {
      return reply
        .type(message.audioMimeType || 'audio/webm')
        .header('Content-Disposition', 'inline')
        .header('Cache-Control', 'public, max-age=31536000, immutable')
        .send(Buffer.from(message.audioData));
    }

    // Fallback: try filesystem
    const filePath = path.join(process.cwd(), message.content);
    try {
      await fs.access(filePath);
      return reply.sendFile(path.basename(filePath), path.dirname(filePath));
    } catch {
      return reply.status(404).send({ success: false, error: { code: 'VOICE_UNAVAILABLE', message: 'Fichier vocal non disponible' } });
    }
  });

  // POST /squads/:id/messages
  fastify.post('/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = sendSquadMessageSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error?.issues[0]?.message ?? 'Erreur de validation' },
      });
    }

    try {
      const message = await squadService.sendMessage(request.user.id, id, {
        content: parsed.data.content,
        type: parsed.data.type,
        replyToId: parsed.data.replyToId,
      });
      emitToSquad(id, 'squad:new_message', message);
      notifySquadMembersOfMessage(id, request.user.id, (message as any).user?.candidateProfile?.firstName ?? 'Un membre', parsed.data.content).catch(() => {});
      return reply.status(201).send({ success: true, data: message });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /squads/:id/messages
  fastify.get('/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { cursor, limit } = request.query as { cursor?: string; limit?: string };

    try {
      const messages = await squadService.getMessages(
        request.user.id, id, cursor, limit ? parseInt(limit) : undefined,
      );
      return reply.send({ success: true, data: messages });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // POST /squads/:id/messages/:messageId/reaction
  fastify.post('/:id/messages/:messageId/reaction', async (request, reply) => {
    const { id, messageId } = request.params as { id: string; messageId: string };
    const { emoji } = request.body as { emoji: string };
    if (!emoji) return reply.status(400).send({ success: false, error: { code: 'MISSING_EMOJI', message: 'Emoji requis' } });
    try {
      const result = await squadService.toggleReaction(request.user.id, id, messageId, emoji);
      emitToSquad(id, 'squad:reaction', { messageId, userId: request.user.id, ...result });
      return reply.send({ success: true, data: result });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // POST /squads/:id/messages/:messageId/pin
  fastify.post('/:id/messages/:messageId/pin', async (request, reply) => {
    const { id, messageId } = request.params as { id: string; messageId: string };
    try {
      const result = await squadService.togglePin(request.user.id, id, messageId);
      emitToSquad(id, 'squad:pin', { messageId, ...result });
      return reply.send({ success: true, data: result });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // POST /squads/:id/messages/:messageId/important
  fastify.post('/:id/messages/:messageId/important', async (request, reply) => {
    const { id, messageId } = request.params as { id: string; messageId: string };
    try {
      const result = await squadService.toggleImportant(request.user.id, id, messageId);
      emitToSquad(id, 'squad:important', { messageId, ...result });
      return reply.send({ success: true, data: result });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // DELETE /squads/:id/messages/:messageId
  fastify.delete('/:id/messages/:messageId', async (request, reply) => {
    const { id, messageId } = request.params as { id: string; messageId: string };
    const { mode } = request.query as { mode?: string };
    const deleteMode = mode === 'FOR_ALL' ? 'FOR_ALL' : 'FOR_ME';
    try {
      const result = await squadService.deleteMessage(request.user.id, id, messageId, deleteMode as any);
      if (result.mode === 'FOR_ALL') {
        emitToSquad(id, 'squad:delete', { messageId, mode: 'FOR_ALL' });
      }
      return reply.send({ success: true, data: result });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // PATCH /squads/:id/read — Marquer les messages comme lus
  fastify.patch('/:id/read', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await prisma.squadMember.updateMany({
        where: { squadId: id, userId: request.user.id, isActive: true },
        data: { lastReadAt: new Date() },
      });
      return reply.send({ success: true });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // GET /squads/:id/competition — Detect competition within squad (#13)
  fastify.get('/:id/competition', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const conflicts = await squadService.detectCompetition(id);
      return reply.send({ success: true, data: { conflicts, hasConflicts: conflicts.length > 0 } });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });
};

export default squadRoutes;
