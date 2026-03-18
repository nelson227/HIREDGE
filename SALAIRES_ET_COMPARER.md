# HIREDGE — Onglets « Salaires » et « Comparer »

> Description exhaustive des fonctionnalités, routes, logique métier, use cases, et rendu final
> des onglets **Salaires** (`/salary`) et **Comparer** (`/compare`) de l'application web.

---

## Table des Matières

1. [Onglet Salaires](#1-onglet-salaires)
   - [1.1 Vue d'ensemble](#11-vue-densemble)
   - [1.2 Route & Navigation](#12-route--navigation)
   - [1.3 Sous-onglet « Explorer les salaires »](#13-sous-onglet--explorer-les-salaires-)
   - [1.4 Sous-onglet « Simuler une négo »](#14-sous-onglet--simuler-une-négo-)
   - [1.5 Sous-onglet « Contribuer »](#15-sous-onglet--contribuer-)
   - [1.6 API Backend — Routes Salary](#16-api-backend--routes-salary)
   - [1.7 Service Salary (Backend)](#17-service-salary-backend)
   - [1.8 Modèle de données Prisma](#18-modèle-de-données-prisma)
   - [1.9 Use Cases complets](#19-use-cases-complets)
2. [Onglet Comparer](#2-onglet-comparer)
   - [2.1 Vue d'ensemble](#21-vue-densemble)
   - [2.2 Route & Navigation](#22-route--navigation)
   - [2.3 Logique de sélection des offres (le problème de l'ID)](#23-logique-de-sélection-des-offres-le-problème-de-lid)
   - [2.4 Flux utilisateur complet](#24-flux-utilisateur-complet)
   - [2.5 API Backend — Route Compare](#25-api-backend--route-compare)
   - [2.6 Rendu des résultats](#26-rendu-des-résultats)
   - [2.7 Use Cases complets](#27-use-cases-complets)
   - [2.8 Logique à implémenter / Améliorations](#28-logique-à-implémenter--améliorations)
3. [Architecture technique partagée](#3-architecture-technique-partagée)
4. [Traductions i18n](#4-traductions-i18n)

---

## 1. Onglet Salaires

### 1.1 Vue d'ensemble

L'onglet **Salaires** (`/salary`) est une page à 3 sous-onglets qui permet aux utilisateurs de :
- **Explorer** les données salariales du marché (par métier, localisation, niveau)
- **Simuler** une négociation salariale conversationnelle avec une IA jouant le rôle d'un recruteur
- **Contribuer** anonymement leurs propres données salariales pour enrichir l'intelligence collective

### 1.2 Route & Navigation

| Propriété | Valeur |
|-----------|--------|
| **Fichier** | `apps/web/app/(dashboard)/salary/page.tsx` |
| **URL** | `/salary` (sous le layout dashboard) |
| **Icône nav** | `DollarSign` (Lucide) |
| **Clé i18n** | `navSalary` → "Salaires" (FR), "Salaries" (EN) |
| **Position sidebar** | 9e item, entre Analytics et Comparer |
| **Authentification** | Requise (layout dashboard + hook `preHandler` côté API) |

**Configuration dans le layout** (`apps/web/app/(dashboard)/layout.tsx`) :
```typescript
{ labelKey: "navSalary", href: "/salary", icon: DollarSign }
```

### 1.3 Sous-onglet « Explorer les salaires »

#### Rendu visuel

La page s'affiche en grille 2 colonnes (desktop) :
- **Colonne gauche** : Formulaire de recherche dans une Card
- **Colonne droite** : Résultats dans une Card (visible après recherche)

#### Formulaire de recherche

| Champ | Type | Requis | Placeholder | Description |
|-------|------|--------|-------------|-------------|
| Famille de métier | `Input` texte | ✅ Oui | "Ex: Développement, Product, Data" | Catégorie de métier (ex: Développement, Marketing, Data, Product) |
| Localisation | `Input` texte | Non | "Ex: Montréal, Paris, Remote" | Ville ou région. Si vide, recherche globale |
| Niveau d'expérience | `<select>` | Non | "Tous niveaux" | Options : Junior (0-2 ans), Confirmé (3-5 ans), Senior (6-10 ans), Lead/Staff (10+ ans) |

#### Affichage des résultats

Quand des données existent, un bloc de **3 cartes côte à côte** s'affiche :

```
┌──────────────┐  ┌──────────────────┐  ┌──────────────┐
│  45 000 $    │  │   60 000 $       │  │  75 000 $    │
│  Minimum     │  │   Médiane        │  │  Maximum     │
│  (fond gris) │  │ (fond primary)   │  │  (fond gris) │
└──────────────┘  └──────────────────┘  └──────────────┘
              Basé sur 42 données
```

- Les montants sont formatés avec `toLocaleString()` + suffixe `$`
- La médiane est mise en valeur avec `bg-primary/10` et `border-primary/20`
- Le nombre de données (sample size) est affiché en dessous
- Si aucune donnée : message "Aucune donnée trouvée pour ces critères"

#### Logique de données

1. **Source primaire** : Table `SalaryData` (intelligence collective — contributions anonymes)
2. **Fallback** : Si `SalaryData` est vide pour ces critères → estimation à partir des offres d'emploi actives (table `Job` avec `salaryMin`/`salaryMax` non-null)
3. **Calcul** : Moyenne des `salaryMin`, `salaryMax`, et médiane = `(avgMin + avgMax) / 2`
4. Les résultats retournent aussi : `currency`, `sampleSize`, `sources` (collective, job_postings, glassdoor, etc.)

### 1.4 Sous-onglet « Simuler une négo »

#### Rendu visuel

Grille 2 colonnes (desktop) :
- **Colonne gauche** : Formulaire de simulation
- **Colonne droite** : Réponse de l'IA (stratégie de négociation)

#### Formulaire

| Champ | Type | Requis | Placeholder | Description |
|-------|------|--------|-------------|-------------|
| Poste | `Input` texte | ✅ Oui | "Ex: Senior Developer" | Titre du poste visé |
| Entreprise | `Input` texte | ✅ Oui | "Ex: Shopify" | Nom de l'entreprise |
| Offre actuelle ($) | `Input` number | ✅ Oui | "85000" | Le montant proposé par le recruteur |
| Objectif ($) | `Input` number | Non | "95000" | Le salaire souhaité. Si vide, calculé à `currentOffer × 1.15` |
| Contexte (optionnel) | `Input` texte | Non | "Ex: 5 ans d'expérience, offre d'un concurrent..." | Informations supplémentaires pour personnaliser la simulation |

#### Logique IA

1. **Modèle utilisé** : Groq (`llama-3.3-70b-versatile`) via l'API OpenAI-compatible
2. **Rate limit** : 5 requêtes/minute par utilisateur
3. **System prompt** : L'IA joue le rôle d'un recruteur avec un budget max secret = `targetSalary × 1.05`
4. Le recruteur IA :
   - Résiste aux premières demandes d'augmentation
   - Accepte des compromis si les arguments sont bons
   - Propose des alternatives (télétravail, formation, bonus)
   - Donne du feedback constructif si demandé
5. **Fallback sans LLM** : Si la clé API Groq est invalide, retourne un conseil textuel statique + 3 tips prédéfinis
6. **Tips dynamiques** : Générés côté backend selon le message de l'utilisateur :
   - Si l'utilisateur parle de "besoin/loyer/facture" → conseil d'éviter les arguments personnels
   - Si pas de mention de "réalisation/projet/résultat" → suggère d'ajouter des chiffres concrets
   - Si "minimum/au moins" → suggère un range plutôt qu'un montant fixe

#### Rendu de la réponse

- Card avec titre "Stratégie de négociation"
- Contenu en `whitespace-pre-wrap` (conserve les retours à la ligne)
- Affiche `result.strategy` ou `result.message` ou le JSON brut en dernier recours

### 1.5 Sous-onglet « Contribuer »

#### Rendu visuel

Card centrée (`max-w-lg mx-auto`), formulaire unique.

#### Formulaire

| Champ | Type | Requis | Placeholder | Description |
|-------|------|--------|-------------|-------------|
| Titre de poste | `Input` texte | ✅ Oui | "Senior Developer" | Le titre exact du poste occupé |
| Famille de métier | `Input` texte | ✅ Oui | "Développement" | Catégorie (Développement, Marketing, etc.) |
| Ville | `Input` texte | Non | "Montréal" | Ville de travail |
| Pays | `Input` texte | Non | "CA" (défaut) | Code pays ISO |
| Niveau | `<select>` | Non | "Sélectionner" | Junior / Confirmé / Senior / Lead. Défaut côté client : "mid" |
| Salaire annuel ($) | `Input` number | ✅ Oui | "90000" | Le salaire annuel brut |

#### Flux après soumission

1. Le frontend envoie `POST /salary/contribute` avec les données du formulaire
2. L'API crée un enregistrement `SalaryData` anonyme (aucun `userId` stocké)
3. Le `salaryMin` et `salaryMax` sont mis à la même valeur (le salaire saisi)
4. La `salaryMedian` est calculée comme `(min + max) / 2`
5. Le champ `source` est mis à `"collective"`
6. L'UI bascule vers un écran de confirmation :
   - Icône verte `DollarSign` dans un cercle
   - "Merci pour votre contribution !"
   - "Vos données aident toute la communauté HIREDGE."
7. L'état `contributed` empêche de soumettre à nouveau (reset au changement de sous-onglet)

#### Note de confidentialité

Un texte sous le bouton indique : "Toutes les données sont anonymisées et agrégées."

### 1.6 API Backend — Routes Salary

**Fichier** : `apps/api/src/routes/salary.ts`

**Préfixe** : `/salary` (enregistré sur le serveur Fastify)

**Hook d'authentification** : `fastify.authenticate` (JWT Bearer token)

| Endpoint | Méthode | Description | Params/Body | Réponse |
|----------|---------|-------------|-------------|---------|
| `/salary/data` | `GET` | Données salariales | `?title=...&location=...&experienceLevel=...` | `{ success, data: { salaryMin, salaryMax, salaryMedian, currency, sampleSize, sources, details[] } }` |
| `/salary/negotiate` | `POST` | Simulation négo IA | `{ jobTitle*, company*, currentOffer*, targetSalary, context }` | `{ success, data: { reply, tips[] } }` |
| `/salary/contribute` | `POST` | Contribution anonyme | `{ jobTitle*, location*, salary*, company? }` | `{ success, data: SalaryData }` |

**Note** : Le route handler GET `/data` utilise le query param `title` tandis que le frontend envoie `jobFamily` — le service backend accepte les deux via des champs séparés dans sa méthode `getSalaryData`.

### 1.7 Service Salary (Backend)

**Fichier** : `apps/api/src/services/salary.service.ts`

**Classe** : `SalaryService` (export singleton `salaryService`)

**Dépendances** :
- `prisma` (accès BDD)
- `OpenAI` client configuré vers Groq (`https://api.groq.com/openai/v1`)
- Modèle LLM : `llama-3.3-70b-versatile`
- Température : `0.7`, max tokens : `400`

**Méthodes** :

| Méthode | Description |
|---------|-------------|
| `getSalaryData(params)` | Cherche dans `SalaryData`, fallback vers `estimateFromJobs()` |
| `estimateFromJobs(params)` | Estime à partir des jobs actifs ayant un salaire |
| `simulateNegotiation(userId, params)` | Charge le profil candidat, appelle le LLM en mode roleplay |
| `generateNegotiationTips(message)` | Analyse le message et génère des tips contextuels |
| `contributeSalary(data)` | Crée un `SalaryData` record anonyme |

### 1.8 Modèle de données Prisma

**Table `salary_data`** :

```prisma
model SalaryData {
  id              String   @id @default(uuid())
  jobFamily       String                          // Ex: "Développement"
  title           String                          // Ex: "Senior Developer"
  location        String?                         // Ex: "Montréal"
  country         String   @default("CA")         // Code ISO
  experienceLevel String   @default("mid")        // junior | mid | senior | lead
  salaryMin       Int                             // Salaire minimum
  salaryMax       Int                             // Salaire maximum
  salaryMedian    Int?                            // Calculé: (min + max) / 2
  currency        String   @default("CAD")        // Devise
  source          String   @default("collective") // collective | glassdoor | levels.fyi
  sampleSize      Int      @default(1)            // Nombre de données agrégées
  updatedAt       DateTime @updatedAt
  createdAt       DateTime @default(now())

  @@index([jobFamily, location])
  @@index([title])
  @@map("salary_data")
}
```

**Champs salary sur le modèle `Job`** :

```prisma
model Job {
  salaryMin       Int?
  salaryMax       Int?
  salaryCurrency  String @default("EUR")
  // ... autres champs
}
```

**Champs salary sur le modèle `CandidateProfile`** :

```prisma
model CandidateProfile {
  salaryMin       Int?
  salaryMax       Int?
  salaryCurrency  String @default("EUR")
  // ... autres champs
}
```

### 1.9 Use Cases complets

#### UC-S1 : Explorer les salaires d'un métier
1. L'utilisateur va sur `/salary` → sous-onglet "Explorer les salaires" (par défaut)
2. Il saisit "Développement" dans "Famille de métier"
3. Il saisit "Montréal" dans "Localisation"
4. Il sélectionne "Senior (6-10 ans)" dans le niveau d'expérience
5. Il clique "Rechercher"
6. Le frontend appelle `GET /salary/data?jobFamily=Développement&location=Montréal&experienceLevel=senior`
7. Le backend cherche dans `SalaryData` — s'il y a des contributions, il agrège min/max/médiane
8. Si aucune contribution → fallback : estime à partir des offres `Job` actives ayant un salaire
9. Résultat affiché : Min `75 000 $` / Médiane `90 000 $` / Max `110 000 $` — "Basé sur 15 données"
10. Si aucune donnée du tout : message "Aucune donnée trouvée pour ces critères"

#### UC-S2 : Simuler une négociation salariale
1. L'utilisateur clique sur l'onglet "Simuler une négo"
2. Il saisit : Poste = "Fullstack Developer", Entreprise = "Shopify", Offre actuelle = 85000, Objectif = 95000
3. Optionnel : contexte = "5 ans d'expérience, offre concurrente de Google"
4. Il clique "Lancer la simulation"
5. Le frontend appelle `POST /salary/negotiate`
6. Le backend charge le profil candidat (compétences, titre actuel)
7. Il construit un system prompt avec le rôle de recruteur, le budget secret = `95000 × 1.05 = 99750 $`
8. Le LLM Groq génère une réponse conversationnelle du "recruteur"
9. Des tips dynamiques sont générés en analysant le message de l'utilisateur
10. La réponse s'affiche dans la colonne droite sous "Stratégie de négociation"

#### UC-S3 : Contribuer anonymement
1. L'utilisateur clique sur l'onglet "Contribuer"
2. Il saisit : Titre = "Ingénieur DevOps", Famille = "Infrastructure", Ville = "Toronto", Pays = "CA", Niveau = "Senior", Salaire = 115000
3. Il clique "Contribuer anonymement"
4. Le backend crée un `SalaryData` sans aucun lien vers le `userId`
5. L'écran affiche "Merci pour votre contribution !"
6. Ces données enrichissent les futures recherches d'autres utilisateurs

#### UC-S4 : Aucune donnée salariale disponible
1. L'utilisateur cherche un métier rare ("Ingénieur quantique") dans une petite ville ("Chicoutimi")
2. Le backend ne trouve rien dans `SalaryData`
3. Il tente le fallback : cherche dans les `Job` actives — rien non plus
4. Résultat retourné : `{ salaryMin: null, salaryMax: null, sampleSize: 0, sources: ['no_data'] }`
5. L'UI n'affiche pas le bloc résultats (le `result.aggregated` est undefined/null)
6. Un message "Aucune donnée trouvée pour ces critères" s'affiche

#### UC-S5 : Fallback LLM désactivé
1. Le service n'a pas de clé API Groq valide (`isLLMEnabled = false`)
2. L'utilisateur tente une simulation de négociation
3. Au lieu d'un appel LLM, le backend retourne un message statique avec 3 tips génériques
4. L'utilisateur reçoit quand même des conseils utiles

#### UC-S6 : Rate limiting sur la négociation
1. L'utilisateur spamme le bouton "Lancer la simulation" (> 5 fois en 1 minute)
2. Fastify rate limit bloque la 6e requête
3. Le frontend reçoit une erreur 429, le bouton est déjà désactivé pendant le loading

---

## 2. Onglet Comparer

### 2.1 Vue d'ensemble

L'onglet **Comparer** (`/compare`) permet aux utilisateurs de comparer **2 à 4 offres d'emploi** côte à côte. L'utilisateur sélectionne des offres via un moteur de recherche intégré, puis lance une comparaison qui affiche les détails, avantages, inconvénients, score de match et une recommandation IA.

### 2.2 Route & Navigation

| Propriété | Valeur |
|-----------|--------|
| **Fichier** | `apps/web/app/(dashboard)/compare/page.tsx` |
| **URL** | `/compare` (sous le layout dashboard) |
| **Icône nav** | `GitCompareArrows` (Lucide) |
| **Clé i18n** | `navCompare` → "Comparer" (FR), "Compare" (EN) |
| **Position sidebar** | 10e item (dernier), après Salaires |
| **Authentification** | Requise |

**Configuration dans le layout** :
```typescript
{ labelKey: "navCompare", href: "/compare", icon: GitCompareArrows }
```

### 2.3 Logique de sélection des offres (le problème de l'ID)

> **Question clé** : "Je vois que ça dit d'ajouter l'ID de l'offre, or dans Offres d'emploi, je ne vois pas d'ID affiché sur les offres."

#### Explication du fonctionnement actuel

Chaque offre d'emploi dans HIREDGE a un **UUID unique** stocké dans la base de données (`Job.id` = UUID, ex: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`). Cet ID est **invisible pour l'utilisateur** dans l'interface normale des offres (`/jobs`), car il serait inutilement technique. Cependant, **l'ID circule en arrière-plan** dans toutes les interactions : quand on clique sur une offre, quand on postule, etc.

#### Comment l'utilisateur sélectionne des offres à comparer

L'onglet Comparer propose **deux mécanismes** pour ajouter des offres :

##### Mécanisme 1 : Recherche intégrée (PRINCIPAL — prévu pour l'utilisateur)

1. L'utilisateur tape un mot-clé dans le champ de recherche (ex: "Developer", "Shopify", "Marketing Paris")
2. En appuyant Entrée ou en cliquant le bouton 🔍, le frontend appelle `GET /jobs/search?q=...&limit=5`
3. Les résultats s'affichent dans une liste déroulante sous le champ de recherche :
   ```
   ┌──────────────────────────────────────────────────┐
   │  🔍 [ Developer chez Shopify          ] [🔍]    │
   │                                                    │
   │  ┌────────────────────────────────────────────┐  │
   │  │ Senior Frontend Developer           [✓]    │  │
   │  │ Shopify · Montréal                         │  │
   │  ├────────────────────────────────────────────┤  │
   │  │ Backend Developer                   [✓]    │  │
   │  │ Shopify · Remote                           │  │
   │  ├────────────────────────────────────────────┤  │
   │  │ Staff Developer                     [✓]    │  │
   │  │ Shopify · Toronto                          │  │
   │  └────────────────────────────────────────────┘  │
   └──────────────────────────────────────────────────┘
   ```
4. L'utilisateur clique sur une offre → la fonction `addJobId(job.id)` est appelée
5. **L'UUID de l'offre est automatiquement injecté** dans le premier slot vide des `jobIds`
6. La liste de résultats se vide et le champ de recherche est réinitialisé
7. L'utilisateur répète pour ajouter d'autres offres (minimum 2)

##### Mécanisme 2 : Saisie manuelle de l'UUID (SECONDAIRE — technique)

Sous la zone de recherche, chaque offre sélectionnée est représentée par un champ `Input` affichant l'UUID en police `font-mono text-xs`. L'utilisateur **peut** coller manuellement un UUID s'il le connaît (ex: copié depuis l'URL `/jobs/a1b2c3d4-...`), mais ce n'est **pas le flux prévu** pour un utilisateur standard.

```
Offres sélectionnées (2)
┌──────────────────────────────────────────────────────┐
│ [ a1b2c3d4-e5f6-7890-abcd-ef1234567890  ] [✗]      │
│ [ f9e8d7c6-b5a4-3210-fedc-ba0987654321  ] [✗]      │
│                                                        │
│ [ + Ajouter une offre ]                               │
└──────────────────────────────────────────────────────┘
```

- Le placeholder dit `ID de l'offre 1`, `ID de l'offre 2`, etc.
- Le bouton ✗ permet de retirer une offre
- Le bouton "+ Ajouter une offre" ajoute un slot (max 4)

#### Où trouver l'ID d'une offre (pour un utilisateur avancé)

L'ID d'une offre est disponible dans :
1. **L'URL de la page détail** : `/jobs/a1b2c3d4-e5f6-7890-abcd-ef1234567890`
2. **La réponse API** de recherche d'offres (chaque objet `job` a un `id`)
3. **Le composant de comparaison lui-même** : la recherche intégrée injecte l'ID automatiquement

#### Résumé de la logique

> **L'utilisateur N'A PAS BESOIN de connaître ou de saisir manuellement l'ID.**
> Le flux principal utilise la **recherche intégrée** qui gère les IDs en arrière-plan.
> Les champs d'ID visibles en `font-mono` sont un détail technique qui sert de
> "état visible" pour confirmer quelles offres sont sélectionnées, et permettre
> la manipulation directe pour les power users.

### 2.4 Flux utilisateur complet

```
Étape 1 : L'utilisateur arrive sur /compare
    │
    ▼
┌──────────────────────────────────────────────────┐
│  Page titre : "Comparer des offres"              │
│  Sous-titre : "Comparez des offres d'emploi      │
│  côte à côte avec l'analyse IA"                  │
│                                                    │
│  Card « Sélectionner des offres »                │
│  ┌────────────────────────────────┐              │
│  │ 🔍 [                    ] [🔍] │              │
│  │                                 │              │
│  │ Offres sélectionnées (0)       │              │
│  │ [  ID de l'offre 1        ]    │              │
│  │ [  ID de l'offre 2        ]    │              │
│  │                                 │              │
│  │ [ Comparer (0 offres) ]  ← grisé│             │
│  └────────────────────────────────┘              │
└──────────────────────────────────────────────────┘
    │
    ▼ L'utilisateur recherche "Developer Montreal"
    │
┌──────────────────────────────────────────────────┐
│  5 résultats s'affichent sous le champ de        │
│  recherche. L'utilisateur clique sur 2 offres.   │
│                                                    │
│  Offres sélectionnées (2)                        │
│  [a1b2c3d4-...  ] [✗]                           │
│  [f9e8d7c6-...  ] [✗]                           │
│  [ + Ajouter une offre ]                         │
│                                                    │
│  [ Comparer (2 offres) ]  ← actif                │
└──────────────────────────────────────────────────┘
    │
    ▼ L'utilisateur clique "Comparer"
    │ Frontend envoie POST /analytics/compare
    │ Body: { jobIds: ["a1b2c3d4-...", "f9e8d7c6-..."] }
    │
    ▼
┌──────────────────────────────────────────────────┐
│  RÉSULTATS — Grille côte à côte                  │
│                                                    │
│  ┌─────────────────┐  ┌─────────────────┐       │
│  │ Senior Frontend  │  │ Backend Dev     │       │
│  │ Shopify          │  │ Google          │       │
│  │ 📍 Montréal     │  │ 📍 Remote       │       │
│  │ 💰 90K-110K     │  │ 💰 100K-130K   │       │
│  │                   │  │                 │       │
│  │    ┌────────┐    │  │    ┌────────┐  │       │
│  │    │  85%   │    │  │    │  72%   │  │       │
│  │    │ Match  │    │  │    │ Match  │  │       │
│  │    └────────┘    │  │    └────────┘  │       │
│  │                   │  │                 │       │
│  │ ✅ Avantages     │  │ ✅ Avantages   │       │
│  │ · React expert   │  │ · Salaire ++   │       │
│  │ · Proche maison  │  │ · Full remote  │       │
│  │                   │  │                 │       │
│  │ ❌ Inconvénients │  │ ❌ Inconvénients│      │
│  │ · Pas de remote  │  │ · Stack inconnue│      │
│  └─────────────────┘  └─────────────────┘       │
│                                                    │
│  ┌──────────────────────────────────────────────┐│
│  │ 🎯 Recommandation IA                        ││
│  │ "Le poste chez Shopify correspond mieux à    ││
│  │  votre profil (85% match). Cependant, le     ││
│  │  poste Google offre un meilleur salaire..."  ││
│  └──────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

### 2.5 API Backend — Route Compare

**Fichier** : `apps/api/src/routes/analytics.ts`

**Endpoint** : `POST /analytics/compare`

#### Requête

```typescript
{
  jobIds: string[]  // Array de 2 à 5 UUIDs d'offres
}
```

#### Validation

- `jobIds` doit être fourni (non-null, non-undefined)
- Longueur minimum : 2
- Longueur maximum : 5
- Si violation → Réponse `400 VALIDATION_ERROR`

#### Traitement backend

```typescript
// 1. Récupère les offres par leurs IDs avec la relation entreprise
const jobs = await prisma.job.findMany({
  where: { id: { in: jobIds } },
  include: { company: true },
});

// 2. Formate chaque offre pour la comparaison
const comparison = jobs.map((job) => ({
  id: job.id,
  title: job.title,
  company: job.company?.name ?? 'N/A',
  location: job.location,
  contractType: job.contractType,
  salary: { min: job.salaryMin, max: job.salaryMax },
  remote: job.remote,
  skills: JSON.parse(job.requiredSkills || '[]'),
  postedAt: job.postedAt,
  source: job.source,
}));

// 3. Retourne les données structurées
return { success: true, data: { jobs: comparison } };
```

#### Réponse

```typescript
{
  success: true,
  data: {
    jobs: [
      {
        id: "uuid",
        title: "Senior Frontend Developer",
        company: "Shopify",
        location: "Montréal, QC",
        contractType: "CDI",
        salary: { min: 90000, max: 110000 },
        remote: false,
        skills: ["React", "TypeScript", "Next.js"],
        postedAt: "2026-03-10T...",
        source: "linkedin"
      },
      // ... autres offres
    ]
  }
}
```

#### Données retournées vs affichées

| Donnée backend | Affiché dans le frontend | Notes |
|----------------|--------------------------|-------|
| `title` | ✅ Oui — titre de la Card | |
| `company` | ✅ Oui — avec icône Building2 | Vient de `company.name` via la relation |
| `location` | ✅ Oui — avec icône MapPin | |
| `salary` | ✅ Oui — avec icône DollarSign | Formaté comme string dans `CompareResult` |
| `matchScore` | ✅ Oui — gros chiffre %  | **Non calculé côté backend actuellement** |
| `pros` | ✅ Oui — liste vert avec ✓ | **Non calculé côté backend actuellement** |
| `cons` | ✅ Oui — liste rouge avec ✗ | **Non calculé côté backend actuellement** |
| `recommendation` | ✅ Oui — Card spéciale | **Non calculé côté backend actuellement** |
| `contractType` | Retourné mais pas affiché | Disponible dans les données |
| `remote` | Retourné mais pas affiché | Disponible dans les données |
| `skills` | Retourné mais pas affiché | Disponible dans les données |
| `postedAt` | Retourné mais pas affiché | Disponible dans les données |
| `source` | Retourné mais pas affiché | Disponible dans les données |

### 2.6 Rendu des résultats

#### Grille responsive

Le nombre de colonnes s'adapte automatiquement au nombre d'offres :

| Nombre d'offres | Classes CSS |
|-----------------|-------------|
| 2 offres | `grid-cols-1 md:grid-cols-2` |
| 3 offres | `grid-cols-1 md:grid-cols-3` |
| 4 offres | `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` |

#### Card d'offre

Chaque offre est rendue dans une `Card` avec :
- **Bordure primary** si `matchScore >= 80%` (pour mettre en valeur la meilleure offre)
- **Header** : Titre + description (entreprise, localisation, salaire avec icônes)
- **Score de match** : Grand chiffre en `text-2xl font-bold text-primary` dans un bloc `bg-primary/10`
- **Avantages** : Liste à puces avec icône ✓ verte (`Check`)
- **Inconvénients** : Liste à puces avec icône ✗ rouge (`X`)

#### Recommandation IA

Card avec bordure `border-primary` :
- Icône `Briefcase` en primary
- Titre "Recommandation IA"
- Texte en `whitespace-pre-wrap`

### 2.7 Use Cases complets

#### UC-C1 : Comparaison standard de 2 offres
1. L'utilisateur va sur `/compare`
2. Il tape "Developer Shopify" dans la recherche → 5 résultats
3. Il clique sur "Senior Frontend Developer - Shopify" → ID auto-injecté dans slot 1
4. Il tape "Developer Google" → résultats
5. Il clique sur "Backend Developer - Google" → ID auto-injecté dans slot 2
6. Le compteur affiche "Offres sélectionnées (2)"
7. Il clique "Comparer (2 offres)"
8. Le frontend envoie `POST /analytics/compare` avec les 2 UUIDs
9. Le backend récupère les 2 jobs avec leurs entreprises
10. Les résultats s'affichent en 2 colonnes côte à côte

#### UC-C2 : Comparaison de 3 ou 4 offres
1. Même flux que UC-C1 pour les 2 premières offres
2. L'utilisateur clique "+ Ajouter une offre" → un 3e slot apparaît
3. Il recherche et ajoute une 3e offre
4. Optionnel : il peut ajouter une 4e offre (max 4 slots dans le UI)
5. La grille s'adapte : 3 colonnes ou 2×2

#### UC-C3 : Suppression d'une offre sélectionnée
1. L'utilisateur a sélectionné 3 offres
2. Il clique le ✗ à côté de la 2e offre
3. Le slot est vidé (mais reste visible comme placeholder)
4. Le compteur passe à "Offres sélectionnées (2)"
5. Il peut resélectionner une autre offre via la recherche

#### UC-C4 : Tentative de comparaison avec moins de 2 offres
1. L'utilisateur n'a sélectionné qu'une offre (ou aucune)
2. Le bouton "Comparer" est grisé (`disabled={filledCount < 2}`)
3. Il ne peut pas lancer la comparaison

#### UC-C5 : Offre introuvable (ID invalide)
1. L'utilisateur colle manuellement un UUID invalide dans un des champs
2. Il lance la comparaison
3. Le backend exécute `prisma.job.findMany({ where: { id: { in: jobIds } } })`
4. L'offre invalide n'est pas trouvée → elle n'apparaît pas dans les résultats
5. Si un seul job valide sur 2 → le résultat ne contient qu'un seul élément (dégradé)

#### UC-C6 : Recherche sans résultats
1. L'utilisateur tape un mot-clé très spécifique ("Quantum Engineer Antarctica")
2. L'API retourne un tableau vide
3. `searchResults` est vide → aucun dropdown n'apparaît
4. L'utilisateur peut réessayer avec d'autres mots-clés

#### UC-C7 : Saisie manuelle d'ID (power user)
1. L'utilisateur ouvre un nouvel onglet, navigue vers `/jobs`
2. Il clique sur une offre → observé l'URL : `/jobs/a1b2c3d4-...`
3. Il copie l'UUID depuis l'URL
4. Il retourne sur `/compare` et le colle dans un champ d'ID
5. La comparaison fonctionne normalement

#### UC-C8 : Comparaison depuis une autre page (flux futur)
1. Sur la page `/jobs`, l'utilisateur pourrait avoir un bouton "Comparer"
2. Ce bouton naviguerait vers `/compare?jobId=xxx`
3. Le composant lirait le query param et pré-remplirait le slot
4. **Ce flux n'est pas encore implémenté** — voir section 2.8

### 2.8 Logique à implémenter / Améliorations

#### 2.8.1 Score de match, Pros/Cons, Recommandation IA

> **État actuel** : Le backend retourne uniquement les données brutes des offres (titre, salaire, skills, etc.). Les champs `matchScore`, `pros`, `cons` et `recommendation` sont définis dans le type `CompareResult` côté frontend mais **ne sont pas calculés par le backend**.

**Logique à implémenter** :

1. **Calcul du Match Score côté API** :
   ```
   POST /analytics/compare →
     1. Récupérer les jobs
     2. Récupérer le profil candidat (compétences, expérience, préférences salariales, localisation)
     3. Pour chaque job, calculer :
        - Overlap de compétences (skills match)
        - Alignement salarial (salaryMin/Max candidat vs salaryMin/Max offre)
        - Correspondance de localisation
        - Correspondance de niveau d'expérience
     4. Score pondéré (similaire à MatchingEngine)
   ```

2. **Génération des Pros/Cons via LLM** :
   ```
   Pour chaque offre dans le top résultat :
     - Prompt : "Voici le profil du candidat et cette offre. Liste 3-4 avantages
       et 2-3 inconvénients spécifiques à CE candidat pour CETTE offre."
     - Alimenté par : les skills du candidat, ses préférences, les détails de l'offre
   ```

3. **Recommandation IA finale** :
   ```
   Prompt : "Compare ces N offres pour ce candidat. Laquelle recommandes-tu et pourquoi ?
   Donne une réponse concise de 2-3 phrases."
   ```

#### 2.8.2 Améliorer la sélection d'offres (masquer les UUIDs)

Le flux actuel montre les UUIDs bruts dans les champs de sélection. Améliorations proposées :

1. **Afficher le nom de l'offre au lieu de l'UUID** : Quand un job est sélectionné via la recherche, remplacer l'affichage UUID par `"Senior Frontend Developer - Shopify"` → Stocker l'objet complet, pas juste l'ID
2. **Chips/tags au lieu de champs texte** : Afficher les offres sélectionnées comme des badges/tags avec un bouton ✗ plutôt que des champs Input
3. **Masquer complètement l'UUID** : Ne jamais montrer l'identifiant technique à l'utilisateur

#### 2.8.3 Intégration avec la page Offres d'emploi

1. **Bouton "Comparer" sur chaque offre** dans `/jobs` → checkbox de sélection
2. **Bouton flottant** : "Comparer (N)" quand des offres sont sélectionnées → redirige vers `/compare?jobIds=id1,id2,id3`
3. **Query params** : Le composant Compare parse `?jobIds=` au montage et pré-remplit les slots

#### 2.8.4 Ajout de critères de comparaison supplémentaires

Le backend retourne déjà beaucoup de données non utilisées côté frontend :

| Donnée disponible | Utilisation proposée |
|-------------------|---------------------|
| `contractType` | Afficher CDI/CDD/Freelance dans chaque carte |
| `remote` | Badge "🏠 Remote" / "🏢 Présentiel" / "🏠🏢 Hybride" |
| `skills` | Tableau comparatif des compétences requises |
| `postedAt` | "Publiée il y a 3 jours" → indicateur de fraîcheur |
| `source` | Icône de la source (LinkedIn, Indeed, etc.) |

#### 2.8.5 Sauvegarde de comparaisons

- Permettre à l'utilisateur de **sauvegarder** une comparaison pour y revenir
- Historique des comparaisons faites
- Partage de comparaison avec les membres de l'escouade

---

## 3. Architecture technique partagée

### Stack Frontend

| Technologie | Usage |
|-------------|-------|
| Next.js (App Router) | Framework React SSR/CSR |
| `"use client"` | Les deux pages sont 100% client-side |
| shadcn/ui | Composants UI (Card, Button, Input, Select) |
| Lucide React | Icônes |
| Axios | Appels API via `@/lib/api` |
| React hooks | État local (`useState`) — pas de state manager global |

### Stack Backend

| Technologie | Usage |
|-------------|-------|
| Fastify | Framework HTTP |
| Prisma | ORM PostgreSQL |
| Groq (LLM) | Simulation de négociation (llama-3.3-70b-versatile) |
| JWT | Authentification (via `fastify.authenticate` hook) |

### Client API (`apps/web/lib/api.ts`)

```typescript
// Salary
export const salaryApi = {
  getData: (params) => api.get('/salary/data', { params }),
  negotiate: (data) => api.post('/salary/negotiate', data),
  contribute: (data) => api.post('/salary/contribute', data),
}

// Analytics (compare)
export const analyticsApi = {
  getPersonal: () => api.get('/analytics/personal'),
  exportCsv: () => api.get('/analytics/export/csv', { responseType: 'blob' }),
  exportJson: () => api.get('/analytics/export/json', { responseType: 'blob' }),
  compare: (jobIds) => api.post('/analytics/compare', { jobIds }),
}

// Jobs (recherche pour /compare)
export const jobsApi = {
  search: (params) => api.get('/jobs/search', { params }),
  getById: (id) => api.get(`/jobs/${id}`),
}
```

### Schéma de routes API

```
/salary
  ├── GET  /data              → Données salariales
  ├── POST /negotiate         → Simulation négo IA
  └── POST /contribute        → Contribution anonyme

/analytics
  ├── GET  /personal          → Tableau de bord personnel
  ├── GET  /export/csv        → Export CSV
  ├── GET  /export/json       → Export JSON
  └── POST /compare           → Comparaison d'offres

/jobs
  ├── GET  /search            → Recherche d'offres (utilisé par /compare)
  └── GET  /:id               → Détail d'une offre
```

---

## 4. Traductions i18n

**Fichier** : `packages/shared/src/i18n/translations.ts`

### Clés de navigation

| Clé | FR | EN | DE | ES |
|-----|----|----|----|----|
| `navSalary` | Salaires | Salaries | Gehälter | Salarios |
| `navCompare` | Comparer | Compare | Vergleichen | Comparar |

### Clés liées aux salaires (utilisées à travers l'app)

| Clé | FR | EN |
|-----|----|----|
| `jobSalary` | Salaire | Salary |
| `jobSalaryLabel` | Salaire | Salary |
| `jobsFilterSalary` | Salaire minimum | Minimum salary |
| `editProfileSalary` | Salaire annuel souhaité (€) | Desired annual salary (€) |
| `profileSalary` | Salaire | Salary |
| `settingsSalaryMin` | Salaire min (€/an) | Min salary (€/year) |
| `settingsSalaryMax` | Salaire max (€/an) | Max salary (€/year) |
| `onboardingSalaryMin` | Salaire annuel minimum (€) | Minimum annual salary (€) |
| `appSalaryLabel` | Salaire | Salary |

### Clés manquantes (à ajouter pour une i18n complète)

Les pages `/salary` et `/compare` contiennent du texte **hardcodé en français** :
- "Salaires & Négociation"
- "Explorez les données salariales..."
- "Explorer les salaires", "Simuler une négo", "Contribuer"
- "Rechercher", "Famille de métier", "Localisation"
- "Comparer des offres", "Rechercher une offre par titre, entreprise..."
- "Offres sélectionnées", "ID de l'offre"
- "Avantages", "Inconvénients", "Recommandation IA"
- etc.

> **Action requise** : Extraire tous ces textes vers des clés i18n dans `translations.ts` pour supporter le multilingue.

---

*Document descriptif — Onglets Salaires & Comparer — Version 1.0*
