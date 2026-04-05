import OpenAI from 'openai';
import prisma from '../db/prisma';
import { env } from '../config/env';
import { AppError } from './auth.service';

type SimulationWithSessions = Awaited<ReturnType<typeof prisma.interviewSimulation.findMany<{ include: { sessions: true } }>>>[number];
type SessionMetrics = SimulationWithSessions['sessions'][number];

const groq = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

// ─── Filler words database (FR + EN) ──────────────────────────────
const FILLER_WORDS_FR = [
  'euh', 'heu', 'ben', 'bah', 'genre', 'voilà', 'en fait', 'du coup',
  'quoi', 'enfin', 'disons', 'bon', 'hein', 'tu vois', 'en gros',
  'comment dire', 'donc voilà', 'tu sais', 'vous savez', 'effectivement',
];
const FILLER_WORDS_EN = [
  'um', 'uh', 'like', 'you know', 'so', 'basically', 'actually',
  'literally', 'right', 'well', 'kind of', 'sort of', 'I mean',
];

interface SpeechMetrics {
  wordsPerMinute: number;
  fillerWordCount: number;
  fillerWords: string[];
  pauseCount: number;
  longestPause: number;
  speechDuration: number;
  wordCount: number;
}

interface ConfidenceAnalysis {
  confidenceScore: number;     // 0-100
  voiceSteadiness: number;     // 0-100
  energyLevel: number;         // 0-100
  eyeContactPct: number;       // 0-100 (only from client-side tracking)
  breakdown: {
    clarity: number;           // 0-100
    pace: number;              // 0-100
    fillerPenalty: number;     // 0-100 (lower = more fillers)
    structuredness: number;    // 0-100
    assertiveness: number;     // 0-100
  };
  tips: string[];
}

interface FullResponseAnalysis {
  speech: SpeechMetrics;
  confidence: ConfidenceAnalysis;
  content: {
    relevance: number;
    depth: number;
    structure: number;
    specificity: number;
    communication: number;
    starMethodUsed: boolean;
    keyPointsCovered: string[];
    missedPoints: string[];
    bestQuote: string;
  };
  feedback: string;
}

export class SpeechAnalysisService {

  /**
   * Analyze written/transcribed text for speech patterns (filler words, pace, etc.)
   */
  analyzeText(text: string, durationSeconds?: number): SpeechMetrics {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    const textLower = text.toLowerCase();

    // Detect filler words
    const allFillers = [...FILLER_WORDS_FR, ...FILLER_WORDS_EN];
    const detectedFillers: string[] = [];
    let fillerCount = 0;

    for (const filler of allFillers) {
      const regex = new RegExp(`\\b${filler.replace(/\s+/g, '\\s+')}\\b`, 'gi');
      const matches = textLower.match(regex);
      if (matches) {
        fillerCount += matches.length;
        for (let i = 0; i < matches.length; i++) {
          detectedFillers.push(filler);
        }
      }
    }

    // Estimate pauses from punctuation patterns
    const pauseIndicators = text.match(/[.…]{2,}|—|–|\.\.\./g);
    const pauseCount = pauseIndicators ? pauseIndicators.length : 0;

    // Estimate speech duration and WPM
    const estimatedDuration = durationSeconds ?? (wordCount / 2.5); // ~150 WPM average spoken
    const wpm = estimatedDuration > 0 ? (wordCount / estimatedDuration) * 60 : 0;

    return {
      wordsPerMinute: Math.round(wpm),
      fillerWordCount: fillerCount,
      fillerWords: detectedFillers,
      pauseCount,
      longestPause: pauseCount > 0 ? 2.5 : 0, // estimate
      speechDuration: Math.round(estimatedDuration),
      wordCount,
    };
  }

  /**
   * Compute confidence score from text + speech metrics + optional eye contact
   */
  computeConfidenceScore(
    text: string,
    speechMetrics: SpeechMetrics,
    eyeContactPct?: number,
  ): ConfidenceAnalysis {
    const { wordsPerMinute, fillerWordCount, wordCount, pauseCount } = speechMetrics;

    // Clarity: fewer fillers = clearer speech
    const fillerRatio = wordCount > 0 ? fillerWordCount / wordCount : 0;
    const clarity = Math.max(0, Math.min(100, 100 - fillerRatio * 500));

    // Pace: 130-170 WPM is ideal for presentations
    let pace = 100;
    if (wordsPerMinute < 100) pace = Math.max(30, wordsPerMinute * 0.7);
    else if (wordsPerMinute > 200) pace = Math.max(30, 100 - (wordsPerMinute - 200) * 0.5);
    else if (wordsPerMinute >= 130 && wordsPerMinute <= 170) pace = 100;
    else pace = 80;

    // Filler penalty
    const fillerPenalty = Math.max(0, 100 - fillerWordCount * 12);

    // Structuredness: check for transition words, numbered points, etc.
    const structureMarkers = text.match(
      /premièrement|deuxièmement|d'abord|ensuite|enfin|par exemple|concrètement|en résumé|first|second|third|finally|for example|specifically|in summary/gi,
    );
    const structuredness = Math.min(100, 40 + (structureMarkers?.length ?? 0) * 20);

    // Assertiveness: looking for strong language patterns
    const weakPatterns = text.match(
      /je pense que|peut-être|je crois|j'espère|I think|maybe|I guess|I hope|probably|possibly/gi,
    );
    const strongPatterns = text.match(
      /j'ai réussi|j'ai atteint|j'ai livré|j'ai mené|I achieved|I delivered|I led|I built|I drove|I managed/gi,
    );
    const weakCount = weakPatterns?.length ?? 0;
    const strongCount = strongPatterns?.length ?? 0;
    const assertiveness = Math.min(100, 50 + strongCount * 15 - weakCount * 10);

    // Voice steadiness (estimated from text — real analysis needs audio)
    const voiceSteadiness = Math.min(100, pace * 0.4 + fillerPenalty * 0.3 + clarity * 0.3);

    // Energy level (estimated from punctuation, word choice, sentence length)
    const exclamations = (text.match(/!/g) || []).length;
    const avgSentenceLen = wordCount / Math.max(1, (text.match(/[.!?]+/g) || []).length);
    const energyLevel = Math.min(100, 50 + exclamations * 5 + (avgSentenceLen > 15 ? 15 : 0));

    // Overall confidence composite
    const eye = eyeContactPct ?? 70; // default if no tracking
    const confidenceScore = Math.round(
      clarity * 0.2 +
      pace * 0.15 +
      fillerPenalty * 0.15 +
      structuredness * 0.15 +
      assertiveness * 0.15 +
      eye * 0.1 +
      voiceSteadiness * 0.1,
    );

    // Tips generation
    const tips: string[] = [];
    if (fillerWordCount > 3) {
      tips.push(`Réduis les mots de remplissage (${fillerWordCount} détectés : "${speechMetrics.fillerWords.slice(0, 3).join('", "')}"). Remplace-les par de courtes pauses silencieuses.`);
    }
    if (wordsPerMinute > 180) {
      tips.push(`Tu parles un peu vite (${wordsPerMinute} mots/min). Vise 140-160 pour plus d'impact.`);
    }
    if (wordsPerMinute < 110 && wordsPerMinute > 0) {
      tips.push(`Tu pourrais accélérer légèrement ton débit (${wordsPerMinute} mots/min). Vise 130-160.`);
    }
    if (structuredness < 60) {
      tips.push('Structure davantage tes réponses avec des transitions ("Premièrement...", "Concrètement...", "En résumé...").');
    }
    if (assertiveness < 50) {
      tips.push('Utilise un langage plus affirmatif : "J\'ai réalisé", "J\'ai mené" plutôt que "Je pense que" ou "Peut-être".');
    }
    if (eye < 60) {
      tips.push('Maintiens le contact visuel avec la caméra plus souvent. Vise >70% pour projeter de la confiance.');
    }

    return {
      confidenceScore: Math.max(0, Math.min(100, confidenceScore)),
      voiceSteadiness: Math.round(voiceSteadiness),
      energyLevel: Math.round(energyLevel),
      eyeContactPct: eye,
      breakdown: {
        clarity: Math.round(clarity),
        pace: Math.round(pace),
        fillerPenalty: Math.round(fillerPenalty),
        structuredness: Math.round(structuredness),
        assertiveness: Math.round(assertiveness),
      },
      tips,
    };
  }

  /**
   * Full analysis of an interview response — combines speech, confidence, and LLM content analysis.
   */
  async analyzeResponse(
    responseText: string,
    questionText: string,
    history: any[],
    durationSeconds?: number,
    eyeContactPct?: number,
  ): Promise<FullResponseAnalysis> {
    // 1. Speech metrics
    const speech = this.analyzeText(responseText, durationSeconds);

    // 2. Confidence analysis
    const confidence = this.computeConfidenceScore(responseText, speech, eyeContactPct);

    // 3. LLM content analysis
    const content = await this.llmContentAnalysis(responseText, questionText, history);

    // 4. Generate combined feedback
    const feedback = this.generateCombinedFeedback(speech, confidence, content);

    return { speech, confidence, content, feedback };
  }

  /**
   * LLM-powered content analysis for depth, relevance, STAR method, etc.
   */
  private async llmContentAnalysis(
    response: string,
    question: string,
    history: any[],
  ) {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0,
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content: `Tu es un expert en évaluation d'entretiens d'embauche.
Analyse la réponse du candidat et retourne un JSON strict:
{
  "relevance": <0-5>,
  "depth": <0-5>,
  "structure": <0-5>,
  "specificity": <0-5>,
  "communication": <0-5>,
  "starMethodUsed": <boolean>,
  "keyPointsCovered": ["point1", "point2"],
  "missedPoints": ["point1"],
  "bestQuote": "meilleure phrase de la réponse"
}
Sois précis et factuel. Réponds UNIQUEMENT avec le JSON.`,
        },
        {
          role: 'user',
          content: `Question posée: ${question}\n\nRéponse du candidat: ${response}`,
        },
      ],
    });

    try {
      const raw = completion.choices[0]?.message?.content?.trim() ?? '{}';
      const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return {
        relevance: 3, depth: 3, structure: 3, specificity: 3, communication: 3,
        starMethodUsed: false, keyPointsCovered: [], missedPoints: [], bestQuote: '',
      };
    }
  }

  /**
   * Generate human-readable combined feedback.
   */
  private generateCombinedFeedback(
    speech: SpeechMetrics,
    confidence: ConfidenceAnalysis,
    content: any,
  ): string {
    const parts: string[] = [];

    // Content quality
    const avgContent = (content.relevance + content.depth + content.structure + content.specificity + content.communication) / 5;
    if (avgContent >= 4) parts.push('Excellente réponse sur le fond 🎯');
    else if (avgContent >= 3) parts.push('Bonne réponse, quelques points à approfondir');
    else parts.push("La réponse manque de profondeur — ajoute des exemples concrets");

    // Confidence
    if (confidence.confidenceScore >= 80) parts.push('Tu projettes beaucoup de confiance ✨');
    else if (confidence.confidenceScore >= 60) parts.push('Confiance correcte, continue comme ça');
    else parts.push('Travaille ta confiance — parle plus affirmativement');

    // Speech
    if (speech.fillerWordCount > 5) parts.push(`Attention : ${speech.fillerWordCount} mots de remplissage détectés`);

    // STAR
    if (content.starMethodUsed) parts.push('Bravo, méthode STAR bien utilisée ⭐');

    return parts.join('. ') + '.';
  }

  /**
   * Store metrics for a single question/response exchange
   */
  async saveSessionMetrics(
    simulationId: string,
    questionIndex: number,
    analysis: FullResponseAnalysis,
    responseTimeMs: number,
    eyeContactPct?: number,
  ) {
    return prisma.interviewSessionMetrics.upsert({
      where: {
        simulationId_questionIndex: { simulationId, questionIndex },
      },
      create: {
        simulationId,
        questionIndex,
        speechDuration: analysis.speech.speechDuration,
        wordsPerMinute: analysis.speech.wordsPerMinute,
        fillerWordCount: analysis.speech.fillerWordCount,
        fillerWords: JSON.stringify(analysis.speech.fillerWords),
        pauseCount: analysis.speech.pauseCount,
        longestPause: analysis.speech.longestPause,
        confidenceScore: analysis.confidence.confidenceScore,
        eyeContactPct: eyeContactPct ?? analysis.confidence.eyeContactPct,
        voiceSteadiness: analysis.confidence.voiceSteadiness,
        energyLevel: analysis.confidence.energyLevel,
        relevanceScore: analysis.content.relevance,
        depthScore: analysis.content.depth,
        structureScore: analysis.content.structure,
        specificityScore: analysis.content.specificity,
        communicationScore: analysis.content.communication,
        starMethodUsed: analysis.content.starMethodUsed,
        responseTimeMs,
      },
      update: {
        speechDuration: analysis.speech.speechDuration,
        wordsPerMinute: analysis.speech.wordsPerMinute,
        fillerWordCount: analysis.speech.fillerWordCount,
        fillerWords: JSON.stringify(analysis.speech.fillerWords),
        pauseCount: analysis.speech.pauseCount,
        longestPause: analysis.speech.longestPause,
        confidenceScore: analysis.confidence.confidenceScore,
        eyeContactPct: eyeContactPct ?? analysis.confidence.eyeContactPct,
        voiceSteadiness: analysis.confidence.voiceSteadiness,
        energyLevel: analysis.confidence.energyLevel,
        relevanceScore: analysis.content.relevance,
        depthScore: analysis.content.depth,
        structureScore: analysis.content.structure,
        specificityScore: analysis.content.specificity,
        communicationScore: analysis.content.communication,
        starMethodUsed: analysis.content.starMethodUsed,
        responseTimeMs,
      },
    });
  }

  /**
   * Get aggregated performance analytics for a user across all sessions.
   */
  async getPerformanceAnalytics(userId: string) {
    // Get all completed simulations
    const simulations = await prisma.interviewSimulation.findMany({
      where: { userId, status: 'COMPLETED' },
      include: { sessions: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    if (simulations.length === 0) {
      return {
        totalSessions: 0,
        averageScore: 0,
        averageConfidence: 0,
        trend: 'stable' as const,
        speechStats: null,
        confidenceStats: null,
        contentStats: null,
        sessionHistory: [],
        topStrengths: [],
        topImprovements: [],
      };
    }

    // Aggregate all metrics
    const allMetrics: SessionMetrics[] = simulations.flatMap((s: SimulationWithSessions) => s.sessions);

    const avgScore = simulations.reduce((sum: number, s: SimulationWithSessions) => sum + s.score, 0) / simulations.length;
    const avgConfidence = allMetrics.length > 0
      ? allMetrics.reduce((sum: number, m: SessionMetrics) => sum + m.confidenceScore, 0) / allMetrics.length
      : 0;
    const avgWPM = allMetrics.length > 0
      ? allMetrics.reduce((sum: number, m: SessionMetrics) => sum + m.wordsPerMinute, 0) / allMetrics.length
      : 0;
    const avgFillers = allMetrics.length > 0
      ? allMetrics.reduce((sum: number, m: SessionMetrics) => sum + m.fillerWordCount, 0) / allMetrics.length
      : 0;
    const avgEyeContact = allMetrics.length > 0
      ? allMetrics.reduce((sum: number, m: SessionMetrics) => sum + m.eyeContactPct, 0) / allMetrics.length
      : 0;

    // Trend: compare last 5 vs previous 5
    const recent5 = simulations.slice(0, 5);
    const previous5 = simulations.slice(5, 10);
    const recentAvg = recent5.reduce((sum: number, s: SimulationWithSessions) => sum + s.score, 0) / recent5.length;
    const previousAvg = previous5.length > 0
      ? previous5.reduce((sum: number, s: SimulationWithSessions) => sum + s.score, 0) / previous5.length
      : recentAvg;
    const trend = recentAvg > previousAvg + 5 ? 'improving' as const
      : recentAvg < previousAvg - 5 ? 'declining' as const
      : 'stable' as const;

    // Content dimension averages
    const contentAvgs = {
      relevance: avg(allMetrics.map((m: SessionMetrics) => m.relevanceScore)),
      depth: avg(allMetrics.map((m: SessionMetrics) => m.depthScore)),
      structure: avg(allMetrics.map((m: SessionMetrics) => m.structureScore)),
      specificity: avg(allMetrics.map((m: SessionMetrics) => m.specificityScore)),
      communication: avg(allMetrics.map((m: SessionMetrics) => m.communicationScore)),
    };

    // Determine strengths and improvements
    const dimensions = Object.entries(contentAvgs).sort((a, b) => b[1] - a[1]);
    const topStrengths = dimensions.slice(0, 2).map(([dim, score]) => ({
      dimension: dim,
      score: Math.round(score * 20), // convert 0-5 to 0-100
      label: dimensionLabel(dim),
    }));
    const topImprovements = dimensions.slice(-2).map(([dim, score]) => ({
      dimension: dim,
      score: Math.round(score * 20),
      label: dimensionLabel(dim),
      tip: dimensionTip(dim),
    }));

    // Session history for charts
    const sessionHistory = simulations.map((s: SimulationWithSessions) => ({
      id: s.id,
      date: s.createdAt,
      type: s.type,
      score: s.score,
      confidence: s.sessions.length > 0
        ? Math.round(s.sessions.reduce((sum: number, m: SessionMetrics) => sum + m.confidenceScore, 0) / s.sessions.length)
        : 0,
      company: s.companyName,
    })).reverse(); // chronological

    return {
      totalSessions: simulations.length,
      averageScore: Math.round(avgScore),
      averageConfidence: Math.round(avgConfidence),
      trend,
      speechStats: {
        averageWPM: Math.round(avgWPM),
        averageFillerWords: Math.round(avgFillers * 10) / 10,
        averageEyeContact: Math.round(avgEyeContact),
        starMethodUsage: allMetrics.length > 0
          ? Math.round((allMetrics.filter((m: SessionMetrics) => m.starMethodUsed).length / allMetrics.length) * 100)
          : 0,
      },
      confidenceStats: {
        average: Math.round(avgConfidence),
        trend: recentAvg > previousAvg ? 'improving' : 'stable',
      },
      contentStats: contentAvgs,
      sessionHistory,
      topStrengths,
      topImprovements,
    };
  }

  /**
   * Get detailed metrics for a single simulation session.
   */
  async getSessionDetails(userId: string, simulationId: string) {
    const simulation = await prisma.interviewSimulation.findFirst({
      where: { id: simulationId, userId },
      include: { sessions: { orderBy: { questionIndex: 'asc' } } },
    });
    if (!simulation) throw new AppError('NOT_FOUND', 'Simulation introuvable', 404);

    const metrics = simulation.sessions;
    if (metrics.length === 0) {
      return {
        simulation,
        metrics: [],
        summary: null,
      };
    }

    return {
      simulation: {
        id: simulation.id,
        type: simulation.type,
        companyName: simulation.companyName,
        jobTitle: simulation.jobTitle,
        score: simulation.score,
        status: simulation.status,
        date: simulation.createdAt,
        mode: (simulation as any).mode ?? 'TEXT',
      },
      metrics: metrics.map((m: SessionMetrics) => ({
        questionIndex: m.questionIndex,
        speech: {
          duration: m.speechDuration,
          wpm: m.wordsPerMinute,
          fillerCount: m.fillerWordCount,
          fillers: m.fillerWords ? JSON.parse(m.fillerWords) : [],
          pauses: m.pauseCount,
          longestPause: m.longestPause,
        },
        confidence: {
          score: m.confidenceScore,
          eyeContact: m.eyeContactPct,
          voiceSteadiness: m.voiceSteadiness,
          energy: m.energyLevel,
        },
        content: {
          relevance: m.relevanceScore,
          depth: m.depthScore,
          structure: m.structureScore,
          specificity: m.specificityScore,
          communication: m.communicationScore,
          starMethodUsed: m.starMethodUsed,
        },
        responseTimeMs: m.responseTimeMs,
      })),
      summary: {
        avgConfidence: Math.round(avg(metrics.map((m: SessionMetrics) => m.confidenceScore))),
        avgWPM: Math.round(avg(metrics.map((m: SessionMetrics) => m.wordsPerMinute))),
        totalFillers: metrics.reduce((sum: number, m: SessionMetrics) => sum + m.fillerWordCount, 0),
        avgEyeContact: Math.round(avg(metrics.map((m: SessionMetrics) => m.eyeContactPct))),
        avgContentScore: Math.round(avg(metrics.map((m: SessionMetrics) =>
          (m.relevanceScore + m.depthScore + m.structureScore + m.specificityScore + m.communicationScore) / 5,
        )) * 20),
        starUsageRate: Math.round(
          (metrics.filter((m: SessionMetrics) => m.starMethodUsed).length / metrics.length) * 100,
        ),
      },
    };
  }

  /**
   * Transcribe audio using Whisper (via Groq)
   */
  async transcribeAudio(audioBuffer: Buffer, language: string = 'fr'): Promise<{
    text: string;
    duration: number;
    segments: { start: number; end: number; text: string }[];
  }> {
    const file = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });

    const transcription = await groq.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3',
      language,
      response_format: 'verbose_json',
    });

    const segments = (transcription as any).segments?.map((s: any) => ({
      start: s.start,
      end: s.end,
      text: s.text,
    })) ?? [];

    return {
      text: transcription.text,
      duration: (transcription as any).duration ?? 0,
      segments,
    };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────
function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function dimensionLabel(dim: string): string {
  const labels: Record<string, string> = {
    relevance: 'Pertinence',
    depth: 'Profondeur',
    structure: 'Structure',
    specificity: 'Exemples concrets',
    communication: 'Communication',
  };
  return labels[dim] ?? dim;
}

function dimensionTip(dim: string): string {
  const tips: Record<string, string> = {
    relevance: 'Relis bien la question et assure-toi que ta réponse y répond directement.',
    depth: 'Développe davantage tes réponses avec des détails et des chiffres.',
    structure: 'Utilise la méthode STAR : Situation, Tâche, Action, Résultat.',
    specificity: 'Donne toujours un exemple concret tiré de ton expérience.',
    communication: 'Travaille la clarté : phrases courtes, transitions, et conclusion nette.',
  };
  return tips[dim] ?? 'Continue à pratiquer !';
}

export const speechAnalysisService = new SpeechAnalysisService();
