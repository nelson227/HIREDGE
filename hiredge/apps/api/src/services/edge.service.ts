import OpenAI from 'openai';
import prisma from '../db/prisma';
import redis from '../lib/redis';
import { env } from '../config/env';
import { AppError } from './auth.service';

// LLM is optional — app runs in smart fallback mode without a key
const isLLMEnabled =
  env.OPENAI_API_KEY.length > 20 &&
  !env.OPENAI_API_KEY.startsWith('sk-...');

const openai = isLLMEnabled
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
  : null;

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
    // --- LLM path ---
    if (openai) {
      const recentMessages = await this.getRecentMessages(userId, 3);
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          temperature: 0,
          max_tokens: 200,
          messages: [
            {
              role: 'system',
              content: `Tu es un détecteur d'intentions pour HIREDGE, une app de recherche d'emploi.
Analyse le message et retourne un JSON avec:
- intent: SEARCH_JOBS | CHECK_STATUS | PREPARE_APPLICATION | INTERVIEW_PREP | SQUAD_INFO | SCOUT_QUESTION | GET_STATS | GET_COMPANY_INFO | MOTIVATION | GENERAL_CHAT | PROFILE_UPDATE | SALARY_INFO
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
        const raw = completion.choices[0]!.message.content ?? '{}';
        return JSON.parse(raw);
      } catch {
        // Fall through to keyword detection
      }
    }

    // --- Keyword-based fallback intent detection ---
    return this.detectIntentByKeywords(message);
  }

  private detectIntentByKeywords(message: string): DetectedIntent {
    const m = message.toLowerCase();

    // Extract company name (word after "chez", "pour", "@" or before "Inc/SA/SAS")
    const companyMatch = m.match(/(?:chez|pour|@)\s+([a-zÀ-ÿ0-9\s\-]+?)(?:\s|$|,)/i)
      ?? m.match(/([a-z0-9\-]+)\s+(?:inc|sa|sas|gmbh|ltd)\.?/i);
    const company = companyMatch?.[1]?.trim()
      ?.split(/\s+/)
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    // Extract job title keywords
    const jobMatch = m.match(/(?:poste|offre|emploi|job|travail)\s+(?:de\s+)?([a-zÀ-ÿ\s]+?)(?:\s+chez|$)/i);
    const jobTitle = jobMatch?.[1]?.trim();

    const patterns: [RegExp, IntentType][] = [
      // Emotional states — check first to avoid false SEARCH match on "recherches"
      [/decourag|décourag|démotiv|déprim|abandone|plus le courage|galère|galere|c'est dur|triste/i, 'MOTIVATION'],
      // Interview prep
      [/entretien|interview|simulation|simuler/i, 'INTERVIEW_PREP'],
      // Applications check — "mes candidatures", "postuler", etc.
      [/candidature|postul|applic|mes cand/i, 'CHECK_STATUS'],
      // Job search — after removing decourag/recherch ambiguity
      [/\bcherche\b|trouve.*offre|offre.*emploi|\bjob\b|poste|recrut/i, 'SEARCH_JOBS'],
      // Squad
      [/squad|équipe|groupe|coéquipier/i, 'SQUAD_INFO'],
      // Stats
      [/stat|chiffre|taux|performance|résultat/i, 'GET_STATS'],
      // Salary
      [/salaire|rémunér|paie|compens/i, 'SALARY_INFO'],
      // Company info
      [/entreprise|société|boite|companie|culture/i, 'GET_COMPANY_INFO'],
      // Profile
      [/profil|compétence|expérience|mise à jour/i, 'PROFILE_UPDATE'],
      // Prepare application dossier
      [/prépare.*(candidature|dossier|lettre)/i, 'PREPARE_APPLICATION'],
      // Motivation — broader positive seek
      [/motiv|courage|encourage|soutien/i, 'MOTIVATION'],
    ];

    for (const [regex, intent] of patterns) {
      if (regex.test(m)) {
        return { intent, confidence: 0.75, entities: { company, jobTitle }, requiresToolCall: true };
      }
    }

    return { intent: 'GENERAL_CHAT', confidence: 0.5, entities: {}, requiresToolCall: false };
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
            where: { name: { contains: intent.entities.company } },
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
    // --- LLM path ---
    if (openai) {
      try {
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
        const responseText = completion.choices[0]!.message.content
          ?? "Je suis là pour t'aider ! Que puis-je faire pour toi ?";
        return {
          message: responseText,
          actions: this.getActions(intent),
          suggestedFollowups: this.getSuggestedFollowups(intent.intent),
        };
      } catch {
        // Fall through to smart fallback
      }
    }

    // --- Smart fallback: context-rich rule-based responses ---
    const responseText = this.buildFallbackResponse(message, intent, context);
    return {
      message: responseText,
      actions: this.getActions(intent),
      suggestedFollowups: this.getSuggestedFollowups(intent.intent),
    };
  }

  private buildFallbackResponse(message: string, intent: DetectedIntent, context: EdgeContext): string {
    const name = context.userProfile?.firstName || 'toi';
    const skills = (context.userProfile?.skills ?? []) as string[];
    const experiences = (context.userProfile?.experience ?? []) as string[];

    switch (intent.intent) {
      case 'CHECK_STATUS': {
        const apps = context.intentData as any[] | null;
        if (!apps || apps.length === 0) {
          return `Tu n'as pas encore de candidatures en cours, ${name}. Lance-toi ! Tape "cherche des offres" pour explorer les 219+ postes disponibles.`;
        }
        const pending = apps.filter((a: any) => a.status === 'SENT' || a.status === 'VIEWED').length;
        const interviews = apps.filter((a: any) => a.status === 'INTERVIEW_SCHEDULED').length;
        const latest = apps[0];
        let resp = `Voici tes candidatures récentes : ${apps.length} au total`;
        if (interviews > 0) resp += `, **${interviews} entretien(s) planifié(s)** 🎯`;
        if (pending > 0) resp += `, ${pending} en attente de réponse`;
        resp += `.\nLa plus récente : **${latest.job?.company?.name ?? 'N/A'}** — ${latest.status}.`;
        return resp;
      }

      case 'SEARCH_JOBS': {
        const kw = message.match(/(?:cherche|trouve|offre|job).*?(développeur|designer|manager|data|devops|product|frontend|backend|fullstack|mobile|IA|AI|marketing|RH|finance)/i);
        const tech = kw?.[1] ?? (skills[0] ?? null);
        if (tech) {
          return `Je cherche des offres de **${tech}** pour toi ! J'ai trouvé des centaines d'offres dans la base — utilise l'onglet Offres avec la recherche "${tech}" pour les voir toutes avec les filtres avancés.`;
        }
        return `Rendez-vous dans l'onglet **Offres** pour explorer les 219+ postes disponibles. Tu peux filtrer par lieu, type de contrat, salaire et niveau d'expérience. Avec ton profil (${skills.slice(0, 3).join(', ')}), tu as de belles options !`;
      }

      case 'INTERVIEW_PREP': {
        const company = intent.entities.company;
        if (company) {
          return `Pour préparer ton entretien chez **${company}**, concentre-toi sur : \n1. Leur culture et produits récents\n2. Des exemples STAR de tes projets avec ${skills.slice(0, 2).join(' et ')}\n3. Questions sur la roadmap tech de l'équipe\n\nVeux-tu lancer une **simulation d'entretien** ?`;
        }
        return `La préparation c'est 80% du succès ! Je peux te lancer une simulation d'entretien réaliste. Quel type : **RH**, **technique**, ou **culture fit** ? Et pour quelle entreprise ?`;
      }

      case 'GET_STATS': {
        const stats = context.intentData as any[] | null;
        if (!stats || stats.length === 0) {
          return `Pas encore de stats — tu n'as pas encore postulé. Commence aujourd'hui, même une candidature c'est un premier pas !`;
        }
        const total = stats.reduce((sum: number, s: any) => sum + (s._count?.id ?? 0), 0);
        const sent = stats.find((s: any) => s.status === 'SENT')?._count?.id ?? 0;
        return `Tes stats : **${total} candidatures** au total, dont ${sent} envoyées. Continue comme ça ! L'objectif recommandé est 5-10 par semaine.`;
      }

      case 'MOTIVATION': {
        const phrases = [
          `La recherche d'emploi c'est un marathon, pas un sprint. Chaque "non" te rapproche du "oui" qui compte. Tu as ${experiences.length > 0 ? experiences[0] : 'des compétences solides'} — c'est réel et précieux.`,
          `Même les meilleurs profils essuient des refus. Ce qui fait la différence ? Ne pas lâcher. Tu es là, tu cherches — c'est déjà beaucoup.`,
          `Rappelle-toi pourquoi tu fais ça. Le bon poste existe, il faut juste qu'il croise ton chemin. On continue ?`,
        ];
        return phrases[Math.floor(Math.random() * phrases.length)];
      }

      case 'SALARY_INFO': {
        return `Les salaires varient selon l'expérience et la région. En France pour ${skills[0] ?? 'ton profil'} : Junior 35-45k€, Confirmé 45-65k€, Senior 65-90k€+. Pour négocier : commence toujours par une fourchette haute, et valorise tes réalisations concrètes.`;
      }

      case 'PREPARE_APPLICATION': {
        const company = intent.entities.company ?? 'l\'entreprise';
        return `Pour préparer ton dossier complet chez **${company}**, j'aurais besoin que tu accèdes à la fiche offre et cliques "Postuler avec EDGE". Je préparerai alors : CV adapté, lettre de motivation personnalisée, et un brief entreprise. Cette fonctionnalité arrive très bientôt !`;
      }

      case 'SQUAD_INFO': {
        const squad = context.intentData as any;
        if (!squad) {
          return `Tu n'es pas encore dans une escouade ! Les escouades sont des groupes de 3-5 chasseurs d'emploi qui se soutiennent mutuellement. Va dans l'onglet **Escouade** pour rejoindre ou créer le tien.`;
        }
        const memberCount = squad.members?.length ?? 0;
        return `Ton escouade compte **${memberCount} membres**. Ensemble vous êtes plus forts ! L'onglet Escouade te montre les dernières activités du groupe.`;
      }

      case 'GET_COMPANY_INFO': {
        const company = intent.entities.company ?? 'cette entreprise';
        const data = context.intentData as any;
        if (data) {
          return `**${data.name}** (${data.industry ?? 'secteur non renseigné'}) : ${data.description ?? 'Pas encore de description disponible.'} Pour en savoir plus, consulte leur page LinkedIn ou Glassdoor.`;
        }
        return `Je n'ai pas encore d'informations détaillées sur **${company}** dans ma base. Je te recommande de consulter leur page LinkedIn, Glassdoor, et leur site careers. Tu veux que je cherche s'ils ont des offres actives ?`;
      }

      default: {
        const greetings = /bonjour|salut|coucou|hello|hey/i.test(message);
        if (greetings) {
          const profileInfo = context.userProfile
            ? `Tu as ${skills.length} compétences enregistrées.`
            : "Commence par compléter ton profil pour que je puisse t'aider encore mieux.";
          return `Salut ${name} ! 👋 Je suis EDGE, ton compagnon de recherche d'emploi. ${profileInfo}\n\nJe peux t'aider à : chercher des offres, suivre tes candidatures, préparer un entretien, ou juste discuter stratégie. Qu'est-ce qu'on fait ?`;
        }
        return `Je t'entends ! Pour t'aider au mieux, dis-moi ce que tu cherches : offres d'emploi, suivi de candidatures, préparation d'entretien, ou autre chose ?`;
      }
    }
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
