import bcrypt from 'bcryptjs';
import prisma from '../db/prisma';
import redis from '../lib/redis';
import { RegisterInput, LoginInput } from '@hiredge/shared';

const SALT_ROUNDS = 12;

export class AuthService {
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new AppError('EMAIL_EXISTS', 'Un compte existe déjà avec cet email', 409);
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: input.role === 'CANDIDATE' ? 'CANDIDATE' : input.role === 'SCOUT' ? 'SCOUT' : 'RECRUITER',
        locale: input.locale,
        candidateProfile: input.role === 'candidate' ? {
          create: {
            firstName: '',
            lastName: '',
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
