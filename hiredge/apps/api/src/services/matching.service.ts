import prisma from '../db/prisma';
import redis from '../lib/redis';
import { MATCH_WEIGHTS } from '@hiredge/shared';
import { stringSimilarity } from 'string-similarity-js';
import OpenAI from 'openai';

// ============================================================
// SKILL TAXONOMY — Synonymes et groupes de compétences
// ============================================================

const SKILL_SYNONYMS: Record<string, string[]> = {
  // Frontend
  'react': ['reactjs', 'react.js', 'react js'],
  'vue': ['vuejs', 'vue.js', 'vue js', 'vue3', 'vue 3'],
  'angular': ['angularjs', 'angular.js', 'angular 2+'],
  'next.js': ['nextjs', 'next', 'next js'],
  'nuxt': ['nuxtjs', 'nuxt.js', 'nuxt js'],
  'svelte': ['sveltekit', 'svelte kit'],
  'javascript': ['js', 'ecmascript', 'es6', 'es2015', 'vanilla js'],
  'typescript': ['ts'],
  'html': ['html5', 'html 5'],
  'css': ['css3', 'css 3'],
  'tailwind': ['tailwindcss', 'tailwind css'],
  'bootstrap': ['bootstrap 5', 'bootstrap5'],
  'sass': ['scss', 'less'],
  'jquery': ['jquery.js'],
  'redux': ['redux toolkit', 'rtk'],
  'webpack': ['webpack 5'],

  // Backend
  'node.js': ['nodejs', 'node', 'node js'],
  'express': ['expressjs', 'express.js'],
  'fastify': ['fastify.js'],
  'python': ['python3', 'python 3'],
  'django': ['django rest framework', 'drf'],
  'flask': ['flask python'],
  'java': ['java 8', 'java 11', 'java 17', 'java 21', 'jdk'],
  'spring': ['spring boot', 'springboot', 'spring framework'],
  'c#': ['csharp', 'c sharp', '.net c#'],
  '.net': ['dotnet', 'asp.net', 'aspnet', '.net core'],
  'php': ['php 8', 'php8'],
  'laravel': ['laravel php'],
  'ruby': ['ruby on rails', 'ror'],
  'rails': ['ruby on rails', 'ror'],
  'go': ['golang', 'go lang'],
  'rust': ['rust lang', 'rustlang'],
  'kotlin': ['kotlin jvm'],
  'swift': ['swift ui', 'swiftui'],

  // Data / ML
  'machine learning': ['ml', 'deep learning', 'dl'],
  'artificial intelligence': ['ai', 'ia', 'intelligence artificielle'],
  'tensorflow': ['tf', 'keras'],
  'pytorch': ['torch'],
  'pandas': ['numpy', 'scipy'],
  'sql': ['mysql', 'postgresql', 'postgres', 'mssql', 'sql server'],
  'mongodb': ['mongo', 'nosql'],
  'redis': ['redis cache'],
  'elasticsearch': ['elastic', 'elk'],

  // DevOps / Cloud
  'docker': ['containers', 'conteneurs', 'containerization'],
  'kubernetes': ['k8s', 'kube'],
  'aws': ['amazon web services', 'amazon aws'],
  'gcp': ['google cloud', 'google cloud platform'],
  'azure': ['microsoft azure', 'azure cloud'],
  'ci/cd': ['cicd', 'ci cd', 'continuous integration', 'continuous deployment'],
  'terraform': ['iac', 'infrastructure as code'],
  'git': ['github', 'gitlab', 'bitbucket', 'version control'],
  'linux': ['ubuntu', 'debian', 'centos', 'unix'],

  // Mobile
  'react native': ['react-native', 'rn'],
  'flutter': ['dart flutter'],
  'ios': ['iphone', 'apple development'],
  'android': ['android development'],
  'expo': ['expo react native'],

  // Other
  'agile': ['scrum', 'kanban', 'sprint', 'méthodologie agile'],
  'rest': ['restful', 'rest api', 'api rest'],
  'graphql': ['graph ql', 'apollo graphql'],
  'microservices': ['micro services', 'microservice'],
  'api': ['web api', 'api rest', 'api design'],
  'figma': ['sketch', 'ui design'],
  'jira': ['confluence', 'project management'],
};

// Build reverse lookup: "reactjs" → "react"
const CANONICAL_SKILL: Map<string, string> = new Map();
for (const [canonical, synonyms] of Object.entries(SKILL_SYNONYMS)) {
  CANONICAL_SKILL.set(canonical.toLowerCase(), canonical.toLowerCase());
  for (const syn of synonyms) {
    CANONICAL_SKILL.set(syn.toLowerCase(), canonical.toLowerCase());
  }
}

// Skill category groups for domain matching
const SKILL_DOMAINS: Record<string, string[]> = {
  frontend: ['react', 'vue', 'angular', 'next.js', 'svelte', 'javascript', 'typescript', 'html', 'css', 'tailwind', 'sass', 'redux', 'webpack'],
  backend: ['node.js', 'express', 'fastify', 'python', 'django', 'flask', 'java', 'spring', 'c#', '.net', 'php', 'laravel', 'ruby', 'rails', 'go', 'rust'],
  mobile: ['react native', 'flutter', 'ios', 'android', 'swift', 'kotlin', 'expo'],
  data: ['sql', 'mongodb', 'redis', 'elasticsearch', 'postgresql', 'pandas', 'machine learning', 'tensorflow', 'pytorch'],
  devops: ['docker', 'kubernetes', 'aws', 'gcp', 'azure', 'ci/cd', 'terraform', 'linux', 'git'],
};

// ============================================================
// TYPES
// ============================================================

interface UserProfile {
  title: string;
  bio: string | null;
  city: string | null;
  country: string | null;
  remotePreference: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  yearsExperience: number;
  skills: { name: string; level: string; yearsOfExperience: number | null }[];
  experiences: { company: string; title: string; description: string | null; startDate: Date; endDate: Date | null; current: boolean }[];
  educations: { institution: string; degree: string; field: string | null }[];
}

interface JobData {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  niceToHave: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  location: string | null;
  locationCity: string | null;
  locationCountry: string | null;
  remote: boolean;
  contractType: string;
  experienceMin: number | null;
  experienceMax: number | null;
  postedAt: Date;
}

export interface MatchResult {
  matchScore: number;
  matchDetails: {
    semantic: number;
    skills: number;
    experience: number;
    salary: number;
    location: number;
    recency: number;
  };
  matchAnalysis?: string;
  sellingPoints?: string[];
  gaps?: string[];
}

// ============================================================
// MATCHING ENGINE
// ============================================================

class MatchingService {
  private groqClient: OpenAI | null = null;

  private getGroqClient(): OpenAI | null {
    if (this.groqClient) return this.groqClient;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;
    this.groqClient = new OpenAI({
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });
    return this.groqClient;
  }

  // -------------------------------------------------------
  // PUBLIC: Score a single job for a user (with optional LLM refinement)
  // -------------------------------------------------------
  async scoreJob(userId: string, job: JobData, useLLM = false): Promise<MatchResult> {
    const profile = await this.loadProfile(userId);
    if (!profile) {
      return { matchScore: 0, matchDetails: { semantic: 0, skills: 0, experience: 0, salary: 0, location: 0, recency: 0 } };
    }

    const result = this.computeScore(profile, job);

    if (useLLM) {
      const refined = await this.llmRefine(profile, job, result);
      return refined;
    }

    return result;
  }

  // -------------------------------------------------------
  // PUBLIC: Score multiple jobs for a user (fast, no LLM)
  // -------------------------------------------------------
  async scoreJobs(userId: string, jobs: JobData[]): Promise<Map<string, MatchResult>> {
    const profile = await this.loadProfile(userId);
    if (!profile) return new Map();

    const results = new Map<string, MatchResult>();
    for (const job of jobs) {
      results.set(job.id, this.computeScore(profile, job));
    }
    return results;
  }

  // -------------------------------------------------------
  // PUBLIC: Get cached or compute a single score
  // -------------------------------------------------------
  async getCachedOrScore(userId: string, job: JobData, useLLM = false): Promise<MatchResult> {
    const cacheKey = `match:${userId}:${job.id}:${useLLM ? 'llm' : 'fast'}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const result = await this.scoreJob(userId, job, useLLM);
    await redis.setex(cacheKey, 1800, JSON.stringify(result)); // Cache 30 min
    return result;
  }

  // ============================================================
  // CORE SCORING ENGINE
  // ============================================================

  private computeScore(profile: UserProfile, job: JobData): MatchResult {
    const skillsScore = this.computeSkillMatch(profile.skills, job.requiredSkills, job.niceToHave);
    const semanticScore = this.computeSemanticMatch(profile, job);
    const experienceScore = this.computeExperienceMatch(profile, job);
    const salaryScore = this.computeSalaryMatch(profile, job);
    const locationScore = this.computeLocationMatch(profile, job);
    const recencyScore = this.computeRecencyScore(job.postedAt);

    const totalScore =
      semanticScore * MATCH_WEIGHTS.semantic +
      skillsScore * MATCH_WEIGHTS.skills +
      experienceScore * MATCH_WEIGHTS.experience +
      salaryScore * MATCH_WEIGHTS.salary +
      locationScore * MATCH_WEIGHTS.location +
      recencyScore * MATCH_WEIGHTS.recency;

    return {
      matchScore: Math.round(Math.min(totalScore * 100, 100)),
      matchDetails: {
        semantic: Math.round(semanticScore * 100),
        skills: Math.round(skillsScore * 100),
        experience: Math.round(experienceScore * 100),
        salary: Math.round(salaryScore * 100),
        location: Math.round(locationScore * 100),
        recency: Math.round(recencyScore * 100),
      },
    };
  }

  // -------------------------------------------------------
  // 1. SKILL MATCHING (fuzzy + synonymes + niceToHave)
  // -------------------------------------------------------
  private computeSkillMatch(
    userSkills: { name: string; level: string; yearsOfExperience: number | null }[],
    requiredSkills: string[],
    niceToHave: string[],
  ): number {
    if (!requiredSkills || requiredSkills.length === 0) return 0.5;

    const userCanonical = userSkills.map(s => ({
      canonical: this.canonicalizeSkill(s.name),
      original: s.name.toLowerCase(),
      level: s.level,
      years: s.yearsOfExperience ?? 0,
    }));

    // Score for required skills (weight 0.8)
    let requiredMatches = 0;
    let requiredTotal = requiredSkills.length;

    for (const reqSkill of requiredSkills) {
      const reqCanonical = this.canonicalizeSkill(reqSkill);
      const bestMatch = this.findBestSkillMatch(reqCanonical, reqSkill.toLowerCase(), userCanonical);
      requiredMatches += bestMatch;
    }

    const requiredScore = requiredTotal > 0 ? requiredMatches / requiredTotal : 0.5;

    // Bonus for nice-to-have skills (weight 0.2)
    let niceMatches = 0;
    const niceTotal = niceToHave?.length || 0;

    if (niceTotal > 0) {
      for (const niceSkill of niceToHave) {
        const niceCanonical = this.canonicalizeSkill(niceSkill);
        const bestMatch = this.findBestSkillMatch(niceCanonical, niceSkill.toLowerCase(), userCanonical);
        niceMatches += bestMatch;
      }
    }

    const niceScore = niceTotal > 0 ? niceMatches / niceTotal : 0;

    return requiredScore * 0.8 + niceScore * 0.2;
  }

  private findBestSkillMatch(
    targetCanonical: string,
    targetOriginal: string,
    userSkills: { canonical: string; original: string; level: string; years: number }[],
  ): number {
    let best = 0;

    for (const uSkill of userSkills) {
      // Exact canonical match
      if (uSkill.canonical === targetCanonical && targetCanonical !== targetOriginal) {
        // Known synonym match = strong match
        const levelBonus = this.getLevelBonus(uSkill.level);
        best = Math.max(best, 0.85 + levelBonus);
        continue;
      }

      // Exact string match
      if (uSkill.original === targetOriginal) {
        const levelBonus = this.getLevelBonus(uSkill.level);
        best = Math.max(best, 0.9 + levelBonus);
        continue;
      }

      // Fuzzy string similarity
      const similarity = stringSimilarity(uSkill.original, targetOriginal);
      if (similarity > 0.7) {
        best = Math.max(best, similarity * 0.85);
      }

      // Check canonical similarity
      if (uSkill.canonical !== uSkill.original || targetCanonical !== targetOriginal) {
        const canonicalSim = stringSimilarity(uSkill.canonical, targetCanonical);
        if (canonicalSim > 0.7) {
          best = Math.max(best, canonicalSim * 0.85);
        }
      }

      // Check if one contains the other (e.g., "React" in "React Native")
      if (uSkill.original.includes(targetOriginal) || targetOriginal.includes(uSkill.original)) {
        const lenRatio = Math.min(uSkill.original.length, targetOriginal.length) / Math.max(uSkill.original.length, targetOriginal.length);
        best = Math.max(best, lenRatio * 0.7);
      }
    }

    return Math.min(best, 1);
  }

  private getLevelBonus(level: string): number {
    switch (level.toUpperCase()) {
      case 'EXPERT': return 0.1;
      case 'ADVANCED': return 0.07;
      case 'INTERMEDIATE': return 0.03;
      case 'BEGINNER': return 0;
      default: return 0.03;
    }
  }

  private canonicalizeSkill(skill: string): string {
    const lower = skill.toLowerCase().trim();
    return CANONICAL_SKILL.get(lower) ?? lower;
  }

  // -------------------------------------------------------
  // 2. SEMANTIC MATCHING (titre, description, domaine)
  // -------------------------------------------------------
  private computeSemanticMatch(profile: UserProfile, job: JobData): number {
    let score = 0;
    let weights = 0;

    // A. Title relevance (weight 3)
    const titleScore = this.computeTitleRelevance(profile, job.title);
    score += titleScore * 3;
    weights += 3;

    // B. Description keyword match (weight 3)
    const descScore = this.computeDescriptionMatch(profile, job.description);
    score += descScore * 3;
    weights += 3;

    // C. Domain overlap (weight 2)
    const domainScore = this.computeDomainOverlap(profile.skills, job.requiredSkills);
    score += domainScore * 2;
    weights += 2;

    // D. Experience relevance (weight 2)
    const expRelevance = this.computeExperienceRelevance(profile.experiences, job);
    score += expRelevance * 2;
    weights += 2;

    return weights > 0 ? score / weights : 0.5;
  }

  private computeTitleRelevance(profile: UserProfile, jobTitle: string): number {
    const jobTitleLower = jobTitle.toLowerCase();
    let best = 0;

    // Compare profile title with job title
    if (profile.title) {
      const profileTitleLower = profile.title.toLowerCase();
      const titleSim = stringSimilarity(profileTitleLower, jobTitleLower);
      best = Math.max(best, titleSim);

      // Check word overlap
      const profileWords = this.extractSignificantWords(profileTitleLower);
      const jobWords = this.extractSignificantWords(jobTitleLower);
      const wordOverlap = this.computeWordOverlap(profileWords, jobWords);
      best = Math.max(best, wordOverlap);
    }

    // Compare experience titles with job title
    for (const exp of profile.experiences) {
      const expTitleLower = exp.title.toLowerCase();
      const titleSim = stringSimilarity(expTitleLower, jobTitleLower);
      best = Math.max(best, titleSim * 0.9); // Slight penalty vs direct profile title

      const expWords = this.extractSignificantWords(expTitleLower);
      const jobWords = this.extractSignificantWords(jobTitleLower);
      const wordOverlap = this.computeWordOverlap(expWords, jobWords);
      best = Math.max(best, wordOverlap * 0.9);
    }

    return best;
  }

  private computeDescriptionMatch(profile: UserProfile, description: string): number {
    if (!description || description.length < 50) return 0.3;

    const descLower = description.toLowerCase();

    // Count how many user skills are mentioned in the description
    let mentionedSkills = 0;
    const totalSkills = profile.skills.length || 1;

    for (const skill of profile.skills) {
      const skillLower = skill.name.toLowerCase();
      const canonical = this.canonicalizeSkill(skill.name);

      if (descLower.includes(skillLower) || descLower.includes(canonical)) {
        mentionedSkills++;
        continue;
      }

      // Check synonyms
      const synonyms = SKILL_SYNONYMS[canonical] ?? [];
      if (synonyms.some(syn => descLower.includes(syn.toLowerCase()))) {
        mentionedSkills++;
      }
    }

    const skillMentionRate = mentionedSkills / totalSkills;

    // Check experience keywords in description
    let expKeywordMatches = 0;
    for (const exp of profile.experiences) {
      const keywords = this.extractSignificantWords(exp.title.toLowerCase());
      if (keywords.some(kw => descLower.includes(kw))) {
        expKeywordMatches++;
      }
    }
    const expRate = profile.experiences.length > 0 ? Math.min(expKeywordMatches / profile.experiences.length, 1) : 0;

    // Check education keywords
    let eduMatch = 0;
    for (const edu of profile.educations) {
      if (edu.field && descLower.includes(edu.field.toLowerCase())) eduMatch = 0.3;
      if (edu.degree && descLower.includes(edu.degree.toLowerCase())) eduMatch = Math.max(eduMatch, 0.2);
    }

    return Math.min(skillMentionRate * 0.5 + expRate * 0.3 + eduMatch + 0.15, 1);
  }

  private computeDomainOverlap(
    userSkills: { name: string }[],
    jobSkills: string[],
  ): number {
    const userDomains = this.identifyDomains(userSkills.map(s => s.name));
    const jobDomains = this.identifyDomains(jobSkills);

    if (userDomains.size === 0 || jobDomains.size === 0) return 0.5;

    let overlap = 0;
    for (const domain of jobDomains) {
      if (userDomains.has(domain)) overlap++;
    }

    return jobDomains.size > 0 ? overlap / jobDomains.size : 0.5;
  }

  private identifyDomains(skills: string[]): Set<string> {
    const domains = new Set<string>();
    for (const skill of skills) {
      const canonical = this.canonicalizeSkill(skill);
      for (const [domain, domainSkills] of Object.entries(SKILL_DOMAINS)) {
        if (domainSkills.includes(canonical)) {
          domains.add(domain);
        }
      }
    }
    return domains;
  }

  private computeExperienceRelevance(experiences: UserProfile['experiences'], job: JobData): number {
    if (experiences.length === 0) return 0.2;

    const jobTitleLower = job.title.toLowerCase();
    const jobDescLower = job.description.toLowerCase();
    const jobWords = this.extractSignificantWords(jobTitleLower);

    let bestRelevance = 0;

    for (const exp of experiences) {
      let relevance = 0;

      // Title similarity
      const titleSim = stringSimilarity(exp.title.toLowerCase(), jobTitleLower);
      relevance = Math.max(relevance, titleSim);

      // Word overlap between experience title and job title
      const expWords = this.extractSignificantWords(exp.title.toLowerCase());
      const wordOverlap = this.computeWordOverlap(expWords, jobWords);
      relevance = Math.max(relevance, wordOverlap);

      // Experience description mentions job keywords
      if (exp.description) {
        const expDescLower = exp.description.toLowerCase();
        const jobKeywords = this.extractSignificantWords(jobDescLower).slice(0, 20);
        const mentionCount = jobKeywords.filter(kw => expDescLower.includes(kw)).length;
        const keywordRate = jobKeywords.length > 0 ? mentionCount / jobKeywords.length : 0;
        relevance = Math.max(relevance, keywordRate * 0.8);
      }

      // Duration bonus: longer experience = more relevant
      const months = exp.endDate
        ? (exp.endDate.getTime() - exp.startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
        : (Date.now() - exp.startDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      const durationBonus = Math.min(months / 60, 0.15); // Max 0.15 bonus for 5+ years

      bestRelevance = Math.max(bestRelevance, relevance + durationBonus);
    }

    return Math.min(bestRelevance, 1);
  }

  // -------------------------------------------------------
  // 3. EXPERIENCE YEARS MATCH
  // -------------------------------------------------------
  private computeExperienceMatch(profile: UserProfile, job: JobData): number {
    const userYears = profile.yearsExperience || this.calculateTotalYears(profile.experiences);

    if (!job.experienceMin && !job.experienceMax) return 0.7;

    if (job.experienceMin && userYears < job.experienceMin) {
      const gap = job.experienceMin - userYears;
      if (gap <= 1) return 0.7;  // 1 year under = still decent
      if (gap <= 2) return 0.5;
      if (gap <= 3) return 0.3;
      return 0.1;
    }

    if (job.experienceMax && userYears > job.experienceMax + 5) return 0.5; // Overqualified

    // In the sweet spot
    if (job.experienceMin && job.experienceMax) {
      const mid = (job.experienceMin + job.experienceMax) / 2;
      const distance = Math.abs(userYears - mid);
      const range = (job.experienceMax - job.experienceMin) / 2;
      return range > 0 ? Math.max(0.6, 1 - (distance / range) * 0.3) : 0.9;
    }

    return 0.9;
  }

  // -------------------------------------------------------
  // 4. SALARY MATCH
  // -------------------------------------------------------
  private computeSalaryMatch(profile: UserProfile, job: JobData): number {
    if (!profile.salaryMin || !job.salaryMin) return 0.5;

    const userMin = profile.salaryMin;
    const userMax = profile.salaryMax ?? userMin * 1.3;
    const jobMin = job.salaryMin;
    const jobMax = job.salaryMax ?? jobMin * 1.2;

    // Perfect overlap
    if (userMin <= jobMax && userMax >= jobMin) {
      // How much overlap?
      const overlapStart = Math.max(userMin, jobMin);
      const overlapEnd = Math.min(userMax, jobMax);
      const overlapRange = overlapEnd - overlapStart;
      const userRange = userMax - userMin || 1;
      const overlapRatio = overlapRange / userRange;
      return Math.min(0.6 + overlapRatio * 0.4, 1);
    }

    // Job pays less than user wants
    if (jobMax < userMin) {
      const gap = (userMin - jobMax) / userMin;
      if (gap < 0.1) return 0.5;
      if (gap < 0.2) return 0.3;
      return 0.1;
    }

    // Job pays more (usually not a problem, but slight flag for overqualification)
    return 0.7;
  }

  // -------------------------------------------------------
  // 5. LOCATION MATCH
  // -------------------------------------------------------
  private computeLocationMatch(profile: UserProfile, job: JobData): number {
    // Remote job + remote-friendly user = perfect
    if (job.remote && (profile.remotePreference === 'REMOTE' || profile.remotePreference === 'HYBRID')) {
      return 1;
    }

    if (!profile.city && !profile.country) return 0.5;

    const userCity = (profile.city || '').toLowerCase().trim();
    const userCountry = (profile.country || '').toLowerCase().trim();
    const jobLocation = (job.location || '').toLowerCase().trim();
    const jobCity = (job.locationCity || '').toLowerCase().trim();
    const jobCountry = (job.locationCountry || '').toLowerCase().trim();

    // Same city
    if (userCity && (jobCity === userCity || jobLocation.includes(userCity))) return 1;

    // Same country
    if (userCountry && (jobCountry === userCountry || jobLocation.includes(userCountry))) return 0.6;

    // Fuzzy location match
    if (userCity && jobLocation) {
      const sim = stringSimilarity(userCity, jobLocation);
      if (sim > 0.6) return 0.7;
    }

    // Remote preference but job is not remote
    if (profile.remotePreference === 'REMOTE' && !job.remote) return 0.2;

    return 0.3;
  }

  // -------------------------------------------------------
  // 6. RECENCY SCORE
  // -------------------------------------------------------
  private computeRecencyScore(postedAt: Date): number {
    const daysSince = (Date.now() - postedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince <= 2) return 1;
    if (daysSince <= 7) return 0.85;
    if (daysSince <= 14) return 0.65;
    if (daysSince <= 30) return 0.4;
    return 0.2;
  }

  // ============================================================
  // LLM REFINEMENT (Groq) — For detail pages and top results
  // ============================================================

  async llmRefine(profile: UserProfile, job: JobData, baseResult: MatchResult): Promise<MatchResult> {
    const client = this.getGroqClient();
    if (!client) return baseResult;

    const cacheKey = `match:llm:${JSON.stringify({ p: profile.title, j: job.id })}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      return { ...baseResult, ...parsed };
    }

    try {
      const profileSummary = this.buildProfileSummary(profile);
      const jobSummary = this.buildJobSummary(job);

      const response = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `Tu es un expert en recrutement. Analyse la compatibilité entre un candidat et une offre d'emploi.
Réponds UNIQUEMENT en JSON valide, sans texte avant ou après.
Format attendu:
{
  "adjustedScore": <nombre 0-100>,
  "analysis": "<2-3 phrases d'analyse en français>",
  "sellingPoints": ["<point fort 1>", "<point fort 2>", "<point fort 3>"],
  "gaps": ["<lacune 1>", "<lacune 2>"]
}
Règles:
- adjustedScore doit être réaliste. Le score de base calculé est ${baseResult.matchScore}%. Tu peux l'ajuster de ±15 points max.
- Sois honnête sur les lacunes mais positif sur les points forts.
- Les sellingPoints sont les arguments clés du candidat pour ce poste.
- Les gaps sont les compétences ou expériences manquantes.`,
          },
          {
            role: 'user',
            content: `PROFIL CANDIDAT:\n${profileSummary}\n\nOFFRE D'EMPLOI:\n${jobSummary}\n\nScore de base algorithmique: ${baseResult.matchScore}%\nDétails: compétences ${baseResult.matchDetails.skills}%, sémantique ${baseResult.matchDetails.semantic}%, expérience ${baseResult.matchDetails.experience}%`,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) return baseResult;

      // Extract JSON from potential markdown wrapping
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return baseResult;

      const parsed = JSON.parse(jsonMatch[0]);

      const adjusted: MatchResult = {
        matchScore: baseResult.matchScore, // Keep base score for consistency with list view
        matchDetails: baseResult.matchDetails,
        matchAnalysis: parsed.analysis,
        sellingPoints: parsed.sellingPoints,
        gaps: parsed.gaps,
      };

      // Cache LLM result for 1 hour
      await redis.setex(cacheKey, 3600, JSON.stringify({
        matchScore: adjusted.matchScore,
        matchAnalysis: adjusted.matchAnalysis,
        sellingPoints: adjusted.sellingPoints,
        gaps: adjusted.gaps,
      }));

      return adjusted;
    } catch (err) {
      // LLM failure is non-blocking
      console.error('[MatchingService] LLM refinement failed:', err);
      return baseResult;
    }
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private async loadProfile(userId: string): Promise<UserProfile | null> {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId },
      include: { skills: true, experiences: true, educations: true },
    });

    if (!profile) return null;

    return {
      title: profile.title,
      bio: profile.bio,
      city: profile.city,
      country: profile.country,
      remotePreference: profile.remotePreference,
      salaryMin: profile.salaryMin,
      salaryMax: profile.salaryMax,
      salaryCurrency: profile.salaryCurrency,
      yearsExperience: profile.yearsExperience,
      skills: profile.skills.map((s: any) => ({
        name: s.name,
        level: s.level,
        yearsOfExperience: s.yearsOfExperience,
      })),
      experiences: profile.experiences.map((e: any) => ({
        company: e.company,
        title: e.title,
        description: e.description,
        startDate: e.startDate,
        endDate: e.endDate,
        current: e.current,
      })),
      educations: profile.educations.map((e: any) => ({
        institution: e.institution,
        degree: e.degree,
        field: e.field,
      })),
    };
  }

  private calculateTotalYears(experiences: UserProfile['experiences']): number {
    let totalMonths = 0;
    for (const exp of experiences) {
      const end = exp.current ? new Date() : (exp.endDate ?? new Date());
      const months = (end.getTime() - exp.startDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      totalMonths += Math.max(months, 0);
    }
    return Math.round(totalMonths / 12);
  }

  private extractSignificantWords(text: string): string[] {
    const stopWords = new Set([
      'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'en', 'au', 'aux',
      'a', 'the', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'is', 'are',
      'we', 'our', 'you', 'your', 'qui', 'que', 'dans', 'sur', 'pour', 'avec', 'par',
      'ce', 'se', 'ne', 'pas', 'plus', 'mais', 'ou', 'where', 'have', 'has', 'been',
      'this', 'that', 'will', 'can', 'from', 'into', 'about', 'its', 'also', 'être', 'avoir',
      'il', 'elle', 'nous', 'vous', 'ils', 'son', 'sa', 'ses', 'nos', 'vos', 'leur', 'leurs',
      '-', '/', '&', '+', '|', ',', '.', ':', ';', '(', ')', 'as', 'their',
    ]);

    return text
      .split(/[\s,;/|()]+/)
      .filter(w => w.length > 2 && !stopWords.has(w))
      .slice(0, 30);
  }

  private computeWordOverlap(words1: string[], words2: string[]): number {
    if (words1.length === 0 || words2.length === 0) return 0;
    const set2 = new Set(words2);
    const matches = words1.filter(w => set2.has(w)).length;
    return matches / Math.max(words1.length, words2.length);
  }

  private buildProfileSummary(profile: UserProfile): string {
    const parts: string[] = [];
    if (profile.title) parts.push(`Titre: ${profile.title}`);
    if (profile.skills.length) {
      parts.push(`Compétences: ${profile.skills.map(s => `${s.name} (${s.level}${s.yearsOfExperience ? ', ' + s.yearsOfExperience + ' ans' : ''})`).join(', ')}`);
    }
    if (profile.experiences.length) {
      parts.push(`Expérience: ${profile.experiences.map(e => `${e.title} chez ${e.company}`).join(' | ')}`);
    }
    if (profile.educations.length) {
      parts.push(`Formation: ${profile.educations.map(e => `${e.degree}${e.field ? ' en ' + e.field : ''} (${e.institution})`).join(' | ')}`);
    }
    parts.push(`Années d'expérience: ${profile.yearsExperience}`);
    if (profile.city) parts.push(`Localisation: ${profile.city}${profile.country ? ', ' + profile.country : ''}`);
    if (profile.salaryMin) parts.push(`Salaire souhaité: ${profile.salaryMin}-${profile.salaryMax ?? '?'} ${profile.salaryCurrency}`);
    parts.push(`Préférence remote: ${profile.remotePreference}`);
    return parts.join('\n');
  }

  private buildJobSummary(job: JobData): string {
    const parts: string[] = [];
    parts.push(`Titre: ${job.title}`);
    if (job.requiredSkills.length) parts.push(`Compétences requises: ${job.requiredSkills.join(', ')}`);
    if (job.niceToHave.length) parts.push(`Nice to have: ${job.niceToHave.join(', ')}`);
    if (job.experienceMin || job.experienceMax) parts.push(`Expérience: ${job.experienceMin ?? '?'}-${job.experienceMax ?? '?'} ans`);
    if (job.salaryMin) parts.push(`Salaire: ${job.salaryMin}-${job.salaryMax ?? '?'} ${job.location ?? ''}`);
    if (job.location) parts.push(`Localisation: ${job.location}`);
    parts.push(`Remote: ${job.remote ? 'Oui' : 'Non'}`);
    parts.push(`Type: ${job.contractType}`);
    // Truncate description to first 500 chars
    if (job.description) parts.push(`Description (extrait): ${job.description.slice(0, 500)}`);
    return parts.join('\n');
  }
}

export const matchingService = new MatchingService();
