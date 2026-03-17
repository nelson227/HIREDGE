import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../db/prisma';
import redis from '../lib/redis';
import { RegisterInput, LoginInput } from '@hiredge/shared';
import { emailService } from './email.service';

const SALT_ROUNDS = 12;

export class AuthService {
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new AppError('EMAIL_EXISTS', 'Un compte existe déjà avec cet email', 409);
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    const role = input.role === 'CANDIDATE' ? 'CANDIDATE' : input.role === 'SCOUT' ? 'SCOUT' : 'RECRUITER';

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        role,
        locale: input.locale,
        candidateProfile: role === 'CANDIDATE' ? {
          create: {
            firstName: (input as any).firstName || '',
            lastName: (input as any).lastName || '',
            title: '',
          },
        } : undefined,
      },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    return user;
  }

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    if (!user) {
      throw new AppError('INVALID_CREDENTIALS', 'Email ou mot de passe incorrect', 401);
    }

    const passwordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordValid) {
      throw new AppError('INVALID_CREDENTIALS', 'Email ou mot de passe incorrect', 401);
    }

    // Update last active
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      subscriptionTier: user.subscriptionTier,
    };
  }

  async saveRefreshToken(userId: string, refreshToken: string, userAgent?: string, ipAddress?: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.session.create({
      data: {
        userId,
        refreshToken,
        userAgent,
        ipAddress,
        expiresAt,
      },
    });
  }

  async validateRefreshToken(refreshToken: string) {
    const session = await prisma.session.findUnique({ where: { refreshToken } });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } });
      }
      throw new AppError('INVALID_TOKEN', 'Refresh token invalide ou expiré', 401);
    }

    return session;
  }

  async revokeRefreshToken(refreshToken: string) {
    await prisma.session.deleteMany({ where: { refreshToken } });
  }

  async revokeAllUserSessions(userId: string) {
    await prisma.session.deleteMany({ where: { userId } });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('USER_NOT_FOUND', 'Utilisateur introuvable', 404);

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new AppError('INVALID_PASSWORD', 'Mot de passe actuel incorrect', 400);

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
  }

  async deleteAccount(userId: string) {
    // Revoke all sessions first
    await prisma.session.deleteMany({ where: { userId } });
    // Delete user — cascade handles related records (profile, applications, etc.)
    await prisma.user.delete({ where: { id: userId } });
  }

  // ── Password Reset ──────────────────────────────────────────
  async requestPasswordReset(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    // Always return success to prevent email enumeration
    if (!user) return;

    // Invalidate previous tokens
    await prisma.passwordReset.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordReset.create({
      data: { userId: user.id, token, expiresAt },
    });

    await emailService.sendPasswordReset(email, token);
  }

  async resetPassword(token: string, newPassword: string) {
    const record = await prisma.passwordReset.findUnique({ where: { token } });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new AppError('INVALID_TOKEN', 'Lien de réinitialisation invalide ou expiré', 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      prisma.passwordReset.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.session.deleteMany({ where: { userId: record.userId } }), // logout everywhere
    ]);
  }

  // ── Email Verification ──────────────────────────────────────
  async createEmailVerification(userId: string, email: string) {
    // Invalidate previous tokens
    await prisma.emailVerification.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.emailVerification.create({
      data: { userId, token, expiresAt },
    });

    await emailService.sendEmailVerification(email, token);
  }

  async verifyEmail(token: string) {
    const record = await prisma.emailVerification.findUnique({ where: { token } });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new AppError('INVALID_TOKEN', 'Lien de vérification invalide ou expiré', 400);
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { isEmailVerified: true } }),
      prisma.emailVerification.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);

    // Clear user cache so middleware picks up the change
    try { await redis.del(`auth:user:${record.userId}`); } catch {}
  }

  async blacklistAccessToken(token: string, expiresInSeconds: number) {
    await redis.setex(`blacklist:${token}`, expiresInSeconds, '1');
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const result = await redis.get(`blacklist:${token}`);
    return result === '1';
  }
}

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const authService = new AuthService();
