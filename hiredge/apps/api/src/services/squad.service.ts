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

    const squads = memberships.map((m) => m.squad);

    // Sort by most recent activity: last message timestamp, then squad creation date
    squads.sort((a, b) => {
      const aTime = a.messages?.[0]?.createdAt ?? a.createdAt;
      const bTime = b.messages?.[0]?.createdAt ?? b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    return squads;
  }

  // Keep legacy single-squad method for backwards compat
  async getMySquad(userId: string) {
    const squads = await this.getMySquads(userId);
    return squads[0] || null;
  }

  async sendMessage(userId: string, squadId: string, data: { content: string; type?: string; replyToId?: string }) {
    const member = await prisma.squadMember.findFirst({ where: { userId, squadId, isActive: true } });
    if (!member) throw new AppError('NOT_IN_SQUAD', 'Vous n\'êtes pas membre de cette escouade', 403);

    const message = await prisma.squadMessage.create({
      data: {
        squadId,
        userId,
        content: data.content,
        type: (data.type as any) ?? 'TEXT',
        replyToId: data.replyToId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            candidateProfile: { select: { firstName: true, lastName: true, avatarUrl: true } },
          },
        },
        replyTo: {
          select: {
            id: true, content: true, type: true,
            user: { select: { candidateProfile: { select: { firstName: true, lastName: true } } } },
          },
        },
        reactions: { select: { id: true, emoji: true, userId: true } },
      },
    });

    return message;
  }

  async getMessages(userId: string, squadId: string, cursor?: string, limit: number = 50) {
    const member = await prisma.squadMember.findFirst({ where: { userId, squadId, isActive: true } });
    if (!member) throw new AppError('NOT_IN_SQUAD', 'Vous n\'êtes pas membre de cette escouade', 403);

    const safeLimit = Math.min(limit, 100);

    const messages = await prisma.squadMessage.findMany({
      where: {
        squadId,
        deletedForAll: false,
        hiddenFor: { none: { userId } },
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            candidateProfile: { select: { firstName: true, lastName: true, avatarUrl: true } },
          },
        },
        replyTo: {
          select: {
            id: true, content: true, type: true,
            user: { select: { candidateProfile: { select: { firstName: true, lastName: true } } } },
          },
        },
        reactions: { select: { id: true, emoji: true, userId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
    });

    return messages.reverse();
  }

  // ─── Message Actions ─────────────────────────────────────────────

  async toggleReaction(userId: string, squadId: string, messageId: string, emoji: string) {
    const member = await prisma.squadMember.findFirst({ where: { userId, squadId, isActive: true } });
    if (!member) throw new AppError('NOT_IN_SQUAD', 'Vous n\'êtes pas membre de cette escouade', 403);

    const existing = await prisma.squadMessageReaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
    });

    if (existing) {
      await prisma.squadMessageReaction.delete({ where: { id: existing.id } });
      return { action: 'removed' as const, emoji };
    }

    await prisma.squadMessageReaction.create({ data: { messageId, userId, emoji } });
    return { action: 'added' as const, emoji };
  }

  async togglePin(userId: string, squadId: string, messageId: string) {
    const member = await prisma.squadMember.findFirst({ where: { userId, squadId, isActive: true } });
    if (!member) throw new AppError('NOT_IN_SQUAD', 'Vous n\'êtes pas membre de cette escouade', 403);

    const msg = await prisma.squadMessage.findFirst({ where: { id: messageId, squadId } });
    if (!msg) throw new AppError('NOT_FOUND', 'Message introuvable', 404);

    const updated = await prisma.squadMessage.update({
      where: { id: messageId },
      data: { isPinned: !msg.isPinned },
    });
    return { isPinned: updated.isPinned };
  }

  async toggleImportant(userId: string, squadId: string, messageId: string) {
    const member = await prisma.squadMember.findFirst({ where: { userId, squadId, isActive: true } });
    if (!member) throw new AppError('NOT_IN_SQUAD', 'Vous n\'êtes pas membre de cette escouade', 403);

    const msg = await prisma.squadMessage.findFirst({ where: { id: messageId, squadId } });
    if (!msg) throw new AppError('NOT_FOUND', 'Message introuvable', 404);

    const updated = await prisma.squadMessage.update({
      where: { id: messageId },
      data: { isImportant: !msg.isImportant },
    });
    return { isImportant: updated.isImportant };
  }

  async deleteMessage(userId: string, squadId: string, messageId: string, mode: 'FOR_ME' | 'FOR_ALL') {
    const member = await prisma.squadMember.findFirst({ where: { userId, squadId, isActive: true } });
    if (!member) throw new AppError('NOT_IN_SQUAD', 'Vous n\'êtes pas membre de cette escouade', 403);

    const msg = await prisma.squadMessage.findFirst({ where: { id: messageId, squadId } });
    if (!msg) throw new AppError('NOT_FOUND', 'Message introuvable', 404);

    if (mode === 'FOR_ALL') {
      if (msg.userId !== userId) throw new AppError('FORBIDDEN', 'Seul l\'auteur peut supprimer pour tous', 403);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (msg.createdAt < oneHourAgo) throw new AppError('TOO_OLD', 'Ce message a plus d\'une heure, vous ne pouvez que le supprimer pour vous', 403);
      await prisma.squadMessage.update({ where: { id: messageId }, data: { deletedForAll: true, content: '🚫 Ce message a été supprimé' } });
      return { mode: 'FOR_ALL' as const };
    }

    // FOR_ME: hide for this user
    await prisma.squadMessageHidden.upsert({
      where: { messageId_userId: { messageId, userId } },
      create: { messageId, userId },
      update: {},
    });
    return { mode: 'FOR_ME' as const };
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

  // ─── Competition Detection (#13) ──────────────────────────────
  /**
   * Check if squad members are competing for the same jobs.
   * Returns a list of conflicts to warn users.
   */
  async detectCompetition(squadId: string): Promise<Array<{
    jobId: string;
    jobTitle: string;
    members: Array<{ userId: string; name: string }>;
  }>> {
    const members = await prisma.squadMember.findMany({
      where: { squadId, isActive: true },
      select: { userId: true, user: { select: { candidateProfile: { select: { firstName: true, lastName: true } } } } },
    });
    const userIds = members.map(m => m.userId);
    if (userIds.length < 2) return [];

    // Find jobs where multiple squad members applied
    const applications = await prisma.application.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, jobId: true, job: { select: { title: true } } },
    });

    const jobApplicants = new Map<string, Array<{ userId: string; name: string; jobTitle: string }>>();
    for (const app of applications) {
      const key = app.jobId;
      if (!jobApplicants.has(key)) jobApplicants.set(key, []);
      const member = members.find(m => m.userId === app.userId);
      const name = member?.user?.candidateProfile
        ? `${member.user.candidateProfile.firstName ?? ''} ${member.user.candidateProfile.lastName ?? ''}`.trim()
        : 'Membre';
      jobApplicants.get(key)!.push({ userId: app.userId, name, jobTitle: app.job.title });
    }

    const conflicts: Array<{ jobId: string; jobTitle: string; members: Array<{ userId: string; name: string }> }> = [];
    for (const [jobId, applicants] of jobApplicants) {
      if (applicants.length >= 2) {
        conflicts.push({
          jobId,
          jobTitle: applicants[0]!.jobTitle,
          members: applicants.map(a => ({ userId: a.userId, name: a.name })),
        });
      }
    }

    return conflicts;
  }

  // ─── Dynamic Reformation (#14) ──────────────────────────────
  /**
   * Check squad health and suggest/execute reformation.
   * Called by a scheduled cron job.
   */
  async checkAndReformSquads(): Promise<Array<{ squadId: string; action: string; details: string }>> {
    const actions: Array<{ squadId: string; action: string; details: string }> = [];

    const activeSquads = await prisma.squad.findMany({
      where: { status: 'ACTIVE' },
      include: {
        members: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                candidateProfile: { select: { firstName: true } },
                applications: { select: { id: true }, where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
              },
            },
          },
        },
      },
    });

    for (const squad of activeSquads) {
      const inactiveMembers = squad.members.filter(m => (m.user?.applications?.length ?? 0) === 0);
      const activeMembers = squad.members.filter(m => (m.user?.applications?.length ?? 0) > 0);

      // If more than half inactive for 7+ days, flag for reformation
      if (inactiveMembers.length > activeMembers.length && squad.members.length >= 3) {
        // Deactivate long-inactive members
        for (const inactiveMember of inactiveMembers) {
          await prisma.squadMember.update({
            where: { id: inactiveMember.id },
            data: { isActive: false },
          });

          // Post a system message
          const name = inactiveMember.user?.candidateProfile?.firstName ?? 'Un membre';
          await prisma.squadMessage.create({
            data: {
              squadId: squad.id,
              userId: inactiveMember.userId,
              content: `${name} a été retiré(e) de l'escouade pour inactivité prolongée.`,
              type: 'SYSTEM',
            },
          });
        }

        // If squad now has < 2 active members, set to FORMING to attract new ones
        const remainingActive = squad.members.length - inactiveMembers.length;
        if (remainingActive < 2) {
          await prisma.squad.update({
            where: { id: squad.id },
            data: { status: 'FORMING' },
          });
        }

        actions.push({
          squadId: squad.id,
          action: 'REFORMED',
          details: `${inactiveMembers.length} membre(s) inactif(s) retirés. ${remainingActive} actif(s) restant(s).`,
        });
      }
    }

    return actions;
  }
}

export const squadService = new SquadService();
