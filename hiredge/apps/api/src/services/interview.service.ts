import OpenAI from 'openai';
import prisma from '../db/prisma';
import { env } from '../config/env';
import { AppError } from './auth.service';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

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
        transcriptJson: [
          { role: 'interviewer', content: opening, phase: 'WARMUP', timestamp: new Date().toISOString() },
        ],
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
    const messages = ((simulation.transcriptJson as any[]) ?? []);
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
          transcriptJson: messages,
          score: debrief.overallScore,
          analysisJson: debrief.analysis,
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
      data: { transcriptJson: messages },
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
    const systemPrompt = `Tu es ${character.name}, ${character.role} chez ${character.company}.
Tu fais passer un entretien d'embauche.

PERSONNALITÉ: Chaleur=${character.personality.warmth}, Directivité=${character.personality.directness}, Technicité=${character.personality.technicality}, Challenge=${character.personality.challenge}

PHASE ACTUELLE: ${phase}
${phase === 'WARMUP' ? 'Accueille le candidat chaleureusement et pose une première question légère.' : ''}
${phase === 'CORE' ? 'Pose une question pertinente au poste. Si la réponse précédente était bonne, approfondis. Si elle était vague, demande des exemples concrets.' : ''}
${phase === 'WRAP_UP' ? 'Pose une dernière question puis propose au candidat de poser ses questions.' : ''}
${phase === 'DEBRIEF' ? 'Sors du personnage et donne un feedback constructif et honnête.' : ''}

RESTE EN PERSONNAGE. Parle naturellement comme dans un vrai entretien. 1-3 phrases max par message.`;

    const chatMessages = messages.slice(-6).map((m: any) => ({
      role: m.role === 'interviewer' ? 'assistant' as const : 'user' as const,
      content: m.content,
    }));

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
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
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
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
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
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
}

export const interviewSimService = new InterviewSimService();
