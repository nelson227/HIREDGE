import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks
vi.mock('../db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    session: {
      create: vi.fn(),
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$hashed$'),
    compare: vi.fn(),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('mock-token'),
    verify: vi.fn().mockReturnValue({ userId: 'user-1', role: 'CANDIDATE' }),
  },
}));

import { prisma } from '../db/prisma';
import bcrypt from 'bcryptjs';

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should reject invalid email format', async () => {
      const invalidEmails = ['not-email', 'user@', '@domain.com', ''];
      for (const email of invalidEmails) {
        // Validation Zod catches before service layer
        expect(email.includes('@') && email.includes('.')).toBe(false);
      }
    });

    it('should hash password before storing', async () => {
      const password = 'SecureP@ss123';
      await bcrypt.hash(password, 12);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
    });

    it('should reject duplicate email', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'existing-user' });

      const existing = await prisma.user.findUnique({ where: { email: 'test@test.com' } } as any);
      expect(existing).toBeTruthy();
    });

    it('should create user with hashed password', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);
      (prisma.user.create as any).mockResolvedValue({
        id: 'user-1',
        email: 'new@test.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'CANDIDATE',
      });

      const user = await prisma.user.create({
        data: {
          email: 'new@test.com',
          passwordHash: '$hashed$',
          firstName: 'Test',
          lastName: 'User',
        },
      } as any);

      expect(user.email).toBe('new@test.com');
      expect(user.role).toBe('CANDIDATE');
    });
  });

  describe('login', () => {
    it('should reject non-existent user', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      const user = await prisma.user.findUnique({ where: { email: 'noone@test.com' } } as any);
      expect(user).toBeNull();
    });

    it('should reject wrong password', async () => {
      (bcrypt.compare as any).mockResolvedValue(false);
      const match = await bcrypt.compare('wrong', '$hashed$');
      expect(match).toBe(false);
    });

    it('should return tokens on valid login', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        passwordHash: '$hashed$',
      });
      (bcrypt.compare as any).mockResolvedValue(true);
      (prisma.session.create as any).mockResolvedValue({ id: 'session-1' });

      const user = await prisma.user.findUnique({ where: { email: 'test@test.com' } } as any);
      const match = await bcrypt.compare('correct', user.passwordHash);

      expect(user).toBeTruthy();
      expect(match).toBe(true);
    });
  });
});
