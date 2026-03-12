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
  ? new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    })
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
  | 'SALARY_INFO'
  | 'GENERATE_DOCUMENT';

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

  async chat(userId: string, message: string, imageBase64?: string): Promise<{
    message: string;
    actions?: any[];
    suggestedFollowups?: string[];
  }> {
    // If an image is attached, use the vision model directly
    if (imageBase64 && openai) {
      const context = await this.buildContext(userId, { intent: 'GENERAL_CHAT', confidence: 1, entities: {}, requiresToolCall: false });
      const response = await this.analyzeImage(message, imageBase64, context);
      await this.saveMessages(userId, message, response.message);
      return response;
    }

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

  private async analyzeImage(message: string, imageBase64: string, context: EdgeContext) {
    try {
      // Clean the base64 — extract the raw data if it includes the data URI prefix
      const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1]! : imageBase64;
      const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z+]+);/);
      const mimeType = mimeMatch?.[1] ?? 'image/jpeg';

      const completion = await openai!.chat.completions.create({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        temperature: 0.5,
        max_tokens: 1500,
        messages: [
          {
            role: 'system',
            content: `Tu es EDGE, l'assistant IA d'HIREDGE (app de recherche d'emploi).
Tu peux voir et analyser les images envoyées par l'utilisateur.
Analyse l'image en détail et réponds à la question de l'utilisateur.
Si c'est un CV, un document professionnel ou une offre d'emploi, donne une analyse utile.
Si c'est un screenshot, décris ce que tu vois.
Réponds toujours en français de manière amicale et professionnelle.
Tu peux aussi générer des PDF et Word — si l'utilisateur veut exporter ton analyse, dis-lui de demander "mets ça en pdf" ou "envoie en word".

PROFIL UTILISATEUR : ${context.userProfile?.firstName ?? ''} ${context.userProfile?.lastName ?? ''}`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${base64Data}` },
              },
              {
                type: 'text',
                text: message || "Que vois-tu sur cette image ? Donne-moi une analyse détaillée.",
              },
            ] as any,
          },
        ],
      });

      const content = completion.choices[0]?.message?.content ?? "Je n'ai pas pu analyser cette image.";
      return {
        message: content,
        suggestedFollowups: ['Analyse mon CV', 'Chercher des offres', 'Préparer un entretien'],
      };
    } catch (err: any) {
      console.error('Vision analysis error:', err?.message ?? err);
      return {
        message: "Désolé, je n'ai pas pu analyser cette image. Essaie avec une image plus petite ou décris-moi ce qu'elle contient.",
        suggestedFollowups: ['Décris ton image', 'Chercher des offres', 'Génère mon CV'],
      };
    }
  }

  private async detectIntent(userId: string, message: string): Promise<DetectedIntent> {
    // --- LLM path ---
    if (openai) {
      const recentMessages = await this.getRecentMessages(userId, 3);
      try {
        const completion = await openai.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          temperature: 0,
          max_tokens: 200,
          messages: [
            {
              role: 'system',
              content: `Tu es un détecteur d'intentions pour HIREDGE, une app de recherche d'emploi.
Analyse le message et retourne un JSON avec:
- intent: SEARCH_JOBS | CHECK_STATUS | PREPARE_APPLICATION | INTERVIEW_PREP | SQUAD_INFO | SCOUT_QUESTION | GET_STATS | GET_COMPANY_INFO | MOTIVATION | GENERAL_CHAT | PROFILE_UPDATE | SALARY_INFO | GENERATE_DOCUMENT
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
      // Document generation — check early (CV, lettre, document, PDF, Word)
      [/(?:génère|genere|générer|generer|crée|cree|créer|creer|fabrique|fais|rédige|redige|modifie|adapte|transforme|convertis|converti|envoie|envoyer|renvoie|renvoyer|donne|télécharge|telecharge|télécharger|telecharger|place|mets?|exporte|exporter).*?(?:cv|curriculum|lettre|document|pdf|word|docx|résumé|resume)|(?:cv|lettre|pdf|word|docx).*?(?:format|standard|norme|style|version|français|anglais|chinois|allemand|espagnol|italien|japonais).*?|(?:mon\s+cv|le\s+cv).*?(?:en\s+)?(?:pdf|word|docx|format)|(?:en\s+(?:pdf|word|docx))\b|(?:dans\s+un\s+(?:pdf|word|docx|document|fichier))\b|(?:cv|lettre).*?(?:format|standard|norme|style).*?(?:france|français|canada|canadien|québec|américain|chinois|allemand|japonais)/i, 'GENERATE_DOCUMENT'],
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
    // --- Document generation path (needs special LLM call with structured output) ---
    if (intent.intent === 'GENERATE_DOCUMENT' && openai) {
      // Check if user wants to export conversation/analysis content (not a CV)
      const isCvOrLetter = /cv|curriculum|lettre|motivation|resume/i.test(message);
      const isExportRequest = /(?:place|mets?|exporte|envoie|donne).*(?:dans|en).*(?:pdf|word|document|fichier)|(?:informations?|contenu|analyse|résultat|tout).*(?:pdf|word|document)/i.test(message);

      if (!isCvOrLetter && isExportRequest) {
        // Export recent conversation as a downloadable document
        const lastAssistantMsg = context.recentMessages
          .filter((m: any) => m.role === 'assistant')
          .slice(-1)[0];
        const contentToExport = lastAssistantMsg?.content ?? 'Aucun contenu à exporter.';
        return {
          message: `📄 Voici le contenu prêt à être exporté ! Tu peux le télécharger en PDF ou Word ci-dessous.`,
          actions: [{ type: 'DOWNLOAD_DOCUMENT', documentType: 'cover_letter', data: { content: contentToExport, personalInfo: context.userProfile } }],
          suggestedFollowups: ['Télécharger en PDF', 'Télécharger en Word', 'Génère mon CV'],
        };
      }

      try {
        return await this.generateDocument(message, context);
      } catch {
        return {
          message: "Désolé, je n'ai pas pu générer le document. Réessaie en précisant quel type de document tu veux (CV, lettre de motivation) et pour quel pays/standard.",
          suggestedFollowups: ['Génère un CV format France', 'Génère une lettre de motivation', 'Adapte mon CV pour le Canada'],
        };
      }
    }

    // --- LLM path ---
    if (openai) {
      try {
        const systemPrompt = this.buildSystemPrompt(context, intent);
        const completion = await openai.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
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

      case 'GENERATE_DOCUMENT': {
        return `Pour générer ton document, j'ai besoin de l'IA activée. En attendant, envoie-moi ton CV en PDF ou texte et dis-moi quel format tu veux (ex: "Adapte mon CV aux standards France"). Assure-toi que la clé API Groq est bien configurée.`;
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

TES CAPACITÉS (tu PEUX faire tout cela) :
- Générer des CV professionnels en PDF et Word adaptés à 23+ pays
- Générer des lettres de motivation personnalisées
- Analyser des images (CV, captures d'écran, offres d'emploi, documents)
- Exporter du contenu en PDF ou Word
- Chercher des offres d'emploi
- Préparer des simulations d'entretien
- Donner des statistiques et conseils
Si l'utilisateur demande un document PDF ou Word, dis-lui de formuler sa demande avec "génère mon CV" ou "en pdf" ou "en word".

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
      GENERATE_DOCUMENT: ['Télécharger en PDF', 'Télécharger en Word', 'Adapter pour un autre pays'],
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

  private async generateDocument(message: string, context: EdgeContext) {
    const completion = await openai!.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.4,
      max_tokens: 4000,
      messages: [
        {
          role: 'system',
          content: `Tu es un EXPERT INTERNATIONAL en rédaction de CV et documents professionnels.
Tu connais parfaitement les normes et conventions de CV de CHAQUE PAYS du monde.
L'utilisateur te demande de générer ou adapter un document.

PROFIL UTILISATEUR :
${JSON.stringify(context.userProfile, null, 2)}

CONVERSATION RÉCENTE (peut contenir le contenu d'un document envoyé par l'utilisateur) :
${context.recentMessages.slice(-6).map((m: any) => `[${m.role}]: ${m.content.slice(0, 3000)}`).join('\n')}

RÈGLES FONDAMENTALES :
- Génère un document COMPLET et PROFESSIONNEL
- Utilise UNIQUEMENT les infos fournies par l'utilisateur, NE FABRIQUE RIEN
- Si des infos manquent, mets des placeholders comme "[Votre email]" ou "[À compléter]"
- DÉTECTE le pays cible dans le message (explicite ou implicite) et adapte le format

⚠️ RÈGLE ABSOLUE DE LANGUE ET DIFFÉRENCIATION :
- Le contenu du CV DOIT ÊTRE ÉCRIT DANS LA LANGUE DU PAYS CIBLE :
  • FR/BE/CH/QC/MA/SN → tout en FRANÇAIS
  • US/UK/CA/AU/AE/IN → tout en ANGLAIS
  • DE → tout en ALLEMAND (Berufserfahrung, Ausbildung, etc.)
  • ES → tout en ESPAGNOL
  • IT → tout en ITALIEN
  • JP → tout en JAPONAIS
  • BR → tout en PORTUGAIS
  • NL → tout en NÉERLANDAIS
  • CN → tout en CHINOIS SIMPLIFIÉ (简体中文)
  • KR → tout en CORÉEN
  • RU → tout en RUSSE
  • SE → tout en SUÉDOIS
  • PL → tout en POLONAIS
- Chaque pays DOIT produire un CV DIFFÉRENT en termes de : langue, structure, sections incluses, style de rédaction, et informations personnelles.
- NE PAS simplement traduire le même CV. ADAPTE véritablement le style, le format et le contenu au pays.

════════════════════════════════════════════════════════
GUIDE COMPLET DES FORMATS DE CV PAR PAYS
════════════════════════════════════════════════════════

🇫🇷 FRANCE (FR)
- Nom : CV
- Photo : NON (tendance moderne, non obligatoire, éviter sauf si demandé)
- Infos perso : NOM seulement requis. Pas d'âge, pas de photo, pas de statut marital en standard
- Format : anti-chronologique, 1 page (junior) à 2 pages max
- Résumé en haut ("Profil"), résultats chiffrés
- Langues avec niveaux (B2, C1) ou descriptif
- En FRANÇAIS : Profil, Expérience Professionnelle, Formation, Compétences, Langues
- Style sobre et élégant

🇺🇸 USA (US)
- Nom : Resume (PAS "CV" sauf académique)
- Photo : JAMAIS (discrimination)
- Infos perso : AUCUNE (pas d'âge, nationalité, statut marital, genre, photo)
- Format : 1 page (junior/mid), 2 max (senior), reverse chronological
- Focus RÉSULTATS : verbe d'action + résultat chiffré ("Increased revenue by 35%")
- En ANGLAIS : Summary, Professional Experience, Education, Skills
- GPA si récent diplômé et > 3.5

🇨🇦 CANADA anglophone (CA)
- Nom : Resume
- Photo : NON
- Infos perso : NON (pas d'âge, genre, statut)
- Format : 1-2 pages, reverse chronological
- En ANGLAIS : similaire au US mais "References available upon request" encore courant

🇨🇦 QUÉBEC (QC)
- Nom : CV
- Photo : NON
- BILINGUISME : toujours mettre en avant (français + anglais)
- Structure nord-américaine, en FRANÇAIS

🇬🇧 ROYAUME-UNI (UK)
- Nom : CV
- Photo : NON
- Format : 2 pages standard
- En ANGLAIS : Personal Profile, Work Experience, Education, Key Skills
- References avec 2 contacts ou "Available upon request"

🇩🇪 ALLEMAGNE (DE)
- Nom : Lebenslauf
- Photo : OUI obligatoire (Bewerbungsfoto)
- Infos perso : date de naissance, nationalité, état civil
- SIGNATURE manuscrite + date en bas — OBLIGATOIRE
- En ALLEMAND : Persönliche Daten, Profil, Berufserfahrung, Ausbildung, Kenntnisse, Sprachen

🇨🇭 SUISSE (CH)
- Photo : OUI
- Infos perso : nationalité, PERMIS DE TRAVAIL (B, C, G) — CRUCIAL
- LANGUES très importantes (FR/DE/IT/EN)

🇧🇪 BELGIQUE (BE)
- Photo : NON (tendance moderne)
- LANGUES : crucial (FR/NL/EN minimum)

🇳🇱 PAYS-BAS (NL)
- Photo : OUI
- Infos perso : date de naissance, nationalité
- En NÉERLANDAIS : Profiel, Werkervaring, Opleiding, Vaardigheden, Talen

🇪🇸 ESPAGNE (ES)
- Photo : OUI
- Infos perso : date de naissance, DNI/NIE
- En ESPAGNOL : Perfil Profesional, Experiencia Profesional, Formación Académica, Competencias, Idiomas

🇮🇹 ITALIE (IT)
- Photo : OUI
- OBLIGATOIRE en bas : "Autorizzo il trattamento dei dati personali ai sensi del D.Lgs. 196/2003"
- SIGNATURE + date en bas
- En ITALIEN : Profilo, Esperienza Professionale, Istruzione, Competenze, Lingue

🇯🇵 JAPON (JP)
- Photo : OUI (3x4cm, fond blanc)
- Infos perso : date de naissance, genre, nationalité, adresse complète
- Format : très structuré, en tableau
- En JAPONAIS : 職務概要, 職務経歴, 学歴, スキル, 語学力, 資格

🇦🇺 AUSTRALIE (AU)
- Photo : NON
- Format : 2-3 pages (plus long que US/Canada)
- "Referees" : section OBLIGATOIRE avec 2-3 contacts NOMMÉS
- En ANGLAIS

🇮🇳 INDE (IN)
- Photo : OUI
- Infos perso : date de naissance, nationalité, état civil
- "Declaration" en bas : "I hereby declare that the information furnished above is true..."
- SIGNATURE + date + lieu
- En ANGLAIS

🇦🇪 ÉMIRATS (AE)
- Photo : OUI
- Infos perso : nationalité, visa/sponsor
- En ANGLAIS

🇧🇷 BRÉSIL (BR)
- Photo : non (tendance récente)
- En PORTUGAIS : Objetivo, Experiência Profissional, Formação Acadêmica, Competências, Idiomas

🇲🇦 MAROC (MA)
- Photo : OUI
- Infos perso : date de naissance, situation familiale
- En FRANÇAIS : Langues (arabe, français, anglais/espagnol)

🇸🇳 AFRIQUE DE L'OUEST FRANCOPHONE (SN)
- Photo : OUI
- Infos perso : date de naissance, situation matrimoniale
- Références souvent incluses
- En FRANÇAIS

🇨🇳 CHINE (CN)
- Nom : 简历 (Jiǎnlì)
- Photo : OUI obligatoire
- Infos perso : date de naissance, genre, nationalité, hukou (户口), état civil, ethnie parfois
- Format : 1-2 pages, très structuré, souvent avec tableau
- En CHINOIS SIMPLIFIÉ (简体中文) : 个人简介, 工作经历, 教育背景, 专业技能, 语言能力, 证书, 兴趣爱好
- Inclure le parti politique si membre du PCC (courant dans le public)
- Diplômes très valorisés avec classement universitaire

🇰🇷 CORÉE DU SUD (KR)
- Nom : 이력서 (Iryeokseo)
- Photo : OUI obligatoire
- Infos perso : date de naissance, genre, adresse complète, état civil
- Format : très standardisé, tableau
- En CORÉEN : 자기소개, 경력, 학력, 보유 기술, 어학, 자격증

🇷🇺 RUSSIE (RU)
- Nom : Резюме (Rezyume)
- Photo : OUI courante
- Infos perso : date de naissance, nationalité
- En RUSSE : Профиль, Опыт работы, Образование, Навыки, Языки

🇸🇪 SUÈDE (SE)
- Photo : NON
- Infos perso : NON (loi anti-discrimination stricte)
- En SUÉDOIS : Profil, Arbetslivserfarenhet, Utbildning, Kompetenser, Språk

🇵🇱 POLOGNE (PL)
- Photo : OUI courante
- Infos perso : date de naissance
- OBLIGATOIRE : clause RGPD en bas ("Wyrażam zgodę na przetwarzanie moich danych osobowych...")
- En POLONAIS : Profil zawodowy, Doświadczenie zawodowe, Wykształcenie, Umiejętności, Języki

════════════════════════════════════════════════════════

Tu DOIS répondre avec un JSON valide (pas de markdown, pas de texte autour) dans CE format exact :
{
  "documentType": "cv" | "cover_letter",
  "targetCountry": "XX",
  "summary": "Courte phrase décrivant ce que tu as généré",
  "cvData": {
    "targetCountry": "XX",
    "personalInfo": { "firstName": "", "lastName": "", "title": "", "email": "", "phone": "", "address": "", "linkedin": "", "portfolio": "", "dateOfBirth": "" ou null, "nationality": "" ou null, "maritalStatus": "" ou null, "drivingLicense": "" ou null, "visaStatus": "" ou null, "photo": true/false },
    "summary": "Résumé/Profil/Objective DANS LA LANGUE DU PAYS CIBLE",
    "experiences": [{ "title": "DANS LA LANGUE DU PAYS", "company": "", "location": "", "startDate": "", "endDate": "", "highlights": ["DANS LA LANGUE DU PAYS"] }],
    "education": [{ "degree": "DANS LA LANGUE DU PAYS", "institution": "", "year": "", "details": "" }],
    "skills": ["..."],
    "languages": [{ "name": "DANS LA LANGUE DU PAYS", "level": "" }],
    "certifications": ["..."],
    "interests": ["..."],
    "references": [{ "name": "", "title": "", "company": "", "contact": "" }] ou "Available upon request" ou null,
    "declaration": "..." ou null
  },
  "letterContent": "..." // seulement si documentType = "cover_letter"
}

RÈGLES CRITIQUES DU JSON :
- targetCountry = code ISO du pays cible DÉTECTÉ dans la demande (FR par défaut)
- photo = true SEULEMENT si le pays l'attend : DE, JP, CH, NL, ES, IT, IN, AE, MA, SN, CN, KR, RU, PL (PAS la France, PAS le US/UK/CA/AU/SE)
- dateOfBirth, nationality, etc. = SEULEMENT si le pays les inclut normalement
- declaration = SEULEMENT pour l'Inde (IN)
- references : inclure si le pays l'attend (UK, CA, AU, IN, AE, SN)
- TOUT le texte du CV (summary, highlights, degree, skills descriptions) DOIT être dans la LANGUE du pays cible, PAS en français sauf si le pays est francophone`,
        },
        { role: 'user', content: message },
      ],
    });

    const raw = completion.choices[0]!.message.content ?? '{}';
    // Try to extract JSON from possible markdown code blocks or raw JSON
    let jsonStr = raw;
    const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1]!;
    } else {
      // Try to find JSON object in the response
      const jsonObjectMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        jsonStr = jsonObjectMatch[0];
      }
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr.trim());
    } catch {
      // LLM returned non-JSON text — return it as a message with a retry suggestion
      return {
        message: raw.length > 20 ? raw.slice(0, 800) : "Je n'ai pas pu structurer le document. Réessaie en précisant le pays.",
        suggestedFollowups: ['Génère mon CV format France', 'Génère mon CV format Chine', 'Écris une lettre de motivation'],
      };
    }

    if (parsed.documentType === 'cv' && parsed.cvData) {
      return {
        message: `✅ ${parsed.summary ?? "J'ai généré ton CV !"} Tu peux le télécharger en PDF ou Word ci-dessous.`,
        actions: [{ type: 'DOWNLOAD_DOCUMENT', documentType: 'cv', data: parsed.cvData }],
        suggestedFollowups: ['Télécharger en PDF', 'Télécharger en Word', 'Modifie la section expériences', 'Adapte-le pour le Canada'],
      };
    } else if (parsed.documentType === 'cover_letter' && parsed.letterContent) {
      return {
        message: `✅ ${parsed.summary ?? "Voici ta lettre de motivation !"} Tu peux la télécharger ci-dessous.`,
        actions: [{ type: 'DOWNLOAD_DOCUMENT', documentType: 'cover_letter', data: { content: parsed.letterContent, personalInfo: parsed.cvData?.personalInfo ?? context.userProfile } }],
        suggestedFollowups: ['Télécharger en PDF', 'Télécharger en Word', 'Rends-la plus formelle', 'Ajoute mes compétences techniques'],
      };
    }

    return {
      message: parsed.summary ?? "J'ai traité ta demande mais je n'ai pas pu structurer le document. Peux-tu reformuler ?",
      suggestedFollowups: ['Génère un CV format France', 'Écris une lettre de motivation'],
    };
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
