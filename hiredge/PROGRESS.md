# HIREDGE — Suivi de Progression

> Document de suivi automatique du développement de l'application HIREDGE.
> Dernière mise à jour : **Session 13 — Mars 2026**

---

## Vue d'ensemble

| Composant | Progression | Statut |
|-----------|:-----------:|--------|
| **Documentation** | 100% | ✅ Complet |
| **Monorepo & Config** | 100% | ✅ Complet |
| **Packages partagés** | 100% | ✅ Complet |
| **Base de données (Prisma)** | 100% | ✅ Complet |
| **Backend API** | 100% | ✅ Complet |
| **Application Mobile (Expo)** | 100% | ✅ Complet |
| **Application Web (Next.js)** | 100% | ✅ Complet |
| **Design System** | 100% | ✅ Complet |
| **Workers (Background Jobs)** | 100% | ✅ Complet |
| **WebSocket (Temps réel)** | 100% | ✅ Complet |
| **Tests** | 100% | ✅ Complet |
| **CI/CD & Déploiement** | 100% | ✅ Complet |
| **Docker** | 100% | ✅ Complet |
| **Config Production** | 100% | ✅ Complet |
| **Import d'offres** | 100% | ✅ Complet (Adzuna + JSearch) |
| **Escouades v2 (WhatsApp-style)** | 100% | ✅ Complet |
| **Messages vocaux** | 100% | ✅ Complet |
| **Appels vidéo (Jitsi)** | 100% | ✅ Complet |
| **Interactions messages** | 100% | ✅ Complet |
| **Photo de profil (Avatar)** | 100% | ✅ Complet |

**Progression globale : 100% ✅ PROJET COMPLET + FONCTIONNALITÉS AVANCÉES**

---

## Détail par composant

### 1. Monorepo & Configuration Racine ✅
- [x] `package.json` racine (Turborepo, npm workspaces)
- [x] `turbo.json` (build, dev, lint pipelines)
- [x] `tsconfig.json` racine
- [x] `.gitignore`

### 2. Package Partagé `@hiredge/shared` ✅
- [x] `types.ts` — Toutes les interfaces TypeScript (~20 types)
- [x] `validation.ts` — Schémas Zod (~13 schémas, incluant `sendSquadMessageSchema` avec `replyToId`)
- [x] `constants.ts` — Constantes (Squad, Matching, Pricing, etc.)
- [x] `index.ts` — Barrel export

### 3. Base de Données ✅
- [x] `schema.prisma` — 20 modèles, 15+ enums, index, relations, cascades
- [x] Client Prisma (singleton)
- [x] Modèles ajoutés : `SquadMessageReaction`, `SquadMessageHidden`
- [x] Champs ajoutés à `SquadMessage` : `replyToId`, `isPinned`, `isImportant`, `deletedForAll`, relations `replyTo`/`replies`, `reactions`, `hiddenFor`

### 4. Backend API ✅
#### Infrastructure
- [x] `config/env.ts` — Variables d'environnement
- [x] `db/prisma.ts` — Client Prisma
- [x] `lib/redis.ts` — Client Redis avec retry + mode résilient (pas de crash si Redis down)
- [x] `lib/websocket.ts` — Socket.io server
- [x] `middleware/auth.ts` — JWT auth + role guard
- [x] `server.ts` — Fastify entry point, CORS, Helmet (cross-origin resource policy), multipart (10MB), static files `/uploads/`

#### Services & Routes (9/9 modules)
| Module | Service | Routes | Description |
|--------|:-------:|:------:|-------------|
| Auth | ✅ | ✅ | Register, login, refresh, logout, token blacklisting |
| Profile | ✅ | ✅ | CRUD profil, compétences, expériences, formation, upload avatar |
| Jobs | ✅ | ✅ | Recherche, recommandations, matching engine |
| Applications | ✅ | ✅ | CRUD candidatures, limites abonnement, stats |
| Squads | ✅ | ✅ | Création, join/leave, chat, messages vocaux, réactions, réponses, épinglage, suppression, événements, appels Jitsi |
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

### 6. Application Web (Next.js) ✅

#### Infrastructure ✅
- [x] Next.js 14+ avec App Router
- [x] Tailwind CSS + Radix UI (Shadcn/ui)
- [x] `lib/api.ts` — Client Axios avec intercepteurs, token refresh, baseURL configurable
- [x] `lib/utils.ts` — Utilitaires (cn, clsx)
- [x] Thème clair/sombre (ThemeProvider)
- [x] Composants UI complets (Button, Input, Card, Badge, Dialog, etc.)
- [x] Déployé sur **Vercel** (`https://hiredge-six.vercel.app`)

#### Pages & Écrans ✅
| Page | Route | Description |
|------|-------|-------------|
| Landing | `/` | Page d'accueil avec présentation produit |
| Login | `/login` | Connexion par email/mot de passe |
| Signup | `/signup` | Inscription avec onboarding |
| Onboarding | `/onboarding` | Onboarding interactif multi-étapes |
| Dashboard | `/dashboard` | Vue d'ensemble : stats, activité, jobs recommandés |
| Jobs | `/jobs` | Recherche d'offres avec filtres avancés |
| Job Detail | `/jobs/[id]` | Détail d'offre, score de matching, postuler |
| Applications | `/applications` | Suivi des candidatures (pipeline kanban) |
| App Detail | `/applications/[id]` | Détail candidature, timeline, actions |
| Escouades | `/squad` | Chat de groupe style WhatsApp, multi-escouades |
| Interview | `/interview` | Lancer une simulation d'entretien |
| Interview Session | `/interviews/[id]` | Session simulation avec chat IA |
| Assistant EDGE | `/assistant` | Conversation IA avec l'agent EDGE |
| Profil | `/profile` | Profil complet avec compétences, expériences, photo de profil |
| Éclaireurs | `/scouts` | Liste des conversations éclaireurs |
| Analytics | `/analytics` | Statistiques personnelles détaillées |
| Notifications | `/notifications` | Centre de notifications |
| Paramètres | `/settings` | Préférences, compte, données personnelles |

#### Escouades Web — Fonctionnalités avancées ✅
- [x] **Layout 3 panneaux** : Liste escouades (gauche) + Chat (centre) + Membres/événements (droite)
- [x] **Style WhatsApp** : aperçu dernier message, indicateur en ligne, code d'invitation
- [x] **Multi-escouades** : jusqu'à 5 escouades simultanées, navigation par onglets
- [x] **Messages texte** : envoi, affichage par auteur, horodatage
- [x] **Messages vocaux** : enregistrement via MediaRecorder, lecture audio intégrée
- [x] **Appels vidéo** : intégration Jitsi Meet (ouvre dans un nouvel onglet), message automatique au groupe
- [x] **Événements** : planification de réunions, appels, revues CV avec formulaire intégré
- [x] **Réactions emoji** : 8 emojis rapides (👍❤️😂😮😢🙏🔥🎉) au survol, toggle, compteur groupé
- [x] **Répondre à un message** : citation avec nom de l'auteur, aperçu du contenu, barre de réponse au-dessus de l'input
- [x] **Clic sur citation → scroll** : cliquer sur un message cité fait défiler jusqu'au message original avec surbrillance temporaire
- [x] **Menu contextuel** : Répondre, Copier, Réagir, Épingler/Désépingler, Marquer comme important, Supprimer
- [x] **Épingler des messages** : badge 📌 affiché sous le message
- [x] **Marquer comme important** : badge ⭐ affiché sous le message
- [x] **Suppression de messages** :
  - Message propre < 1h : supprimer pour moi OU pour tous
  - Message propre > 1h : supprimer pour moi uniquement
  - Message d'autrui : supprimer pour moi uniquement
  - Messages supprimés pour tous : affichage "🚫 Ce message a été supprimé"
- [x] **Boîtes de message visibles** : bulles bleues (propres messages), bordure + fond gris clair (messages des autres)
- [x] **Responsive** : mobile-first, panneau gauche/chat toggle sur petits écrans

### 7. Tests ✅

#### Backend (`apps/api/src/__tests__/`)
- [x] `auth.test.ts` — 6 tests (validation email, hashing, doublons, login, tokens)
- [x] `jobs.test.ts` — 5 tests (pagination, filtres contrat/location, cache Redis)
- [x] `profile.test.ts` — 6 tests (profil complet, mise à jour, compétences, score completion)
- [x] `squad.test.ts` — 4 tests (création LEADER, max membres, doublon, join)
- [x] `application.test.ts` — 4 tests (limite abonnement, création, stats, taux réponse)
- [x] `vitest.config.ts` — Configuration Vitest avec coverage v8

#### Mobile (`apps/mobile/__tests__/`)
- [x] `components.test.ts` — Tests logique : initiales Avatar, couleurs Badge, formatRelativeTime, labels statut, parsing salaire, couleurs match score

### 8. Docker & Infrastructure ✅
- [x] `Dockerfile` — Build multi-stage (base → deps → shared-build → api-build → runner), node:20-alpine, utilisateur non-root, health check
- [x] `docker-compose.yml` — PostgreSQL 16, Redis 7, API service, service migrate one-shot, volumes nommés
- [x] `.dockerignore` — Exclut node_modules, .git, mobile, coverage

### 9. CI/CD ✅
- [x] `.github/workflows/ci.yml` — 5 jobs : lint & type-check, tests backend (services PG + Redis), tests mobile, Docker build + push GHCR, deploy staging

### 10. EAS Build (Mobile) ✅
- [x] `eas.json` — 3 profils (development/preview/production), config submit App Store + Play Store

### 11. Configuration Production ✅
- [x] `.env.example` — Toutes les variables d'environnement documentées par catégorie
- [x] `package.json` — Scripts : test, test:api, test:mobile, docker:up/down/build/logs, db:push/generate/migrate/seed
- [x] `prisma/seed.ts` — Données démo canadiennes : utilisateur (Amadou Diallo, Full-Stack JS, Montréal), 3 entreprises (Shopify, Element AI, Wealthsimple), 3 offres à Toronto/Montréal, 1 escouade

### 12. Import d'offres d'emploi — Sources multiples ✅

#### Stratégie
HIREDGE cible exclusivement le **marché canadien** au lancement. Les offres sont importées depuis 2 agrégateurs API qui couvrent les plateformes majeures :

#### Sources de données

| Service | Plateformes couvertes | Clé requise | Tier gratuit |
|---------|----------------------|-------------|-------------|
| **Adzuna** | Adzuna, agrégation multi-sources Canada | `ADZUNA_APP_ID` + `ADZUNA_APP_KEY` | Illimité |
| **JSearch (RapidAPI)** | **LinkedIn**, **Indeed**, **Glassdoor**, ZipRecruiter, + autres sites | `JSEARCH_API_KEY` | 500 req/mois |

### 13. Déploiement Production ✅

| Service | Plateforme | URL |
|---------|-----------|-----|
| **API Backend** | Railway | `https://hiredge-production.up.railway.app` |
| **Web Frontend** | Vercel | `https://hiredge-six.vercel.app` |
| **Base de données** | Railway PostgreSQL | `caboose.proxy.rlwy.net:39234/railway` |
| **Code source** | GitHub | `https://github.com/nelson227/HIREDGE.git` (branche `main`) |

---

## Historique des sessions de développement

### Sessions 1-4 : Fondations
- Monorepo Turborepo + npm workspaces
- Backend Fastify 5 + Prisma + PostgreSQL
- Application mobile React Native (Expo)
- Seed de la base de données (120 offres Adzuna Canada)
- Docker, CI/CD, tests

### Session 5 : Correctifs et sécurité
- Fix `vercel.json` (configuration de déploiement)
- Redis résilient (pas de crash si Redis indisponible)
- Audit d'isolation des données utilisateur
- Fix auth Safari/iOS (cookies)

### Session 6 : Escouades v1
- Système de codes d'invitation
- Fix TypeScript build

### Session 7 : Escouades v2 complètes
- Layout 3 panneaux style WhatsApp
- Multi-escouades (jusqu'à 5)
- Chat temps réel, membres en ligne
- Événements planifiés
- Suggestions d'escouades par IA

### Session 8 : Correctifs UX
- Fix flow de candidature
- Fix suggestions d'escouades
- Fix erreur 400 chat (champ `content` vs `message`)

### Session 9 : Appels vidéo
- Intégration Jitsi Meet (bouton vidéo → nouvel onglet)
- Message automatique au groupe avec lien de l'appel
- Tentative Daily.co abandonnée (payant)

### Session 10 : Messages vocaux
- Backend : route `POST /squads/:id/voice`, stockage `uploads/voice/{squadId}/`
- Frontend : MediaRecorder, enregistrement, envoi, lecture audio
- Fix URL relative (plus de `localhost:3000` en production)
- Fix CORS Helmet (`cross-origin-resource-policy`)
- Fix visibilité audio propre (fond clair pour bulles vocales de l'auteur)

### Session 11 : Interactions messages WhatsApp-style
- **Schema Prisma** : `SquadMessageReaction`, `SquadMessageHidden`, champs reply/pin/important/delete sur `SquadMessage`
- **Backend** : 4 nouveaux endpoints (réaction, épingler, important, supprimer)
- **Frontend** : survol avec emojis + flèche, menu contextuel complet, système de réponses avec citation cliquable, réactions groupées, badges épinglé/important, suppression pour moi/pour tous avec règle 1 heure

### Session 12 : Corrections UX finales
- Fix réponse à un message qui ne s'affichait pas (schéma Zod manquait `replyToId`)
- Boîtes de messages des autres bien visibles (fond `bg-slate-100` + bordure)
- Positionnement des boutons survol au niveau de la bulle (pas du nom)
- Clic sur citation → scroll vers le message original avec surbrillance temporaire

### Session 13 : Photo de profil (Avatar)
- **Backend** : route `POST /profile/avatar` — validation format (JPG/PNG/WebP), limite 10 Mo, stockage `/uploads/avatars/{userId}/`
- **Service** : `uploadAvatar()` dans `profile.service.ts` — gestion stockage, suppression ancien avatar, mise à jour `avatarUrl` en base
- **Multipart** : limite augmentée de 5 Mo → 10 Mo
- **Page Profil** : photo affichée dans le bloc d'initiales, bouton "+" en bas à droite pour upload
- **Squad Chat** : photos de profil affichées à côté des messages et dans la liste des membres
- **Sidebar Layout** : avatar utilisateur dans le menu latéral affiche la photo si disponible
- Partout où les initiales s'affichaient, la photo de profil est maintenant prioritaire
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

## Déploiement

### Vercel — Frontend Web ✅

- **Plateforme** : [Vercel](https://vercel.com)
- **Root Directory** : `hiredge` (sous-dossier du repo)
- **Framework** : Next.js (auto-détecté)
- **Build Command** : `turbo run build --filter=@hiredge/web`
- **Output Directory** : `apps/web/.next`
- **Install Command** : `rm -f package-lock.json && npm install`
- **Config** : `hiredge/vercel.json`

**Problème résolu — Cross-platform lockfile** :
Le `package-lock.json` généré sur Windows ne contient pas les bindings natifs Linux (`@tailwindcss/oxide-linux-x64-gnu`, `@next/swc-linux-x64-gnu`). La solution est de supprimer le lockfile dans l'install command Vercel pour que npm résolve les dépendances natives Linux.

> ⚠️ **NE PAS MODIFIER** `hiredge/vercel.json` — le frontend est déployé et fonctionnel.

### Railway — Backend API ✅

- **Plateforme** : [Railway](https://railway.app)
- **Root Directory** : `hiredge`
- **Builder** : Dockerfile (`hiredge/Dockerfile`)
- **Config** : `hiredge/railway.toml`
- **Healthcheck** : `GET /health` (timeout 300s)
- **Region** : us-west2

**Dockerfile multi-stage (6 stages)** :

| Stage | Rôle |
|-------|------|
| `base` | `node:20-alpine` + openssl |
| `deps` | `npm ci` — toutes les dépendances (build + runtime) |
| `shared-build` | Compile `@hiredge/shared` (tsc) |
| `api-build` | `prisma generate` + compile API (`tsc` + `tsc-alias`) |
| `prod-deps` | `npm ci --omit=dev` — dépendances production seulement |
| `runner` | Image finale — openssl, utilisateur non-root, copies ciblées |

**Problèmes résolus** :

1. **`npm ci` sans lockfile** — Le monorepo nécessite un `package-lock.json` généré via `npm install` à la racine `hiredge/`
2. **`@hiredge/shared` sans script build** — Ajout de `"build": "tsc"` dans `packages/shared/package.json` + configuration tsconfig (rootDir, declaration, noEmit:false, module:CommonJS)
3. **`Cannot read file '/app/tsconfig.json'`** — Les tsconfig.build.json héritent du root tsconfig. Ajout de `COPY tsconfig.json ./` dans les stages `shared-build` et `api-build`
4. **`tsc-alias` : missing `run-parallel`** — Dépendance transitive manquante (tsc-alias → globby → fast-glob → @nodelib/fs.scandir → run-parallel). Bug npm de résolution. Ajout explicite en devDependencies
5. **Prisma binary target mismatch** — `prisma generate` générait pour `linux-musl` mais le runtime (avec openssl) attendait `linux-musl-openssl-3.0.x`. Ajout de `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]` dans `schema.prisma`
6. **OpenSSL manquant** — Le moteur Prisma nécessite openssl sur Alpine. `apk add --no-cache openssl` ajouté dans `base` ET `runner`
7. **Prisma client non copié dans runner** — `prisma generate` tournait dans `api-build` mais les node_modules du runner venaient de `prod-deps`. Ajout de `COPY --from=api-build /app/node_modules/.prisma ./node_modules/.prisma`
8. **`@hiredge/shared` symlink perdu** — Docker COPY suit les symlinks (workspace npm), donc `require('@hiredge/shared')` ne trouvait pas `dist/`. Ajout de `COPY --from=shared-build .../dist → node_modules/@hiredge/shared/dist`
9. **`/app/uploads` inexistant** — `fastify-static` crash si le dossier root n'existe pas. Ajout de `mkdir -p /app/uploads`

**Variables d'environnement requises sur Railway** :

| Variable | Source | Obligatoire |
|----------|--------|:-----------:|
| `DATABASE_URL` | Railway PostgreSQL (auto) | ✅ |
| `REDIS_URL` | Railway Redis (auto) | ✅ |
| `JWT_SECRET` | `openssl rand -base64 32` | ✅ |
| `JWT_REFRESH_SECRET` | `openssl rand -base64 32` | ✅ |
| `OPENAI_API_KEY` | OpenAI | Pour IA |
| `ANTHROPIC_API_KEY` | Anthropic | Pour IA |
| `CORS_ORIGIN` | URL Vercel (ex: `https://hiredge.vercel.app`) | ✅ |

> ⚠️ Sans `JWT_SECRET` et `JWT_REFRESH_SECRET`, l'app crash au démarrage avec `FATAL: JWT_SECRET must be set in production`.

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

---

## Déploiement

### Vercel (Frontend Web — Next.js)
- **Repo** : `nelson227/HIREDGE` — branche `main`
- **Root directory** : `hiredge/` (racine du monorepo)
- **Config** : `hiredge/vercel.json`
- **Build command** : `turbo run build --filter=@hiredge/web`
- **Output directory** : `apps/web/.next`
- **Install command** : `rm -f package-lock.json && npm install`
- **Framework** : Next.js

> ⚠️ **IMPORTANT — Bindings natifs cross-platform**
> Le `package-lock.json` généré sur Windows n'inclut pas les bindings natifs Linux nécessaires pour Vercel :
> - `@tailwindcss/oxide-linux-x64-gnu` (Tailwind CSS v4)
> - `@next/swc-linux-x64-gnu` / `@next/swc-linux-x64-musl` (Next.js SWC)
> 
> **Solution** : L'install command supprime le lockfile avant `npm install`, ce qui permet à npm de résoudre les dépendances natives pour la plateforme Linux de Vercel.

### Railway (Backend API — Fastify)
- **Config** : `hiredge/Dockerfile` (multi-stage build)
- **Stages** : `base` → `deps` → `shared-build` → `api-build` → `prod-deps` → `runner`
- Le package `@hiredge/shared` doit être buildé **AVANT** l'API (Turbo `dependsOn: ["^build"]`)
- `@hiredge/shared` : `main` = `./dist/index.js`, script build = `tsc`
- Le Dockerfile utilise `npm ci` qui nécessite un `package-lock.json` présent dans le repo

### Notes déploiement
- Toujours tester avec `npx turbo run build --filter=@hiredge/web` en local avant de push
- Les commits sur `main` déclenchent automatiquement un déploiement Vercel et Railway
- Si le build Vercel échoue avec des erreurs de native bindings, vérifier que l'install command supprime bien le lockfile
