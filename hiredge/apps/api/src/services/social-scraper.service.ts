import OpenAI from 'openai';
import { env } from '../config/env';
import prisma from '../db/prisma';

const isLLMEnabled =
  env.OPENAI_API_KEY.length > 20 &&
  !env.OPENAI_API_KEY.startsWith('sk-...');

const openai = isLLMEnabled
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY, baseURL: 'https://api.groq.com/openai/v1' })
  : null;

/**
 * Social scraper: detects hidden/informal job offers from social media text.
 * Processes text from Telegram groups, Twitter/X, Reddit, Discord channels.
 */
export class SocialScraperService {
  /**
   * Parse an informal job posting (social media text) into structured data.
   */
  async parseInformalPost(text: string, source: string): Promise<any | null> {
    if (!openai) return null;
    if (text.length < 20) return null;

    const response = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: 600,
      messages: [
        {
          role: 'system',
          content: `Tu es un détecteur d'offres d'emploi dans des posts informels de réseaux sociaux.
Analyse le texte et détermine s'il contient une offre d'emploi.
Si OUI, retourne JSON:
{
  "isJob": true,
  "title": "titre du poste",
  "company": "nom de l'entreprise ou null",
  "location": "lieu ou 'Remote'",
  "contractType": "CDI/CDD/Freelance/Stage",
  "skills": ["skill1","skill2"],
  "contactMethod": "email/DM/lien",
  "contactValue": "l'email ou le lien si trouvé",
  "salaryHint": "indice salarial si mentionné",
  "confidence": 0.8
}
Si NON, retourne: {"isJob": false}`,
        },
        { role: 'user', content: text.substring(0, 2000) },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim() || '{}';
    const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();

    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed.isJob) return null;

      return {
        ...parsed,
        source,
        originalText: text.substring(0, 500),
        detectedAt: new Date(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Process a batch of social media texts and create jobs for valid ones.
   */
  async processBatch(
    posts: Array<{ text: string; source: string; externalId: string }>,
  ): Promise<{ processed: number; jobsFound: number }> {
    let jobsFound = 0;

    for (const post of posts) {
      const result = await this.parseInformalPost(post.text, post.source);
      if (!result || result.confidence < 0.6) continue;

      // Check if already exists
      const existing = await prisma.job.findFirst({
        where: { externalId: `social-${post.source}-${post.externalId}` },
      });
      if (existing) continue;

      // Find or create company
      let companyId: string | undefined;
      if (result.company) {
        const company = await prisma.company.upsert({
          where: { name: result.company },
          update: {},
          create: {
            name: result.company,
            description: `Offre détectée sur ${post.source}`,
          },
        });
        companyId = company.id;
      }

      await prisma.job.create({
        data: {
          title: result.title || 'Offre détectée',
          description: result.originalText,
          location: result.location || 'Non précisé',
          contractType: result.contractType || 'CDI',
          source: `social-${post.source}`,
          externalId: `social-${post.source}-${post.externalId}`,
          externalUrl: result.contactValue || '',
          companyId,
          status: 'ACTIVE',
          postedAt: new Date(),
          skills: result.skills || [],
        },
      });

      jobsFound++;
    }

    return { processed: posts.length, jobsFound };
  }

  /**
   * Quick keyword-based pre-filter before sending to LLM (saves API calls).
   */
  isLikelyJobPost(text: string): boolean {
    const lower = text.toLowerCase();
    const jobKeywords = [
      'recrute',
      'cherche',
      'recherche',
      'embauche',
      'hiring',
      'looking for',
      'we need',
      'on recrute',
      'poste',
      'cdi',
      'cdd',
      'freelance',
      'stage',
      'alternance',
      'développeur',
      'developer',
      'ingénieur',
      'designer',
      'product manager',
      'devops',
      'fullstack',
      'frontend',
      'backend',
      'salaire',
      'salary',
      'remote',
      'télétravail',
    ];

    let matchCount = 0;
    for (const kw of jobKeywords) {
      if (lower.includes(kw)) matchCount++;
    }

    return matchCount >= 2;
  }
}

export const socialScraperService = new SocialScraperService();
