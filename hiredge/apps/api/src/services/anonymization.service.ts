import OpenAI from 'openai';
import { env } from '../config/env';

const isLLMEnabled =
  env.OPENAI_API_KEY.length > 20 &&
  !env.OPENAI_API_KEY.startsWith('sk-...');

const openai = isLLMEnabled
  ? new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    })
  : null;

/**
 * Scout Anonymization Pipeline — AGENTS.md §8
 *
 * 1. PII Detector   (regex + patterns)
 * 2. Context Analyzer (LLM — detects identifying info in context)
 * 3. Redactor       (replaces dangerous elements)
 */

// Common French/English first names to detect
const COMMON_NAMES_PATTERN =
  /\b(Jean|Pierre|Marie|Paul|Michel|Alain|Patrick|Philippe|Laurent|Nicolas|Stéphane|Thomas|David|John|James|Robert|Michael|William|Sarah|Sophie|Julie|Nathalie|Céline|Isabelle|Christophe|François|Sébastien|Julien|Alexandre|Antoine|Maxime|Hugo|Lucas|Théo|Emma|Léa|Manon|Chloé|Camille)\b/gi;

// ─── PII Regex Patterns ───
const PII_PATTERNS: { name: string; pattern: RegExp; replacement: string }[] = [
  { name: 'email', pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[email masqué]' },
  { name: 'phone_fr', pattern: /(?:0|\+33)[1-9](?:[\s.-]?\d{2}){4}/g, replacement: '[téléphone masqué]' },
  { name: 'phone_intl', pattern: /\+\d{1,3}[\s.-]?\d{6,14}/g, replacement: '[téléphone masqué]' },
  { name: 'url', pattern: /https?:\/\/[^\s<>"]+/gi, replacement: '[lien masqué]' },
  { name: 'linkedin', pattern: /linkedin\.com\/in\/[^\s<>"]+/gi, replacement: '[profil LinkedIn masqué]' },
  { name: 'address', pattern: /\d{1,4}\s+(?:rue|avenue|boulevard|place|impasse|allée|chemin)\s+[^\n,.]{3,50}/gi, replacement: '[adresse masquée]' },
  { name: 'postal_code', pattern: /\b\d{5}\b/g, replacement: '[code postal]' },
];

// Context patterns that could identify someone
const CONTEXT_PATTERNS: { name: string; pattern: RegExp; replacement: string }[] = [
  { name: 'team_size', pattern: /(?:équipe|team)\s+de\s+(\d{1,2})\s+personnes?/gi, replacement: 'une équipe' },
  { name: 'project_name', pattern: /(?:projet|project)\s+([A-Z][a-zA-Zéèêàâôûïüö]{2,})/g, replacement: 'un projet interne' },
  { name: 'floor_office', pattern: /(?:étage|floor|bureau|office)\s+(?:\d+|[A-Z]\d+)/gi, replacement: '[bureau]' },
  { name: 'specific_date', pattern: /(?:le\s+)?\d{1,2}(?:er)?\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}/gi, replacement: '[date masquée]' },
];

export class AnonymizationService {
  /**
   * Full anonymization pipeline for scout messages.
   * Returns { anonymized: string, riskLevel: 'low' | 'medium' | 'high', redactions: number }
   */
  async anonymize(text: string): Promise<{ anonymized: string; riskLevel: string; redactions: number }> {
    let result = text;
    let redactions = 0;

    // Step 1: Regex-based PII removal
    for (const { pattern, replacement } of PII_PATTERNS) {
      const matches = result.match(pattern);
      if (matches) {
        redactions += matches.length;
        result = result.replace(pattern, replacement);
      }
    }

    // Step 2: Remove common names
    const nameMatches = result.match(COMMON_NAMES_PATTERN);
    if (nameMatches) {
      redactions += nameMatches.length;
      result = result.replace(COMMON_NAMES_PATTERN, (match) => {
        // Replace with generic term based on context
        return 'un(e) collègue';
      });
    }

    // Step 3: Context patterns
    for (const { pattern, replacement } of CONTEXT_PATTERNS) {
      const matches = result.match(pattern);
      if (matches) {
        redactions += matches.length;
        result = result.replace(pattern, replacement);
      }
    }

    // Step 4: LLM-based deep anonymization (only if significant text)
    if (openai && text.length > 50) {
      try {
        const llmResult = await this.llmAnonymize(result);
        if (llmResult) {
          result = llmResult.text;
          redactions += llmResult.additionalRedactions;
        }
      } catch {
        // Continue with regex-only result
      }
    }

    // Assess risk level
    const riskLevel = this.assessRiskLevel(text, result, redactions);

    return { anonymized: result, riskLevel, redactions };
  }

  /** Quick check — does the text contain identifiable info? */
  containsPII(text: string): boolean {
    for (const { pattern } of PII_PATTERNS) {
      if (pattern.test(text)) {
        pattern.lastIndex = 0; // Reset regex state
        return true;
      }
    }
    if (COMMON_NAMES_PATTERN.test(text)) {
      COMMON_NAMES_PATTERN.lastIndex = 0;
      return true;
    }
    return false;
  }

  // ─── Private ───

  private async llmAnonymize(text: string): Promise<{ text: string; additionalRedactions: number } | null> {
    if (!openai) return null;

    const completion = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0,
      max_tokens: 1500,
      messages: [
        {
          role: 'system',
          content: `Tu es un système d'anonymisation pour des messages d'éclaireurs (employés décrivant leur entreprise anonymement).

MISSION : Supprime toute information qui pourrait identifier l'auteur du message ou des personnes citées, TOUT EN CONSERVANT les informations utiles sur l'entreprise.

RÈGLES :
- Remplace les noms propres par des termes génériques ("le manager", "un collègue", "la directrice")
- Remplace les noms de projets spécifiques par "un projet interne"
- Remplace les dates précises par des périodes vagues ("récemment", "il y a quelques mois")
- Conserve les informations sur la culture, le salaire, les processus, l'ambiance
- Si le texte est déjà anonyme, retourne-le tel quel
- Retourne UNIQUEMENT le texte anonymisé, rien d'autre`,
        },
        { role: 'user', content: text },
      ],
    });

    const anonymized = completion.choices[0]?.message?.content?.trim();
    if (!anonymized) return null;

    // Count differences (rough estimate of additional redactions)
    const originalWords = new Set(text.toLowerCase().split(/\s+/));
    const anonymizedWords = new Set(anonymized.toLowerCase().split(/\s+/));
    const diff = [...originalWords].filter((w) => !anonymizedWords.has(w)).length;

    return { text: anonymized, additionalRedactions: Math.max(0, diff - 2) };
  }

  private assessRiskLevel(original: string, anonymized: string, redactions: number): string {
    if (redactions === 0) return 'low';
    if (redactions <= 2) return 'medium';
    return 'high';
  }
}

export const anonymizationService = new AnonymizationService();
