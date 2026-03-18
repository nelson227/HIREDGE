import OpenAI from 'openai';
import prisma from '../db/prisma';
import { env } from '../config/env';

const isLLMEnabled =
  env.OPENAI_API_KEY.length > 20 &&
  !env.OPENAI_API_KEY.startsWith('sk-...');

const openai = isLLMEnabled
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY, baseURL: 'https://api.groq.com/openai/v1' })
  : null;

export class SalaryService {
  /**
   * Get salary range data for a given job family / title / location.
   */
  async getSalaryData(params: {
    jobFamily?: string;
    title?: string;
    location?: string;
    country?: string;
  }) {
    const where: any = {};
    if (params.jobFamily) where.jobFamily = params.jobFamily;
    if (params.location) where.location = { contains: params.location, mode: 'insensitive' };
    if (params.country) where.country = params.country;
    if (params.title) where.title = { contains: params.title, mode: 'insensitive' };

    const data = await prisma.salaryData.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    if (data.length === 0) {
      // Generate estimates from job postings
      return this.estimateFromJobs(params);
    }

    const avgMin = Math.round(data.reduce((s: number, d) => s + d.salaryMin, 0) / data.length);
    const avgMax = Math.round(data.reduce((s: number, d) => s + d.salaryMax, 0) / data.length);
    const avgMedian = Math.round((avgMin + avgMax) / 2);

    return {
      salaryMin: avgMin,
      salaryMax: avgMax,
      salaryMedian: avgMedian,
      currency: data[0]?.currency || 'CAD',
      sampleSize: data.reduce((s: number, d) => s + d.sampleSize, 0),
      sources: [...new Set(data.map((d) => d.source))],
      details: data,
    };
  }

  private async estimateFromJobs(params: { title?: string; location?: string }) {
    const where: any = { status: 'ACTIVE' };
    if (params.title) where.title = { contains: params.title, mode: 'insensitive' };
    if (params.location) where.location = { contains: params.location, mode: 'insensitive' };

    const jobs = await prisma.job.findMany({
      where: { ...where, salaryMin: { not: null } },
      select: { salaryMin: true, salaryMax: true, salaryCurrency: true },
      take: 50,
    });

    if (jobs.length === 0) {
      return { salaryMin: null, salaryMax: null, salaryMedian: null, sampleSize: 0, sources: ['no_data'] };
    }

    const mins = jobs.filter(j => j.salaryMin).map(j => j.salaryMin!);
    const maxs = jobs.filter(j => j.salaryMax).map(j => j.salaryMax!);

    return {
      salaryMin: Math.round(mins.reduce((a, b) => a + b, 0) / mins.length),
      salaryMax: Math.round(maxs.reduce((a, b) => a + b, 0) / maxs.length),
      salaryMedian: Math.round(((mins.reduce((a, b) => a + b, 0) / mins.length) + (maxs.reduce((a, b) => a + b, 0) / maxs.length)) / 2),
      currency: jobs[0]?.salaryCurrency || 'CAD',
      sampleSize: jobs.length,
      sources: ['job_postings'],
    };
  }

  /**
   * Simulate a salary negotiation conversation.
   */
  async simulateNegotiation(userId: string, params: {
    targetSalary: number;
    currentOffer: number;
    companyName?: string;
    jobTitle?: string;
    message: string;
    history?: Array<{ role: string; content: string }>;
  }) {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId },
      include: { skills: { take: 10 } },
    });

    if (!openai) {
      return {
        reply: "La simulation de négociation nécessite le service IA. Conseil : proposez un argumentaire basé sur la valeur que vous apportez, pas sur vos besoins personnels.",
        tips: ["Préparez des chiffres concrets", "Mentionnez vos réalisations", "Proposez un range plutôt qu'un montant fixe"],
      };
    }

    const systemPrompt = `Tu joues le rôle d'un recruteur dans une simulation de négociation salariale.
Entreprise: ${params.companyName || 'Tech Corp'}
Poste: ${params.jobTitle || profile?.title || 'Candidat'}
Offre initiale: ${params.currentOffer}$ CAD
Budget max secret: ${Math.round(params.targetSalary * 1.05)}$ (ne le révèle jamais)

Règles:
- Sois réaliste, pas un pushover
- Résiste aux premières demandes d'augmentation
- Accepte un compromis si les arguments sont bons
- Mentionne d'autres avantages (télétravail, formation, bonus) comme alternatives
- Donne un feedback constructif à la fin si demandé
- Reste professionnel et cordial`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...(params.history || []),
      { role: 'user', content: params.message },
    ];

    const response = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 400,
      messages,
    });

    const reply = response.choices[0]?.message?.content?.trim() || '';

    return {
      reply,
      tips: this.generateNegotiationTips(params.message),
    };
  }

  private generateNegotiationTips(message: string): string[] {
    const tips: string[] = [];
    const lower = message.toLowerCase();

    if (lower.includes('besoin') || lower.includes('loyer') || lower.includes('facture')) {
      tips.push("Évitez de parler de vos besoins personnels. Concentrez-vous sur votre valeur ajoutée.");
    }
    if (!lower.includes('réalisation') && !lower.includes('projet') && !lower.includes('résultat')) {
      tips.push("Mentionnez des réalisations concrètes avec des chiffres pour appuyer votre demande.");
    }
    if (lower.includes('minimum') || lower.includes('au moins')) {
      tips.push("Proposez un range plutôt qu'un minimum. Ex: 'Je vise entre X et Y en fonction du package global.'");
    }

    return tips;
  }

  /**
   * Contribute salary data from a hired user (anonymized).
   */
  async contributeSalary(data: {
    jobFamily: string;
    title: string;
    location?: string;
    country?: string;
    salaryMin: number;
    salaryMax: number;
  }) {
    return prisma.salaryData.create({
      data: {
        jobFamily: data.jobFamily,
        title: data.title,
        location: data.location,
        country: data.country || 'CA',
        salaryMin: data.salaryMin,
        salaryMax: data.salaryMax,
        salaryMedian: Math.round((data.salaryMin + data.salaryMax) / 2),
        source: 'collective',
        sampleSize: 1,
      },
    });
  }
}

export const salaryService = new SalaryService();
