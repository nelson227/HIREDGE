import crypto from 'crypto';
import prisma from '../db/prisma';
import { AppError } from './auth.service';
import { SQUAD_LIMITS } from '@hiredge/shared';

function generateSquadCode(): string {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

const MEMBER_SELECT = {
  include: {
    user: {
      select: {
        id: true,
        email: true,
        lastActiveAt: true,
        candidateProfile: { select: { firstName: true, lastName: true, title: true, avatarUrl: true } },
      },
    },
  },
};

export class SquadService {
  async createSquad(userId: string, data: {
    name: string;
    description?: string;
    industry?: string;
    focus?: string;
    jobFamily?: string;
    experienceLevel?: string;
    locationFilter?: string;
  }) {
    // Check multi-squad limit
    const activeCount = await prisma.squadMember.count({
      where: { userId, isActive: true, squad: { status: { in: ['FORMING', 'ACTIVE'] } } },
    });
    if (activeCount >= SQUAD_LIMITS.MAX_SQUADS_PER_USER) {
      throw new AppError('MAX_SQUADS_REACHED', `Vous êtes déjà dans ${SQUAD_LIMITS.MAX_SQUADS_PER_USER} escouades (limite max)`, 409);
    }

    // Generate a unique code (retry on collision)
    let code = generateSquadCode();
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.squad.findUnique({ where: { code } });
      if (!exists) break;
      code = generateSquadCode();
    }

    const squad = await prisma.squad.create({
      data: {
        code,
        name: data.name,
        description: data.description,
        industry: data.industry,
        focus: data.focus,
        jobFamily: data.jobFamily,
        experienceLevel: data.experienceLevel,
        locationFilter: data.locationFilter,
        status: 'FORMING',
        maxMembers: SQUAD_LIMITS.MAX_MEMBERS,
        members: {
          create: {
            userId,
            role: 'LEADER',
          },
        },
      },
      include: { members: { ...MEMBER_SELECT } },
    });

    return squad;
  }

  async joinSquad(userId: string, codeOrId: string) {
    // Check multi-squad limit
    const activeCount = await prisma.squadMember.count({
      where: { userId, isActive: true, squad: { status: { in: ['FORMING', 'ACTIVE'] } } },
    });
    if (activeCount >= SQUAD_LIMITS.MAX_SQUADS_PER_USER) {
      throw new AppError('MAX_SQUADS_REACHED', `Vous êtes déjà dans ${SQUAD_LIMITS.MAX_SQUADS_PER_USER} escouades (limite max)`, 409);
    }

    // Try to find by code first, then by id
    let squad = await prisma.squad.findUnique({
      where: { code: codeOrId },
      include: { members: true },
    });
    if (!squad) {
      squad = await prisma.squad.findUnique({
        where: { id: codeOrId },
        include: { members: true },
      });
    }

    if (!squad) throw new AppError('SQUAD_NOT_FOUND', 'Escouade introuvable', 404);
    if (squad.status !== 'FORMING' && squad.status !== 'ACTIVE') {
      throw new AppError('SQUAD_CLOSED', 'Cette escouade n\'accepte plus de membres', 400);
    }
    if (squad.members.length >= squad.maxMembers) {
      throw new AppError('SQUAD_FULL', 'Cette escouade est complète', 400);
    }

    const member = await prisma.squadMember.create({
      data: { squadId: squad.id, userId, role: 'MEMBER' },
    });

    // Auto-activate if minimum reached
    if (squad.members.length + 1 >= SQUAD_LIMITS.MIN_MEMBERS && squad.status === 'FORMING') {
      await prisma.squad.update({ where: { id: squad.id }, data: { status: 'ACTIVE' } });
    }

    return member;
  }

  async leaveSquad(userId: string, squadId: string) {
    const member = await prisma.squadMember.findFirst({
      where: { userId, squadId },
    });
    if (!member) throw new AppError('NOT_IN_SQUAD', 'Vous n\'êtes pas membre de cette escouade', 404);

    await prisma.$transaction(async (tx) => {
      await tx.squadMember.delete({ where: { id: member.id } });

      // If leader left, promote next member or dissolve
      if (member.role === 'LEADER') {
        const remainingMembers = await tx.squadMember.findMany({
          where: { squadId },
          orderBy: { joinedAt: 'asc' },
        });

        if (remainingMembers.length === 0) {
          await tx.squad.update({ where: { id: squadId }, data: { status: 'DISSOLVED' } });
        } else {
          await tx.squadMember.update({
            where: { id: remainingMembers[0]!.id },
            data: { role: 'LEADER' },
          });
        }
      }

      // Check minimum members
      const count = await tx.squadMember.count({ where: { squadId } });
      if (count < SQUAD_LIMITS.MIN_MEMBERS) {
        await tx.squad.update({ where: { id: squadId }, data: { status: 'FORMING' } });
      }
    });
  }

  async getSquadDetails(userId: string, squadId: string) {
    const member = await prisma.squadMember.findFirst({ where: { userId, squadId } });
    if (!member) throw new AppError('NOT_IN_SQUAD', 'Vous n\'êtes pas membre de cette escouade', 403);

    const squad = await prisma.squad.findUnique({
      where: { id: squadId },
      include: {
        members: {
          where: { isActive: true },
          ...MEMBER_SELECT,
        },
        events: {
          where: { scheduledAt: { gte: new Date() } },
          orderBy: { scheduledAt: 'asc' },
          take: 5,
          include: { createdBy: { select: { candidateProfile: { select: { firstName: true, lastName: true } } } } },
        },
      },
    });

    if (!squad) throw new AppError('SQUAD_NOT_FOUND', 'Escouade introuvable', 404);
    return squad;
  }

  async getMySquads(userId: string) {
    const memberships = await prisma.squadMember.findMany({
      where: { userId, isActive: true, squad: { status: { in: ['FORMING', 'ACTIVE'] } } },
      include: {
        squad: {
          include: {
            members: {
              where: { isActive: true },
              ...MEMBER_SELECT,
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: { user: { select: { candidateProfile: { select: { firstName: true } } } } },
            },
            _count: { select: { members: { where: { isActive: true } } } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return memberships.map((m) => m.squad);
  }

  // Keep legacy single-squad method for backwards compat
  async getMySquad(userId: string) {
    const squads = await this.getMySquads(userId);
    return squads[0] || null;
  }

  async sendMessage(userId: string, squadId: string, data: { content: string; type?: string }) {
    const member = await prisma.squadMember.findFirst({ where: { userId, squadId, isActive: true } });
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
    const member = await prisma.squadMember.findFirst({ where: { userId, squadId, isActive: true } });
    if (!member) throw new AppError('NOT_IN_SQUAD', 'Vous n\'êtes pas membre de cette escouade', 403);

    const safeLimit = Math.min(limit, 100);

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
      take: safeLimit,
    });

    return messages.reverse();
  }

  // ─── Events ──────────────────────────────────────────────────────
  async createEvent(userId: string, squadId: string, data: { title: string; type: string; scheduledAt: string; duration?: number; link?: string }) {
    const member = await prisma.squadMember.findFirst({ where: { userId, squadId, isActive: true } });
    if (!member) throw new AppError('NOT_IN_SQUAD', 'Vous n\'êtes pas membre de cette escouade', 403);

    const event = await prisma.squadEvent.create({
      data: {
        squadId,
        createdById: userId,
        title: data.title,
        type: data.type || 'MEETING',
        scheduledAt: new Date(data.scheduledAt),
        duration: data.duration || 30,
        link: data.link,
      },
      include: { createdBy: { select: { candidateProfile: { select: { firstName: true, lastName: true } } } } },
    });

    // Also post a system message
    await prisma.squadMessage.create({
      data: { squadId, userId, content: `📅 ${data.title} — ${new Date(data.scheduledAt).toLocaleDateString('fr-CA')} à ${new Date(data.scheduledAt).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}`, type: 'SYSTEM' },
    });

    return event;
  }

  async getEvents(userId: string, squadId: string) {
    const member = await prisma.squadMember.findFirst({ where: { userId, squadId, isActive: true } });
    if (!member) throw new AppError('NOT_IN_SQUAD', 'Vous n\'êtes pas membre de cette escouade', 403);

    return prisma.squadEvent.findMany({
      where: { squadId, scheduledAt: { gte: new Date() } },
      orderBy: { scheduledAt: 'asc' },
      take: 10,
      include: { createdBy: { select: { candidateProfile: { select: { firstName: true, lastName: true } } } } },
    });
  }

  async findAvailableSquads(userId: string, filters?: { industry?: string; jobFamily?: string; experienceLevel?: string }) {
    const where: any = {
      status: 'FORMING',
      members: { none: { userId } },
    };
    if (filters?.industry) where.industry = filters.industry;
    if (filters?.jobFamily) where.jobFamily = filters.jobFamily;
    if (filters?.experienceLevel) where.experienceLevel = filters.experienceLevel;

    const squads = await prisma.squad.findMany({
      where,
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
