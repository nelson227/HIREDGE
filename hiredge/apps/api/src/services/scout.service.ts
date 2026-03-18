import prisma from '../db/prisma';
import { AppError } from './auth.service';
import { SCOUT_CREDITS } from '@hiredge/shared';
import { anonymizationService } from './anonymization.service';

export class ScoutService {
  async registerAsScout(userId: string, data: {
    companyId: string;
    department?: string;
    position?: string;
    yearsAtCompany?: number;
    isAnonymous?: boolean;
  }) {
    const existingScout = await prisma.scout.findFirst({
      where: { userId, companyId: data.companyId },
    });
    if (existingScout) {
      throw new AppError('ALREADY_SCOUT', 'Vous êtes déjà éclaireur pour cette entreprise', 409);
    }

    const scout = await prisma.scout.create({
      data: {
        userId,
        companyId: data.companyId,
        department: data.department,
        position: data.position,
        yearsAtCompany: data.yearsAtCompany,
        isAnonymous: data.isAnonymous ?? true,
        creditBalance: 0,
        trustScore: 50,
      },
    });

    return scout;
  }

  async getScoutProfile(userId: string) {
    const scouts = await prisma.scout.findMany({
      where: { userId },
      include: {
        company: { select: { id: true, name: true, logo: true, industry: true } },
        _count: { select: { conversations: true } },
      },
    });

    if (scouts.length === 0) return null;
    return scouts;
  }

  async findScoutsForCompany(companyId: string) {
    const scouts = await prisma.scout.findMany({
      where: {
        companyId,
        status: 'VERIFIED',
      },
      select: {
        id: true,
        department: true,
        yearsAtCompany: true,
        trustScore: true,
        isAnonymous: true,
        // Never expose identity
      },
    });

    return scouts;
  }

  async startConversation(candidateUserId: string, scoutId: string, initialQuestion: string) {
    const scout = await prisma.scout.findUnique({ where: { id: scoutId } });
    if (!scout) throw new AppError('SCOUT_NOT_FOUND', 'Éclaireur introuvable', 404);
    if (scout.status !== 'VERIFIED') {
      throw new AppError('SCOUT_NOT_VERIFIED', 'Cet éclaireur n\'est pas encore vérifié', 400);
    }

    // Check existing conversation
    const existing = await prisma.scoutConversation.findFirst({
      where: { candidateId: candidateUserId, scoutId, status: 'ACTIVE' },
    });
    if (existing) {
      throw new AppError('CONVERSATION_EXISTS', 'Vous avez déjà une conversation active avec cet éclaireur', 409);
    }

    const conversation = await prisma.scoutConversation.create({
      data: {
        candidateId: candidateUserId,
        scoutId,
        status: 'ACTIVE',
        messages: {
          create: {
            senderId: candidateUserId,
            senderType: 'CANDIDATE',
            content: initialQuestion,
            isAnonymized: false,
          },
        },
      },
      include: { messages: true },
    });

    return conversation;
  }

  async sendMessage(userId: string, conversationId: string, content: string) {
    const conversation = await prisma.scoutConversation.findUnique({
      where: { id: conversationId },
      include: { scout: true },
    });
    if (!conversation) throw new AppError('CONVERSATION_NOT_FOUND', 'Conversation introuvable', 404);
    if (conversation.status !== 'ACTIVE') {
      throw new AppError('CONVERSATION_CLOSED', 'Cette conversation est fermée', 400);
    }

    // Determine sender type
    const isScout = conversation.scout.userId === userId;
    const isCandidate = conversation.candidateId === userId;
    if (!isScout && !isCandidate) {
      throw new AppError('NOT_PARTICIPANT', 'Vous ne participez pas à cette conversation', 403);
    }

    // Anonymize scout messages before storing
    let finalContent = content;
    let isAnonymized = false;
    if (isScout) {
      const result = await anonymizationService.anonymize(content);
      finalContent = result.anonymized;
      isAnonymized = true;
    }

    const message = await prisma.scoutMessage.create({
      data: {
        conversationId,
        senderId: userId,
        senderType: isScout ? 'SCOUT' : 'CANDIDATE',
        content: finalContent,
        isAnonymized,
      },
    });

    // Award credits to scout for answering
    if (isScout) {
      await prisma.scout.update({
        where: { id: conversation.scoutId },
        data: { creditBalance: { increment: SCOUT_CREDITS.answerQuestion } },
      });
    }

    return message;
  }

  async getConversations(userId: string) {
    // Get conversations where user is candidate or scout
    const scoutIds = await prisma.scout.findMany({
      where: { userId },
      select: { id: true },
    });

    const conversations = await prisma.scoutConversation.findMany({
      where: {
        OR: [
          { candidateId: userId },
          { scoutId: { in: scoutIds.map((s: any) => s.id) } },
        ],
      },
      include: {
        scout: {
          select: {
            id: true,
            department: true,
            company: { select: { id: true, name: true, logo: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return conversations;
  }

  async getConversationMessages(userId: string, conversationId: string) {
    const conversation = await prisma.scoutConversation.findUnique({
      where: { id: conversationId },
      include: { scout: true },
    });
    if (!conversation) throw new AppError('CONVERSATION_NOT_FOUND', 'Conversation introuvable', 404);

    const isScout = conversation.scout.userId === userId;
    const isCandidate = conversation.candidateId === userId;
    if (!isScout && !isCandidate) {
      throw new AppError('NOT_PARTICIPANT', 'Vous ne participez pas à cette conversation', 403);
    }

    const messages = await prisma.scoutMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        conversationId: true,
        senderType: true,
        content: true,
        isAnonymized: true,
        createdAt: true,
      },
    });

    return messages;
  }
}

export const scoutService = new ScoutService();
