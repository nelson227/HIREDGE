import OpenAI from 'openai';
import prisma from '../db/prisma';
import redis from '../lib/redis';
import { env } from '../config/env';
import { AppError } from './auth.service';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

// Intent types matching AGENTS.md specification
type IntentType =
  | 'SEARCH_JOBS'
  | 'CHECK_STATUS'
  | 'PREPARE_APPLICATION'
  | 'INTERVIEW_PREP'
  | 'SQUAD_INFO'
  | 'SCOUT_QUESTION'
  | 'GET_STATS'
  | 'GET_COMPANY_INFO'
  | 'MOTIVATION'
  | 'GENERAL_CHAT'
  | 'PROFILE_UPDATE'
  | 'SALARY_INFO';

interface DetectedIntent {
  intent: IntentType;
  confidence: number;
  entities: {
    company?: string;
    jobTitle?: string;
    location?: string;
    applicationId?: string;
  };
  requiresToolCall: boolean;
}

interface EdgeContext {
  userProfile: any;
  recentMessages: any[];
  intentData?: any;
}

export class EdgeService {
  private readonly MAX_CONTEXT_MESSAGES = 10;

  async chat(userId: string, message: string): Promise<{
    message: string;
    actions?: any[];
    suggestedFollowups?: string[];
  }> {
    // 1. Detect intent
    const intent = await this.detectIntent(userId, message);

    // 2. Build context
    const context = await this.buildContext(userId, intent);

    // 3. Generate response
    const response = await this.generateResponse(userId, message, intent, context);

    // 4. Save messages
    await this.saveMessages(userId, message, response.message);

    return response;
  }

  private async detectIntent(userId: string, message: string): Promise<DetectedIntent> {
    const recentMessages = await this.getRecentMessages(userId, 3);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 200,
      messages: [
        {
          role: 'system',
          content: `Tu es un détecteur d'intentions pour HIREDGE, une app de recherche d'emploi.
Analyse le message et retourne un JSON avec:
- intent: une des valeurs suivantes: SEARCH_JOBS, CHECK_STATUS, PREPARE_APPLICATION, INTERVIEW_PREP, SQUAD_INFO, SCOUT_QUESTION, GET_STATS, GET_COMPANY_INFO, MOTIVATION, GENERAL_CHAT, PROFILE_UPDATE, SALARY_INFO
- confidence: 0 à 1
- entities: { company?, jobTitle?, location?, applicationId? }
- requiresToolCall: boolean

Réponds UNIQUEMENT avec le JSON, sans markdown.`,
        },
        ...recentMessages.map((m: any) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: message },
      ],
    });

    try {
      const raw = completion.choices[0]!.message.content ?? '{}';
      return JSON.parse(raw);
    } catch {
      return {
        intent: 'GENERAL_CHAT',
        confidence: 0.5,
        entities: {},
        requiresToolCall: false,
      };
    }
  }

  private async buildContext(userId: string, intent: DetectedIntent): Promise<EdgeContext> {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId },
      include: { skills: true, experiences: { take: 3, orderBy: { startDate: 'desc' } } },
    });

    const recentMessages = await this.getRecentMessages(userId, this.MAX_CONTEXT_MESSAGES);

    let intentData: any = null;

    switch (intent.intent) {
      case 'CHECK_STATUS':
        intentData = await prisma.application.findMany({
          where: { userId },
          include: { job: { include: { company: { select: { name: true } } } } },
          orderBy: { updatedAt: 'desc' },
          take: 5,
        });
        break;

      case 'GET_STATS':
        const stats = await prisma.application.groupBy({
          by: ['status'],
          where: { userId },
          _count: { id: true },
        });
        intentData = stats;
        break;

      case 'SQUAD_INFO':
        const member = await prisma.squadMember.findFirst({
          where: { userId, squad: { status: 'ACTIVE' } },
          include: {
            squad: {
              include: {
                members: {
                  include: {
                    user: { select: { candidateProfile: { select: { firstName: true } } } },
                  },
                },
                messages: { orderBy: { createdAt: 'desc' }, take: 5 },
              },
            },
          },
        });
        intentData = member?.squad;
        break;

      case 'GET_COMPANY_INFO':
        if (intent.entities.company) {
          intentData = await prisma.company.findFirst({
            where: { name: { contains: intent.entities.company, mode: 'insensitive' } },
          });
        }
        break;
    }

    return {
      userProfile: profile ? {
        firstName: profile.firstName,
        lastName: profile.lastName,
        title: profile.title,
        skills: profile.skills.map((s: any) => s.name),
        experience: profile.experiences.map((e: any) => `${e.title} chez ${e.company}`),
      } : null,
      recentMessages,
      intentData,
    };
  }

  private async generateResponse(
    userId: string,
    message: string,
    intent: DetectedIntent,
    context: EdgeContext,
  ) {
    const systemPrompt = this.buildSystemPrompt(context, intent);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.7,
      max_tokens: 800,
      messages: [
        { role: 'system', content: systemPrompt },
        ...context.recentMessages.map((m: any) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: message },
      ],
    });

    const responseText = completion.choices[0]!.message.content ?? 'Je suis là pour t\'aider ! Que puis-je faire pour toi ?';

    // Generate suggested follow-ups
    const suggestedFollowups = this.getSuggestedFollowups(intent.intent);

    return {
      message: responseText,
      actions: this.getActions(intent),
      suggestedFollowups,
    };
  }

  private buildSystemPrompt(context: EdgeContext, intent: DetectedIntent): string {
    let prompt = `Tu es EDGE, le compagnon IA de recherche d'emploi dans l'app HIREDGE.

PERSONNALITÉ :
- Amical mais stratégique
- Tu tutoies l'utilisateur
- Tu es concis et actionnable (pas de blabla)
- Tu célèbres les victoires et tu soutiens dans les moments difficiles
- Tu ne fais JAMAIS de promesses de résultats
- Tu ne fabriques JAMAIS de compétences ou expériences que l'utilisateur n'a pas

PROFIL UTILISATEUR :
${context.userProfile ? JSON.stringify(context.userProfile, null, 2) : 'Profil non encore renseigné.'}
`;

    if (context.intentData) {
      prompt += `\nDONNÉES PERTINENTES :\n${JSON.stringify(context.intentData, null, 2)}\n`;
    }

    prompt += `\nINTENTION DÉTECTÉE : ${intent.intent} (confiance: ${intent.confidence})
Réponds de manière naturelle et utile. Si tu n'as pas assez d'info, pose une question. 
Limite ta réponse à 3-4 phrases max sauf si l'utilisateur demande plus de détails.`;

    return prompt;
  }

  private getSuggestedFollowups(intent: IntentType): string[] {
    const followups: Record<string, string[]> = {
      SEARCH_JOBS: ['Voir mes recommandations', 'Filtrer par remote', 'Tendances du marché'],
      CHECK_STATUS: ['Relancer une candidature', 'Voir mes stats', 'Préparer un entretien'],
      PREPARE_APPLICATION: ['Adapter mon CV', 'Écrire une lettre', 'En savoir plus sur l\'entreprise'],
      INTERVIEW_PREP: ['Lancer une simulation', 'Questions fréquentes', 'Conseils pour le jour J'],
      SQUAD_INFO: ['Voir les messages', 'Mes co-équipiers', 'Défi de la semaine'],
      GET_STATS: ['Détail par entreprise', 'Améliorer mon taux', 'Objectif de la semaine'],
      GENERAL_CHAT: ['Chercher des offres', 'Mes candidatures', 'Préparer un entretien'],
    };

    return (followups[intent] ?? followups['GENERAL_CHAT']) as string[];
  }

  private getActions(intent: DetectedIntent): any[] | undefined {
    switch (intent.intent) {
      case 'SEARCH_JOBS':
        return [{ type: 'NAVIGATE', screen: 'Jobs' }];
      case 'CHECK_STATUS':
        return [{ type: 'NAVIGATE', screen: 'Applications' }];
      case 'INTERVIEW_PREP':
        return [{ type: 'NAVIGATE', screen: 'InterviewSim' }];
      case 'SQUAD_INFO':
        return [{ type: 'NAVIGATE', screen: 'Squad' }];
      default:
        return undefined;
    }
  }

  private async getRecentMessages(userId: string, limit: number) {
    const messages = await prisma.edgeChatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return messages.reverse();
  }

  private async saveMessages(userId: string, userMessage: string, assistantMessage: string) {
    await prisma.edgeChatMessage.createMany({
      data: [
        { userId, role: 'user', content: userMessage },
        { userId, role: 'assistant', content: assistantMessage },
      ],
    });
  }
}

export const edgeService = new EdgeService();
