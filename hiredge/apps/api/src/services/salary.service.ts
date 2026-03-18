import prisma from '../db/prisma';
import { config } from '../config/env';
import { normalizeQuery, stripAccents } from '../lib/salary-normalizer';

const OPENWEBNINJA_BASE_URL = 'https://api.openwebninja.com/job-salary-data';
const FETCH_TIMEOUT_MS = 12000;  // 12s timeout per request
const MAX_RETRIES = 2;          // retry once on timeout/failure

interface OpenWebNinjaSalaryResult {
  location: string;
  job_title: string;
  company?: string;
  min_salary: number;
  max_salary: number;
  median_salary: number;
  min_base_salary?: number;
  max_base_salary?: number;
  median_base_salary?: number;
  min_additional_pay?: number;
  max_additional_pay?: number;
  median_additional_pay?: number;
  salary_period: string;
  salary_currency: string;
  salary_count: number;
  publisher_name: string;
  publisher_link: string;
  confidence: string;
}

export class SalaryService {
  private apiKey: string;

  constructor() {
    this.apiKey = config.openwebninja.apiKey;
    console.log(`[Salary] OpenWebNinja API key loaded: ${this.apiKey ? `${this.apiKey.substring(0, 8)}... (${this.apiKey.length} chars)` : 'MISSING'}`);
  }

  /**
   * Fetch with timeout and retry.
   */
  private async fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response | null> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        const response = await fetch(url, {
          headers: { 'x-api-key': this.apiKey },
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (response.ok) return response;
        console.error(`[Salary] API ${response.status} for ${url.substring(0, 120)}`);
        return null; // Non-retryable HTTP error
      } catch (err: any) {
        const isTimeout = err?.name === 'AbortError';
        console.warn(`[Salary] Attempt ${attempt + 1}/${retries + 1} failed${isTimeout ? ' (timeout)' : ''}: ${err?.message}`);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); // backoff
        }
      }
    }
    return null;
  }

  /**
   * Parse an API response into structured salary data.
   */
  private parseSalaryEntry(entry: OpenWebNinjaSalaryResult): { min: number; max: number; median: number; currency: string; sampleSize: number; confidence: string; publisherName: string; company?: string } {
    let multiplier = 1;
    switch (entry.salary_period?.toUpperCase()) {
      case 'HOUR': multiplier = 2080; break;
      case 'MONTH': multiplier = 12; break;
      case 'WEEK': multiplier = 52; break;
      default: multiplier = 1;
    }
    return {
      min: Math.round(entry.min_salary * multiplier),
      max: Math.round(entry.max_salary * multiplier),
      median: Math.round(entry.median_salary * multiplier),
      currency: entry.salary_currency || 'CAD',
      sampleSize: entry.salary_count || 1,
      confidence: entry.confidence || 'UNKNOWN',
      publisherName: entry.publisher_name || 'Glassdoor',
      company: entry.company,
    };
  }

  /**
   * Fetch real-time salary data from OpenWebNinja Job Salary endpoint (Glassdoor).
   */
  private async fetchExternalSalaryData(params: {
    title: string;
    location?: string;
  }): Promise<{ min: number; max: number; median: number; currency: string; source: string; sampleSize: number; confidence: string; publisherName: string } | null> {
    if (!this.apiKey || this.apiKey.length < 10) return null;

    try {
      const url = new URL(`${OPENWEBNINJA_BASE_URL}/job-salary`);
      url.searchParams.set('job_title', params.title);
      if (params.location) url.searchParams.set('location', params.location);

      const response = await this.fetchWithRetry(url.toString());
      if (!response) return null;

      const json = await response.json() as { status: string; data: OpenWebNinjaSalaryResult[] };
      const entry = json.status === 'OK' && json.data?.length > 0 ? json.data[0] : undefined;
      if (!entry) return null;

      return { ...this.parseSalaryEntry(entry), source: 'glassdoor' };
    } catch (err) {
      console.error('[Salary] OpenWebNinja API error:', err);
      return null;
    }
  }

  /**
   * Fetch salary data for a specific company from OpenWebNinja.
   */
  async fetchCompanySalaryData(params: {
    company: string;
    title: string;
    location?: string;
  }): Promise<{ min: number; max: number; median: number; currency: string; source: string; sampleSize: number; confidence: string; company: string } | null> {
    if (!this.apiKey || this.apiKey.length < 10) return null;

    try {
      const url = new URL(`${OPENWEBNINJA_BASE_URL}/company-job-salary`);
      url.searchParams.set('company', params.company);
      url.searchParams.set('job_title', params.title);
      if (params.location) url.searchParams.set('location', params.location);

      const response = await this.fetchWithRetry(url.toString());
      if (!response) return null;

      const json = await response.json() as { status: string; data: OpenWebNinjaSalaryResult[] };
      const entry = json.status === 'OK' && json.data?.length > 0 ? json.data[0] : undefined;
      if (!entry) return null;

      return {
        ...this.parseSalaryEntry(entry),
        source: 'glassdoor',
        company: entry.company || params.company,
      };
    } catch (err) {
      console.error('[Salary] OpenWebNinja company API error:', err);
      return null;
    }
  }

  /**
   * Fallback: estimate from imported job postings in DB.
   */
  private async estimateFromJobs(params: { title?: string; jobFamily?: string; location?: string }) {
    const where: any = { status: 'ACTIVE', salaryMin: { not: null } };
    if (params.title) where.title = { contains: params.title, mode: 'insensitive' };
    if (params.jobFamily) where.title = { contains: params.jobFamily, mode: 'insensitive' };
    if (params.location) where.location = { contains: params.location, mode: 'insensitive' };

    const jobs = await prisma.job.findMany({
      where,
      select: { salaryMin: true, salaryMax: true, salaryCurrency: true },
      take: 50,
    });

    if (jobs.length === 0) return null;

    type JobSalary = { salaryMin: number | null; salaryMax: number | null; salaryCurrency: string | null };
    const mins: number[] = jobs.filter((j: JobSalary) => j.salaryMin).map((j: JobSalary) => j.salaryMin!);
    const maxs: number[] = jobs.filter((j: JobSalary) => j.salaryMax).map((j: JobSalary) => j.salaryMax!);

    return {
      min: Math.round(mins.reduce((a: number, b: number) => a + b, 0) / mins.length),
      max: maxs.length > 0 ? Math.round(maxs.reduce((a: number, b: number) => a + b, 0) / maxs.length) : null,
      median: maxs.length > 0
        ? Math.round(((mins.reduce((a: number, b: number) => a + b, 0) / mins.length) + (maxs.reduce((a: number, b: number) => a + b, 0) / maxs.length)) / 2)
        : Math.round(mins.reduce((a: number, b: number) => a + b, 0) / mins.length),
      currency: jobs[0]?.salaryCurrency || 'CAD',
      sampleSize: jobs.length,
      source: 'job_postings',
    };
  }

  /**
   * Get collective contributions from SalaryData table for the given criteria.
   */
  private async getCollectiveData(params: { title?: string; jobFamily?: string; location?: string }) {
    const where: any = { source: 'collective' };
    if (params.jobFamily) where.jobFamily = { contains: params.jobFamily, mode: 'insensitive' };
    if (params.title) where.title = { contains: params.title, mode: 'insensitive' };
    if (params.location) where.location = { contains: params.location, mode: 'insensitive' };

    return prisma.salaryData.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Main salary lookup: combines external API data + collective contributions.
   * Priority: OpenWebNinja API > Job postings DB > no data
   */
  async getSalaryData(params: {
    jobFamily?: string;
    title?: string;
    location?: string;
    company?: string;
  }) {
    const rawTitle = params.title || params.jobFamily || '';
    const normalized = normalizeQuery(rawTitle, params.location);
    console.log(`[Salary] getSalaryData: raw="${rawTitle}" → normalized="${normalized.title}", location="${normalized.location}", variants=${JSON.stringify(normalized.titleVariants)}, company="${params.company || 'none'}"`);

    // Build the list of titles to try: [normalized, ...variants]
    const titlesToTry = [normalized.title, ...normalized.titleVariants];
    const searchLocation = normalized.location;

    // 1. Try each title variant until we get data
    let externalData: { min: number; max: number; median: number; currency: string; source: string; sampleSize: number; confidence?: string; company?: string } | null = null;

    for (const titleAttempt of titlesToTry) {
      if (externalData) break;

      // 1a. Try company-specific API if company provided
      if (params.company) {
        const companyData = await this.fetchCompanySalaryData({
          company: params.company,
          title: titleAttempt,
          location: searchLocation,
        });
        if (companyData) { externalData = companyData; break; }
      }

      // 1b. Try general salary API
      const generalData = await this.fetchExternalSalaryData({
        title: titleAttempt,
        location: searchLocation,
      });
      if (generalData) { externalData = generalData; break; }

      console.log(`[Salary] No data for variant "${titleAttempt}", trying next...`);
    }

    // 3. Get collective contributions (non-blocking)
    let collectiveEntries: any[] = [];
    try {
      collectiveEntries = await this.getCollectiveData(params);
    } catch (err) {
      console.error('[Salary] Failed to get collective data (DB issue):', (err as Error).message);
    }

    // 4. Fallback to job postings if no external data (non-blocking)
    let jobEstimate: { min: number; max: number | null; median: number; currency: string; sampleSize: number; source: string } | null = null;
    if (!externalData) {
      try {
        jobEstimate = await this.estimateFromJobs(params);
      } catch (err) {
        console.error('[Salary] Failed to estimate from jobs (DB issue):', (err as Error).message);
      }
    }

    // Base salary range from API or job postings
    const baseMin = externalData?.min ?? jobEstimate?.min ?? null;
    const baseMax = externalData?.max ?? jobEstimate?.max ?? null;
    const baseMedian = externalData?.median ?? jobEstimate?.median ?? null;
    const baseCurrency = externalData?.currency ?? jobEstimate?.currency ?? 'CAD';
    const baseSource = externalData?.source ?? jobEstimate?.source ?? 'no_data';

    if (baseMin == null && collectiveEntries.length === 0) {
      return { salaryMin: null, salaryMax: null, salaryMedian: null, sampleSize: 0, sources: ['no_data'] };
    }

    // Merge base data with collective contributions
    const allMins: number[] = [];
    const allMaxs: number[] = [];

    if (baseMin != null) allMins.push(baseMin);
    if (baseMax != null) allMaxs.push(baseMax);

    for (const entry of collectiveEntries) {
      allMins.push(entry.salaryMin);
      allMaxs.push(entry.salaryMax);
    }

    const finalMin = Math.round(allMins.reduce((a, b) => a + b, 0) / allMins.length);
    const finalMax = allMaxs.length > 0 ? Math.round(allMaxs.reduce((a, b) => a + b, 0) / allMaxs.length) : finalMin;
    const finalMedian = collectiveEntries.length > 0
      ? Math.round((finalMin + finalMax) / 2)
      : (baseMedian ?? Math.round((finalMin + finalMax) / 2));

    const sources: string[] = [];
    if (baseSource !== 'no_data') sources.push(baseSource);
    if (collectiveEntries.length > 0) sources.push('collective');

    return {
      salaryMin: finalMin,
      salaryMax: finalMax,
      salaryMedian: finalMedian,
      currency: baseCurrency,
      sampleSize: (externalData?.sampleSize ?? (jobEstimate as any)?.sampleSize ?? 0) + collectiveEntries.length,
      sources,
      confidence: (externalData as any)?.confidence || null,
      company: (externalData as any)?.company || null,
      referenceRange: baseMin != null ? { min: baseMin, max: baseMax } : null,
    };
  }

  /**
   * Get the reference salary range (from OpenWebNinja or job postings) for validation.
   */
  async getReferenceSalaryRange(title: string, location?: string): Promise<{ min: number; max: number } | null> {
    const normalized = normalizeQuery(title, location);
    const external = await this.fetchExternalSalaryData({ title: normalized.title, location: normalized.location });
    if (external) return { min: external.min, max: external.max };

    // Fallback to job postings
    const jobEstimate = await this.estimateFromJobs({ title, location });
    if (jobEstimate && jobEstimate.min != null && jobEstimate.max != null) {
      return { min: jobEstimate.min, max: jobEstimate.max };
    }

    return null;
  }

  /**
   * Contribute salary data — validated against reference salary range.
   * Accepted only if within ±40% of the known range to filter out fake data.
   */
  async contributeSalary(data: {
    jobFamily: string;
    title: string;
    location?: string;
    country?: string;
    salary: number;
  }): Promise<{ accepted: boolean; message: string; data?: any }> {
    const reference = await this.getReferenceSalaryRange(data.title, data.location);

    if (reference) {
      const toleranceMin = reference.min * 0.6; // 40% below min
      const toleranceMax = reference.max * 1.4; // 40% above max

      if (data.salary < toleranceMin || data.salary > toleranceMax) {
        return {
          accepted: false,
          message: `Le salaire soumis (${data.salary.toLocaleString()} $) est en dehors de la plage observée pour ce poste et lieu (${reference.min.toLocaleString()} $ - ${reference.max.toLocaleString()} $). Contribution refusée.`,
        };
      }
    }

    // No reference data → still accept but flag it
    const created = await prisma.salaryData.create({
      data: {
        jobFamily: data.jobFamily,
        title: data.title,
        location: data.location,
        country: data.country || 'CA',
        salaryMin: data.salary,
        salaryMax: data.salary,
        salaryMedian: data.salary,
        source: 'collective',
        sampleSize: 1,
      },
    });

    return {
      accepted: true,
      message: 'Merci pour votre contribution !',
      data: created,
    };
  }
}

export const salaryService = new SalaryService();
