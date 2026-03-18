/**
 * Salary Search Normalizer
 * 
 * Handles:
 * 1. French → English job title translation (API uses English titles from Glassdoor)
 * 2. Accent/diacritic removal for locations (Montréal → Montreal)
 * 3. Location alias mapping (common variants)
 * 4. Title variant generation for fallback searches
 */

// ─── Accent Removal ────────────────────────────────────────────────
/**
 * Remove diacritical marks from a string.
 * "Montréal" → "Montreal", "Québec" → "Quebec"
 */
export function stripAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// ─── Job Title: French → English Mapping ────────────────────────────
// Covers common French job titles and their English equivalents on Glassdoor.
// Keys are lowercase, values are the canonical English title.
const FR_TO_EN_TITLES: Record<string, string> = {
  // Data & Analytics
  'analyste de données': 'Data Analyst',
  'data analyste': 'Data Analyst',
  'analyste données': 'Data Analyst',
  'analyste data': 'Data Analyst',
  'scientifique de données': 'Data Scientist',
  'scientifique des données': 'Data Scientist',
  'data scientiste': 'Data Scientist',
  'ingénieur de données': 'Data Engineer',
  'ingénieur données': 'Data Engineer',
  'ingénieur data': 'Data Engineer',
  'analyste intelligence affaires': 'Business Intelligence Analyst',
  'analyste bi': 'Business Intelligence Analyst',

  // Software Development
  'développeur': 'Software Developer',
  'developpeur': 'Software Developer',
  'développeur logiciel': 'Software Developer',
  'developpeur logiciel': 'Software Developer',
  'développeur web': 'Web Developer',
  'developpeur web': 'Web Developer',
  'développeur full stack': 'Full Stack Developer',
  'développeur fullstack': 'Full Stack Developer',
  'développeur frontend': 'Frontend Developer',
  'développeur front-end': 'Frontend Developer',
  'développeur front end': 'Frontend Developer',
  'développeur backend': 'Backend Developer',
  'développeur back-end': 'Backend Developer',
  'développeur back end': 'Backend Developer',
  'développeur mobile': 'Mobile Developer',
  'programmeur': 'Software Developer',
  'programmeur analyste': 'Programmer Analyst',
  'ingénieur logiciel': 'Software Engineer',
  'ingenieur logiciel': 'Software Engineer',
  'ingénieur informatique': 'Software Engineer',

  // Management & Product
  'chef de projet': 'Project Manager',
  'gestionnaire de projet': 'Project Manager',
  'chef de produit': 'Product Manager',
  'gestionnaire de produit': 'Product Manager',
  'directeur technique': 'CTO',
  'directeur de projet': 'Project Director',
  'directeur des opérations': 'Operations Director',
  'directeur informatique': 'IT Director',
  'scrum master': 'Scrum Master',

  // Design
  'concepteur ux': 'UX Designer',
  'concepteur ui': 'UI Designer',
  'designer ux': 'UX Designer',
  'designer ui': 'UI Designer',
  'concepteur graphique': 'Graphic Designer',
  'designer graphique': 'Graphic Designer',

  // DevOps & Infra
  'administrateur systèmes': 'System Administrator',
  'administrateur systeme': 'System Administrator',
  'administrateur réseau': 'Network Administrator',
  'ingénieur devops': 'DevOps Engineer',
  'ingenieur devops': 'DevOps Engineer',
  'ingénieur cloud': 'Cloud Engineer',
  'architecte logiciel': 'Software Architect',
  'architecte solution': 'Solutions Architect',
  'architecte solutions': 'Solutions Architect',

  // QA & Testing
  'testeur': 'QA Tester',
  'analyste qualité': 'QA Analyst',
  'ingénieur qualité': 'QA Engineer',
  'analyste qa': 'QA Analyst',
  'ingénieur qa': 'QA Engineer',

  // Security
  'analyste sécurité': 'Security Analyst',
  'ingénieur sécurité': 'Security Engineer',
  'analyste cybersécurité': 'Cybersecurity Analyst',

  // Support & Operations
  'technicien informatique': 'IT Technician',
  'technicien support': 'IT Support Technician',
  'analyste support': 'Support Analyst',
  'analyste fonctionnel': 'Business Analyst',
  'analyste d\'affaires': 'Business Analyst',

  // Marketing & Sales
  'responsable marketing': 'Marketing Manager',
  'directeur marketing': 'Marketing Director',
  'responsable commercial': 'Sales Manager',
  'directeur commercial': 'Sales Director',
  'chargé de communication': 'Communications Specialist',

  // HR & Finance
  'responsable ressources humaines': 'HR Manager',
  'directeur ressources humaines': 'HR Director',
  'analyste financier': 'Financial Analyst',
  'comptable': 'Accountant',
  'contrôleur de gestion': 'Financial Controller',

  // Healthcare
  'infirmier': 'Nurse',
  'infirmière': 'Nurse',
  'médecin': 'Physician',
  'chirurgien': 'Surgeon',
  'pharmacien': 'Pharmacist',
  'pharmacienne': 'Pharmacist',
  'dentiste': 'Dentist',
  'psychologue': 'Psychologist',
  'kinésithérapeute': 'Physiotherapist',
  'ergothérapeute': 'Occupational Therapist',
  'technicien de laboratoire': 'Lab Technician',

  // Education
  'enseignant': 'Teacher',
  'professeur': 'Professor',
  'formateur': 'Trainer',

  // Consulting
  'consultant': 'Consultant',
  'consultant en gestion': 'Management Consultant',
  'consultant informatique': 'IT Consultant',
  'consultant sap': 'SAP Consultant',
};

// ─── Location Aliases ───────────────────────────────────────────────
const LOCATION_ALIASES: Record<string, string> = {
  'mtl': 'Montreal',
  'mtrl': 'Montreal',
  'montréal': 'Montreal',
  'montreal': 'Montreal',
  'qc': 'Quebec',
  'québec': 'Quebec City',
  'quebec': 'Quebec City',
  'ville de québec': 'Quebec City',
  'ville de quebec': 'Quebec City',
  'tor': 'Toronto',
  'van': 'Vancouver',
  'ott': 'Ottawa',
  'edm': 'Edmonton',
  'cal': 'Calgary',
  'wpg': 'Winnipeg',
  // France
  'paris': 'Paris',
  'lyon': 'Lyon',
  'marseille': 'Marseille',
  'toulouse': 'Toulouse',
  'nantes': 'Nantes',
  'bordeaux': 'Bordeaux',
  'lille': 'Lille',
  'strasbourg': 'Strasbourg',
  'île-de-france': 'Paris',
  'ile-de-france': 'Paris',
  'idf': 'Paris',
};

// ─── Public API ─────────────────────────────────────────────────────

export interface NormalizedQuery {
  title: string;
  location?: string;
  titleVariants: string[];   // alternative spellings to try as fallback
}

/**
 * Normalize a salary search query:
 * - Translate French titles to English
 * - Strip accents from locations
 * - Generate title variants for fallback
 */
export function normalizeQuery(title: string, location?: string): NormalizedQuery {
  const normalizedTitle = normalizeJobTitle(title);
  const normalizedLocation = location ? normalizeLocation(location) : undefined;
  const titleVariants = generateTitleVariants(title, normalizedTitle);

  return {
    title: normalizedTitle,
    location: normalizedLocation,
    titleVariants,
  };
}

/**
 * Normalize a job title: try FR→EN mapping first, then clean up.
 */
function normalizeJobTitle(title: string): string {
  const lower = title.trim().toLowerCase();
  const stripped = stripAccents(lower);

  // 1. Exact match in FR→EN dictionary  
  if (FR_TO_EN_TITLES[lower]) return FR_TO_EN_TITLES[lower];
  if (FR_TO_EN_TITLES[stripped]) return FR_TO_EN_TITLES[stripped];

  // 2. Partial match: check if input starts with or contains a known French title
  for (const [fr, en] of Object.entries(FR_TO_EN_TITLES)) {
    if (stripped === stripAccents(fr)) return en;
  }

  // 3. Suffix-based normalization (common French suffixes → English)
  let result = title.trim();
  const suffixMap: [RegExp, string][] = [
    [/\banalyste\b/gi, 'Analyst'],
    [/\bdéveloppeur\b/gi, 'Developer'],
    [/\bdeveloppeur\b/gi, 'Developer'],
    [/\bingénieur\b/gi, 'Engineer'],
    [/\bingenieur\b/gi, 'Engineer'],
    [/\bresponsable\b/gi, 'Manager'],
    [/\bdirecteur\b/gi, 'Director'],
    [/\bconcepteur\b/gi, 'Designer'],
    [/\barchitecte\b/gi, 'Architect'],
    [/\bconsultant\b/gi, 'Consultant'],
    [/\btesteur\b/gi, 'Tester'],
    [/\btechnicien\b/gi, 'Technician'],
    [/\bscientiste\b/gi, 'Scientist'],
    [/\bgestionnaire\b/gi, 'Manager'],
    [/\bchef\b/gi, 'Manager'],
    [/\bsenior\b/gi, 'Senior'],
    [/\bjunior\b/gi, 'Junior'],
    [/\bconfirmé\b/gi, 'Mid-Level'],
    [/\bprincipal\b/gi, 'Principal'],
    [/\bstagiaire\b/gi, 'Intern'],
    [/\bde données\b/gi, 'Data'],
    [/\bdes données\b/gi, 'Data'],
    [/\bdonnées\b/gi, 'Data'],
    [/\blogiciel\b/gi, 'Software'],
    [/\binformatique\b/gi, 'IT'],
    [/\bréseau\b/gi, 'Network'],
    [/\bsystèmes?\b/gi, 'Systems'],
    [/\bsécurité\b/gi, 'Security'],
    [/\bqualité\b/gi, 'Quality'],
  ];

  let wasTransformed = false;
  for (const [pattern, replacement] of suffixMap) {
    if (pattern.test(result)) {
      result = result.replace(pattern, replacement);
      wasTransformed = true;
    }
  }

  // Remove leftover French filler words after transformation
  if (wasTransformed) {
    result = result
      .replace(/\b(de|des|du|en|le|la|les|d')\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  return result;
}

/**
 * Normalize a location string: strip accents, apply aliases.
 */
function normalizeLocation(location: string): string {
  const lower = location.trim().toLowerCase();
  const stripped = stripAccents(lower);

  // Check aliases
  if (LOCATION_ALIASES[lower]) return LOCATION_ALIASES[lower];
  if (LOCATION_ALIASES[stripped]) return LOCATION_ALIASES[stripped];

  // Just strip accents and return
  return stripAccents(location.trim());
}

/**
 * Generate alternative title forms for fallback searches.
 * If the first attempt fails, these can be tried in order.
 */
function generateTitleVariants(originalTitle: string, normalizedTitle: string): string[] {
  const variants: string[] = [];
  const seen = new Set<string>();
  const addVariant = (v: string) => {
    const key = v.toLowerCase().trim();
    if (key && !seen.has(key) && key !== normalizedTitle.toLowerCase()) {
      seen.add(key);
      variants.push(v.trim());
    }
  };

  // Original title (in case user typed correct English)
  addVariant(originalTitle);

  // Accent-stripped original
  addVariant(stripAccents(originalTitle));

  // Common word substitutions
  const substitutions: [RegExp, string][] = [
    [/\bdeveloper\b/gi, 'Engineer'],
    [/\bengineer\b/gi, 'Developer'],
    [/\bdata analyst\b/gi, 'Business Analyst'],
    [/\bdata scientist\b/gi, 'Machine Learning Engineer'],
    [/\bfrontend\b/gi, 'Front End'],
    [/\bfront end\b/gi, 'Frontend'],
    [/\bbackend\b/gi, 'Back End'],
    [/\bback end\b/gi, 'Backend'],
    [/\bfull stack\b/gi, 'Fullstack'],
    [/\bfullstack\b/gi, 'Full Stack'],
    [/\bweb developer\b/gi, 'Frontend Developer'],
    [/\bsoftware developer\b/gi, 'Software Engineer'],
    [/\bsoftware engineer\b/gi, 'Software Developer'],
  ];

  for (const [pattern, replacement] of substitutions) {
    if (pattern.test(normalizedTitle)) {
      addVariant(normalizedTitle.replace(pattern, replacement));
    }
  }

  // Drop seniority prefix for broader search
  const withoutSeniority = normalizedTitle
    .replace(/\b(senior|junior|lead|staff|principal|mid-level|intern)\b\s*/gi, '')
    .trim();
  if (withoutSeniority.length > 3) addVariant(withoutSeniority);

  return variants;
}
