import { FastifyPluginAsync } from 'fastify';
import { linkedinService } from '../services/linkedin.service';
import { mfaService } from '../services/mfa.service';
import { exportService } from '../services/export.service';
import { AppError } from '../services/auth.service';

/**
 * Extended auth routes: LinkedIn OAuth, MFA, security features.
 */
const authExtRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── LinkedIn OAuth ───────────────────────────────────────

  // GET /auth/linkedin — Get LinkedIn OAuth URL
  fastify.get('/linkedin', { preHandler: fastify.authenticate }, async (request, reply) => {
    const state = Buffer.from(JSON.stringify({ userId: request.user.id })).toString('base64url');
    const url = linkedinService.getAuthUrl(state);
    if (!url) {
      return reply.status(503).send({
        success: false,
        error: { code: 'LINKEDIN_NOT_CONFIGURED', message: 'LinkedIn OAuth non configuré' },
      });
    }
    return reply.send({ success: true, data: { url } });
  });

  // GET /auth/linkedin/callback — LinkedIn OAuth callback
  fastify.get('/linkedin/callback', async (request, reply) => {
    const { code, state } = request.query as { code: string; state: string };
    if (!code || !state) {
      return reply.status(400).send({ success: false, error: { code: 'INVALID_CALLBACK', message: 'Paramètres manquants' } });
    }

    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString());
      const accessToken = await linkedinService.exchangeToken(code);
      if (!accessToken) {
        return reply.status(401).send({ success: false, error: { code: 'TOKEN_EXCHANGE_FAILED', message: 'Échec de l\'authentification LinkedIn' } });
      }

      const profile = await linkedinService.fetchProfile(accessToken);
      if (!profile) {
        return reply.status(502).send({ success: false, error: { code: 'PROFILE_FETCH_FAILED', message: 'Impossible de récupérer le profil LinkedIn' } });
      }

      const result = await linkedinService.importProfile(decoded.userId, profile);
      return reply.send({ success: true, data: result });
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // POST /auth/linkedin/parse — Parse copy-pasted LinkedIn text with LLM
  fastify.post('/linkedin/parse', { preHandler: fastify.authenticate }, async (request, reply) => {
    const { text } = request.body as { text: string };
    if (!text || text.length < 20) {
      return reply.status(400).send({ success: false, error: { code: 'INVALID_TEXT', message: 'Texte LinkedIn trop court' } });
    }
    try {
      const result = await linkedinService.parseLinkedInText(request.user.id, text);
      return reply.send({ success: true, data: result });
    } catch (err) {
      throw err;
    }
  });

  // ─── MFA / 2FA ────────────────────────────────────────────

  // POST /auth/mfa/setup — Initialize MFA setup
  fastify.post('/mfa/setup', { preHandler: fastify.authenticate }, async (request, reply) => {
    try {
      const user = await fastify.prisma.user.findUnique({ where: { id: request.user.id } });
      if (!user) return reply.status(404).send({ success: false, error: { code: 'USER_NOT_FOUND', message: 'Utilisateur introuvable' } });

      const result = await mfaService.setup(request.user.id, user.email);
      return reply.send({ success: true, data: result });
    } catch (err) {
      throw err;
    }
  });

  // POST /auth/mfa/verify — Verify MFA setup with code
  fastify.post('/mfa/verify', { preHandler: fastify.authenticate }, async (request, reply) => {
    const { code } = request.body as { code: string };
    if (!code || code.length !== 6) {
      return reply.status(400).send({ success: false, error: { code: 'INVALID_CODE', message: 'Code à 6 chiffres requis' } });
    }
    try {
      const success = await mfaService.verifySetup(request.user.id, code);
      if (!success) {
        return reply.status(401).send({ success: false, error: { code: 'INVALID_MFA_CODE', message: 'Code invalide' } });
      }
      return reply.send({ success: true, data: { mfaEnabled: true } });
    } catch (err) {
      throw err;
    }
  });

  // POST /auth/mfa/validate — Validate MFA code during login
  fastify.post('/mfa/validate', async (request, reply) => {
    const { userId, code } = request.body as { userId: string; code: string };
    if (!userId || !code) {
      return reply.status(400).send({ success: false, error: { code: 'INVALID_INPUT', message: 'userId et code requis' } });
    }
    try {
      const valid = await mfaService.validateLogin(userId, code);
      if (!valid) {
        return reply.status(401).send({ success: false, error: { code: 'INVALID_MFA_CODE', message: 'Code MFA invalide' } });
      }
      return reply.send({ success: true, data: { valid: true } });
    } catch (err) {
      throw err;
    }
  });

  // DELETE /auth/mfa — Disable MFA
  fastify.delete('/mfa', { preHandler: fastify.authenticate }, async (request, reply) => {
    try {
      await mfaService.disable(request.user.id);
      return reply.send({ success: true, data: { mfaEnabled: false } });
    } catch (err) {
      throw err;
    }
  });

  // GET /auth/mfa/status — Check MFA status
  fastify.get('/mfa/status', { preHandler: fastify.authenticate }, async (request, reply) => {
    try {
      const enabled = await mfaService.isEnabled(request.user.id);
      return reply.send({ success: true, data: { mfaEnabled: enabled } });
    } catch (err) {
      throw err;
    }
  });

  // ─── Data Export (GDPR) ───────────────────────────────────

  // GET /auth/export — Export all user data (GDPR)
  fastify.get('/export', { preHandler: fastify.authenticate }, async (request, reply) => {
    try {
      const data = await exportService.exportUserData(request.user.id);
      if (!data) return reply.status(404).send({ success: false, error: { code: 'USER_NOT_FOUND', message: 'Utilisateur introuvable' } });
      return reply.send({ success: true, data });
    } catch (err) {
      throw err;
    }
  });
};

export default authExtRoutes;
