import OpenAI from 'openai';
import prisma from '../db/prisma';
import { env } from '../config/env';

const isLLMEnabled =
  env.OPENAI_API_KEY.length > 20 &&
  !env.OPENAI_API_KEY.startsWith('sk-...');

const openai = isLLMEnabled
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY, baseURL: 'https://api.groq.com/openai/v1' })
  : null;

interface OnboardingState {
  step: 'greeting' | 'name' | 'title' | 'experience' | 'skills' | 'location' | 'preferences' | 'complete';
  collected: {
    firstName?: string;
    lastName?: string;
    title?: string;
    experiences?: Array<{ company: string; title: string; current: boolean }>;
    skills?: string[];
    city?: string;
    country?: string;
    remotePreference?: string;
    salaryMin?: number;
    salaryMax?: number;
    preferredSectors?: string[];
  };
}

const STEPS_ORDER: OnboardingState['step'][] = ['greeting', 'name', 'title', 'experience', 'skills', 'location', 'preferences', 'complete'];

export class OnboardingService {
  async chat(userId: string, message: string, stateJson?: string): Promise<{
    reply: string;
    state: OnboardingState;
    complete: boolean;
    suggestedReplies?: string[];
  }> {
    let state: OnboardingState = stateJson
      ? JSON.parse(stateJson)
      : { step: 'greeting', collected: {} };

    if (state.step === 'greeting') {
      state.step = 'name';
      return {
        reply: "Salut ! Bienvenue sur HIREDGE. Je suis EDGE, ton compagnon de recherche d'emploi. Pour commencer, comment tu t'appelles ? (Prénom et nom)",
        state,
        complete: false,
        suggestedReplies: [],
      };
    }

    // Use LLM to extract structured info from the user's message
    const extraction = await this.extractInfo(state.step, message);

    switch (state.step) {
      case 'name': {
        const names = extraction.firstName && extraction.lastName
          ? { firstName: extraction.firstName, lastName: extraction.lastName }
          : this.parseNames(message);
        state.collected.firstName = names.firstName;
        state.collected.lastName = names.lastName;
        state.step = 'title';
        return {
          reply: `Enchanté ${names.firstName} ! Quel est ton poste actuel ou le type de poste que tu recherches ?`,
          state,
          complete: false,
          suggestedReplies: ['Développeur Full Stack', 'Data Analyst', 'Chef de projet', 'Designer UX/UI'],
        };
      }

      case 'title': {
        state.collected.title = extraction.title || message.trim();
        state.step = 'experience';
        return {
          reply: `${state.collected.title}, super ! Tu as combien d'années d'expérience dans ce domaine ? Et tu travailles où en ce moment ?`,
          state,
          complete: false,
          suggestedReplies: ['Moins de 2 ans', '2-5 ans', '5-10 ans', 'Plus de 10 ans'],
        };
      }

      case 'experience': {
        if (extraction.experiences?.length) {
          state.collected.experiences = extraction.experiences;
        }
        state.step = 'skills';
        return {
          reply: "Top ! Quelles sont tes compétences principales ? Liste-moi les technologies, outils ou soft skills que tu maîtrises.",
          state,
          complete: false,
          suggestedReplies: ['JavaScript, React, Node.js', 'Python, SQL, Tableau', 'Gestion de projet, Agile, Scrum'],
        };
      }

      case 'skills': {
        const skills = extraction.skills?.length
          ? extraction.skills
          : message.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
        state.collected.skills = skills;
        state.step = 'location';
        return {
          reply: "Parfait ! Tu cherches où géographiquement ? Et tu préfères le télétravail, le présentiel ou l'hybride ?",
          state,
          complete: false,
          suggestedReplies: ['Montréal, hybride', 'Toronto, remote', 'Paris, présentiel', 'Peu importe, full remote'],
        };
      }

      case 'location': {
        state.collected.city = extraction.city || message.split(',')[0]?.trim();
        state.collected.country = extraction.country || 'CA';
        state.collected.remotePreference = extraction.remotePreference || 'HYBRID';
        state.step = 'preferences';
        return {
          reply: "Dernière question : tu vises quel range salarial ? Et tu as une préférence pour la taille d'entreprise ? (startup, PME, grande entreprise)",
          state,
          complete: false,
          suggestedReplies: ['60-80k, startup ou PME', '80-120k, grande entreprise', 'Pas de préférence salariale'],
        };
      }

      case 'preferences': {
        if (extraction.salaryMin) state.collected.salaryMin = extraction.salaryMin;
        if (extraction.salaryMax) state.collected.salaryMax = extraction.salaryMax;
        if (extraction.preferredSectors) state.collected.preferredSectors = extraction.preferredSectors;

        // Save to profile
        await this.saveProfile(userId, state.collected);
        state.step = 'complete';

        return {
          reply: `Ton profil est prêt ${state.collected.firstName} ! Voici ce que j'ai retenu :\n\n` +
            `- **Nom** : ${state.collected.firstName} ${state.collected.lastName}\n` +
            `- **Poste** : ${state.collected.title}\n` +
            `- **Compétences** : ${state.collected.skills?.join(', ')}\n` +
            `- **Localisation** : ${state.collected.city}${state.collected.country ? `, ${state.collected.country}` : ''}\n` +
            `- **Mode** : ${state.collected.remotePreference}\n` +
            (state.collected.salaryMin ? `- **Salaire visé** : ${state.collected.salaryMin}-${state.collected.salaryMax}k\n` : '') +
            `\nJe commence déjà à chercher des offres qui correspondent à ton profil !`,
          state,
          complete: true,
          suggestedReplies: ['Voir les offres', 'Modifier mon profil', 'Explorer HIREDGE'],
        };
      }

      default:
        return { reply: "Ton profil est déjà configuré !", state, complete: true };
    }
  }

  private parseNames(text: string): { firstName: string; lastName: string } {
    const parts = text.trim().split(/\s+/);
    return {
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' ') || '',
    };
  }

  private async extractInfo(step: string, message: string): Promise<any> {
    if (!openai) return {};

    try {
      const response = await openai.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        max_tokens: 300,
        messages: [
          {
            role: 'system',
            content: `Tu es un extracteur d'informations. Extrais les données structurées du message de l'utilisateur.
Étape actuelle: ${step}
Retourne UNIQUEMENT un JSON valide sans markdown, sans explication.
Schéma attendu selon l'étape:
- name: {"firstName":"","lastName":""}
- title: {"title":""}
- experience: {"experiences":[{"company":"","title":"","current":true}]}
- skills: {"skills":["skill1","skill2"]}
- location: {"city":"","country":"","remotePreference":"REMOTE|HYBRID|ONSITE"}
- preferences: {"salaryMin":0,"salaryMax":0,"preferredSectors":["tech","finance"]}`,
          },
          { role: 'user', content: message },
        ],
      });

      const content = response.choices[0]?.message?.content?.trim() || '{}';
      // Safely parse JSON, handling potential markdown code blocks
      const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch {
      return {};
    }
  }

  private async saveProfile(userId: string, data: OnboardingState['collected']) {
    const profile = await prisma.candidateProfile.findUnique({ where: { userId } });

    const updateData: any = {
      onboardingDone: true,
    };

    if (data.firstName) updateData.firstName = data.firstName;
    if (data.lastName) updateData.lastName = data.lastName;
    if (data.title) updateData.title = data.title;
    if (data.city) updateData.city = data.city;
    if (data.country) updateData.country = data.country;
    if (data.remotePreference) updateData.remotePreference = data.remotePreference;
    if (data.salaryMin) updateData.salaryMin = data.salaryMin;
    if (data.salaryMax) updateData.salaryMax = data.salaryMax;
    if (data.preferredSectors) updateData.preferredSectors = JSON.stringify(data.preferredSectors);

    if (profile) {
      await prisma.candidateProfile.update({ where: { userId }, data: updateData });
    } else {
      await prisma.candidateProfile.create({ data: { userId, ...updateData } });
    }

    // Add skills
    if (data.skills?.length && profile) {
      for (const skillName of data.skills) {
        const exists = await prisma.skill.findFirst({
          where: { profileId: profile.id, name: { equals: skillName, mode: 'insensitive' } },
        });
        if (!exists) {
          await prisma.skill.create({
            data: { profileId: profile.id, name: skillName, level: 'INTERMEDIATE' },
          });
        }
      }
    }
  }
}

export const onboardingService = new OnboardingService();
