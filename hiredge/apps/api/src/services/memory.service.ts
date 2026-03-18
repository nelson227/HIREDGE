import prisma from '../db/prisma';
import redis from '../lib/redis';
import OpenAI from 'openai';
import { env } from '../config/env';

const isLLMEnabled =
  env.OPENAI_API_KEY.length > 20 &&
  !env.OPENAI_API_KEY.startsWith('sk-...');

const openai = isLLMEnabled
  ? new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    })
  : null;

/**
 * EDGE Memory Service — 3-level memory system per AGENTS.md §12
 *
 * 1. SHORT-TERM  (Working Memory)  → Redis, conversation session, ~4000 tokens
 * 2. MEDIUM-TERM (Episodic Memory) → DB EdgeMemoryEpisode, conversation summaries
 * 3. LONG-TERM   (Semantic Memory) → DB UserProfile + learned preferences
 */
export class MemoryService {
  private readonly SHORT_TERM_TTL = 3600; // 1 hour
  private readonly MAX_EPISODES = 50;

  // ─── SHORT-TERM: Redis session context ───

  /** Store current conversation working memory (entities, emotional state, etc.) */
  async setWorkingMemory(userId: string, conversationId: string, data: WorkingMemory) {
    const key = `edge:mem:short:${userId}:${conversationId}`;
    await redis.set(key, JSON.stringify(data), 'EX', this.SHORT_TERM_TTL);
  }

  async getWorkingMemory(userId: string, conversationId: string): Promise<WorkingMemory | null> {
    const key = `edge:mem:short:${userId}:${conversationId}`;
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  }

  /** Extend TTL when conversation is active */
  async touchWorkingMemory(userId: string, conversationId: string) {
    const key = `edge:mem:short:${userId}:${conversationId}`;
    await redis.expire(key, this.SHORT_TERM_TTL);
  }

  // ─── MEDIUM-TERM: Episodic Memory ───

  /** Create an episode summary at end of conversation */
  async createEpisode(userId: string, conversationId: string): Promise<void> {
    // Get conversation messages
    const messages = await prisma.edgeChatMessage.findMany({
      where: { userId, conversationId },
      orderBy: { createdAt: 'asc' },
      take: 40,
    });

    if (messages.length < 2) return; // Too short to summarize

    // Check if episode already exists
    const existing = await prisma.edgeMemoryEpisode.findFirst({
      where: { userId, conversationId },
    });
    if (existing) return;

    const conversationText = messages
      .map((m) => `[${m.role}]: ${m.content.slice(0, 300)}`)
      .join('\n');

    let summary: EpisodeSummary;

    if (openai) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          temperature: 0,
          max_tokens: 300,
          messages: [
            {
              role: 'system',
              content: `Résume cette conversation en JSON:
{
  "summary": "résumé en 2-3 phrases",
  "keyDecisions": ["décision 1", "décision 2"],
  "emotionalState": "neutral|happy|frustrated|anxious|discouraged|motivated",
  "actionItems": ["action 1", "action 2"]
}
Réponds UNIQUEMENT avec le JSON.`,
            },
            { role: 'user', content: conversationText },
          ],
        });
        const raw = completion.choices[0]?.message?.content ?? '{}';
        summary = JSON.parse(raw);
      } catch {
        summary = this.buildFallbackSummary(messages);
      }
    } else {
      summary = this.buildFallbackSummary(messages);
    }

    await prisma.edgeMemoryEpisode.create({
      data: {
        userId,
        conversationId,
        summary: summary.summary || 'Conversation sans résumé.',
        keyDecisions: summary.keyDecisions || [],
        emotionalState: summary.emotionalState || 'neutral',
        actionItems: summary.actionItems || [],
      },
    });

    // Prune old episodes (keep max 50)
    const count = await prisma.edgeMemoryEpisode.count({ where: { userId } });
    if (count > this.MAX_EPISODES) {
      const oldest = await prisma.edgeMemoryEpisode.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        take: count - this.MAX_EPISODES,
        select: { id: true },
      });
      await prisma.edgeMemoryEpisode.deleteMany({
        where: { id: { in: oldest.map((e) => e.id) } },
      });
    }
  }

  /** Retrieve relevant episodes for context building */
  async getRelevantEpisodes(userId: string, limit: number = 5): Promise<any[]> {
    // Get most recent episodes (keyword-based relevance can be added later with embeddings)
    const episodes = await prisma.edgeMemoryEpisode.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        summary: true,
        keyDecisions: true,
        emotionalState: true,
        actionItems: true,
        createdAt: true,
      },
    });
    return episodes;
  }

  /** Get the last emotional state across episodes */
  async getLastEmotionalState(userId: string): Promise<string | null> {
    const episode = await prisma.edgeMemoryEpisode.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { emotionalState: true },
    });
    return episode?.emotionalState ?? null;
  }

  // ─── LONG-TERM: Learned Preferences ───

  /** Store a learned preference in Redis (long-lived) */
  async setPreference(userId: string, key: string, value: string) {
    const redisKey = `edge:mem:long:${userId}:prefs`;
    await redis.hset(redisKey, key, value);
  }

  async getPreference(userId: string, key: string): Promise<string | null> {
    const redisKey = `edge:mem:long:${userId}:prefs`;
    return redis.hget(redisKey, key);
  }

  async getAllPreferences(userId: string): Promise<Record<string, string>> {
    const redisKey = `edge:mem:long:${userId}:prefs`;
    return redis.hgetall(redisKey) as Promise<Record<string, string>>;
  }

  /** Learn user tone from their messages (called periodically) */
  async learnWritingStyle(userId: string) {
    const messages = await prisma.edgeChatMessage.findMany({
      where: { userId, role: 'user' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { content: true },
    });

    if (messages.length < 5) return;

    const avgLength = messages.reduce((s, m) => s + m.content.length, 0) / messages.length;
    const usesEmoji = messages.some((m) => /[\p{Emoji_Presentation}]/u.test(m.content));
    const formality = messages.some((m) => /vous|monsieur|madame|veuillez/i.test(m.content))
      ? 'formal'
      : 'informal';

    await this.setPreference(userId, 'avgMessageLength', String(Math.round(avgLength)));
    await this.setPreference(userId, 'usesEmoji', String(usesEmoji));
    await this.setPreference(userId, 'formality', formality);
  }

  // ─── Context Assembler (for EDGE) ───

  /** Build memory context to inject into EDGE's system prompt */
  async buildMemoryContext(userId: string, conversationId?: string): Promise<string> {
    const parts: string[] = [];

    // 1. Working memory (if active conversation)
    if (conversationId) {
      const working = await this.getWorkingMemory(userId, conversationId);
      if (working) {
        parts.push(`[Session en cours] ${working.currentTopic || ''} | Humeur: ${working.detectedMood || 'neutre'}`);
      }
    }

    // 2. Recent episodes
    const episodes = await this.getRelevantEpisodes(userId, 3);
    if (episodes.length > 0) {
      const episodeSummary = episodes.map((e) => {
        const date = new Date(e.createdAt).toLocaleDateString('fr-FR');
        return `- ${date}: ${e.summary}${e.actionItems?.length ? ` (à faire: ${(e.actionItems as string[]).join(', ')})` : ''}`;
      }).join('\n');
      parts.push(`[Conversations récentes]\n${episodeSummary}`);
    }

    // 3. Preferences
    const prefs = await this.getAllPreferences(userId);
    if (Object.keys(prefs).length > 0) {
      const prefParts: string[] = [];
      if (prefs.formality) prefParts.push(`style: ${prefs.formality}`);
      if (prefs.usesEmoji === 'true') prefParts.push('aime les emojis');
      if (prefParts.length > 0) {
        parts.push(`[Préférences] ${prefParts.join(', ')}`);
      }
    }

    return parts.join('\n');
  }

  // ─── Helpers ───

  private buildFallbackSummary(messages: any[]): EpisodeSummary {
    const userMessages = messages.filter((m) => m.role === 'user');
    const firstMsg = userMessages[0]?.content?.slice(0, 100) || '';
    const lastMsg = userMessages[userMessages.length - 1]?.content?.slice(0, 100) || '';

    return {
      summary: `Discussion de ${messages.length} messages. Début: "${firstMsg}". Fin: "${lastMsg}".`,
      keyDecisions: [],
      emotionalState: 'neutral',
      actionItems: [],
    };
  }
}

interface WorkingMemory {
  currentTopic?: string;
  detectedMood?: string;
  mentionedCompanies?: string[];
  mentionedJobs?: string[];
  lastIntentType?: string;
}

interface EpisodeSummary {
  summary: string;
  keyDecisions: string[];
  emotionalState: string;
  actionItems: string[];
}

export const memoryService = new MemoryService();
