import { memoryService } from './memory.service';

/**
 * Tone Adapter — Adapts EDGE's response tone based on emotional context.
 * See AGENTS.md §2.6 for the tone matrix specification.
 */

interface ToneConfig {
  energy: 'low' | 'medium' | 'high' | 'very_high';
  empathy: 'low' | 'medium' | 'high';
  directiveness: 'low' | 'medium' | 'high';
  humor: boolean;
}

const TONE_MATRIX: Record<string, ToneConfig> = {
  normal:          { energy: 'medium',    empathy: 'medium', directiveness: 'medium', humor: true },
  post_rejection:  { energy: 'low',       empathy: 'high',   directiveness: 'low',    humor: false },
  pre_interview:   { energy: 'high',      empathy: 'medium', directiveness: 'high',   humor: true },
  long_inactivity: { energy: 'low',       empathy: 'high',   directiveness: 'low',    humor: false },
  victory:         { energy: 'very_high', empathy: 'medium', directiveness: 'low',    humor: true },
  discouraged:     { energy: 'low',       empathy: 'high',   directiveness: 'low',    humor: false },
  frustrated:      { energy: 'medium',    empathy: 'high',   directiveness: 'medium', humor: false },
};

export class ToneAdapterService {
  /** Detect emotional context from recent signals and return tone instructions. */
  async getToneInstructions(userId: string): Promise<string> {
    const context = await this.detectEmotionalContext(userId);
    const tone = TONE_MATRIX[context] ?? TONE_MATRIX.normal!;
    return this.buildTonePrompt(tone, context);
  }

  /** Build a post-rejection analysis with actionable insights. */
  async buildPostRejectionAnalysis(
    userId: string,
    applicationId: string,
  ): Promise<string | null> {
    // Import prisma here to avoid circular deps at module level
    const { default: prisma } = await import('../db/prisma');

    const app = await prisma.application.findFirst({
      where: { id: applicationId, userId },
      include: {
        job: { include: { company: { select: { name: true, industry: true } } } },
      },
    });
    if (!app || app.status !== 'REJECTED') return null;

    const daysSinceApply = Math.floor(
      (Date.now() - app.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Get user's overall stats for comparison
    const stats = await prisma.application.groupBy({
      by: ['status'],
      where: { userId },
      _count: { id: true },
    });
    const total = stats.reduce((s, x) => s + x._count.id, 0);
    const rejected = stats.find((s) => s.status === 'REJECTED')?._count.id ?? 0;
    const rejectionRate = total > 0 ? Math.round((rejected / total) * 100) : 0;

    const parts: string[] = [];
    parts.push(`📊 **Analyse du rejet — ${app.job.title} chez ${app.job.company?.name ?? 'l\'entreprise'}**`);
    parts.push('');

    // Timing analysis
    if (daysSinceApply <= 2) {
      parts.push('⏱️ **Réponse très rapide** (< 2 jours) : Le profil ne correspondait probablement pas aux critères automatiques. Vérifie que tes compétences clés matchent bien l\'annonce.');
    } else if (daysSinceApply <= 7) {
      parts.push('⏱️ **Réponse dans la semaine** : Ton profil a été vu mais pas retenu. Assure-toi que ton CV met en avant les mots-clés de l\'offre.');
    } else {
      parts.push(`⏱️ **Réponse après ${daysSinceApply} jours** : Le processus a pris du temps, ce qui veut dire que ton profil a probablement été étudié. C'est encourageant pour de futures candidatures similaires.`);
    }

    // Overall pattern
    parts.push('');
    if (rejectionRate > 70 && total > 5) {
      parts.push(`📈 **Pattern détecté** : ${rejectionRate}% de tes candidatures sont refusées. Il serait bon de revoir ton CV ou de cibler davantage les offres qui matchent ton profil.`);
    } else if (rejectionRate < 30 && total > 5) {
      parts.push(`📈 **Bon ratio global** : Seulement ${rejectionRate}% de rejets — tu cibles bien. Ce rejet est l'exception, pas la règle.`);
    }

    // Actionable suggestions
    parts.push('');
    parts.push('💡 **Prochaines actions** :');
    parts.push('1. Adapte ton CV pour mieux correspondre aux offres similaires');
    parts.push('2. Postule à des postes proches chez d\'autres entreprises du même secteur');
    parts.push('3. Lance une simulation d\'entretien pour te préparer aux entretiens à venir');

    return parts.join('\n');
  }

  // ─── Private ───

  private async detectEmotionalContext(userId: string): Promise<string> {
    const { default: prisma } = await import('../db/prisma');

    // Check recent rejection
    const recentRejection = await prisma.application.findFirst({
      where: {
        userId,
        status: 'REJECTED',
        updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (recentRejection) return 'post_rejection';

    // Check upcoming interview
    const upcomingInterview = await prisma.application.findFirst({
      where: {
        userId,
        status: 'INTERVIEW_SCHEDULED',
        interviewDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 48 * 60 * 60 * 1000),
        },
      },
    });
    if (upcomingInterview) return 'pre_interview';

    // Check recent success
    const recentOffer = await prisma.application.findFirst({
      where: {
        userId,
        status: 'OFFERED',
        updatedAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      },
    });
    if (recentOffer) return 'victory';

    // Check last activity (inactivity)
    const lastMessage = await prisma.edgeChatMessage.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (lastMessage) {
      const daysSince = (Date.now() - lastMessage.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > 5) return 'long_inactivity';
    }

    // Check episodic memory emotional state
    const lastMood = await memoryService.getLastEmotionalState(userId);
    if (lastMood === 'discouraged') return 'discouraged';
    if (lastMood === 'frustrated') return 'frustrated';

    return 'normal';
  }

  private buildTonePrompt(tone: ToneConfig, context: string): string {
    const parts: string[] = ['INSTRUCTIONS DE TON :'];

    switch (tone.energy) {
      case 'very_high': parts.push('- Sois enthousiaste et célèbre !'); break;
      case 'high': parts.push('- Sois dynamique et motivant.'); break;
      case 'low': parts.push('- Sois doux et posé, pas trop d\'énergie.'); break;
      default: parts.push('- Ton équilibré et naturel.'); break;
    }

    switch (tone.empathy) {
      case 'high': parts.push('- Montre beaucoup d\'empathie et de compréhension.'); break;
      case 'low': parts.push('- Sois factuel et orienté action.'); break;
      default: break;
    }

    switch (tone.directiveness) {
      case 'high': parts.push('- Sois directif : propose des actions concrètes.'); break;
      case 'low': parts.push('- Pas de pression. Laisse l\'utilisateur décider.'); break;
      default: break;
    }

    if (!tone.humor) {
      parts.push('- Pas d\'humour ni de blagues dans ce contexte.');
    }

    // Context-specific notes
    if (context === 'post_rejection') {
      parts.push('- L\'utilisateur vient de recevoir un rejet. Sois empathique d\'abord, puis propose des alternatives.');
      parts.push('- Ne minimise PAS le rejet ("c\'est pas grave") — valide l\'émotion.');
    } else if (context === 'pre_interview') {
      parts.push('- L\'utilisateur a un entretien bientôt. Booste sa confiance et propose une préparation.');
    } else if (context === 'long_inactivity') {
      parts.push('- L\'utilisateur revient après une absence. Note sa présence de manière positive, sans culpabiliser.');
    } else if (context === 'victory') {
      parts.push('- L\'utilisateur a une offre ! Célèbre cette victoire avec enthousiasme !');
    }

    return parts.join('\n');
  }
}

export const toneAdapterService = new ToneAdapterService();
