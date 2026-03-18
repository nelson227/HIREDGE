import prisma from '../db/prisma';
import { AppError } from './auth.service';

export class AdminService {
  async getStats() {
    const [
      totalUsers,
      totalJobs,
      totalApplications,
      totalSquads,
      usersByRole,
      usersBySubscription,
      recentSignups,
      activeUsersLast7d,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.job.count(),
      prisma.application.count(),
      prisma.squad.count(),
      prisma.user.groupBy({ by: ['role'], _count: true }),
      prisma.user.groupBy({ by: ['subscriptionTier'], _count: true }),
      prisma.user.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      }),
      prisma.user.count({
        where: { lastActiveAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      }),
    ]);

    return {
      totalUsers,
      totalJobs,
      totalApplications,
      totalSquads,
      recentSignups,
      activeUsersLast7d,
      usersByRole: Object.fromEntries(usersByRole.map(r => [r.role, r._count])),
      usersBySubscription: Object.fromEntries(usersBySubscription.map(r => [r.subscriptionTier, r._count])),
    };
  }

  async listUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    subscriptionTier?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.role) where.role = params.role;
    if (params.subscriptionTier) where.subscriptionTier = params.subscriptionTier;
    if (params.search) {
      where.OR = [
        { email: { contains: params.search, mode: 'insensitive' } },
        { candidateProfile: { firstName: { contains: params.search, mode: 'insensitive' } } },
        { candidateProfile: { lastName: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const orderBy: any = {};
    const sortField = params.sortBy || 'createdAt';
    const allowedSortFields = ['createdAt', 'lastActiveAt', 'email', 'role'];
    if (allowedSortFields.includes(sortField)) {
      orderBy[sortField] = params.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          email: true,
          role: true,
          subscriptionTier: true,
          isEmailVerified: true,
          lastActiveAt: true,
          createdAt: true,
          candidateProfile: {
            select: {
              firstName: true,
              lastName: true,
              title: true,
              avatarUrl: true,
              city: true,
              country: true,
            },
          },
          _count: {
            select: {
              applications: true,
              squadMembers: true,
              simulations: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserDetail(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        subscriptionTier: true,
        isEmailVerified: true,
        lastActiveAt: true,
        createdAt: true,
        updatedAt: true,
        candidateProfile: {
          select: {
            firstName: true,
            lastName: true,
            title: true,
            bio: true,
            avatarUrl: true,
            city: true,
            country: true,
            phone: true,
            linkedinUrl: true,
          },
        },
        _count: {
          select: {
            applications: true,
            squadMembers: true,
            simulations: true,
            notifications: true,
            chatMessages: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('USER_NOT_FOUND', 'Utilisateur introuvable', 404);
    }

    return user;
  }

  async updateUserRole(userId: string, role: string, requesterId?: string) {
    const validRoles = ['CANDIDATE', 'SCOUT', 'RECRUITER', 'ADMIN'];
    if (!validRoles.includes(role)) {
      throw new AppError('INVALID_ROLE', 'Rôle invalide', 400);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 'Utilisateur introuvable', 404);
    }

    // Prevent an admin from downgrading their own role
    if (user.role === 'ADMIN' && role !== 'ADMIN' && requesterId === userId) {
      throw new AppError('CANNOT_DOWNGRADE_SELF', 'Impossible de rétrograder votre propre rôle administrateur', 400);
    }

    return prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, role: true },
    });
  }

  async updateUserSubscription(userId: string, subscriptionTier: string) {
    const validTiers = ['FREE', 'STARTER', 'PRO', 'SQUAD_PLUS'];
    if (!validTiers.includes(subscriptionTier)) {
      throw new AppError('INVALID_TIER', 'Abonnement invalide', 400);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 'Utilisateur introuvable', 404);
    }

    return prisma.user.update({
      where: { id: userId },
      data: { subscriptionTier },
      select: { id: true, email: true, subscriptionTier: true },
    });
  }

  async deleteUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 'Utilisateur introuvable', 404);
    }
    if (user.role === 'ADMIN') {
      throw new AppError('CANNOT_DELETE_ADMIN', 'Impossible de supprimer un administrateur', 400);
    }

    // Prisma cascade will handle related records
    await prisma.user.delete({ where: { id: userId } });
    return { deleted: true };
  }
}

export const adminService = new AdminService();
