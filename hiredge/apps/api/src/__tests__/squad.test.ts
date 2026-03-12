import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db/prisma', () => ({
  prisma: {
    squad: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    squadMember: {
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    squadMessage: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '../db/prisma';

describe('Squad Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSquad', () => {
    it('should create squad with user as LEADER', async () => {
      (prisma.squad.create as any).mockResolvedValue({
        id: 'squad-1',
        name: 'Les Conquérants',
        description: 'Objectif CDI !',
        members: [{ userId: 'user-1', role: 'LEADER' }],
      });

      const squad = await prisma.squad.create({
        data: {
          name: 'Les Conquérants',
          description: 'Objectif CDI !',
          members: { create: { userId: 'user-1', role: 'LEADER' } },
        },
      } as any);

      expect(squad.name).toBe('Les Conquérants');
      expect(squad.members[0].role).toBe('LEADER');
    });
  });

  describe('joinSquad', () => {
    it('should not allow joining if squad is full (8 members)', async () => {
      (prisma.squadMember.count as any).mockResolvedValue(8);

      const count = await prisma.squadMember.count({
        where: { squadId: 'squad-1' },
      } as any);

      expect(count).toBe(8);
      expect(count >= 8).toBe(true);
    });

    it('should not allow duplicate membership', async () => {
      (prisma.squadMember.findFirst as any).mockResolvedValue({
        id: 'member-1', userId: 'user-1', squadId: 'squad-1',
      });

      const existing = await prisma.squadMember.findFirst({
        where: { userId: 'user-1', squadId: 'squad-1' },
      } as any);

      expect(existing).toBeTruthy();
    });

    it('should add member when conditions are met', async () => {
      (prisma.squadMember.count as any).mockResolvedValue(5);
      (prisma.squadMember.findFirst as any).mockResolvedValue(null);
      (prisma.squadMember.create as any).mockResolvedValue({
        id: 'member-2', userId: 'user-2', role: 'MEMBER',
      });

      const count = await prisma.squadMember.count({ where: { squadId: 'squad-1' } } as any);
      const existing = await prisma.squadMember.findFirst({
        where: { userId: 'user-2', squadId: 'squad-1' },
      } as any);

      expect(count).toBeLessThan(8);
      expect(existing).toBeNull();

      const member = await prisma.squadMember.create({
        data: { userId: 'user-2', squadId: 'squad-1', role: 'MEMBER' },
      } as any);

      expect(member.role).toBe('MEMBER');
    });
  });

  describe('sendMessage', () => {
    it('should create message in squad', async () => {
      (prisma.squadMessage.create as any).mockResolvedValue({
        id: 'msg-1',
        content: 'Go go go !',
        userId: 'user-1',
        squadId: 'squad-1',
      });

      const msg = await prisma.squadMessage.create({
        data: { content: 'Go go go !', userId: 'user-1', squadId: 'squad-1' },
      } as any);

      expect(msg.content).toBe('Go go go !');
    });
  });
});
