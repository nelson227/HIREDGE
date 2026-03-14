import { config } from '../config/env';
import { prisma } from '../db/prisma';

const JSEARCH_BASE_URL = 'https://jsearch.p.rapidapi.com';

interface JSearchJob {
  job_id: string;
  employer_name: string;
  employer_logo: string | null;
  employer_website: string | null;
  job_employment_type: string;
  job_title: string;
  job_apply_link: string;
  job_description: string;
  job_is_remote: boolean;
  job_posted_at_datetime_utc: string;
  job_city: string;
  job_state: string;
  job_country: string;
  job_min_salary: number | null;
  job_max_salary: number | null;
  job_salary_currency: string | null;
  job_salary_period: string | null;
  job_highlights?: {
    Qualifications?: string[];
    Responsibilities?: string[];
    Benefits?: string[];
  };
  job_required_skills: string[] | null;
  job_google_link: string;
  job_publisher: string; // "LinkedIn", "Indeed", "Glassdoor", etc.
}

interface JSearchResponse {
  status: string;
  request_id: string;
  data: JSearchJob[];
}

export class JSearchService {
  private apiKey: string;

  constructor() {
    this.apiKey = config.jsearch.apiKey;
  }

  async searchJobs(params: {
    query: string;
    page?: number;
    numPages?: number;
    country?: string;
    datePosted?: string;
  }): Promise<JSearchJob[]> {
    const {
      query,
      page = 1,
      numPages = 1,
      country = 'CA',
      datePosted = 'week',
    } = params;

    const url = new URL(`${JSEARCH_BASE_URL}/search`);
    url.searchParams.set('query', `${query} in Canada`);
    url.searchParams.set('page', page.toString());
    url.searchParams.set('num_pages', numPages.toString());
    url.searchParams.set('country', country);
    url.searchParams.set('date_posted', datePosted);

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[JSearch] API error: ${response.status}`, errorText);
        throw new Error(`JSearch API error: ${response.status}`);
      }

      const data = (await response.json()) as JSearchResponse;
      return data.data || [];
    } catch (error: any) {
      console.error('[JSearch] Error:', error.message);
      throw error;
    }
  }

  async importJobs(params: {
    query: string;
    numPages?: number;
    country?: string;
    datePosted?: string;
  }): Promise<{ fetched: number; imported: number }> {
    const { query, numPages = 1, country = 'CA', datePosted = 'week' } = params;

    let totalFetched = 0;
    let totalImported = 0;

    for (let page = 1; page <= numPages; page++) {
      const jobs = await this.searchJobs({ query, page, numPages: 1, country, datePosted });

      if (jobs.length === 0) break;
      totalFetched += jobs.length;

      for (const job of jobs) {
        try {
          // Skip if already exists
          const existing = await prisma.job.findFirst({
            where: { externalId: job.job_id, source: this.mapSource(job.job_publisher) },
          });
          if (existing) continue;

          // Find or create company
          let company = await prisma.company.findFirst({
            where: { name: job.employer_name },
          });

          if (!company) {
            company = await prisma.company.create({
              data: {
                name: job.employer_name,
                website: job.employer_website || undefined,
                logo: job.employer_logo || undefined,
                industry: 'Technology',
                location: `${job.job_city}, ${job.job_state}`,
                sizeRange: 'Unknown',
              },
            });
          }

          // Normalize salary to annual
          const { salaryMin, salaryMax } = this.normalizeSalary(
            job.job_min_salary,
            job.job_max_salary,
            job.job_salary_period,
          );

          await prisma.job.create({
            data: {
              title: job.job_title,
              description: job.job_description || 'No description available',
              location: `${job.job_city}, ${job.job_state}`.replace(/, $/, ''),
              locationCity: job.job_city || undefined,
              locationCountry: 'CA',
              companyId: company.id,
              source: this.mapSource(job.job_publisher),
              externalId: job.job_id,
              sourceUrl: job.job_apply_link,
              salaryMin,
              salaryMax,
              salaryCurrency: 'CAD',
              contractType: this.mapEmploymentType(job.job_employment_type),
              remote: job.job_is_remote,
              status: 'ACTIVE',
              requiredSkills: JSON.stringify(job.job_required_skills || []),
              postedAt: new Date(job.job_posted_at_datetime_utc),
            },
          });

          totalImported++;
        } catch (error: any) {
          console.error(`[JSearch] Error importing job ${job.job_id}:`, error.message);
        }
      }

      // Rate limit: 500ms between pages
      if (page < numPages) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return { fetched: totalFetched, imported: totalImported };
  }

  private mapSource(publisher: string): string {
    const p = publisher.toLowerCase();
    if (p.includes('linkedin')) return 'linkedin';
    if (p.includes('indeed')) return 'indeed';
    if (p.includes('glassdoor')) return 'glassdoor';
    if (p.includes('ziprecruiter')) return 'ziprecruiter';
    return `jsearch-${p.replace(/\s+/g, '-')}`;
  }

  private mapEmploymentType(type: string): string {
    switch (type?.toUpperCase()) {
      case 'FULLTIME': return 'CDI';
      case 'PARTTIME': return 'TEMPS_PARTIEL';
      case 'CONTRACTOR':
      case 'CONTRACT': return 'CDD';
      case 'INTERN': return 'STAGE';
      default: return 'CDI';
    }
  }

  private normalizeSalary(
    min: number | null,
    max: number | null,
    period: string | null,
  ): { salaryMin: number | null; salaryMax: number | null } {
    if (!min && !max) return { salaryMin: null, salaryMax: null };

    let multiplier = 1;
    switch (period?.toLowerCase()) {
      case 'hour': multiplier = 2080; break;   // 40h/week * 52 weeks
      case 'month': multiplier = 12; break;
      case 'week': multiplier = 52; break;
      case 'year': multiplier = 1; break;
      default: multiplier = 1;
    }

    return {
      salaryMin: min ? Math.round(min * multiplier) : null,
      salaryMax: max ? Math.round(max * multiplier) : null,
    };
  }
}
