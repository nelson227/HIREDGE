import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import OpenAI from 'openai';
import { config } from '../config/env';
import prisma from '../db/prisma';
import { AppError } from './auth.service';
import { profileService } from './profile.service';
import path from 'path';
import fs from 'fs/promises';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'cv');

interface ParsedCVData {
  firstName?: string;
  lastName?: string;
  title?: string;
  bio?: string;
  phone?: string;
  city?: string;
  country?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  skills: { name: string; level: string }[];
  experiences: {
    company: string;
    title: string;
    description?: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    location?: string;
  }[];
  educations: {
    institution: string;
    degree: string;
    field?: string;
    startDate: string;
    endDate?: string;
    current: boolean;
  }[];
}

export class CVService {
  private openai: OpenAI | null = null;

  private getOpenAI(): OpenAI {
    if (!this.openai) {
      if (!config.openai.apiKey) {
        throw new AppError('OPENAI_NOT_CONFIGURED', 'La clé API IA n\'est pas configurée', 500);
      }
      this.openai = new OpenAI({
        apiKey: config.openai.apiKey,
        baseURL: 'https://api.groq.com/openai/v1',
      });
    }
    return this.openai;
  }

  /**
   * Extract text content from a PDF or DOCX buffer
   */
  async extractText(buffer: Buffer, mimetype: string): Promise<string> {
    if (mimetype === 'application/pdf') {
      const data = await pdf(buffer);
      return data.text;
    }

    if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/msword'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    throw new AppError('UNSUPPORTED_FORMAT', 'Format de fichier non supporté. Utilisez PDF ou DOCX.', 400);
  }

  /**
   * Parse CV text using OpenAI to extract structured data
   */
  async parseWithAI(text: string): Promise<ParsedCVData> {
    const openai = this.getOpenAI();

    const trimmedText = text.slice(0, 50000); // safety limit (50KB)

    let response;
    try {
      response = await openai.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `Tu es un expert en extraction de données de CV. Analyse le texte du CV fourni et extrais les informations structurées.

Retourne un objet JSON avec cette structure EXACTE :
{
  "firstName": "string ou null",
  "lastName": "string ou null",
  "title": "titre professionnel actuel ou le plus récent, string ou null",
  "bio": "résumé professionnel en 2-3 phrases, string ou null",
  "phone": "numéro de téléphone si trouvé, string ou null",
  "city": "ville de résidence, string ou null",
  "country": "pays (code ISO comme CA, FR, etc.), string ou null",
  "linkedinUrl": "URL LinkedIn si trouvée, string ou null",
  "portfolioUrl": "URL portfolio/site personnel si trouvée, string ou null",
  "skills": [
    { "name": "nom de la compétence", "level": "BEGINNER|INTERMEDIATE|ADVANCED|EXPERT" }
  ],
  "experiences": [
    {
      "company": "nom entreprise",
      "title": "titre du poste",
      "description": "description brève des responsabilités, 1-2 phrases",
      "startDate": "YYYY-MM-DD (utilise le 1er du mois si jour inconnu)",
      "endDate": "YYYY-MM-DD ou null si poste actuel",
      "current": true/false,
      "location": "ville, pays"
    }
  ],
  "educations": [
    {
      "institution": "nom de l'établissement",
      "degree": "type de diplôme (Baccalauréat, Licence, Master, Doctorat, DEC, etc.)",
      "field": "domaine d'études",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD ou null si en cours",
      "current": true/false
    }
  ]
}

Règles :
- Extrais UNIQUEMENT ce qui est explicitement mentionné dans le CV
- N'invente JAMAIS de données
- Pour les dates, utilise le format YYYY-MM-DD. Si seule l'année est indiquée, utilise YYYY-01-01
- Si un mois est indiqué sans jour, utilise le 1er du mois
- Trie les expériences de la plus récente à la plus ancienne
- Trie les formations de la plus récente à la plus ancienne
- Pour le level des compétences, estime en fonction du contexte du CV (années d'expérience, poste)
- Le bio doit être un résumé professionnel concis basé sur le profil global
- Si une information n'est pas trouvée, utilise null (pas de chaîne vide)`,
          },
          {
            role: 'user',
            content: `Voici le texte extrait du CV :\n\n${trimmedText}`,
          },
        ],
      });
    } catch (err: any) {
      throw new AppError('AI_SERVICE_ERROR', `Erreur du service IA lors de l'analyse du CV : ${err.message || 'service indisponible'}`, 502);
    }

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new AppError('PARSE_FAILED', 'Impossible d\'analyser le CV. Veuillez réessayer.', 500);
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new AppError('PARSE_FAILED', 'L\'IA a renvoyé un format invalide. Veuillez réessayer.', 500);
    }

    // Validate and clean the parsed data
    return {
      firstName: parsed.firstName || undefined,
      lastName: parsed.lastName || undefined,
      title: parsed.title || undefined,
      bio: parsed.bio || undefined,
      phone: parsed.phone || undefined,
      city: parsed.city || undefined,
      country: parsed.country || undefined,
      linkedinUrl: parsed.linkedinUrl || undefined,
      portfolioUrl: parsed.portfolioUrl || undefined,
      skills: Array.isArray(parsed.skills) ? parsed.skills.filter((s: any) => s.name) : [],
      experiences: Array.isArray(parsed.experiences) ? parsed.experiences.filter((e: any) => e.company && e.title) : [],
      educations: Array.isArray(parsed.educations) ? parsed.educations.filter((e: any) => e.institution && e.degree) : [],
    };
  }

  /**
   * Save uploaded CV file to disk (best-effort, ephemeral on Railway)
   */
  async saveFile(userId: string, buffer: Buffer, filename: string): Promise<string> {
    // Sanitize filename to prevent path traversal
    const safeName = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = path.extname(safeName) || '.pdf';
    const finalName = `cv_${Date.now()}${ext}`;

    // Best-effort disk write — may fail on Railway (ephemeral filesystem)
    try {
      const userDir = path.join(UPLOADS_DIR, userId);
      await fs.mkdir(userDir, { recursive: true });
      await fs.writeFile(path.join(userDir, finalName), buffer);
    } catch { /* ignore — DB is the source of truth */ }

    // Return relative path for storage
    return `/uploads/cv/${userId}/${finalName}`;
  }

  /**
   * Full pipeline: upload CV, parse it, update profile
   */
  async uploadAndParse(userId: string, buffer: Buffer, mimetype: string, filename: string): Promise<{
    profile: any;
    parsed: ParsedCVData;
  }> {
    try {
      // 1. Extract text
      let text: string;
      try {
        text = await this.extractText(buffer, mimetype);
      } catch (err: any) {
        if (err instanceof AppError) throw err;
        throw new AppError('EXTRACT_FAILED', 'Impossible de lire le fichier. Veuillez vérifier que le PDF/DOCX n\'est pas corrompu.', 400);
      }
      if (!text || text.trim().length < 50) {
        throw new AppError('CV_EMPTY', 'Le CV semble vide ou illisible. Veuillez vérifier le fichier.', 400);
      }

      // 2. Save file to disk (best-effort, ephemeral on Railway)
      const cvUrl = await this.saveFile(userId, buffer, filename);

      // 3. Parse with AI
      const parsed = await this.parseWithAI(text);

      // 4. Update profile with parsed data + store binary in DB
      const profile = await this.applyToProfile(userId, parsed, cvUrl, buffer, mimetype);

      return { profile, parsed };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError('CV_UPLOAD_FAILED', `Erreur lors du traitement du CV : ${err.message || 'erreur interne'}`, 500);
    }
  }

  /**
   * Apply parsed CV data to user profile
   */
  private async applyToProfile(userId: string, parsed: ParsedCVData, cvUrl: string, cvBuffer?: Buffer, cvMimeType?: string) {
    // Ensure profile exists
    let profile = await prisma.candidateProfile.findUnique({ where: { userId } });
    if (!profile) {
      profile = await prisma.candidateProfile.create({
        data: { userId, firstName: '', lastName: '', title: '' },
      });
    }

    // Replace ALL profile fields with CV data (keep existing or empty for non-nullable fields)
    const updateData: any = {
      cvUrl,
      ...(cvBuffer ? { cvData: cvBuffer, cvMimeType: cvMimeType || 'application/pdf' } : {}),
      firstName: parsed.firstName || profile.firstName || '',
      lastName: parsed.lastName || profile.lastName || '',
      title: parsed.title || profile.title || '',
      bio: parsed.bio || null,
      phone: parsed.phone || null,
      city: parsed.city || null,
      country: parsed.country || null,
      linkedinUrl: parsed.linkedinUrl || null,
      portfolioUrl: parsed.portfolioUrl || null,
    };

    await prisma.candidateProfile.update({
      where: { userId },
      data: updateData,
    });

    // Clear existing skills, experiences, educations and replace with parsed ones
    await prisma.skill.deleteMany({ where: { profileId: profile.id } });
    await prisma.experience.deleteMany({ where: { profileId: profile.id } });
    await prisma.education.deleteMany({ where: { profileId: profile.id } });

    // Add parsed skills
    if (parsed.skills.length > 0) {
      await prisma.skill.createMany({
        data: parsed.skills.map((s) => ({
          profileId: profile!.id,
          name: s.name,
          level: s.level || 'INTERMEDIATE',
        })),
      });
    }

    // Add parsed experiences (skip entries with invalid dates)
    for (const exp of parsed.experiences) {
      const startDate = exp.startDate ? new Date(exp.startDate) : null;
      if (!startDate || isNaN(startDate.getTime())) continue;
      const endDate = exp.endDate ? new Date(exp.endDate) : null;
      await prisma.experience.create({
        data: {
          profileId: profile.id,
          company: exp.company,
          title: exp.title,
          description: exp.description || null,
          startDate,
          endDate: endDate && !isNaN(endDate.getTime()) ? endDate : null,
          current: exp.current ?? false,
          location: exp.location || null,
        },
      });
    }

    // Add parsed educations (skip entries with invalid dates)
    for (const edu of parsed.educations) {
      const startDate = edu.startDate ? new Date(edu.startDate) : null;
      const endDate = edu.endDate ? new Date(edu.endDate) : null;
      await prisma.education.create({
        data: {
          profileId: profile.id,
          institution: edu.institution,
          degree: edu.degree,
          field: edu.field || null,
          startDate: startDate && !isNaN(startDate.getTime()) ? startDate : null,
          endDate: endDate && !isNaN(endDate.getTime()) ? endDate : null,
          current: edu.current ?? false,
        },
      });
    }

    // Recalculate completion score
    await profileService.recalcCompletionScore(userId);

    // Return full profile
    return profileService.getProfile(userId);
  }

  /**
   * Get the CV file path for a user
   */
  async getCvPath(userId: string): Promise<string | null> {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId },
      select: { cvUrl: true },
    });
    return profile?.cvUrl || null;
  }

  async getCvData(userId: string): Promise<{ data: Buffer; mimeType: string } | null> {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId },
      select: { cvData: true, cvMimeType: true },
    });
    if (!profile?.cvData) return null;
    return { data: Buffer.from(profile.cvData), mimeType: profile.cvMimeType || 'application/pdf' };
  }
}

export const cvService = new CVService();
