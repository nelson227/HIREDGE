import * as cheerio from 'cheerio';
import { prisma } from '../db/prisma';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Sélecteurs courants pour les descriptions d'offres d'emploi
const DESCRIPTION_SELECTORS = [
  // Indeed
  '#jobDescriptionText',
  '.jobsearch-JobComponent-description',
  // LinkedIn
  '.description__text',
  '.show-more-less-html__markup',
  // Welcome to the Jungle
  '[data-testid="job-section-description"]',
  '.sc-bXCUML',
  // Glassdoor
  '.desc',
  '#JobDescriptionContainer',
  // Generic patterns (les plus courants)
  '[class*="job-description"]',
  '[class*="jobDescription"]',
  '[class*="job_description"]',
  '[id*="job-description"]',
  '[id*="jobDescription"]',
  '[class*="description-content"]',
  '[class*="vacancy-description"]',
  '[class*="offer-description"]',
  // Schema.org structured data
  '[itemprop="description"]',
  // Fallback : sections article/main
  'article .description',
  'main .description',
  '.job-detail .description',
  '.job-details',
  '.posting-requirements',
];

// Selecteurs "bruit" à exclure de l'extraction
const NOISE_SELECTORS = [
  'script', 'style', 'nav', 'header', 'footer',
  '.cookie-banner', '.ad', '.sidebar', '.related-jobs',
  '[class*="apply"]', '[class*="similar"]', '[class*="share"]',
];

interface ScrapeResult {
  jobId: string;
  success: boolean;
  description?: string;
  finalUrl?: string;
  error?: string;
}

export class DescriptionScraperService {
  private rateLimitMs: number;
  private maxRedirects: number;
  private timeoutMs: number;

  constructor(options?: { rateLimitMs?: number; maxRedirects?: number; timeoutMs?: number }) {
    this.rateLimitMs = options?.rateLimitMs ?? 2000;
    this.maxRedirects = options?.maxRedirects ?? 5;
    this.timeoutMs = options?.timeoutMs ?? 15000;
  }

  /**
   * Scrape la description complète pour un seul job
   */
  async scrapeJobDescription(jobId: string): Promise<ScrapeResult> {
    const job = await prisma.job.findUnique({ where: { id: jobId } });

    if (!job || !job.sourceUrl) {
      return { jobId, success: false, error: 'Job not found or no sourceUrl' };
    }

    try {
      const html = await this.fetchPage(job.sourceUrl);
      const description = this.extractDescription(html);

      if (!description || description.length < 100) {
        return { jobId, success: false, error: 'Description too short or not found', finalUrl: job.sourceUrl };
      }

      // Extraire skills supplémentaires de la description complète
      const { adzunaService } = await import('./adzuna.service');
      const newSkills = adzunaService.extractSkills(job.title, description);
      const existingSkills: string[] = typeof job.requiredSkills === 'string'
        ? JSON.parse(job.requiredSkills || '[]')
        : (job.requiredSkills as string[] ?? []);

      // Fusionner les skills
      const allSkills = [...new Set([...existingSkills, ...newSkills])].slice(0, 20);

      // Extraire l'expérience depuis la description complète
      const expRange = adzunaService.extractExperienceRange(job.title, description);

      // Mettre à jour le job
      await prisma.job.update({
        where: { id: jobId },
        data: {
          description,
          requiredSkills: JSON.stringify(allSkills),
          ...(expRange.min !== null && !job.experienceMin ? { experienceMin: expRange.min } : {}),
          ...(expRange.max !== null && !job.experienceMax ? { experienceMax: expRange.max } : {}),
        },
      });

      return { jobId, success: true, description, finalUrl: job.sourceUrl };
    } catch (error: any) {
      return { jobId, success: false, error: error.message, finalUrl: job.sourceUrl };
    }
  }

  /**
   * Scrape les descriptions pour tous les jobs qui n'ont pas de description complète
   */
  async scrapeAllPending(options?: { limit?: number; minDescriptionLength?: number }): Promise<{
    total: number;
    success: number;
    failed: number;
    results: ScrapeResult[];
  }> {
    const limit = options?.limit ?? 50;
    const minLength = options?.minDescriptionLength ?? 600;

    // Trouver les jobs avec des descriptions courtes (tronquées)
    const jobs = await prisma.job.findMany({
      where: {
        sourceUrl: { not: null },
        status: 'ACTIVE',
      },
      select: { id: true, description: true, sourceUrl: true },
      orderBy: { postedAt: 'desc' },
      take: limit * 3, // Prendre plus pour filtrer
    });

    // Filtrer ceux avec description courte
    const pending = jobs
      .filter(j => j.sourceUrl && j.description.length < minLength)
      .slice(0, limit);

    const results: ScrapeResult[] = [];
    let success = 0;
    let failed = 0;

    for (const job of pending) {
      const result = await this.scrapeJobDescription(job.id);
      results.push(result);

      if (result.success) {
        success++;
        console.log(`[Scraper] ✓ ${job.id} — ${result.description?.length} chars`);
      } else {
        failed++;
        console.log(`[Scraper] ✗ ${job.id} — ${result.error}`);
      }

      // Rate limiting entre les requêtes
      await this.sleep(this.rateLimitMs);
    }

    console.log(`[Scraper] Terminé: ${success}/${pending.length} réussis, ${failed} échoués`);

    return { total: pending.length, success, failed, results };
  }

  /**
   * Fetch une page en suivant les redirections
   */
  private async fetchPage(url: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        redirect: 'follow',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        throw new Error(`Not HTML: ${contentType}`);
      }

      return await response.text();
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Extrait la description d'offre d'emploi du HTML
   */
  private extractDescription(html: string): string {
    const $ = cheerio.load(html);

    // Supprimer le bruit
    for (const sel of NOISE_SELECTORS) {
      $(sel).remove();
    }

    // Essayer les sélecteurs dans l'ordre (du plus spécifique au plus générique)
    for (const selector of DESCRIPTION_SELECTORS) {
      const element = $(selector).first();
      if (element.length > 0) {
        const text = this.cleanText(element.text());
        if (text.length > 150) {
          return text;
        }
      }
    }

    // Fallback : chercher le plus grand bloc de texte dans le body
    return this.extractLargestTextBlock($);
  }

  /**
   * Fallback : trouve le plus grand bloc de texte significatif
   */
  private extractLargestTextBlock($: cheerio.CheerioAPI): string {
    let bestText = '';
    let bestLength = 0;

    $('div, section, article').each((_, el) => {
      const $el = $(el);
      // Ignorer les éléments avec trop de descendants (c'est probablement un wrapper)
      if ($el.children().length > 20) return;

      const text = this.cleanText($el.text());
      if (text.length > bestLength && text.length > 200) {
        // Vérifier que ça ressemble à une description de job
        const jobKeywords = /\b(experience|expérience|responsab|qualif|compétence|skill|mission|profil|avantage|benefit|requirement|poste|role|tâch|task)\b/i;
        if (jobKeywords.test(text)) {
          bestText = text;
          bestLength = text.length;
        }
      }
    });

    return bestText;
  }

  /**
   * Nettoie le texte extrait
   */
  private cleanText(text: string): string {
    return text
      // Normaliser les espaces
      .replace(/[\t\r]+/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/ {2,}/g, ' ')
      // Supprimer les lignes vides en début/fin
      .trim()
      // Supprimer les artefacts courants
      .replace(/^(Cookie|Accept|Decline|Close|×).*$/gm, '')
      .replace(/^Share this job.*$/gim, '')
      .replace(/^Report this job.*$/gim, '')
      .replace(/^Apply now.*$/gim, '')
      // Re-trim
      .trim();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const descriptionScraper = new DescriptionScraperService();
