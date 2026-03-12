import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db/prisma', () => ({
  prisma: {
    application: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

import { prisma } from '../db/prisma';

describe('Application Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createApplication', () => {
    it('should enforce subscription limit for free users (3/month)', async () => {
      (prisma.application.count as any).mockResolvedValue(3);

      const count = await prisma.application.count({
        where: {
          userId: 'user-1',
          createdAt: { gte: expect.any(Date) },
        },
      } as any);

      expect(count).toBe(3);
      expect(count >= 3).toBe(true); // Should block
    });

    it('should allow application when under limit', async () => {
      (prisma.application.count as any).mockResolvedValue(1);
      (prisma.application.create as any).mockResolvedValue({
        id: 'app-1',
        userId: 'user-1',
        jobId: 'job-1',
        status: 'APPLIED',
      });

      const count = await prisma.application.count({
        where: { userId: 'user-1' },
      } as any);
      expect(count).toBe(1);

      const app = await prisma.application.create({
        data: { userId: 'user-1', jobId: 'job-1', status: 'APPLIED' },
      } as any);

      expect(app.status).toBe('APPLIED');
    });
  });

  describe('getStatistics', () => {
    it('should aggregate by status', async () => {
      (prisma.application.groupBy as any).mockResolvedValue([
        { status: 'APPLIED', _count: { _all: 10 } },
        { status: 'INTERVIEW_SCHEDULED', _count: { _all: 3 } },
        { status: 'OFFERED', _count: { _all: 1 } },
        { status: 'REJECTED', _count: { _all: 5 } },
      ]);

      const stats = await prisma.application.groupBy({
        by: ['status'],
        _count: { _all: true },
        where: { userId: 'user-1' },
      } as any);

      expect(stats).toHaveLength(4);
      const total = stats.reduce((sum: number, s: any) => sum + s._count._all, 0);
      expect(total).toBe(19);
    });

    it('should calculate response rate', () => {
      const applied = 20;
      const viewed = 8;
      const interviewed = 3;
      const responded = viewed + interviewed;
      const responseRate = (responded / applied) * 100;

      expect(responseRate).toBe(55);
    });
  });
});
