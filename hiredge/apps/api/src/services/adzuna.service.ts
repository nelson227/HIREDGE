import { config } from '../config/env';
import { prisma } from '../db/prisma';

const ADZUNA_BASE_URL = 'https://api.adzuna.com/v1/api/jobs';

interface AdzunaJob {
  id: string;
  title: string;
  description: string;
  company: { display_name: string };
  location: { display_name: string; area: string[] };
  salary_min?: number;
  salary_max?: number;
  contract_type?: string;
  contract_time?: string;
  redirect_url: string;
  created: string;
  category: { label: string; tag: string };
}

interface AdzunaResponse {
  results: AdzunaJob[];
  count: number;
  mean: number;
}

// Country codes pour Adzuna
const COUNTRY_CODES: Record<string, string> = {
  canada: 'ca',
  france: 'fr',
  usa: 'us',
  uk: 'gb',
  germany: 'de',
};

export class AdzunaService {
  private appId: string;
  private appKey: string;

  constructor() {
    this.appId = config.adzuna.appId;
    this.appKey = config.adzuna.appKey;
  }

  /**
   * Recherche des offres d'emploi via Adzuna API
   */
  async searchJobs(params: {
    keywords: string;
    location: string;
    country?: string;
    page?: number;
    resultsPerPage?: number;
  }): Promise<AdzunaJob[]> {
    const {
      keywords,
      location,
      country = 'canada',
      page = 1,
      resultsPerPage = 20,
    } = params;

    const countryCode = COUNTRY_CODES[country.toLowerCase()] || 'ca';

    const url = new URL(`${ADZUNA_BASE_URL}/${countryCode}/search/${page}`);
    url.searchParams.set('app_id', this.appId);
    url.searchParams.set('app_key', this.appKey);
    url.searchParams.set('results_per_page', resultsPerPage.toString());
    url.searchParams.set('what', keywords);
    url.searchParams.set('where', location);
    url.searchParams.set('content-type', 'application/json');

    try {
      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Adzuna] Erreur API: ${response.status}`, errorText);
        throw new Error(`Adzuna API error: ${response.status}`);
      }

      const data = (await response.json()) as AdzunaResponse;

      return data.results;
    } catch (error: any) {
      console.error('[Adzuna] Erreur:', error.message);
      throw error;
    }
  }

  /**
   * Importe les offres Adzuna dans la base de données
   */
  async importJobs(params: {
    keywords: string;
    location: string;
    country?: string;
    maxPages?: number;
  }): Promise<{ fetched: number; imported: number }> {
    const { keywords, location, country = 'canada', maxPages = 3 } = params;

    let totalFetched = 0;
    let totalImported = 0;

    for (let page = 1; page <= maxPages; page++) {
      const jobs = await this.searchJobs({
        keywords,
        location,
        country,
        page,
        resultsPerPage: 20,
      });

      if (jobs.length === 0) break;

      totalFetched += jobs.length;

      for (const adzunaJob of jobs) {
        try {
          // Vérifier si l'offre existe déjà
          const existing = await prisma.job.findFirst({
            where: {
              externalId: adzunaJob.id,
              source: 'adzuna',
            },
          });

          if (existing) continue;

          // Trouver ou créer la company
          let company = await prisma.company.findFirst({
            where: { name: adzunaJob.company.display_name },
          });

          if (!company) {
            company = await prisma.company.create({
              data: {
                name: adzunaJob.company.display_name,
                industry: adzunaJob.category?.label || 'General',
                location: adzunaJob.location.display_name,
                sizeRange: 'Unknown',
              },
            });
          }

          // Créer l'offre
          await prisma.job.create({
            data: {
              title: adzunaJob.title,
              description: adzunaJob.description || 'No description available',
              location: adzunaJob.location.display_name,
              companyId: company.id,
              source: 'adzuna',
              externalId: adzunaJob.id,
              sourceUrl: adzunaJob.redirect_url,
              salaryMin: adzunaJob.salary_min ? Math.round(adzunaJob.salary_min) : null,
              salaryMax: adzunaJob.salary_max ? Math.round(adzunaJob.salary_max) : null,
              contractType: this.mapContractType(adzunaJob.contract_type, adzunaJob.contract_time),
              remote: this.detectRemote(adzunaJob.title, adzunaJob.description || ''),
              status: 'ACTIVE',
              requiredSkills: JSON.stringify(this.extractSkills(adzunaJob.title, adzunaJob.description || '')),
              postedAt: new Date(adzunaJob.created),
            },
          });

          totalImported++;
        } catch (error: any) {
          console.error(`[Adzuna] Erreur import job ${adzunaJob.id}:`, error.message);
        }
      }

      // Petit délai entre les pages pour respecter les rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`[Adzuna] Import terminé: ${totalImported}/${totalFetched} offres importées`);
    return { fetched: totalFetched, imported: totalImported };
  }

  private mapContractType(contractType?: string, contractTime?: string): string {
    if (contractType?.toLowerCase().includes('permanent')) return 'CDI';
    if (contractType?.toLowerCase().includes('contract')) return 'CDD';
    if (contractTime?.toLowerCase().includes('part_time')) return 'TEMPS_PARTIEL';
    return 'CDI';
  }

  private detectRemote(title: string, description: string): boolean {
    const text = `${title} ${description}`.toLowerCase();
    return /\b(remote|télétravail|work from home|wfh|hybrid|hybride)\b/.test(text);
  }

  private detectExperienceLevel(title: string): string {
    const lower = title.toLowerCase();
    if (/\b(senior|sr\.?|lead|principal|staff)\b/.test(lower)) return 'SENIOR';
    if (/\b(junior|jr\.?|entry|débutant)\b/.test(lower)) return 'JUNIOR';
    if (/\b(intern|stage|stagiaire)\b/.test(lower)) return 'INTERN';
    return 'MID';
  }

  private extractSkills(title: string, description: string): string[] {
    const text = `${title} ${description}`;
    const skills: string[] = [];

    const skillPatterns = [
      /\b(JavaScript|TypeScript|Python|Java|C\+\+|C#|Ruby|Go|Rust|PHP|Swift|Kotlin)\b/gi,
      /\b(React|Vue|Angular|Node\.?js|Django|Flask|Spring|Rails|Laravel|Express)\b/gi,
      /\b(AWS|Azure|GCP|Docker|Kubernetes|Terraform|Jenkins|CI\/CD)\b/gi,
      /\b(PostgreSQL|MySQL|MongoDB|Redis|Elasticsearch|GraphQL|REST API)\b/gi,
      /\b(Machine Learning|ML|AI|Data Science|Deep Learning|NLP)\b/gi,
      /\b(Agile|Scrum|DevOps|Git|Linux)\b/gi,
    ];

    for (const pattern of skillPatterns) {
      const matches = text.match(pattern) || [];
      skills.push(...matches.map(s => s.trim()));
    }

    // Dédupliquer et limiter à 10 skills
    return [...new Set(skills)].slice(0, 10);
  }
}

export const adzunaService = new AdzunaService();
