# HIREDGE — Suivi de Progression

> Document de suivi automatique du développement de l'application HIREDGE.
> Dernière mise à jour : **Session 4 — FINAL**

---

## Vue d'ensemble

| Composant | Progression | Statut |
|-----------|:-----------:|--------|
| **Documentation** | 100% | ✅ Complet |
| **Monorepo & Config** | 100% | ✅ Complet |
| **Packages partagés** | 100% | ✅ Complet |
| **Base de données (Prisma)** | 100% | ✅ Complet |
| **Backend API** | 100% | ✅ Complet |
| **Application Mobile** | 100% | ✅ Complet |
| **Design System** | 100% | ✅ Complet |
| **Workers (Background Jobs)** | 100% | ✅ Complet |
| **WebSocket (Temps réel)** | 100% | ✅ Complet |
| **Tests** | 100% | ✅ Complet |
| **CI/CD & Déploiement** | 100% | ✅ Complet |
| **Docker** | 100% | ✅ Complet |
| **Config Production** | 100% | ✅ Complet |
| **Import d'offres** | 100% | ✅ Complet (Adzuna + JSearch) |

**Progression globale : 100% ✅ PROJET COMPLET**

---

## Détail par composant

### 1. Monorepo & Configuration Racine ✅
- [x] `package.json` racine (Turborepo, npm workspaces)
- [x] `turbo.json` (build, dev, lint pipelines)
- [x] `tsconfig.json` racine
- [x] `.gitignore`

### 2. Package Partagé `@hiredge/shared` ✅
- [x] `types.ts` — Toutes les interfaces TypeScript (~20 types)
- [x] `validation.ts` — Schémas Zod (~12 schémas)
- [x] `constants.ts` — Constantes (Squad, Matching, Pricing, etc.)
- [x] `index.ts` — Barrel export

### 3. Base de Données ✅
- [x] `schema.prisma` — 18 modèles, 15 enums, index, relations, cascades
- [x] Client Prisma (singleton)

### 4. Backend API ✅
#### Infrastructure
- [x] `config/env.ts` — Variables d'environnement
- [x] `db/prisma.ts` — Client Prisma
- [x] `lib/redis.ts` — Client Redis avec retry
- [x] `lib/websocket.ts` — Socket.io server
- [x] `middleware/auth.ts` — JWT auth + role guard
- [x] `server.ts` — Fastify entry point, CORS, plugins, routes

#### Services & Routes (9/9 modules)
| Module | Service | Routes | Description |
|--------|:-------:|:------:|-------------|
| Auth | ✅ | ✅ | Register, login, refresh, logout, token blacklisting |
| Profile | ✅ | ✅ | CRUD profil, compétences, expériences, formation |
| Jobs | ✅ | ✅ | Recherche, recommandations, matching engine |
| Applications | ✅ | ✅ | CRUD candidatures, limites abonnement, stats |
| Squads | ✅ | ✅ | Création, join/leave, chat, lifecycle automatique |
| Scouts | ✅ | ✅ | Inscription, conversations, crédits, anonymat |
| EDGE AI | ✅ | ✅ | Détection d'intention, contexte, réponse IA |
| Interview Sim | ✅ | ✅ | Multi-phase, personnage, évaluation temps réel |
| Notifications | ✅ | ✅ | CRUD, unread count, mark as read |

#### Workers
- [x] Matching Worker (recalcule les recommandations)
- [x] Notification Worker (job-match, application-update, interview-reminder)
- [x] Scraping Worker (6 sources : Indeed, WTTJ, Pôle Emploi, APEC, Hellowork, LinkedIn)
- [x] Content Generation Worker (CV adapté, lettre de motivation, email de relance, brief entreprise)

### 5. Application Mobile (React Native + Expo) ✅

#### Foundation ✅
- [x] `package.json` (Expo 51, React Native 0.74.5)
- [x] `app.json` (config Expo, splash, icons)
- [x] `tsconfig.json` (path aliases)
- [x] `tailwind.config.js` (NativeWind + palette HIREDGE)
- [x] `lib/api.ts` (Axios + intercepteurs auto-refresh)
- [x] `lib/socket.ts` (Socket.io client)
- [x] `stores/auth.store.ts` (Zustand)

#### Routing ✅
- [x] `app/_layout.tsx` — Root layout (QueryClient, Stack)
- [x] `app/index.tsx` — Redirect basé sur auth
- [x] `app/(auth)/_layout.tsx` — Stack auth
- [x] `app/(auth)/login.tsx` — Écran de connexion
- [x] `app/(auth)/register.tsx` — Écran d'inscription
- [x] `app/(tabs)/_layout.tsx` — Navigation 5 tabs

#### Écrans Tabs (5/5) ✅
- [x] `(tabs)/index.tsx` — Dashboard (stats, actions rapides, jobs recommandés)
- [x] `(tabs)/jobs.tsx` — Liste d'offres (recherche, filtres, pagination infinie)
- [x] `(tabs)/edge.tsx` — Chat EDGE (messages, suggestions, optimistic updates)
- [x] `(tabs)/squad.tsx` — Escouade (créer/rejoindre, chat, liste membres)
- [x] `(tabs)/profile.tsx` — Profil (infos, compétences, xp, formation, stats)

#### Écrans Détail (4/4) ✅
- [x] `job/[id].tsx` — Détail d'offre (match score, postuler, sauvegarder)
- [x] `interview/index.tsx` — Lancer simulation (choix type, contexte, historique)
- [x] `interview/[id].tsx` — Session simulation (chat, évaluation, rapport)
- [x] `notifications.tsx` — Liste notifications (mark read, types/couleurs)

#### Écrans restants ✅
- [x] `edit-profile.tsx` — Formulaire complet (titre, bio, localisation, salaire, remote, contrats)
- [x] `applications.tsx` — Liste candidatures (7 filtres statut, stats, cartes colorées)
- [x] `application/[id].tsx` — Détail candidature (timeline 6 étapes, dates, retrait)
- [x] `scouts.tsx` — Conversations éclaireurs (anonyme, non-lus, temps relatif)
- [x] `scout/[id].tsx` — Chat éclaireur (polling 5s, badge anonyme, disclaimer vie privée)
- [x] `settings.tsx` — Paramètres (notifications, apparence, compte, données RGPD, suppression)
- [x] `onboarding.tsx` — Onboarding 5 étapes (bienvenue, profil, compétences, préférences, prêt)

#### Design System (`components/ui/`) ✅
- [x] `Button.tsx` — 5 variantes (primary/secondary/outline/ghost/danger), 3 tailles, loading
- [x] `Input.tsx` — Label, erreur, hint, icône préfixe, focus animé
- [x] `Card.tsx` — 3 variantes (default/elevated/outlined), padding configurable
- [x] `Badge.tsx` — 7 variantes de couleur, 2 tailles
- [x] `Avatar.tsx` — Image ou initiales (couleur déterministe), 5 tailles (xs → xl)
- [x] `EmptyState.tsx` — Icône, titre, description, bouton action optionnel
- [x] `index.ts` — Barrel export

### 6. Tests ✅

#### Backend (`apps/api/src/__tests__/`)
- [x] `auth.test.ts` — 6 tests (validation email, hashing, doublons, login, tokens)
- [x] `jobs.test.ts` — 5 tests (pagination, filtres contrat/location, cache Redis)
- [x] `profile.test.ts` — 6 tests (profil complet, mise à jour, compétences, score completion)
- [x] `squad.test.ts` — 4 tests (création LEADER, max membres, doublon, join)
- [x] `application.test.ts` — 4 tests (limite abonnement, création, stats, taux réponse)
- [x] `vitest.config.ts` — Configuration Vitest avec coverage v8

#### Mobile (`apps/mobile/__tests__/`)
- [x] `components.test.ts` — Tests logique : initiales Avatar, couleurs Badge, formatRelativeTime, labels statut, parsing salaire, couleurs match score

### 7. Docker & Infrastructure ✅
- [x] `Dockerfile` — Build multi-stage (base → deps → shared-build → api-build → runner), node:20-alpine, utilisateur non-root, health check
- [x] `docker-compose.yml` — PostgreSQL 16, Redis 7, API service, service migrate one-shot, volumes nommés
- [x] `.dockerignore` — Exclut node_modules, .git, mobile, coverage

### 8. CI/CD ✅
- [x] `.github/workflows/ci.yml` — 5 jobs : lint & type-check, tests backend (services PG + Redis), tests mobile, Docker build + push GHCR, deploy staging

### 9. EAS Build (Mobile) ✅
- [x] `eas.json` — 3 profils (development/preview/production), config submit App Store + Play Store

### 10. Configuration Production ✅
- [x] `.env.example` — Toutes les variables d'environnement documentées par catégorie
- [x] `package.json` — Scripts : test, test:api, test:mobile, docker:up/down/build/logs, db:push/generate/migrate/seed
- [x] `prisma/seed.ts` — Données démo canadiennes : utilisateur (Amadou Diallo, Full-Stack JS, Montréal), 3 entreprises (Shopify, Element AI, Wealthsimple), 3 offres à Toronto/Montréal, 1 escouade

### 11. Import d'offres d'emploi — Sources multiples ✅

#### Stratégie
HIREDGE cible exclusivement le **marché canadien** au lancement. Les offres sont importées depuis 2 agrégateurs API qui couvrent les plateformes majeures :

#### Sources de données

| Service | Plateformes couvertes | Clé requise | Tier gratuit |
|---------|----------------------|-------------|-------------|
| **Adzuna** | Adzuna, agrégation multi-sources Canada | `ADZUNA_APP_ID` + `ADZUNA_APP_KEY` | Illimité |
| **JSearch (RapidAPI)** | **LinkedIn**, **Indeed**, **Glassdoor**, ZipRecruiter, + autres sites | `JSEARCH_API_KEY` | 500 req/mois |

#### Services backend

| Fichier | Rôle |
|---------|------|
| `src/services/adzuna.service.ts` | Client Adzuna API — recherche, import, déduplique, normalise |
| `src/services/jsearch.service.ts` | Client JSearch/RapidAPI — agrège LinkedIn/Indeed/Glassdoor, normalise salaires (horaire/mensuel → annuel), extrait ville/pays |

#### Scripts d'import

| Script | Usage |
|--------|-------|
| `scripts/import-jobs.ts` | Import combiné **Adzuna + JSearch** — script principal |
| `scripts/import-jsearch.ts` | Import JSearch uniquement — 9 requêtes (dev, data, devops) pour Montréal, Toronto, Vancouver |

#### Fonctionnalités d'import
- [x] Déduplication par `externalId` + `source` (pas de doublons)
- [x] Création automatique des entreprises (`company`) avec logo, site web, industrie
- [x] Normalisation salariale (horaire × 2080, mensuel × 12, hebdo × 52 → annuel)
- [x] `locationCountry = 'CA'` et `salaryCurrency = 'CAD'` forcés pour le marché canadien
- [x] Extraction de `locationCity` depuis les données brutes
- [x] Source originale préservée (`linkedin`, `indeed`, `glassdoor`, `adzuna`, etc.)
- [x] Détection du type de contrat (FULLTIME → CDI, CONTRACT → CDD, etc.)
- [x] Détection du statut remote/hybride via regex dans titre + description
- [x] Extraction de compétences depuis le titre et la description (pour Adzuna)
- [x] Rate limiting entre requêtes (500ms-1s) pour respecter les quotas

#### Variables d'environnement requises
```env
# Adzuna (adzuna.com/developers)
ADZUNA_APP_ID=your_app_id
ADZUNA_APP_KEY=your_app_key

# JSearch / RapidAPI (rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch)
JSEARCH_API_KEY=your_rapidapi_key
```

#### Commandes d'import
```bash
cd apps/api

# Import combiné (Adzuna + JSearch)
npx tsx --env-file=.env scripts/import-jobs.ts

# Import JSearch uniquement (LinkedIn, Indeed, Glassdoor)
npx tsx --env-file=.env scripts/import-jsearch.ts

# Seed données démo (3 entreprises CA + 3 offres + 1 squad)
npx prisma db seed
```

#### Répartition actuelle (mars 2026)
| Source | Offres |
|--------|--------|
| Adzuna | 140 |
| LinkedIn | 14 |
| Indeed | 5 |
| Glassdoor | 1 |
| Autres (RBC, Uber, TD, etc.) | 19 |
| **Total** | **179** |

---

## Historique des sessions

### Session 1
- Documentation complète lue et analysée
- Décisions d'architecture (mobile-first, custom AI code)
- Monorepo initialisé (Turborepo, npm workspaces)
- Package partagé créé (types, validation, constants)
- Schema Prisma créé (18 modèles)
- Infrastructure backend (Redis, config, auth middleware)

### Session 2
- Tous les services backend créés (9 modules)
- Toutes les routes API créées
- Fastify server configuré et opérationnel
- Mobile: Foundation (Expo config, API client, auth store)
- Mobile: Auth screens (login, register)
- Mobile: Tab layout (5 onglets)

### Session 3
- Mobile: 5 écrans tabs créés (Dashboard, Jobs, EDGE, Squad, Profile)
- Mobile: 4 écrans détail créés (Job detail, Interview launcher, Interview session, Notifications)
- WebSocket: Server Socket.io + client mobile
- Workers: Matching + Notification workers (BullMQ)
- Root layout mis à jour avec toutes les routes
- PROGRESS.md créé

### Session 4 — FINAL ✅
- **Écrans mobiles** : 7 écrans restants créés (edit-profile, applications, application detail, scouts, scout conversation, settings, onboarding 5 étapes)
- **Design System** : 6 composants UI réutilisables (Button, Input, Card, Badge, Avatar, EmptyState) + barrel export
- **Scraping Worker** : Pipeline complet — 6 sources (Indeed, WTTJ, Pôle Emploi, APEC, Hellowork, LinkedIn), normalisation, déduplication, détection d'arnaques, extraction de compétences
- **Content Worker** : Génération de contenu (lettres de motivation, CV adapté, emails de relance, briefs entreprise)
- **Tests backend** : 5 fichiers de tests (25 tests) — auth, jobs, profile, squad, applications + vitest.config.ts
- **Tests mobile** : Tests de logique composants (initiales, couleurs, dates, labels, parsing)
- **Docker** : Dockerfile multi-stage + docker-compose (PG 16, Redis 7, API, migrate) + .dockerignore
- **CI/CD** : GitHub Actions avec 5 jobs (lint, tests backend/mobile, Docker build/push GHCR, deploy staging)
- **EAS Build** : 3 profils (development, preview, production) + config submit stores
- **Production** : .env.example complet, scripts npm, seed.ts avec données démo
- **Layout** : Routing mis à jour pour tous les nouveaux écrans

### Session 5 — Intégration Web & Import d'offres 🇨🇦
- **App Web Next.js** : Dashboard complet, pages jobs, profil, interviews, notifications, éclaireurs, analytics
- **Auth guard** : Layout dashboard avec vérification auth + loading screen + redirect /login
- **Corrections critiques** : Bug de casse registerSchema (`'candidate'` vs `'CANDIDATE'`), auto-création profil, proxy next.config.mjs, intercepteur Axios 401
- **Page /interview** : Écran de lancement de simulation (4 types d'entretien, tips)
- **Seed data canadien** : Profil démo basé à Montréal, entreprises (Shopify, Element AI, Wealthsimple), offres à Toronto/Montréal
- **Service Adzuna** : Import massif d'offres canadiennes (Montréal, Toronto, Vancouver) — 140 offres
- **Service JSearch** : Intégration RapidAPI agrégeant **LinkedIn, Indeed, Glassdoor** — 39 offres supplémentaires
- **Script import combiné** : `import-jobs.ts` combine Adzuna + JSearch en une commande
- **Nettoyage Canada-only** : Purge des offres non-canadiennes, correctifs `locationCountry`, `salaryCurrency`, `locationCity`
- **Total** : 179 offres en base, 5 sources (Adzuna, LinkedIn, Indeed, Glassdoor, autres)

---

## Statistiques Finales

| Métrique | Valeur |
|----------|--------|
| **Fichiers créés** | ~95+ |
| **Lignes de code** | ~20 000+ |
| **Services backend** | 9 modules complets |
| **Écrans mobile** | 18 écrans |
| **Composants UI** | 6 composants design system |
| **Tests** | 31 tests (25 backend + 6 mobile) |
| **Workers** | 4 (matching, notification, scraping, content) |
| **Modèles Prisma** | 18 modèles + 15 enums |
| **Sessions de dev** | 4 |

---

## Stack Technique Complète

- **Monorepo** : Turborepo + npm workspaces
- **Backend** : Fastify + Prisma + PostgreSQL 16 + Redis 7 + BullMQ + Socket.io
- **Mobile** : React Native + Expo SDK 51 + Expo Router 3.5 + NativeWind 4 + Zustand + TanStack Query v5
- **IA** : OpenAI GPT-4o (principal) + GPT-4o-mini (intention, évaluation)
- **Tests** : Vitest + v8 coverage
- **Docker** : Multi-stage build, docker-compose
- **CI/CD** : GitHub Actions (5 jobs)
- **Mobile Builds** : EAS Build (3 profils)
- **Couleurs** : Primary #6C5CE7, Secondary #00CEC9, Success #00B894, Warning #FDCB6E, Danger #FF7675
