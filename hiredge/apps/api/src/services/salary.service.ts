import prisma from '../db/prisma';
import { config } from '../config/env';

const JSEARCH_BASE_URL = 'https://jsearch.p.rapidapi.com';

interface JSearchSalaryEstimate {
  min_salary: number;
  max_salary: number;
  median_salary: number;
  salary_period: string;
  salary_currency: string;
  publisher_name: string;
  publisher_link: string;
}

export class SalaryService {
  private jsearchApiKey: string;

  constructor() {
    this.jsearchApiKey = config.jsearch.apiKey;
  }

  /**
   * Fetch real-time salary data from JSearch estimated-salary endpoint.
   */
  private async fetchExternalSalaryData(params: {
    title: string;
    location?: string;
  }): Promise<{ min: number; max: number; median: number; currency: string; source: string } | null> {
    if (!this.jsearchApiKey || this.jsearchApiKey.length < 10) return null;

    try {
      const url = new URL(`${JSEARCH_BASE_URL}/estimated-salary`);
      url.searchParams.set('job_title', params.title);
      url.searchParams.set('location', params.location || 'Canada');
      url.searchParams.set('radius', '100');

      const response = await fetch(url.toString(), {
        headers: {
          'X-RapidAPI-Key': this.jsearchApiKey,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
        },
      });

      if (!response.ok) {
        console.error(`[Salary] JSearch estimated-salary error: ${response.status}`);
        return null;
      }

      const json: any = await response.json();
      const estimates: JSearchSalaryEstimate[] = json.data || [];

      if (estimates.length === 0) return null;

      // Aggregate across publishers, normalize to annual
      const annualSalaries = estimates.map((e) => {
        let multiplier = 1;
        switch (e.salary_period?.toLowerCase()) {
          case 'hour': multiplier = 2080; break;
          case 'month': multiplier = 12; break;
          case 'week': multiplier = 52; break;
          default: multiplier = 1;
        }
        return {
          min: Math.round(e.min_salary * multiplier),
          max: Math.round(e.max_salary * multiplier),
          median: Math.round(e.median_salary * multiplier),
        };
      });

      const avgMin = Math.round(annualSalaries.reduce((s, e) => s + e.min, 0) / annualSalaries.length);
      const avgMax = Math.round(annualSalaries.reduce((s, e) => s + e.max, 0) / annualSalaries.length);
      const avgMedian = Math.round(annualSalaries.reduce((s, e) => s + e.median, 0) / annualSalaries.length);

      return {
        min: avgMin,
        max: avgMax,
        median: avgMedian,
        currency: estimates[0]?.salary_currency || 'CAD',
        source: 'jsearch_api',
      };
    } catch (err) {
      console.error('[Salary] JSearch API error:', err);
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
   * Priority: JSearch API > Job postings DB > no data
   */
  async getSalaryData(params: {
    jobFamily?: string;
    title?: string;
    location?: string;
  }) {
    const searchTitle = params.title || params.jobFamily || '';

    // 1. Try external API (JSearch estimated-salary)
    const externalData = await this.fetchExternalSalaryData({
      title: searchTitle,
      location: params.location,
    });

    // 2. Get collective contributions
    const collectiveEntries = await this.getCollectiveData(params);

    // 3. Fallback to job postings if no external data
    const jobEstimate = !externalData ? await this.estimateFromJobs(params) : null;

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
      sampleSize: (externalData ? 1 : (jobEstimate as any)?.sampleSize ?? 0) + collectiveEntries.length,
      sources,
      // Pass the reference range for the frontend info
      referenceRange: baseMin != null ? { min: baseMin, max: baseMax } : null,
    };
  }

  /**
   * Get the reference salary range (from API or job postings) for validation.
   */
  async getReferenceSalaryRange(title: string, location?: string): Promise<{ min: number; max: number } | null> {
    // Try JSearch first
    const external = await this.fetchExternalSalaryData({ title, location });
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
