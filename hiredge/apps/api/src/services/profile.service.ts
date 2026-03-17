import prisma from '../db/prisma';
import { AppError } from './auth.service';

export class ProfileService {
  async getProfile(userId: string) {
    let profile = await prisma.candidateProfile.findUnique({
      where: { userId },
      include: {
        skills: true,
        experiences: { orderBy: { startDate: 'desc' } },
        educations: { orderBy: { startDate: 'desc' } },
      },
    });

    if (!profile) {
      // Auto-create a blank profile for the user
      profile = await prisma.candidateProfile.create({
        data: { userId, firstName: '', lastName: '', title: '' },
        include: {
          skills: true,
          experiences: { orderBy: { startDate: 'desc' } },
          educations: { orderBy: { startDate: 'desc' } },
        },
      });
    }

    return profile;
  }

  async updateProfile(userId: string, data: {
    firstName?: string;
    lastName?: string;
    title?: string;
    bio?: string;
    phone?: string;
    city?: string;
    country?: string;
    linkedinUrl?: string;
    portfolioUrl?: string;
    remotePreference?: string;
    salaryMin?: number;
    salaryMax?: number;
    salaryCurrency?: string;
    availableFrom?: string;
    notificationPrefs?: Record<string, boolean>;
    privacyPrefs?: Record<string, boolean>;
  }) {
    const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new AppError('PROFILE_NOT_FOUND', 'Profil introuvable', 404);
    }

    // Merge notification/privacy prefs with existing values
    const { notificationPrefs, privacyPrefs, ...profileData } = data;
    const mergedNotifPrefs = notificationPrefs
      ? { ...((profile.notificationPrefs as Record<string, boolean>) ?? {}), ...notificationPrefs }
      : undefined;
    const mergedPrivacyPrefs = privacyPrefs
      ? { ...((profile.privacyPrefs as Record<string, boolean>) ?? {}), ...privacyPrefs }
      : undefined;

    return prisma.candidateProfile.update({
      where: { userId },
      data: {
        ...profileData,
        remotePreference: profileData.remotePreference as any,
        availableFrom: profileData.availableFrom ? new Date(profileData.availableFrom) : undefined,
        completionScore: this.calculateCompletion({ ...profile, ...profileData }),
        ...(mergedNotifPrefs && { notificationPrefs: mergedNotifPrefs }),
        ...(mergedPrivacyPrefs && { privacyPrefs: mergedPrivacyPrefs }),
      },
    });
  }

  async addSkill(userId: string, data: { name: string; level: string; yearsOfExperience?: number }) {
    const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
    if (!profile) throw new AppError('PROFILE_NOT_FOUND', 'Profil introuvable', 404);

    const existing = await prisma.skill.findFirst({
      where: { profileId: profile.id, name: { equals: data.name, mode: 'insensitive' } },
    });
    if (existing) throw new AppError('SKILL_EXISTS', 'Cette compétence existe déjà', 409);

    const skill = await prisma.skill.create({
      data: {
        profileId: profile.id,
        name: data.name,
        level: data.level as any,
        yearsOfExperience: data.yearsOfExperience,
      },
    });

    await this.recalcCompletionScore(userId);
    return skill;
  }

  async removeSkill(userId: string, skillId: string) {
    const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
    if (!profile) throw new AppError('PROFILE_NOT_FOUND', 'Profil introuvable', 404);

    const skill = await prisma.skill.findFirst({ where: { id: skillId, profileId: profile.id } });
    if (!skill) throw new AppError('SKILL_NOT_FOUND', 'Compétence introuvable', 404);

    await prisma.skill.delete({ where: { id: skillId } });
    await this.recalcCompletionScore(userId);
  }

  async addExperience(userId: string, data: {
    company: string;
    title: string;
    description?: string;
    startDate: string;
    endDate?: string;
    current?: boolean;
    location?: string;
  }) {
    const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
    if (!profile) throw new AppError('PROFILE_NOT_FOUND', 'Profil introuvable', 404);

    const experience = await prisma.experience.create({
      data: {
        profileId: profile.id,
        company: data.company,
        title: data.title,
        description: data.description,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        current: data.current ?? false,
        location: data.location,
      },
    });

    await this.recalcCompletionScore(userId);
    return experience;
  }

  async removeExperience(userId: string, experienceId: string) {
    const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
    if (!profile) throw new AppError('PROFILE_NOT_FOUND', 'Profil introuvable', 404);

    const exp = await prisma.experience.findFirst({ where: { id: experienceId, profileId: profile.id } });
    if (!exp) throw new AppError('EXPERIENCE_NOT_FOUND', 'Expérience introuvable', 404);

    await prisma.experience.delete({ where: { id: experienceId } });
    await this.recalcCompletionScore(userId);
  }

  async addEducation(userId: string, data: {
    institution: string;
    degree: string;
    field?: string;
    startDate: string;
    endDate?: string;
    current?: boolean;
  }) {
    const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
    if (!profile) throw new AppError('PROFILE_NOT_FOUND', 'Profil introuvable', 404);

    const education = await prisma.education.create({
      data: {
        profileId: profile.id,
        institution: data.institution,
        degree: data.degree,
        field: data.field,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        current: data.current ?? false,
      },
    });

    await this.recalcCompletionScore(userId);
    return education;
  }

  async removeEducation(userId: string, educationId: string) {
    const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
    if (!profile) throw new AppError('PROFILE_NOT_FOUND', 'Profil introuvable', 404);

    const edu = await prisma.education.findFirst({ where: { id: educationId, profileId: profile.id } });
    if (!edu) throw new AppError('EDUCATION_NOT_FOUND', 'Formation introuvable', 404);

    await prisma.education.delete({ where: { id: educationId } });
    await this.recalcCompletionScore(userId);
  }

  private calculateCompletion(profile: any): number {
    let score = 0;
    if (profile.firstName) score += 10;
    if (profile.lastName) score += 10;
    if (profile.title) score += 15;
    if (profile.bio) score += 10;
    if (profile.phone) score += 5;
    if (profile.city) score += 5;
    if (profile.country) score += 5;
    if (profile.linkedinUrl) score += 5;
    if (profile.cvUrl) score += 15;
    // skills & experiences checked separately via recalc
    return Math.min(score, 100);
  }

  async uploadAvatar(userId: string, buffer: Buffer, mimetype: string): Promise<string> {
    const sharp = (await import('sharp')).default;

    const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
    if (!profile) throw new AppError('PROFILE_NOT_FOUND', 'Profil introuvable', 404);

    // Resize to 512x512 max, compress as JPEG
    const resized = await sharp(buffer)
      .resize(512, 512, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Store as base64 data URL in DB (persistent across deploys)
    const avatarUrl = `data:image/jpeg;base64,${resized.toString('base64')}`;

    await prisma.candidateProfile.update({
      where: { userId },
      data: { avatarUrl },
    });

    return avatarUrl;
  }

  async recalcCompletionScore(userId: string) {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId },
      include: { skills: true, experiences: true, educations: true },
    });
    if (!profile) return;

    let score = this.calculateCompletion(profile);
    if (profile.skills.length > 0) score += 10;
    if (profile.experiences.length > 0) score += 10;
    if (profile.educations.length > 0) score += 5;
    score = Math.min(score, 100);

    await prisma.candidateProfile.update({
      where: { userId },
      data: { completionScore: score },
    });
  }
}

export const profileService = new ProfileService();
