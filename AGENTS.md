# HIREDGE — Architecture des Agents IA

> Ce document décrit en détail le système multi-agents d'HIREDGE :
> comment les agents fonctionnent, communiquent, prennent des décisions,
> gèrent leur mémoire, et s'orchestrent entre eux.

---

## Table des Matières

1. [Vue d'Ensemble du Système Multi-Agents](#1-vue-densemble)
2. [Agent EDGE (Agent Principal)](#2-agent-edge)
3. [Agent Scraping Orchestrator](#3-agent-scraping-orchestrator)
4. [Agent Matching Engine](#4-agent-matching-engine)
5. [Agent Content Generator](#5-agent-content-generator)
6. [Agent Interview Simulator](#6-agent-interview-simulator)
7. [Agent Squad Animator](#7-agent-squad-animator)
8. [Agent Scout Manager](#8-agent-scout-manager)
9. [Agent Analytics](#9-agent-analytics)
10. [Agent Notification Planner](#10-agent-notification-planner)
11. [Orchestration & Communication Inter-Agents](#11-orchestration)
12. [Gestion de la Mémoire](#12-mémoire)
13. [Boucles de Feedback](#13-feedback-loops)
14. [Sécurité & Garde-fous](#14-sécurité)

---

## 1. Vue d'Ensemble

### Diagramme du Système Multi-Agents

```
                    ┌─────────────────────────────────────────────────┐
                    │              UTILISATEUR (Mobile/Web)           │
                    └─────────────────────┬───────────────────────────┘
                                          │
                                          ▼
                    ┌─────────────────────────────────────────────────┐
                    │                 API GATEWAY                      │
                    │         (Auth, Rate Limit, Routing)              │
                    └─────────────────────┬───────────────────────────┘
                                          │
                    ┌─────────────────────▼───────────────────────────┐
                    │            🧠 AGENT ORCHESTRATOR                │
                    │    (Router central, gestion des intentions,     │
                    │     dispatch vers les agents spécialisés)       │
                    └──┬──────┬──────┬──────┬──────┬──────┬──────┬───┘
                       │      │      │      │      │      │      │
            ┌──────────▼┐ ┌──▼────┐ ┌▼─────┐ ┌───▼──┐ ┌─▼────┐ ┌▼─────┐ ┌──▼────┐
            │   EDGE    │ │SCRAPER│ │MATCH │ │CONTENT│ │INTERV│ │SQUAD │ │SCOUT │
            │ (Principal│ │ ORCH  │ │ENGINE│ │ GEN   │ │ SIM  │ │ANIM  │ │MANAGER│
            │ Companion)│ │       │ │      │ │       │ │      │ │      │ │       │
            └─────┬─────┘ └───┬───┘ └──┬───┘ └───┬───┘ └──┬───┘ └──┬───┘ └───┬───┘
                  │           │        │         │        │        │         │
                  └───────────┴────────┴─────────┴────────┴────────┴─────────┘
                                          │
                    ┌─────────────────────▼───────────────────────────┐
                    │              COUCHE DE DONNÉES                   │
                    │   PostgreSQL │ Redis │ Pinecone │ S3 │ ClickHouse│
                    └─────────────────────────────────────────────────┘
```

### Philosophie

Le système multi-agents d'HIREDGE suit ces principes :

1. **Agent Principal Unique** : L'utilisateur interagit uniquement avec EDGE. Les autres agents sont invisibles.
2. **Spécialisation** : Chaque agent est expert dans un domaine précis.
3. **Autonomie Contrôlée** : Les agents peuvent agir de manière proactive mais dans des limites strictes.
4. **Communication Asynchrone** : Les agents communiquent via une file de messages (Redis Streams / BullMQ).
5. **Mémoire Partagée** : Un contexte partagé permet la cohérence entre agents.
6. **Fail-Safe** : Chaque agent a un fallback. Aucun échec d'agent ne bloque l'utilisateur.

---

## 2. Agent EDGE (Agent Principal)

### Rôle
EDGE est le compagnon personnel de chaque utilisateur. C'est le seul agent avec lequel l'utilisateur interagit directement. Il orchestre les demandes vers les autres agents et présente les résultats de manière humaine et conversationnelle.

### Architecture Interne

```
┌───────────────────────────────────────────────────┐
│                   AGENT EDGE                       │
│                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │  INTENTION   │  │   CONTEXT    │  │  RESPONSE │ │
│  │  DETECTOR    │──│   BUILDER    │──│  GENERATOR│ │
│  │  (Classify)  │  │  (Assemble)  │  │  (LLM)   │ │
│  └─────────────┘  └──────────────┘  └───────────┘ │
│         │                │                │         │
│  ┌──────▼──────┐  ┌─────▼──────┐  ┌─────▼───────┐ │
│  │   TOOL      │  │  MEMORY    │  │   TONE      │ │
│  │   CALLER    │  │  MANAGER   │  │   ADAPTER   │ │
│  │  (Actions)  │  │  (Context) │  │  (Persona)  │ │
│  └─────────────┘  └────────────┘  └─────────────┘ │
└───────────────────────────────────────────────────┘
```

### Composants

#### 2.1 Intention Detector
- **Input** : Message utilisateur + contexte récent
- **Output** : Intention classifiée + entités extraites + confiance
- **Modèle** : GPT-4o-mini (rapide et léger)
- **Latence cible** : <300ms

```typescript
interface DetectedIntent {
  intent: IntentType;       // Enum des 12+ intentions possibles
  confidence: number;       // 0-1
  entities: {
    company?: string;
    jobTitle?: string;
    location?: string;
    timeframe?: string;
    applicationId?: string;
  };
  requiresToolCall: boolean;
  suggestedTool?: string;
  fallbackIntent?: IntentType;  // Si la confiance est basse
}
```

#### Arbre de Décision des Intentions

```
Message Utilisateur
    │
    ├─ Confiance >= 0.8 ──► Exécuter l'intention directement
    │
    ├─ Confiance 0.5-0.8 ──► Confirmer avec l'utilisateur
    │   "Tu veux que je cherche des offres de dev à Paris ?"
    │
    └─ Confiance < 0.5 ──► Demander une clarification
        "Je n'ai pas bien compris, tu veux... ?"
```

#### 2.2 Context Builder
Assemble le contexte minimal nécessaire pour le LLM de réponse.

```typescript
interface EdgeContext {
  // Toujours inclus
  userProfile: UserProfileSummary;
  recentMessages: Message[];         // 10 derniers messages
  currentDateTime: string;
  
  // Inclus conditionnellement
  activeApplications?: ApplicationSummary[];   // Si intent = CHECK_STATUS
  matchingJobs?: JobMatch[];                   // Si intent = SEARCH_JOBS
  interviewSchedule?: Interview[];             // Si intent = INTERVIEW_PREP
  squadActivity?: SquadEvent[];                // Si intent = SQUAD_INFO
  companyAnalysis?: CompanyAnalysis;            // Si intent concerne une entreprise
  
  // Méta
  tokensUsed: number;   // Monitoring du contexte
  contextVersion: string;
}
```

**Règle de Budget de Tokens** :
- Contexte max : 6000 tokens (input)
- Profil : ~500 tokens (résumé, pas tout le CV)
- Messages récents : ~1500 tokens (10 derniers)
- Données spécifiques : ~3000 tokens
- Marge : ~1000 tokens

#### 2.3 Response Generator
- **Input** : System prompt + context assemblé + message utilisateur
- **Output** : Réponse textuelle + actions optionnelles
- **Modèle** : GPT-4o (qualité conversationnelle)
- **Latence cible** : <2s

```typescript
interface EdgeResponse {
  message: string;              // Texte affiché à l'utilisateur
  actions?: Action[];           // Actions UI déclenchées
  suggestedFollowups?: string[]; // Boutons de réponse rapide
  emotion?: EmotionTag;         // Pour adapter l'UI
  internalNotes?: string;       // Pour le prochain tour (pas affiché)
}

type Action = 
  | { type: 'SHOW_JOBS'; jobs: JobMatch[] }
  | { type: 'SHOW_APPLICATION'; applicationId: string }
  | { type: 'START_INTERVIEW_SIM'; config: SimConfig }
  | { type: 'SHOW_DASHBOARD' }
  | { type: 'NAVIGATE'; screen: string }
  | { type: 'TRIGGER_AGENT'; agent: AgentType; payload: any };
```

#### 2.4 Tool Caller
EDGE peut appeler des "tools" (actions concrètes) :

| Tool | Description | Agent Cible |
|------|-------------|-------------|
| `search_jobs` | Chercher des offres correspondant à des critères | Matching Engine |
| `prepare_dossier` | Préparer un dossier complet de candidature | Content Generator |
| `send_application` | Envoyer une candidature | Scraping Orchestrator |
| `get_company_info` | Obtenir l'analyse d'une entreprise | Analytics |
| `start_simulation` | Lancer une simulation d'entretien | Interview Simulator |
| `get_squad_updates` | Obtenir les nouvelles de l'escouade | Squad Animator |
| `contact_scout` | Initier un échange avec un éclaireur | Scout Manager |
| `get_stats` | Obtenir les statistiques personnelles | Analytics |
| `schedule_followup` | Planifier une relance | Notification Planner |
| `get_salary_data` | Obtenir les données salariales | Analytics |

#### 2.5 Memory Manager
Gère la mémoire court, moyen et long terme d'EDGE pour un utilisateur. Voir [Section 12](#12-mémoire).

#### 2.6 Tone Adapter
Adapte le ton de la réponse en fonction du contexte émotionnel :

```typescript
interface ToneConfig {
  basePersonality: 'friendly-strategic';  // Personnalité de base
  
  adaptations: {
    // Basé sur l'humeur détectée
    mood: 'neutral' | 'happy' | 'frustrated' | 'anxious' | 'discouraged';
    
    // Basé sur le moment
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    dayOfWeek: 'weekday' | 'weekend';
    
    // Basé sur le contexte
    recentRejection: boolean;    // Plus empathique
    upcomingInterview: boolean;  // Plus encourageant
    longInactivity: boolean;     // Plus doux, pas culpabilisant
    recentSuccess: boolean;      // Célébration !
  };
}
```

**Matrice de Ton** :

| Contexte | Énergie | Empathie | Directivité | Humour |
|----------|---------|----------|-------------|--------|
| Normal | Moyenne | Moyenne | Moyenne | Léger |
| Post-rejet | Basse | Haute | Basse | Non |
| Pré-entretien | Haute | Moyenne | Haute | Léger |
| Longue inactivité | Basse | Haute | Basse | Non |
| Victoire | Très haute | Moyenne | Basse | Oui |
| Lundi matin | Haute | Basse | Haute | Léger |
| Vendredi soir | Basse | Haute | Basse | Oui |

---

## 3. Agent Scraping Orchestrator

### Rôle
Collecte les offres d'emploi depuis de multiples sources, les déduplique, les normalise, et les indexe.

### Architecture

```
┌────────────────────────────────────────────────────────┐
│               SCRAPING ORCHESTRATOR                     │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ SCHEDULER│  │ WORKERS  │  │DEDUP &   │  │INDEXER │ │
│  │ (Cron +  │──│(Scrapers │──│NORMALIZE │──│(PG +   │ │
│  │ Priority)│  │ Pool)    │  │          │  │Pinecone│ │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘ │
│                      │                                    │
│              ┌───────▼───────┐                           │
│              │  PROXY POOL   │                           │
│              │  & ROTATION   │                           │
│              └───────────────┘                           │
└────────────────────────────────────────────────────────┘
```

### Sources & Workers

| Source | Type | Fréquence | Priorité | Worker |
|--------|------|-----------|----------|--------|
| Indeed France | Scraping HTML | Toutes les 4h | Haute | Puppeteer |
| Welcome to the Jungle | API + Scraping | Toutes les 6h | Haute | Axios |
| LinkedIn Jobs | API officielle (limitée) | Toutes les 12h | Moyenne | API Client |
| Glassdoor | Scraping | Quotidien | Basse | Puppeteer |
| Sites carrières top 200 | Crawling | Quotidien | Moyenne | Crawlee |
| Pôle Emploi | API officielle | Toutes les 6h | Haute | API Client |
| APEC | Scraping | Quotidien | Moyenne | Axios |
| Hellowork | Scraping | Toutes les 6h | Moyenne | Puppeteer |
| Twitter/X #jobs | API + Keywords | Toutes les 2h | Basse | API Client |
| Telegram groupes emploi | Listener | Temps réel | Basse | Telethon |

### Pipeline de Traitement

```
1. SCRAPE
   │ → Raw HTML / JSON
   │
2. PARSE
   │ → Extraction structurée (titre, entreprise, description, salaire, etc.)
   │ → IA si nécessaire pour les formats non-standard
   │
3. NORMALIZE
   │ → Format unifié JobOffer
   │ → Normalisation des titres (Sr. Developer == Senior Developer)
   │ → Normalisation des salaires (annuel, mensuel, devise)
   │ → Normalisation des localisations
   │
4. DEDUPLICATE
   │ → Hash de similarité (titre + entreprise + localisation)
   │ → Embedding similarity pour les quasi-doublons (seuil: 0.95)
   │ → Fusion des sources (même offre sur Indeed + WTTJ)
   │
5. ENRICH
   │ → Extraction de compétences requises (NER)
   │ → Classification du niveau (junior/confirmé/senior)
   │ → Détection du type de contrat
   │ → Détection d'arnaque (patterns : trop beau, pas de nom d'entreprise, email suspect)
   │ → Score de qualité de l'offre
   │
6. INDEX
   │ → PostgreSQL (données structurées)
   │ → Pinecone (embedding pour le matching sémantique)
   │ → Redis (cache des offres récentes)
   │
7. NOTIFY
   → Pour chaque offre indexée : vérifier le matching avec les profils actifs
   → Si score > seuil → file d'attente de notification
```

### Gestion des Erreurs

```typescript
interface ScrapingPolicy {
  maxRetries: 3;
  backoffMs: [1000, 5000, 30000];  // Progressive
  proxyRotationOnFail: true;
  userAgentRotation: true;
  respectRobotsTxt: true;          // Éthique
  rateLimitPerDomain: {
    default: '10 req/min',
    indeed: '5 req/min',
    linkedin: '2 req/min'           // Très conservateur
  };
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeMs: 300000              // 5 min avant de réessayer
  };
}
```

### Détection d'Arnaques

```typescript
interface ScamDetector {
  rules: [
    { name: 'no_company_name', weight: 0.3, check: '!job.company' },
    { name: 'salary_too_high', weight: 0.4, check: 'job.salary > market_avg * 2' },
    { name: 'suspicious_email', weight: 0.5, check: 'job.contact matches gmail/yahoo/hotmail pattern' },
    { name: 'vague_description', weight: 0.2, check: 'job.description.length < 100' },
    { name: 'upfront_payment', weight: 0.9, check: 'job.description matches payment/fee pattern' },
    { name: 'too_many_emojis', weight: 0.2, check: 'emoji_count(job.description) > 10' },
    { name: 'known_scam_company', weight: 1.0, check: 'job.company in scam_blacklist' }
  ];
  threshold: 0.6;  // Score >= 0.6 → flaggé comme suspect
  action: 'flag_and_hide';  // Pas supprimé, mais caché avec avertissement
}
```

---

## 4. Agent Matching Engine

### Rôle
Calcule la compatibilité entre un profil candidat et les offres d'emploi. Utilise un mix de matching sémantique (embeddings) et de scoring analytique (règles).

### Architecture

```
┌──────────────────────────────────────────────┐
│              MATCHING ENGINE                  │
│                                                │
│  ┌────────────┐  ┌─────────────┐             │
│  │  SEMANTIC   │  │  RULE-BASED │             │
│  │  MATCHER    │  │  SCORER     │             │
│  │ (Pinecone)  │  │ (Critères)  │             │
│  └──────┬──────┘  └──────┬──────┘             │
│         │                │                     │
│         └────────┬───────┘                     │
│                  ▼                              │
│         ┌────────────────┐                     │
│         │  SCORE FUSION  │                     │
│         │  (Pondéré)     │                     │
│         └────────┬───────┘                     │
│                  ▼                              │
│         ┌────────────────┐                     │
│         │   LLM REFINE   │                     │
│         │ (Top 20 only)  │                     │
│         └────────────────┘                     │
└──────────────────────────────────────────────┘
```

### Pipeline de Matching (3 étapes)

#### Étape 1 : Pre-filter (< 50ms)
```sql
-- Filtrage SQL rapide
SELECT * FROM jobs
WHERE status = 'active'
  AND (location = ANY(user.locations) OR remote = true)
  AND contract_type = ANY(user.contract_preferences)
  AND posted_at > NOW() - INTERVAL '30 days'
  AND NOT EXISTS (SELECT 1 FROM applications WHERE job_id = jobs.id AND user_id = ?)
LIMIT 500;
```

#### Étape 2 : Semantic + Rule Scoring (< 200ms)
```typescript
async function scoreJobs(user: UserProfile, jobs: Job[]): Promise<ScoredJob[]> {
  // Embedding du profil utilisateur (caché en Redis)
  const userEmbedding = await getOrComputeEmbedding(user);
  
  // Recherche vectorielle dans Pinecone
  const semanticScores = await pinecone.query({
    vector: userEmbedding,
    topK: 100,
    filter: { jobIds: jobs.map(j => j.id) }
  });
  
  // Scoring par règles
  const ruleScores = jobs.map(job => ({
    jobId: job.id,
    skills: computeSkillOverlap(user.skills, job.requiredSkills),
    experience: computeExperienceMatch(user.experienceYears, job.requiredExperience),
    salary: computeSalaryMatch(user.salaryExpectation, job.salaryRange),
    location: computeLocationScore(user.locations, job.location, user.remotePreference),
    recency: computeRecencyBonus(job.postedAt)
  }));
  
  // Fusion pondérée
  return fuseScores(semanticScores, ruleScores, {
    semantic: 0.4,
    skills: 0.25,
    experience: 0.15,
    salary: 0.10,
    location: 0.05,
    recency: 0.05
  });
}
```

#### Étape 3 : LLM Refinement (Top 20 seulement)
Pour les 20 meilleures offres, un appel LLM raffine le score :

```typescript
// Seulement pour les top 20 offres (contrôle des coûts)
const refinedTop20 = await Promise.all(
  top20.map(job => llmRefineScore(user, job))
);
// Ajoute : selling_points, gaps, strategy
```

### Apprentissage du Matching

```typescript
interface MatchingFeedbackLoop {
  // Signaux positifs
  userApplied: boolean;           // +1 si l'utilisateur postule
  userSaved: boolean;             // +0.5 si sauvegardé
  userViewedLong: boolean;        // +0.3 si vu > 30 secondes
  
  // Signaux négatifs
  userDismissed: boolean;         // -1 si swipé/ignoré
  userReportedIrrelevant: boolean; // -2 si signalé
  
  // Résultat final
  gotInterview: boolean;          // +3 (signal fort)
  gotOffer: boolean;              // +5 (signal très fort)
  
  // Ajustement
  updateUserPreferenceVector(signals);  // Affine l'embedding utilisateur
}
```

---

## 5. Agent Content Generator

### Rôle
Génère tout le contenu textuel : CV adapté, lettres de motivation, emails, messages de relance, etc.

### Architecture

```
┌─────────────────────────────────────────────┐
│           CONTENT GENERATOR                  │
│                                               │
│  ┌───────────┐  ┌────────────┐              │
│  │  TEMPLATE  │  │  LLM       │              │
│  │  SELECTOR  │──│  PIPELINE  │              │
│  └───────────┘  └─────┬──────┘              │
│                        │                      │
│                 ┌──────▼──────┐               │
│                 │ HUMANIZER   │               │
│                 │ (Anti-detect)│              │
│                 └──────┬──────┘               │
│                        │                      │
│                 ┌──────▼──────┐               │
│                 │  QUALITY    │               │
│                 │  CHECKER    │               │
│                 └─────────────┘               │
└─────────────────────────────────────────────┘
```

### Pipeline de Génération

```
1. TEMPLATE SELECTION
   │ → Choisir le prompt approprié (voir PROMPTS.md)
   │ → Assembler le contexte nécessaire
   │
2. LLM GENERATION
   │ → Appel au LLM avec le prompt sélectionné
   │ → Claude pour les textes longs (lettres), GPT-4o pour le reste
   │
3. HUMANIZATION
   │ → Passer le texte dans le pipeline anti-détection IA
   │ → Intégrer le style d'écriture de l'utilisateur (si échantillons disponibles)
   │ → Varier la structure des phrases
   │
4. QUALITY CHECK
   │ → Vérifier : pas de hallucinations (compétences inventées)
   │ → Vérifier : longueur appropriée
   │ → Vérifier : ton approprié
   │ → Vérifier : pas de phrases génériques blacklistées
   │ → Score de qualité global
   │
5. DELIVERY
   → Si score qualité >= 0.7 : livrer au candidat
   → Si score < 0.7 : régénérer avec des instructions supplémentaires
   → Max 2 régénérations, puis livrer avec avertissement
```

### Style d'Écriture Utilisateur

```typescript
interface UserWritingStyle {
  // Appris à partir des messages de l'utilisateur dans le chat
  averageSentenceLength: number;
  vocabularyComplexity: 'simple' | 'moderate' | 'complex';
  formalityLevel: number;  // 0 (très informel) à 1 (très formel)
  favoriteConnectors: string[];  // "en effet", "par ailleurs"...
  typicalParagraphLength: number;
  usesEmoji: boolean;
  writingSamples: string[];  // Jusqu'à 5 échantillons de texte réel
  
  // Embedding du style (pour maintenir la cohérence)
  styleEmbedding: number[];
}
```

---

## 6. Agent Interview Simulator

### Rôle
Simule des entretiens d'embauche réalistes (RH, technique, stress, culture fit) en conversation textuelle ou vocale.

### Architecture

```
┌───────────────────────────────────────────────────┐
│             INTERVIEW SIMULATOR                    │
│                                                     │
│  ┌───────────┐  ┌───────────┐  ┌───────────────┐ │
│  │ CHARACTER  │  │ QUESTION  │  │  EVALUATION   │ │
│  │ ENGINE     │  │ PLANNER   │  │  ENGINE       │ │
│  │(Personnage)│  │(Séquence) │  │(Score/Report) │ │
│  └─────┬─────┘  └─────┬─────┘  └───────┬───────┘ │
│        │               │                │          │
│  ┌─────▼───────────────▼────────────────▼───────┐ │
│  │           CONVERSATION MANAGER                │ │
│  │     (État, historique, transitions)            │ │
│  └──────────────────────┬────────────────────────┘ │
│                          │                          │
│  ┌──────────────────────▼────────────────────────┐ │
│  │           VOICE PIPELINE (optionnel)          │ │
│  │   STT (Whisper) ──► LLM ──► TTS (ElevenLabs) │ │
│  └───────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────┘
```

### Machine à États

```
                    ┌─────────┐
                    │  IDLE   │
                    └────┬────┘
                         │ startSimulation()
                    ┌────▼────┐
                    │  SETUP  │ ← Choix du type, paramétrage
                    └────┬────┘
                         │
                    ┌────▼────┐
                    │ WARMUP  │ ← Accueil, mise à l'aise (1-2 échanges)
                    └────┬────┘
                         │
                    ┌────▼────┐
                    │  CORE   │ ← Questions principales (5-8 échanges)
                    │         │   Boucle : question → réponse → relance?
                    └────┬────┘
                         │
                    ┌────▼────┐
                    │WRAP_UP  │ ← Questions du candidat, conclusion
                    └────┬────┘
                         │
                    ┌────▼────┐
                    │DEBRIEF  │ ← Sortie du personnage, feedback préliminaire
                    └────┬────┘
                         │
                    ┌────▼────┐
                    │ REPORT  │ ← Génération du rapport complet
                    └────┬────┘
                         │
                    ┌────▼────┐
                    │  DONE   │
                    └─────────┘
```

### Character Engine

```typescript
interface InterviewCharacter {
  name: string;            // Généré alétoirement
  role: string;            // "Recruteur RH", "Lead Dev", "CTO"
  company: string;         // L'entreprise cible
  personality: {
    warmth: number;        // 0 (froid) à 1 (chaleureux)
    directness: number;    // 0 (indirect) à 1 (très direct)
    technicality: number;  // 0 (généraliste) à 1 (très technique)
    challenge: number;     // 0 (facile) à 1 (très challengeant)
  };
  // Le personnage est cohérent tout au long de l'entretien
  backgroundStory: string; // Contexte du personnage pour le LLM
  interviewStyle: string;  // Description du style d'entretien
}
```

### Question Planner

```typescript
interface QuestionPlan {
  type: InterviewType;
  phases: Phase[];
  totalQuestions: number;     // 8-15 selon le type
  adaptiveDifficulty: true;  // Ajuste en fonction des réponses
  
  // Banque de questions par phase
  questionBank: {
    warmup: Question[];       // 3 options, en choisir 1-2
    motivational: Question[]; // 5 options, en choisir 2-3
    technical: Question[];    // 10 options, en choisir 3-5
    situational: Question[];  // 5 options, en choisir 1-2
    closing: Question[];      // 3 options, en choisir 1
  };
  
  // Questions spécifiques à l'entreprise (si dispo via intelligence collective)
  companySpecificQuestions: Question[];
}

interface Question {
  text: string;
  category: string;
  difficulty: 1 | 2 | 3;
  expectedTopics: string[];     // Ce qu'une bonne réponse devrait couvrir
  followUpIf: {
    vague: string;               // Relance si réponse vague
    good: string;                // Approfondissement si bonne réponse
    offTopic: string;            // Recadrage si hors sujet
  };
  evaluationCriteria: string[];
}
```

### Evaluation Engine (Temps Réel)

```typescript
// Évaluation de chaque réponse en temps réel (en parallèle de la conversation)
interface RealTimeEvaluation {
  questionId: string;
  scores: {
    relevance: number;        // 0-5 : la réponse est-elle pertinente ?
    depth: number;            // 0-5 : niveau de détail
    structure: number;        // 0-5 : réponse structurée (STAR, etc.)
    specificity: number;      // 0-5 : exemples concrets vs généralités
    communication: number;    // 0-5 : clarté de la communication
  };
  fillerWords: string[];      // Mots de remplissage détectés
  starMethodUsed: boolean;
  keyPointsCovered: string[]; // Lesquels des expectedTopics ont été couverts
  missedPoints: string[];     // Points importants non mentionnés
  bestQuote: string;          // Meilleure phrase de la réponse
  internalNote: string;       // Note pour le rapport final
}
```

### Pipeline Vocal

```
Candidat parle
    │
    ▼
┌──────────┐
│ Whisper  │ → Transcription temps réel (streaming)
│  STT     │   Latence : ~500ms
└────┬─────┘
     │
     ▼
┌──────────┐
│  LLM     │ → Génération de la réponse du recruteur
│ GPT-4o   │   Latence : ~1-2s
└────┬─────┘
     │
     ▼
┌──────────┐
│ElevenLabs│ → Synthèse vocale avec la voix du personnage
│   TTS    │   Latence : ~500ms (streaming)
└────┬─────┘
     │
     ▼
Recruteur IA "parle"

Latence totale : ~2-3 secondes (acceptable pour une conversation)
```

---

## 7. Agent Squad Animator

### Rôle
Anime les escouades : envoie des messages d'encouragement, propose des défis, détecte les problèmes, et célèbre les victoires.

### Comportements Autonomes

```typescript
interface SquadAnimatorBehaviors {
  // RÉACTIF (déclenché par des événements)
  onMemberApplied: () => celebrateAction(member, 'candidature envoyée');
  onMemberGotInterview: () => celebrateBig(member, 'entretien obtenu');
  onMemberHired: () => throwParty(member, squad);
  onMemberRejected: () => supportMember(member, squad);
  onMemberInactive3Days: () => gentleNudge(member);
  onMemberInactive7Days: () => privateCheckIn(member);
  onNewMemberJoined: () => welcomeAndIntroduce(member, squad);
  onConflictDetected: () => mediate(members, issue);
  
  // PROACTIF (schedulé)
  dailyMorningBoost: CronJob('0 8 * * 1-5');     // Lun-Ven 8h
  weeklyChallenge: CronJob('0 9 * * 1');          // Lundi 9h  
  fridayRetrospective: CronJob('0 17 * * 5');     // Vendredi 17h
  monthlyStats: CronJob('0 10 1 * *');            // 1er du mois
  
  // ADAPTATIF (basé sur l'état de l'escouade)
  detectAndActOnLowMorale: () => boostSquadMorale();
  detectAndSuggestReformation: () => suggestSquadChanges();
  detectCompetitionConflict: () => alertAndResolve();
}
```

### Scoring de Santé d'Escouade

```typescript
interface SquadHealthScore {
  overall: number;  // 0-100
  
  components: {
    engagement: number;      // Fréquence des messages
    reciprocity: number;     // Est-ce que tous participent ou juste 1-2 ?
    momentum: number;        // Tendance (croissante, stable, déclinante)
    supportiveness: number;  // Réponses aux messages négatifs
    activity: number;        // Actions concrètes (candidatures, simulations)
  };
  
  alerts: SquadAlert[];
  recommendedActions: Action[];
}

interface SquadAlert {
  type: 'member_inactive' | 'morale_drop' | 'imbalance' | 'competition' | 'toxic_pattern';
  severity: 'low' | 'medium' | 'high';
  details: string;
  suggestedAction: string;
}
```

---

## 8. Agent Scout Manager

### Rôle
Gère les éclaireurs : inscription, validation, questionnaires, mise en relation anonyme avec les candidats, et système de crédits.

### Pipeline d'Anonymisation

```
Éclaireur écrit un message
    │
    ▼
┌───────────────────┐
│  PII DETECTOR     │ ← Détecte noms propres, emails, numéros
│  (NER + regex)    │
└────────┬──────────┘
    │
    ▼
┌───────────────────┐
│  CONTEXT ANALYZER │ ← Détecte les infos qui pourraient identifier
│  (LLM)            │   ("dans l'équipe de 3 personnes du projet X")
└────────┬──────────┘
    │
    ▼
┌───────────────────┐
│  REDACTOR         │ ← Remplace les éléments dangereux
│                   │   "Pierre" → "le manager"
│                   │   "projet Alpha" → "un projet interne"
└────────┬──────────┘
    │
    ▼
┌───────────────────┐
│  HUMAN REVIEW     │ ← Si risque élevé, review manuelle
│  (si flaggé)      │
└────────┬──────────┘
    │
    ▼
Message anonymisé livré au candidat
```

### Système de Crédits

```typescript
interface ScoutCreditSystem {
  // Gains
  completeQuestionnaire: +50;
  answerCandidateQuestion: +20;
  detailedAnswer: +10;     // Bonus si réponse > 100 mots
  positiveRating: +15;      // Si le candidat note positivement
  monthlyActiveBonus: +30;  // Bonus si actif tout le mois
  
  // Dépenses
  accessPremiumInsights: -30;
  priorityCandidateContact: -50;
  
  // Récompenses
  thresholds: {
    100: 'badge Bronze Scout',
    300: 'badge Silver Scout',
    500: 'badge Gold Scout → 1 mois premium gratuit',
    1000: 'badge Platinum Scout → 3 mois premium gratuit'
  };
}
```

### Trust Score Éclaireur

```typescript
interface ScoutTrustScore {
  overall: number;  // 0-100
  
  factors: {
    profileVerified: boolean;     // Email corporate vérifié
    tenure: number;               // Mois depuis inscription
    responseRate: number;         // % de questions répondues
    averageRating: number;        // Note moyenne des candidats
    consistencyScore: number;     // Cohérence des réponses dans le temps
    flagCount: number;            // Nombre de signalements
  };
  
  // Un éclaireur avec un trust score < 30 est suspendu
  status: 'active' | 'probation' | 'suspended';
}
```

---

## 9. Agent Analytics

### Rôle
Agrège, analyse et présente les données personnelles (pour le candidat) et collectives (intelligence collective).

### Données Personnelles Traquées

```typescript
interface PersonalAnalytics {
  // Pipeline
  totalApplicationsSent: number;
  applicationsByStatus: Record<ApplicationStatus, number>;
  averageResponseTime: number;  // jours
  responseRate: number;         // %
  interviewConversionRate: number;
  offerConversionRate: number;
  
  // Activité
  weeklyApplicationsChart: DataPoint[];
  dailyActiveMinutes: DataPoint[];
  simulationsCompleted: number;
  simulationAverageScore: number;
  
  // Insights IA
  bestPerformingSkills: string[];   // Compétences qui génèrent le plus de réponses
  weakAreas: string[];              // Domaines à améliorer
  optimalApplicationTime: string;   // "Mardi et Mercredi, 9h-11h"
  applicationQualityTrend: 'improving' | 'stable' | 'declining';
  
  // Prédictions
  estimatedTimeToHire: string;      // "2-4 semaines au rythme actuel"
  recommendedWeeklyTarget: number;  // Nombre de candidatures/semaine recommandé
}
```

### Intelligence Collective (Agrégée)

```typescript
interface CollectiveIntelligence {
  // Par entreprise (anonymisé)
  companyCards: Map<CompanyId, {
    totalApplicationsFromHiredge: number;
    responseRate: number;
    averageProcessDuration: number;
    interviewSuccessRate: number;
    salaryRangeObserved: Range;
    topSkillsRequested: string[];
    bestTimeToApply: string;
    scoutInsights: string[];
    candidateExperienceRating: number;
  }>;
  
  // Par domaine/métier
  industryInsights: Map<Industry, {
    averageSalary: number;
    demandTrend: 'growing' | 'stable' | 'declining';
    topEmployers: string[];
    hotSkills: string[];
    jobPostingVolumeTrend: DataPoint[];
  }>;
  
  // Patterns de succès
  successPatterns: {
    pattern: string;
    confidenceLevel: number;
    exampleCount: number;
  }[];
}
```

---

## 10. Agent Notification Planner

### Rôle
Planifie et envoie les notifications de manière intelligente pour maximiser l'engagement tout en respectant l'utilisateur.

### Politique Anti-Spam

```typescript
interface NotificationPolicy {
  // Limites strictes
  maxPushPerDay: 5;
  maxPushPerWeek: 20;
  quietHours: { start: '22:00', end: '08:00' };
  noWeekendJobAlerts: true;  // Sauf si l'utilisateur le demande
  
  // Priorités
  priority: {
    interviewReminder: 'CRITICAL',      // Toujours envoyé
    offerReceived: 'CRITICAL',           // Toujours envoyé
    highMatchJob: 'HIGH',                // Max 2/jour
    squadMessage: 'MEDIUM',              // Groupé toutes les 2h
    scoutReply: 'MEDIUM',                // Envoyé dès réception
    followupReminder: 'LOW',             // Max 1/jour
    weeklyDigest: 'LOW',                 // 1x/semaine
    motivational: 'LOWEST',              // Seulement si pas d'autre notif
  };
  
  // Apprentissage
  userEngagementModel: {
    bestNotificationTime: string[];      // Appris des interactions
    preferredChannels: ('push' | 'email' | 'in_app')[];
    clickThroughRate: number;
    optimalFrequency: number;            // Notifs/jour qui maximise l'engagement
  };
}
```

### Scheduling Intelligent

```typescript
interface NotificationScheduler {
  // Pour chaque notification, décide QUAND l'envoyer
  schedule(notification: Notification): ScheduledNotification {
    // 1. Vérifier les quiet hours
    if (isQuietHours()) return defer(notification, nextActiveHour);
    
    // 2. Vérifier les limites
    if (dailyLimitReached()) return defer(notification, tomorrow);
    
    // 3. Vérifier le contexte émotionnel
    if (userJustRejected() && notification.type !== 'support') {
      return defer(notification, hours(4));  // Pas de job alerts après un rejet
    }
    
    // 4. Optimiser le timing
    const optimalTime = userEngagementModel.bestNotificationTime;
    const nextOptimalSlot = findNextSlot(optimalTime);
    
    // 5. Grouper si possible
    if (canBatch(notification)) return addToBatch(notification);
    
    return scheduleAt(nextOptimalSlot, notification);
  }
}
```

---

## 11. Orchestration & Communication Inter-Agents

### Bus de Messages

```
┌──────────────────────────────────────────────────┐
│              REDIS STREAMS / BULLMQ               │
│                                                    │
│  Queues:                                           │
│  ├── edge:requests        (EDGE → Agents)         │
│  ├── matching:jobs        (Scraper → Matcher)     │
│  ├── content:generate     (EDGE → Content Gen)    │
│  ├── interview:sessions   (EDGE → Interview Sim)  │
│  ├── squad:events         (Any → Squad Animator)  │
│  ├── scout:messages       (Any → Scout Manager)   │
│  ├── analytics:events     (All → Analytics)       │
│  ├── notifications:send   (Any → Notification)    │
│  └── deadletter           (Échecs → Monitoring)   │
└──────────────────────────────────────────────────┘
```

### Format de Message Inter-Agent

```typescript
interface AgentMessage {
  id: string;              // UUID
  timestamp: string;       // ISO 8601
  source: AgentType;       // Agent émetteur
  target: AgentType;       // Agent destinataire
  type: string;            // Type de requête
  priority: 'low' | 'normal' | 'high' | 'critical';
  userId: string;          // Utilisateur concerné
  payload: any;            // Données spécifiques
  correlationId?: string;  // Pour lier requête et réponse
  ttl?: number;            // Time-to-live en secondes
  retryCount?: number;     // Nombre de tentatives
}
```

### Exemple de Flux Complet : "Prépare un dossier de candidature"

```
Utilisateur : "Prépare-moi un dossier pour cette offre chez Spotify"
    │
    ▼
[1] EDGE → Intention Detector
    intent: PREPARE_APPLICATION, company: "Spotify", confidence: 0.95
    │
    ▼
[2] EDGE → Context Builder
    Charge : profil, offre Spotify, intelligence collective Spotify
    │
    ▼
[3] EDGE → Respond "Je prépare ton dossier complet ! Donne-moi 30 secondes 🎯"
    │
    ▼ (En parallèle)
[4a] EDGE → Matching Engine : scoreJob(user, spotifyJob)
[4b] EDGE → Analytics : getCompanyAnalysis("Spotify")
    │
    ▼ (Résultats agrégés)
[5] EDGE → Content Generator : generateDossier({
      matching: matchResult,
      companyAnalysis: companyData,
      user: userProfile,
      job: spotifyJob
    })
    │
    ▼ (Content Generator fait 3 appels parallèles)
[6a] Content → LLM : adaptCV(user, job)
[6b] Content → LLM : generateCoverLetter(user, job, company)
[6c] Content → LLM : generateCompanyBrief(company)
    │
    ▼
[7] Content → Humanizer : humanize(coverLetter)
    │
    ▼
[8] Content → Quality Check : validate(dossier)
    │
    ▼
[9] Content → EDGE : dossierReady(dossier)
    │
    ▼
[10] EDGE → Respond "Ton dossier est prêt ! Voici ce que j'ai préparé :"
     + Actions: SHOW_DOSSIER(dossier)
     + Suggested: ["Voir le CV adapté", "Voir la lettre", "Envoyer la candidature"]
```

**Durée totale estimée : 15-30 secondes**

### Gestion des Erreurs Inter-Agents

```typescript
interface AgentErrorPolicy {
  // Retry automatique
  retryPolicy: {
    maxRetries: 3,
    backoff: 'exponential',
    baseDelayMs: 1000
  };
  
  // Fallback par agent
  fallbacks: {
    contentGenerator: {
      onLLMFailure: 'switchToFallbackModel',  // Claude → GPT-4o ou inversement
      onTimeout: 'respondWithPartialResult',
      onTotalFailure: 'notifyUserPolitely'     // "J'ai un petit souci, réessaie dans 1 min"
    },
    matchingEngine: {
      onPineconeFailure: 'fallbackToSQLSearch',
      onTimeout: 'returnCachedResults'
    },
    scrapingOrchestrator: {
      onSourceBlocked: 'skipAndContinue',
      onAllSourcesDown: 'useCachedJobs'
    }
  };
  
  // Dead letter queue
  deadLetter: {
    storeFailedMessages: true,
    alertOnThreshold: 10,  // Alerte si >10 messages en DLQ
    retryDeadLettersEvery: '1h'
  };
}
```

---

## 12. Gestion de la Mémoire

### 3 Niveaux de Mémoire

```
┌────────────────────────────────────────────────────┐
│                  MÉMOIRE EDGE                       │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │  COURT TERME (Working Memory)                  │ │
│  │  • Conversation en cours                        │ │
│  │  • Contexte de la session actuelle              │ │
│  │  • Stocké en : RAM + Redis                      │ │
│  │  • Durée : Session (quelques heures)            │ │
│  │  • Taille : ~4000 tokens                        │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │  MOYEN TERME (Episodic Memory)                 │ │
│  │  • Résumés des conversations passées            │ │
│  │  • Événements marquants (rejet, entretien, etc.)│ │
│  │  • Préférences apprises                         │ │
│  │  • Stocké en : PostgreSQL + embeddings          │ │
│  │  • Durée : 3-6 mois                            │ │
│  │  • Taille : ~50 épisodes résumés               │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │  LONG TERME (Semantic Memory)                  │ │
│  │  • Profil complet (CV, compétences, objectifs)  │ │
│  │  • Historique de candidatures                   │ │
│  │  • Patterns de comportement                     │ │
│  │  • Style d'écriture                             │ │
│  │  • Stocké en : PostgreSQL                       │ │
│  │  • Durée : Permanente                           │ │
│  └────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

### Gestion du Contexte LLM

```typescript
class ContextWindowManager {
  private maxTokens = 8000;  // Budget total pour le contexte
  
  buildContext(userId: string, intent: IntentType): Context {
    let tokens = 0;
    const context: ContextParts = {};
    
    // 1. System prompt (fixe) : ~800 tokens
    context.system = EDGE_SYSTEM_PROMPT;
    tokens += 800;
    
    // 2. Profil résumé (toujours inclus) : ~500 tokens
    context.profile = getUserProfileSummary(userId);
    tokens += 500;
    
    // 3. Mémoire court terme (conversation actuelle) : ~1500 tokens
    context.recentMessages = getRecentMessages(userId, { maxTokens: 1500 });
    tokens += context.recentMessages.tokenCount;
    
    // 4. Mémoire moyen terme (pertinente au contexte) : ~1000 tokens
    context.relevantEpisodes = retrieveRelevantEpisodes(userId, intent, {
      maxTokens: 1000
    });
    tokens += context.relevantEpisodes.tokenCount;
    
    // 5. Données spécifiques à l'intention : budget restant
    const remainingBudget = this.maxTokens - tokens - 500; // 500 pour la réponse
    context.intentData = getIntentSpecificData(userId, intent, {
      maxTokens: remainingBudget
    });
    
    return context;
  }
}
```

### Création d'Épisodes (Résumés)

```typescript
// À la fin de chaque conversation, créer un épisode résumé
async function createEpisode(conversation: Message[]): Promise<Episode> {
  const summary = await llm.summarize(conversation, {
    prompt: `Résume cette conversation en 2-3 phrases.
             Inclus : le sujet principal, les décisions prises, l'état émotionnel.
             Format : { summary, key_decisions, emotional_state, action_items }`,
    model: 'gpt-4o-mini',
    maxTokens: 200
  });
  
  const embedding = await embed(summary.summary);
  
  return {
    id: uuid(),
    userId: conversation[0].userId,
    date: new Date(),
    summary: summary.summary,
    keyDecisions: summary.key_decisions,
    emotionalState: summary.emotional_state,
    actionItems: summary.action_items,
    embedding: embedding,
    messageCount: conversation.length
  };
}
```

### Retrieval d'Épisodes Pertinents

```typescript
// Quand EDGE a besoin de contexte historique
async function retrieveRelevantEpisodes(
  userId: string,
  currentContext: string,
  maxResults: number = 5
): Promise<Episode[]> {
  // 1. Embedding du contexte actuel
  const contextEmbedding = await embed(currentContext);
  
  // 2. Recherche vectorielle dans les épisodes
  const similar = await pinecone.query({
    vector: contextEmbedding,
    filter: { userId },
    topK: maxResults
  });
  
  // 3. Ajouter les épisodes récents (même si pas similaires)
  const recent = await db.episodes
    .where({ userId })
    .orderBy('date', 'desc')
    .limit(2);
  
  // 4. Fusionner et dédupliquer
  return mergeAndDeduplicate(similar, recent);
}
```

---

## 13. Boucles de Feedback

### Feedback Explicite

```typescript
interface ExplicitFeedback {
  // L'utilisateur peut noter chaque sortie de l'IA
  rateOutput: {
    target: 'cover_letter' | 'cv_adaptation' | 'interview_sim' | 'job_recommendation';
    rating: 1 | 2 | 3 | 4 | 5;
    comment?: string;
  };
  
  // L'utilisateur peut corriger une sortie
  correctOutput: {
    originalOutput: string;
    userCorrection: string;
    // L'IA apprend les préférences
  };
}
```

### Feedback Implicite

```typescript
interface ImplicitFeedback {
  // Signaux de comportement
  jobRecommendation: {
    viewed: boolean;          // A cliqué pour voir l'offre
    viewDuration: number;     // Temps passé sur l'offre
    applied: boolean;         // A postulé
    dismissed: boolean;       // A ignoré/rejeté
    saved: boolean;           // A sauvegardé
  };
  
  coverLetter: {
    sentAsIs: boolean;        // Envoyé sans modification = bonne qualité
    modifiedBeforeSend: boolean; // Modifié = peut être amélioré
    discarded: boolean;       // Jeté = mauvaise qualité
    edits: Diff[];            // Les modifications faites (pour apprendre)
  };
  
  interview: {
    gotInterview: boolean;    // La candidature a mené à un entretien
    gotOffer: boolean;        // A reçu une offre
    // Meilleur signal de qualité : est-ce que ça a marché ?
  };
}
```

### Boucle d'Amélioration Continue

```
                 ┌──────────────┐
                 │  Génération  │
                 │  (Output IA) │
                 └──────┬───────┘
                        │
                        ▼
                 ┌──────────────┐
                 │  Utilisation │
                 │  (Candidat)  │
                 └──────┬───────┘
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
       ┌────────────┐     ┌──────────────┐
       │  Feedback   │     │   Résultat   │
       │  Explicite  │     │   Réel       │
       │  (note 1-5) │     │   (embauché?)│
       └──────┬──────┘     └──────┬───────┘
              │                   │
              └─────────┬─────────┘
                        ▼
                 ┌──────────────┐
                 │  Analyse     │
                 │  des Patterns│
                 └──────┬───────┘
                        │
                 ┌──────▼──────┐
                 │  Ajustement │
                 │  • Prompts  │
                 │  • Scoring  │
                 │  • Matching │
                 └──────┬──────┘
                        │
                        ▼
                 ┌──────────────┐
                 │  Génération  │ (améliorée)
                 │  v(n+1)     │
                 └─────────────┘
```

---

## 14. Sécurité & Garde-fous

### Garde-fous des Agents

```typescript
interface AgentGuardrails {
  // L'IA ne peut PAS faire sans confirmation utilisateur :
  requiresConfirmation: [
    'SEND_APPLICATION',       // Envoyer une candidature
    'SEND_MESSAGE_TO_RECRUITER', // Envoyer un message
    'SHARE_DATA_WITH_SCOUT',  // Partager des infos avec un éclaireur
    'CHANGE_PROFILE',         // Modifier le profil
    'DELETE_DATA',            // Supprimer des données
    'SUBSCRIBE_PAYMENT',      // Payer
  ];
  
  // L'IA ne peut JAMAIS faire :
  absolutelyForbidden: [
    'DISCLOSE_OTHER_USER_DATA',     // Révéler des données d'autres utilisateurs
    'IDENTIFY_SCOUT',               // Révéler l'identité d'un éclaireur
    'FABRICATE_EXPERIENCE',         // Inventer des expériences/compétences
    'GUARANTEE_OUTCOME',            // Promettre un résultat
    'ACCESS_WITHOUT_AUTH',          // Agir sans authentification
    'SHARE_WITH_EMPLOYER_WITHOUT_CONSENT', // Partager avec un recruteur sans accord
  ];
  
  // Limites d'autonomie
  autonomyLimits: {
    maxAutoSearchesPerDay: 10,       // Recherches proactives max
    maxNotificationsPerDay: 5,       // Notifications push max
    maxLLMCallsPerUserPerDay: 100,   // Contrôle des coûts
    maxScrapingPerHour: 50,          // Requêtes scraping par utilisateur
  };
}
```

### Content Safety

```typescript
interface ContentSafety {
  // Avant d'envoyer une réponse à l'utilisateur
  outputFilter: {
    checkForPII: true;              // Pas de données perso d'autres users
    checkForBias: true;             // Pas de biais discriminatoires
    checkForHallucination: true;    // Pas d'inventions
    checkForToxicity: true;         // Pas de contenu toxique
    checkForLegalRisk: true;        // Pas de conseil juridique
    checkForMedicalAdvice: true;    // Pas de conseil médical
  };
  
  // Si un check fail
  onCheckFail: {
    PII: 'redact_and_send',
    bias: 'regenerate',
    hallucination: 'flag_and_warn_user',
    toxicity: 'block_and_log',
    legalRisk: 'add_disclaimer',
    medicalAdvice: 'redirect_to_professional'
  };
}
```

### Détection d'Abus

```typescript
interface AbuseDetection {
  // Détection de prompt injection
  promptInjection: {
    detector: 'heuristic + LLM classifier',
    onDetection: 'block_and_log',
    patterns: [
      'ignore previous instructions',
      'you are now',
      'system:',
      'jailbreak patterns...'
    ]
  };
  
  // Détection d'utilisation abusive
  rateAbuse: {
    maxRequestsPerMinute: 30,
    maxRequestsPerHour: 200,
    onExceed: 'throttle_then_block'
  };
  
  // Détection de contenu frauduleux
  scamDetection: {
    fakeScouts: 'ML classifier on response patterns',
    fakeReviews: 'anomaly detection on review patterns',
    fakeProfiles: 'cross-reference with known patterns'
  };
}
```

### Protection RGPD

```typescript
interface GDPRCompliance {
  // Minimisation des données
  dataMinimization: {
    collectOnlyNecessary: true,
    anonymizeAfterUse: true,  // Données collectives = anonymisées
    deleteInactiveAfter: '12 months',
  };
  
  // Droits utilisateur
  userRights: {
    exportData: () => generateFullExport(userId);        // Portabilité
    deleteAccount: () => hardDeleteAllData(userId);      // Suppression
    modifyConsent: () => updateConsentPreferences(userId); // Consentement
    accessLog: () => getDataAccessLog(userId);           // Transparence
  };
  
  // Anonymisation pour l'intelligence collective
  collectiveAnonymization: {
    minimumGroupSize: 5,  // Jamais de stat sur < 5 personnes
    noIndividualIdentification: true,
    noReIdentificationRisk: true,
    kAnonymity: 5,   // Au moins 5 profils identiques dans chaque groupe
  };
}
```

---

## Annexe : Glossaire des Agents

| Agent | Symbole | Responsabilité | Modèle IA Principal |
|-------|---------|----------------|---------------------|
| EDGE | 🧠 | Compagnon, orchestrateur | GPT-4o |
| Scraping Orchestrator | 🕷️ | Collecte des offres | GPT-4o-mini (parsing) |
| Matching Engine | 🎯 | Score de compatibilité | text-embedding-3-large + GPT-4o |
| Content Generator | ✍️ | CV, lettres, emails | Claude 3.5 Sonnet |
| Interview Simulator | 🎭 | Simulations d'entretien | GPT-4o + Whisper + ElevenLabs |
| Squad Animator | 🤝 | Animation des escouades | GPT-4o-mini |
| Scout Manager | 🔭 | Gestion des éclaireurs | GPT-4o (anonymisation) |
| Analytics | 📊 | Données et insights | GPT-4o-mini |
| Notification Planner | 🔔 | Notifications intelligentes | GPT-4o-mini |

---

*Document agents IA — Version 1.0*
