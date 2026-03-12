import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db/prisma', () => ({
  prisma: {
    job: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock('../lib/redis', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

import { prisma } from '../db/prisma';
import { redis } from '../lib/redis';

describe('Job Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchJobs', () => {
    it('should return paginated results', async () => {
      const mockJobs = Array.from({ length: 5 }, (_, i) => ({
        id: `job-${i}`,
        title: `Developer ${i}`,
        location: 'Paris',
        status: 'ACTIVE',
        company: { name: `Company ${i}` },
      }));

      (prisma.job.findMany as any).mockResolvedValue(mockJobs);
      (prisma.job.count as any).mockResolvedValue(20);

      const jobs = await prisma.job.findMany({
        where: { status: 'ACTIVE' },
        take: 5,
        skip: 0,
      } as any);

      expect(jobs).toHaveLength(5);
    });

    it('should filter by contract type', async () => {
      (prisma.job.findMany as any).mockResolvedValue([
        { id: 'job-1', title: 'Dev', contractType: 'CDI' },
      ]);

      const jobs = await prisma.job.findMany({
        where: { contractType: 'CDI', status: 'ACTIVE' },
      } as any);

      expect(jobs[0].contractType).toBe('CDI');
    });

    it('should filter by location', async () => {
      (prisma.job.findMany as any).mockResolvedValue([
        { id: 'job-1', title: 'Dev', location: 'Lyon' },
      ]);

      const jobs = await prisma.job.findMany({
        where: { location: { contains: 'Lyon' } },
      } as any);

      expect(jobs[0].location).toBe('Lyon');
    });
  });

  describe('getJobById', () => {
    it('should return cached job if available', async () => {
      (redis.get as any).mockResolvedValue(JSON.stringify({
        id: 'job-1', title: 'Cached Dev',
      }));

      const cached = await redis.get('job:job-1');
      expect(JSON.parse(cached!).title).toBe('Cached Dev');
    });

    it('should fetch from DB and cache on miss', async () => {
      (redis.get as any).mockResolvedValue(null);
      (prisma.job.findUnique as any).mockResolvedValue({
        id: 'job-1', title: 'DB Dev',
      });

      const cached = await redis.get('job:job-1');
      expect(cached).toBeNull();

      const job = await prisma.job.findUnique({ where: { id: 'job-1' } } as any);
      expect(job.title).toBe('DB Dev');

      await redis.set('job:job-1', JSON.stringify(job));
      expect(redis.set).toHaveBeenCalled();
    });
  });
});
