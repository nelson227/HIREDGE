import OpenAI from 'openai';
import prisma from '../db/prisma';
import { env } from '../config/env';
import { AppError } from './auth.service';

const groq = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

type InterviewType = 'RH' | 'TECHNICAL' | 'BEHAVIORAL' | 'CASE_STUDY';
type SimPhase = 'WARMUP' | 'CORE' | 'WRAP_UP' | 'DEBRIEF';

interface SimulationState {
  phase: SimPhase;
  questionIndex: number;
  totalQuestions: number;
  evaluations: QuestionEvaluation[];
  character: InterviewCharacter;
}

interface InterviewCharacter {
  name: string;
  role: string;
  company: string;
  personality: {
    warmth: number;
    directness: number;
    technicality: number;
    challenge: number;
  };
}

interface QuestionEvaluation {
  questionId: number;
  scores: {
    relevance: number;
    depth: number;
    structure: number;
    specificity: number;
    communication: number;
  };
  feedback: string;
}

export class InterviewSimService {
  async startSimulation(userId: string, data: {
    type: string;
    jobId?: string;
    companyName?: string;
    jobTitle?: string;
    difficulty?: number;
    stressMode?: boolean;
  }) {
    // Get user profile for context
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId },
      include: { skills: true, experiences: { take: 3, orderBy: { startDate: 'desc' } } },
    });

    // Get job info if provided
    let jobContext = '';
    if (data.jobId) {
      const job = await prisma.job.findUnique({
        where: { id: data.jobId },
        include: { company: true },
      });
      if (job) {
        jobContext = `Poste: ${job.title}\nEntreprise: ${job.company.name}\nDescription: ${job.description?.substring(0, 500)}`;
      }
    }

    // Generate character
    const character = this.generateCharacter(data.type as InterviewType, data.companyName ?? 'Entreprise Tech', data.difficulty ?? 2);

    const simulation = await prisma.interviewSimulation.create({
      data: {
        userId,
        type: data.type as any,
        companyName: character.company,
        jobTitle: data.jobTitle ?? profile?.title ?? 'Candidat',
        status: 'IN_PROGRESS',
        config: {
          character: character as any,
          difficulty: data.difficulty ?? 2,
          stressMode: data.stressMode ?? false,
          totalQuestions: data.type === 'TECHNICAL' ? 8 : 6,
        } as any,
      },
    });

    // Generate opening message
    const opening = await this.generateInterviewerMessage(
      simulation.id,
      character,
      'WARMUP',
      [],
      { profile, jobContext },
    );

    // Save opening message
    await prisma.interviewSimulation.update({
      where: { id: simulation.id },
      data: {
        transcriptJson: JSON.stringify([
          { role: 'interviewer', content: opening, phase: 'WARMUP', timestamp: new Date().toISOString() },
        ]),
      },
    });

    return {
      simulationId: simulation.id,
      character: { name: character.name, role: character.role, company: character.company },
      message: opening,
      phase: 'WARMUP',
    };
  }

  async respondToSimulation(userId: string, simulationId: string, response: string) {
    const simulation = await prisma.interviewSimulation.findFirst({
      where: { id: simulationId, userId },
    });
    if (!simulation) throw new AppError('SIMULATION_NOT_FOUND', 'Simulation introuvable', 404);
    if (simulation.status !== 'IN_PROGRESS') {
      throw new AppError('SIMULATION_ENDED', 'Cette simulation est terminée', 400);
    }

    const config = simulation.config as any;
    const messages: any[] = simulation.transcriptJson ? JSON.parse(simulation.transcriptJson as string) : [];
    const character = config.character as InterviewCharacter;
    const questionCount = messages.filter((m: any) => m.role === 'interviewer').length;
    const totalQuestions = config.totalQuestions ?? 6;

    // Determine phase
    let phase: SimPhase = 'CORE';
    if (questionCount <= 1) phase = 'WARMUP';
    else if (questionCount >= totalQuestions - 1) phase = 'WRAP_UP';
    else if (questionCount >= totalQuestions) phase = 'DEBRIEF';

    // Add user response to messages
    messages.push({
      role: 'candidate',
      content: response,
      phase,
      timestamp: new Date().toISOString(),
    });

    // Evaluate response in background (simplified inline)
    const evaluation = await this.evaluateResponse(response, messages, character);

    // Check if simulation should end
    if (questionCount >= totalQuestions) {
      // Generate final debrief
      const debrief = await this.generateDebrief(messages, character, config);

      messages.push({
        role: 'interviewer',
        content: debrief.message,
        phase: 'DEBRIEF',
        timestamp: new Date().toISOString(),
      });

      await prisma.interviewSimulation.update({
        where: { id: simulationId },
        data: {
          status: 'COMPLETED',
          transcriptJson: JSON.stringify(messages),
          score: debrief.overallScore,
          analysisJson: JSON.stringify(debrief.analysis),
        },
      });

      return {
        message: debrief.message,
        phase: 'DEBRIEF',
        isComplete: true,
        overallScore: debrief.overallScore,
        analysis: debrief.analysis,
      };
    }

    // Generate next interviewer message
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId },
      include: { skills: true },
    });

    const nextMessage = await this.generateInterviewerMessage(
      simulationId,
      character,
      phase,
      messages,
      { profile, evaluation },
    );

    messages.push({
      role: 'interviewer',
      content: nextMessage,
      phase,
      timestamp: new Date().toISOString(),
    });

    await prisma.interviewSimulation.update({
      where: { id: simulationId },
      data: { transcriptJson: JSON.stringify(messages) },
    });

    return {
      message: nextMessage,
      phase,
      isComplete: false,
      questionNumber: questionCount + 1,
      totalQuestions,
      evaluation: {
        score: evaluation.scores,
        feedback: evaluation.feedback,
      },
    };
  }

  async getSimulationHistory(userId: string) {
    return prisma.interviewSimulation.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        companyName: true,
        jobTitle: true,
        status: true,
        score: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async getUpcomingInterviews(userId: string) {
    // Get applications with scheduled interview dates
    const applications = await prisma.application.findMany({
      where: {
        userId,
        interviewDate: { gte: new Date() },
      },
      include: {
        job: {
          include: {
            company: true,
          },
        },
      },
      orderBy: { interviewDate: 'asc' },
    });

    return applications.map(app => ({
      id: app.id,
      jobTitle: app.job.title,
      companyName: app.job.company.name,
      interviewDate: app.interviewDate,
      status: app.status,
    }));
  }

  async getSimulationDetails(userId: string, simulationId: string) {
    const simulation = await prisma.interviewSimulation.findFirst({
      where: { id: simulationId, userId },
    });
    if (!simulation) throw new AppError('SIMULATION_NOT_FOUND', 'Simulation introuvable', 404);
    return simulation;
  }

  private generateCharacter(type: InterviewType, company: string, difficulty: number): InterviewCharacter {
    const names = ['Marie Dupont', 'Thomas Martin', 'Sophie Leroy', 'Antoine Bernard', 'Léa Moreau'];
    const roles: Record<InterviewType, string[]> = {
      RH: ['Responsable RH', 'Talent Acquisition Manager', 'DRH'],
      TECHNICAL: ['Lead Developer', 'CTO', 'Engineering Manager'],
      BEHAVIORAL: ['Responsable RH', 'HR Business Partner'],
      CASE_STUDY: ['Manager', 'Directeur de Projet', 'Consultant Senior'],
    };

    const name = names[Math.floor(Math.random() * names.length)] ?? 'Marie Dupont';
    const role = roles[type]![Math.floor(Math.random() * roles[type]!.length)] ?? 'Recruteur';

    return {
      name,
      role,
      company,
      personality: {
        warmth: type === 'RH' ? 0.8 : 0.5,
        directness: difficulty > 2 ? 0.8 : 0.5,
        technicality: type === 'TECHNICAL' ? 0.9 : 0.3,
        challenge: Math.min(difficulty * 0.3, 1),
      },
    };
  }

  private async generateInterviewerMessage(
    simulationId: string,
    character: InterviewCharacter,
    phase: SimPhase,
    messages: any[],
    context: any,
  ): Promise<string> {
    // Check if stress mode is active
    const sim = await prisma.interviewSimulation.findUnique({ where: { id: simulationId } });
    const config = sim?.config as any;
    const isStressMode = config?.stressMode === true;

    const stressInstructions = isStressMode
      ? `\n\nMODE STRESS ACTIVÉ: Tu es beaucoup plus challengeant que d'habitude.
- Interromps parfois le candidat ("Attendez, pouvez-vous être plus précis ?")
- Pose des questions pièges ("Et si je vous disais que votre approche est complètement fausse ?")
- Mets la pression sur le temps ("Il nous reste peu de temps, soyez concis")
- Challenge chaque réponse ("Concrètement, quel résultat chiffré ?")
- Reste professionnel mais exigeant`
      : '';

    const systemPrompt = `Tu es ${character.name}, ${character.role} chez ${character.company}.
Tu fais passer un entretien d'embauche.

PERSONNALITÉ: Chaleur=${character.personality.warmth}, Directivité=${character.personality.directness}, Technicité=${character.personality.technicality}, Challenge=${character.personality.challenge}

PHASE ACTUELLE: ${phase}
${phase === 'WARMUP' ? 'Accueille le candidat chaleureusement et pose une première question légère.' : ''}
${phase === 'CORE' ? 'Pose une question pertinente au poste. Si la réponse précédente était bonne, approfondis. Si elle était vague, demande des exemples concrets.' : ''}
${phase === 'WRAP_UP' ? 'Pose une dernière question puis propose au candidat de poser ses questions.' : ''}
${phase === 'DEBRIEF' ? 'Sors du personnage et donne un feedback constructif et honnête.' : ''}${stressInstructions}

RESTE EN PERSONNAGE. Parle naturellement comme dans un vrai entretien. 1-3 phrases max par message.`;

    const chatMessages = messages.slice(-6).map((m: any) => ({
      role: m.role === 'interviewer' ? 'assistant' as const : 'user' as const,
      content: m.content,
    }));

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.8,
      max_tokens: 300,
      messages: [
        { role: 'system', content: systemPrompt },
        ...chatMessages,
      ],
    });

    return completion.choices[0]!.message.content ?? 'Très bien, merci. Continuons.';
  }

  private async evaluateResponse(
    response: string,
    history: any[],
    character: InterviewCharacter,
  ): Promise<QuestionEvaluation> {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0,
      max_tokens: 300,
      messages: [
        {
          role: 'system',
          content: `Évalue la réponse du candidat sur 5 critères (0-5 chacun):
- relevance: pertinence par rapport à la question
- depth: niveau de détail
- structure: organisation de la réponse (méthode STAR, etc.)
- specificity: exemples concrets vs généralités
- communication: clarté d'expression

Retourne un JSON: { scores: { relevance, depth, structure, specificity, communication }, feedback: "1 phrase de feedback" }
Réponds UNIQUEMENT avec le JSON.`,
        },
        {
          role: 'user',
          content: `Dernière question posée: ${history.filter((m: any) => m.role === 'interviewer').pop()?.content ?? ''}}
Réponse du candidat: ${response}`,
        },
      ],
    });

    try {
      return JSON.parse(completion.choices[0]!.message.content ?? '{}');
    } catch {
      return {
        questionId: history.length,
        scores: { relevance: 3, depth: 3, structure: 3, specificity: 3, communication: 3 },
        feedback: 'Réponse correcte.',
      };
    }
  }

  private async generateDebrief(messages: any[], character: InterviewCharacter, config: any) {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.5,
      max_tokens: 600,
      messages: [
        {
          role: 'system',
          content: `Tu es un coach d'entretien professionnel. Analyse cet entretien simulé et fournis:
1. Un score global sur 100
2. 3 points forts
3. 3 axes d'amélioration
4. Un conseil actionnable pour le prochain entretien

Retourne un JSON: { overallScore: number, message: "feedback conversationnel", analysis: { strengths: string[], improvements: string[], tip: string } }
Réponds UNIQUEMENT avec le JSON.`,
        },
        {
          role: 'user',
          content: `Voici la conversation complète:\n${messages.map((m: any) => `${m.role}: ${m.content}`).join('\n')}`,
        },
      ],
    });

    try {
      return JSON.parse(completion.choices[0]!.message.content ?? '{}');
    } catch {
      return {
        overallScore: 65,
        message: 'Bon effort ! Continue à pratiquer pour gagner en confiance.',
        analysis: {
          strengths: ['Bonne communication'],
          improvements: ['Plus d\'exemples concrets'],
          tip: 'Utilise la méthode STAR pour structurer tes réponses.',
        },
      };
    }
  }

  /**
   * Start simulation in STRESS mode — interruptions, challenging follow-ups, time pressure cues.
   */
  async startStressSimulation(userId: string, data: {
    jobId?: string;
    companyName?: string;
    jobTitle?: string;
  }) {
    return this.startSimulation(userId, {
      type: 'TECHNICAL',
      jobId: data.jobId,
      companyName: data.companyName,
      jobTitle: data.jobTitle,
      difficulty: 4, // Max difficulty
      stressMode: true,
    });
  }

  /**
   * Generate a comprehensive post-interview report with section breakdowns and coaching.
   */
  async generateFullReport(userId: string, simulationId: string) {
    const simulation = await prisma.interviewSimulation.findFirst({
      where: { id: simulationId, userId, status: 'COMPLETED' },
    });
    if (!simulation) throw new AppError('SIMULATION_NOT_FOUND', 'Simulation terminée introuvable', 404);

    const messages: any[] = simulation.transcriptJson ? JSON.parse(simulation.transcriptJson as string) : [];
    const config = simulation.config as any;

    const candidateResponses = messages.filter((m: any) => m.role === 'candidate');
    const interviewerQuestions = messages.filter((m: any) => m.role === 'interviewer');

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 1500,
      messages: [
        {
          role: 'system',
          content: `Tu es un coach expert en entretiens d'embauche. Génère un rapport complet de simulation d'entretien.
Le rapport doit inclure :
1. Résumé global (score /100, impression générale)
2. Analyse question par question (pour chaque échange Q/R)
3. Communication verbale (clarté, structure, concision)
4. Gestion du stress et confiance
5. Points forts (top 3)
6. Axes d'amélioration (top 3 avec exercices pratiques)
7. Score par compétence (technique, communication, motivation, adaptabilité)
8. Plan d'action personnalisé (3 actions concrètes)

Retourne un JSON structuré:
{
  "overallScore": number,
  "summary": "string",
  "questionAnalysis": [{"question": "...", "response": "...", "score": number, "feedback": "..."}],
  "communication": {"score": number, "details": "string"},
  "stressManagement": {"score": number, "details": "string"},
  "strengths": ["..."],
  "improvements": [{"area": "...", "exercise": "..."}],
  "competencyScores": {"technical": number, "communication": number, "motivation": number, "adaptability": number},
  "actionPlan": ["..."]
}`,
        },
        {
          role: 'user',
          content: `Type: ${simulation.type}\nEntreprise: ${simulation.companyName}\nPoste: ${simulation.jobTitle}\n\nTranscription:\n${messages.map((m: any) => `[${m.role}] ${m.content}`).join('\n')}`,
        },
      ],
    });

    try {
      const content = completion.choices[0]?.message?.content?.trim() || '{}';
      const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      const report = JSON.parse(jsonStr);

      // Store the full report 
      await prisma.interviewSimulation.update({
        where: { id: simulationId },
        data: { analysisJson: JSON.stringify(report) },
      });

      return report;
    } catch {
      return {
        overallScore: simulation.score ?? 65,
        summary: 'Rapport généré avec les données disponibles.',
        strengths: ['Participation complète à la simulation'],
        improvements: [{ area: 'Préparation', exercise: 'Pratiquer la méthode STAR' }],
        competencyScores: { technical: 3, communication: 3, motivation: 3, adaptability: 3 },
        actionPlan: ['Refaire une simulation dans 3 jours'],
      };
    }
  }

  /**
   * Get annotated replay of a completed simulation — each exchange with evaluation.
   */
  async getReplay(userId: string, simulationId: string) {
    const simulation = await prisma.interviewSimulation.findFirst({
      where: { id: simulationId, userId },
    });
    if (!simulation) throw new AppError('SIMULATION_NOT_FOUND', 'Simulation introuvable', 404);

    const messages: any[] = simulation.transcriptJson ? JSON.parse(simulation.transcriptJson as string) : [];
    const analysis: any = simulation.analysisJson ? JSON.parse(simulation.analysisJson as string) : {};

    // Group messages into exchanges (question + response pairs)
    const exchanges: any[] = [];
    let currentExchange: any = null;

    for (const msg of messages) {
      if (msg.role === 'interviewer') {
        if (currentExchange) exchanges.push(currentExchange);
        currentExchange = { question: msg.content, phase: msg.phase, timestamp: msg.timestamp };
      } else if (msg.role === 'candidate' && currentExchange) {
        currentExchange.response = msg.content;
        currentExchange.responseTimestamp = msg.timestamp;
      }
    }
    if (currentExchange) exchanges.push(currentExchange);

    // Merge with question analysis if available
    if (analysis.questionAnalysis) {
      exchanges.forEach((ex, i) => {
        if (analysis.questionAnalysis[i]) {
          ex.score = analysis.questionAnalysis[i].score;
          ex.feedback = analysis.questionAnalysis[i].feedback;
        }
      });
    }

    return {
      id: simulationId,
      type: simulation.type,
      companyName: simulation.companyName,
      jobTitle: simulation.jobTitle,
      status: simulation.status,
      overallScore: simulation.score,
      date: simulation.createdAt,
      exchanges,
      analysis,
      audioUrl: simulation.audioUrl,
    };
  }
}

export const interviewSimService = new InterviewSimService();
