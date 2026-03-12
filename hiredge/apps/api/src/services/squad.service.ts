import prisma from '../db/prisma';
import { AppError } from './auth.service';
import { SQUAD_LIMITS } from '@hiredge/shared';

export class SquadService {
  async createSquad(userId: string, data: { name: string; description?: string; industry?: string }) {
    // Check if user is already in a squad
    const existing = await prisma.squadMember.findFirst({
      where: { userId, squad: { status: 'ACTIVE' } },
    });
    if (existing) {
      throw new AppError('ALREADY_IN_SQUAD', 'Vous êtes déjà membre d\'une escouade active', 409);
    }

    const squad = await prisma.squad.create({
      data: {
        name: data.name,
        description: data.description,
        industry: data.industry,
        status: 'FORMING',
        maxMembers: SQUAD_LIMITS.MAX_MEMBERS,
        members: {
          create: {
            userId,
            role: 'LEADER',
          },
        },
      },
      include: { members: { include: { user: { select: { id: true, email: true } } } } },
    });

    return squad;
  }

  async joinSquad(userId: string, squadId: string) {
    // Check if user is already in a squad
    const existingMembership = await prisma.squadMember.findFirst({
      where: { userId, squad: { status: 'ACTIVE' } },
    });
    if (existingMembership) {
      throw new AppError('ALREADY_IN_SQUAD', 'Vous êtes déjà membre d\'une escouade', 409);
    }

    const squad = await prisma.squad.findUnique({
      where: { id: squadId },
      include: { members: true },
    });

    if (!squad) throw new AppError('SQUAD_NOT_FOUND', 'Escouade introuvable', 404);
    if (squad.status !== 'FORMING' && squad.status !== 'ACTIVE') {
      throw new AppError('SQUAD_CLOSED', 'Cette escouade n\'accepte plus de membres', 400);
    }
    if (squad.members.length >= squad.maxMembers) {
      throw new AppError('SQUAD_FULL', 'Cette escouade est complète', 400);
    }

    const member = await prisma.squadMember.create({
      data: { squadId, userId, role: 'MEMBER' },
    });

    // Auto-activate if minimum reached
    if (squad.members.length + 1 >= SQUAD_LIMITS.MIN_MEMBERS && squad.status === 'FORMING') {
      await prisma.squad.update({ where: { id: squadId }, data: { status: 'ACTIVE' } });
    }

    return member;
  }

  async leaveSquad(userId: string, squadId: string) {
    const member = await prisma.squadMember.findFirst({
      where: { userId, squadId },
    });
    if (!member) throw new AppError('NOT_IN_SQUAD', 'Vous n\'êtes pas membre de cette escouade', 404);

    await prisma.squadMember.delete({ where: { id: member.id } });

    // If leader left, promote next member or dissolve
    if (member.role === 'LEADER') {
      const remainingMembers = await prisma.squadMember.findMany({
        where: { squadId },
        orderBy: { joinedAt: 'asc' },
      });

      if (remainingMembers.length === 0) {
        await prisma.squad.update({ where: { id: squadId }, data: { status: 'DISSOLVED' } });
      } else {
        await prisma.squadMember.update({
          where: { id: remainingMembers[0]!.id },
          data: { role: 'LEADER' },
        });
      }
    }

    // Check minimum members
    const count = await prisma.squadMember.count({ where: { squadId } });
    if (count < SQUAD_LIMITS.MIN_MEMBERS) {
      await prisma.squad.update({ where: { id: squadId }, data: { status: 'FORMING' } });
    }
  }

  async getSquadDetails(userId: string, squadId: string) {
    const member = await prisma.squadMember.findFirst({ where: { userId, squadId } });
    if (!member) throw new AppError('NOT_IN_SQUAD', 'Vous n\'êtes pas membre de cette escouade', 403);

    const squad = await prisma.squad.findUnique({
      where: { id: squadId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                candidateProfile: { select: { firstName: true, lastName: true, title: true, avatarUrl: true } },
              },
            },
          },
        },
      },
    });

    if (!squad) throw new AppError('SQUAD_NOT_FOUND', 'Escouade introuvable', 404);
    return squad;
  }

  async getMySquad(userId: string) {
    const member = await prisma.squadMember.findFirst({
      where: { userId, squad: { status: { in: ['FORMING', 'ACTIVE'] } } },
      include: {
        squad: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    candidateProfile: { select: { firstName: true, lastName: true, title: true, avatarUrl: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!member) return null;
    return member.squad;
  }

  async sendMessage(userId: string, squadId: string, data: { content: string; type?: string }) {
    const member = await prisma.squadMember.findFirst({ where: { userId, squadId } });
    if (!member) throw new AppError('NOT_IN_SQUAD', 'Vous n\'êtes pas membre de cette escouade', 403);

    const message = await prisma.squadMessage.create({
      data: {
        squadId,
        userId,
        content: data.content,
        type: (data.type as any) ?? 'TEXT',
      },
      include: {
        user: {
          select: {
            id: true,
            candidateProfile: { select: { firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });

    return message;
  }

  async getMessages(userId: string, squadId: string, cursor?: string, limit: number = 50) {
    const member = await prisma.squadMember.findFirst({ where: { userId, squadId } });
    if (!member) throw new AppError('NOT_IN_SQUAD', 'Vous n\'êtes pas membre de cette escouade', 403);

    const messages = await prisma.squadMessage.findMany({
      where: { squadId, ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}) },
      include: {
        user: {
          select: {
            id: true,
            candidateProfile: { select: { firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return messages.reverse();
  }

  async findAvailableSquads(userId: string, industry?: string) {
    const squads = await prisma.squad.findMany({
      where: {
        status: 'FORMING',
        ...(industry ? { industry } : {}),
        members: { none: { userId } },
      },
      include: {
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return squads.filter((s: any) => s._count.members < s.maxMembers);
  }
}

export const squadService = new SquadService();
