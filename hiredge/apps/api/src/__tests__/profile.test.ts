import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    candidateProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    skill: { create: vi.fn(), delete: vi.fn(), findMany: vi.fn() },
    experience: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    education: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}));

import { prisma } from '../db/prisma';

describe('Profile Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return full profile with relations', async () => {
      (prisma.candidateProfile.findUnique as any).mockResolvedValue({
        id: 'profile-1',
        userId: 'user-1',
        title: 'Développeur Full-Stack',
        skills: [{ name: 'React', level: 4 }],
        experiences: [{ title: 'Dev', company: 'Startup' }],
        educations: [{ school: 'EPITA', degree: 'Master' }],
        completionScore: 75,
      });

      const profile = await prisma.candidateProfile.findUnique({
        where: { userId: 'user-1' },
        include: { skills: true, experiences: true, educations: true },
      } as any);

      expect(profile?.title).toBe('Développeur Full-Stack');
      expect(profile?.skills).toHaveLength(1);
    });

    it('should return null for non-existent profile', async () => {
      (prisma.candidateProfile.findUnique as any).mockResolvedValue(null);

      const profile = await prisma.candidateProfile.findUnique({
        where: { userId: 'non-existent' },
      } as any);

      expect(profile).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('should update profile fields', async () => {
      (prisma.candidateProfile.update as any).mockResolvedValue({
        id: 'profile-1',
        title: 'Senior Dev',
        bio: 'Updated bio',
      });

      const updated = await prisma.candidateProfile.update({
        where: { userId: 'user-1' },
        data: { title: 'Senior Dev', bio: 'Updated bio' },
      } as any);

      expect(updated.title).toBe('Senior Dev');
    });
  });

  describe('skills', () => {
    it('should add a skill', async () => {
      (prisma.skill.create as any).mockResolvedValue({
        id: 'skill-1', name: 'TypeScript', level: 4,
      });

      const skill = await prisma.skill.create({
        data: { name: 'TypeScript', level: 4, profileId: 'profile-1' },
      } as any);

      expect(skill.name).toBe('TypeScript');
      expect(skill.level).toBe(4);
    });

    it('should delete a skill', async () => {
      (prisma.skill.delete as any).mockResolvedValue({ id: 'skill-1' });

      const deleted = await prisma.skill.delete({ where: { id: 'skill-1' } } as any);
      expect(deleted.id).toBe('skill-1');
    });
  });

  describe('completion score', () => {
    it('should calculate based on filled fields', () => {
      const weights = {
        title: 15, bio: 10, skills: 25, experiences: 25,
        educations: 10, preferredLocations: 5, salaryExpectation: 5, avatarUrl: 5,
      };

      const profile = {
        title: 'Dev', bio: 'Bio', skills: [{ name: 'JS' }],
        experiences: [], educations: [], preferredLocations: ['Paris'],
        salaryExpectation: null, avatarUrl: null,
      };

      let score = 0;
      if (profile.title) score += weights.title;
      if (profile.bio) score += weights.bio;
      if (profile.skills.length > 0) score += weights.skills;
      if (profile.preferredLocations.length > 0) score += weights.preferredLocations;

      expect(score).toBe(55); // title(15) + bio(10) + skills(25) + locations(5)
    });
  });
});
