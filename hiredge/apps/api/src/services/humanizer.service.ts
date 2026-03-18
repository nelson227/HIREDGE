import OpenAI from 'openai';
import { env } from '../config/env';

const isLLMEnabled =
  env.OPENAI_API_KEY.length > 20 &&
  !env.OPENAI_API_KEY.startsWith('sk-...');

const openai = isLLMEnabled
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY, baseURL: 'https://api.groq.com/openai/v1' })
  : null;

export class HumanizerService {
  /**
   * Post-process AI-generated text to make it sound more human.
   * Varies sentence structure, adds natural imperfections, removes AI patterns.
   */
  async humanize(text: string, style?: { formalityLevel?: number; vocabularyComplexity?: string }): Promise<string> {
    if (!openai || !text) return text;

    const formality = style?.formalityLevel ?? 0.7;
    const complexity = style?.vocabularyComplexity ?? 'moderate';

    try {
      const response = await openai.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.8,
        max_tokens: 1500,
        messages: [
          {
            role: 'system',
            content: `Tu es un expert en réécriture de texte pour le rendre indétectable par les IA.
Règles STRICTES:
1. Varie la longueur des phrases (mélange courtes et longues)
2. Utilise des connecteurs naturels variés (d'ailleurs, en fait, du coup, par contre)
3. Ajoute occasionnellement des tournures légèrement imparfaites (comme un humain écrit)
4. Évite les listes à puces systématiques
5. Remplace les transitions trop "lisses" par des transitions plus naturelles
6. N'utilise PAS de mots typiquement IA: "en effet", "il convient de noter", "dans le cadre de"
7. Garde le contenu factuel IDENTIQUE - ne change que le style
8. Niveau de formalité: ${formality * 10}/10
9. Complexité vocabulaire: ${complexity}
10. Ne JAMAIS commencer par "Je me permets de" ou "C'est avec" ou "Fort(e) de"

IMPORTANT: Retourne UNIQUEMENT le texte réécrit, sans commentaire ni explication.`,
          },
          { role: 'user', content: text },
        ],
      });

      return response.choices[0]?.message?.content?.trim() || text;
    } catch {
      return text; // Fallback to original on error
    }
  }

  /**
   * Apply quick rule-based humanization (no LLM call).
   * Good for when LLM quota is reached.
   */
  quickHumanize(text: string): string {
    let result = text;

    // Remove common AI patterns
    const aiPatterns = [
      /Il convient de noter que /gi,
      /En effet, /gi,
      /Il est important de souligner que /gi,
      /Dans le cadre de /gi,
      /Force est de constater que /gi,
      /Il va sans dire que /gi,
      /À cet égard, /gi,
    ];

    for (const pattern of aiPatterns) {
      result = result.replace(pattern, '');
    }

    // Vary some connectors
    const replacements: [RegExp, string[]][] = [
      [/De plus,/g, ['Par ailleurs,', 'Aussi,', 'En plus,']],
      [/Par conséquent,/g, ['Du coup,', 'Résultat :',  'Ce qui fait que']],
      [/Cependant,/g, ['Mais', 'Par contre,', 'Toutefois,']],
      [/En conclusion,/g, ['Pour finir,', 'En résumé,', 'Bref,']],
    ];

    for (const [pattern, alternatives] of replacements) {
      result = result.replace(pattern, () => {
        return alternatives[Math.floor(Math.random() * alternatives.length)]!;
      });
    }

    return result;
  }
}

export const humanizerService = new HumanizerService();
