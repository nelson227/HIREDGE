import OpenAI from 'openai';
import prisma from '../db/prisma';
import { env, config } from '../config/env';

const isLLMEnabled =
  env.OPENAI_API_KEY.length > 20 &&
  !env.OPENAI_API_KEY.startsWith('sk-...');

const openai = isLLMEnabled
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY, baseURL: 'https://api.groq.com/openai/v1' })
  : null;

export class LinkedinService {
  /**
   * Get LinkedIn OAuth authorization URL.
   */
  getAuthUrl(state: string): string | null {
    if (!config.linkedin.clientId) return null;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.linkedin.clientId,
      redirect_uri: config.linkedin.redirectUri,
      state,
      scope: 'openid profile email',
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token.
   */
  async exchangeToken(code: string): Promise<string | null> {
    if (!config.linkedin.clientId || !config.linkedin.clientSecret) return null;

    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.linkedin.redirectUri,
        client_id: config.linkedin.clientId,
        client_secret: config.linkedin.clientSecret,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.access_token || null;
  }

  /**
   * Fetch LinkedIn profile with access token (OpenID Connect userinfo).
   */
  async fetchProfile(accessToken: string): Promise<any> {
    const response = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) return null;
    return response.json();
  }

  /**
   * Import LinkedIn profile data into a user's candidate profile.
   */
  async importProfile(userId: string, linkedinData: any) {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId },
    });

    const updateData: any = {
      linkedinImportedAt: new Date(),
    };

    if (linkedinData.given_name) updateData.firstName = linkedinData.given_name;
    if (linkedinData.family_name) updateData.lastName = linkedinData.family_name;
    if (linkedinData.picture) updateData.avatarUrl = linkedinData.picture;
    if (linkedinData.email) {
      // Store LinkedIn URL if available
      updateData.linkedinUrl = `https://linkedin.com/in/${linkedinData.sub}`;
    }

    if (profile) {
      await prisma.candidateProfile.update({ where: { userId }, data: updateData });
    } else {
      await prisma.candidateProfile.create({ data: { userId, ...updateData } });
    }

    return { imported: true, fields: Object.keys(updateData) };
  }

  /**
   * Parse LinkedIn profile text (copy-pasted from LinkedIn).
   * Uses LLM to extract structured data.
   */
  async parseLinkedInText(userId: string, text: string): Promise<any> {
    if (!openai) {
      return { error: 'LLM not configured' };
    }

    const response = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: 1000,
      messages: [
        {
          role: 'system',
          content: `Extrais les informations d'un profil LinkedIn copié-collé. Retourne JSON uniquement:
{
  "firstName": "", "lastName": "", "title": "", "city": "", "country": "",
  "skills": ["skill1", "skill2"],
  "experiences": [{"company":"","title":"","startYear":2020,"endYear":null,"current":true}],
  "educations": [{"institution":"","degree":"","field":""}]
}`,
        },
        { role: 'user', content: text.substring(0, 3000) },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim() || '{}';
    const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    // Save to profile
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (profile) {
      const update: any = { linkedinImportedAt: new Date() };
      if (parsed.firstName) update.firstName = parsed.firstName;
      if (parsed.lastName) update.lastName = parsed.lastName;
      if (parsed.title) update.title = parsed.title;
      if (parsed.city) update.city = parsed.city;
      if (parsed.country) update.country = parsed.country;

      await prisma.candidateProfile.update({ where: { userId }, data: update });

      // Add skills
      if (parsed.skills?.length) {
        for (const name of parsed.skills.slice(0, 20)) {
          const exists = await prisma.skill.findFirst({
            where: { profileId: profile.id, name: { equals: name, mode: 'insensitive' } },
          });
          if (!exists) {
            await prisma.skill.create({ data: { profileId: profile.id, name, level: 'INTERMEDIATE' } });
          }
        }
      }

      // Add experiences
      if (parsed.experiences?.length) {
        for (const exp of parsed.experiences.slice(0, 10)) {
          await prisma.experience.create({
            data: {
              profileId: profile.id,
              company: exp.company || 'N/A',
              title: exp.title || 'N/A',
              current: !!exp.current,
              startDate: new Date(exp.startYear || 2020, 0, 1),
              endDate: exp.endYear ? new Date(exp.endYear, 0, 1) : null,
            },
          });
        }
      }
    }

    return { parsed, saved: true };
  }
}

export const linkedinService = new LinkedinService();
