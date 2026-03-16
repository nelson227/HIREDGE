# HIREDGE — Architecture Technique

---

## 1. VUE D'ENSEMBLE

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENTS                                     │
│                                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ App iOS  │  │App Android│  │  Web App     │  │ Dashboard    │    │
│  │ (React   │  │ (React   │  │  (Next.js)   │  │ Recruteur    │    │
│  │  Native) │  │  Native) │  │              │  │ (Next.js)    │    │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘  └──────┬───────┘    │
│       │              │               │                  │            │
└───────┼──────────────┼───────────────┼──────────────────┼────────────┘
        │              │               │                  │
        └──────────────┴───────┬───────┴──────────────────┘
                               │
                         HTTPS / WSS
                               │
┌──────────────────────────────┼────────────────────────────────────────┐
│                        API GATEWAY                                     │
│                     (Kong / AWS API Gateway)                           │
│                                                                        │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌─────────────┐ │
│  │Rate Limiting│  │Auth (JWT)    │  │Load Balancer│  │API Versioning│ │
│  └─────────────┘  └──────────────┘  └────────────┘  └─────────────┘ │
└──────────────────────────────┬────────────────────────────────────────┘
                               │
┌──────────────────────────────┼────────────────────────────────────────┐
│                       MICROSERVICES                                    │
│                                                                        │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────────┐ │
│  │ Auth       │ │ Profile    │ │ Job Search │ │ EDGE Agent         │ │
│  │ Service    │ │ Service    │ │ Service    │ │ Service            │ │
│  │ (Node.js)  │ │ (Node.js)  │ │ (Python)   │ │ (Python)           │ │
│  └────────────┘ └────────────┘ └────────────┘ └────────────────────┘ │
│                                                                        │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────────┐ │
│  │ Squad      │ │ Scout      │ │ Interview  │ │ Analytics          │ │
│  │ Service    │ │ Service    │ │ Prep       │ │ Service            │ │
│  │ (Node.js)  │ │ (Node.js)  │ │ Service   │ │ (Python)           │ │
│  │            │ │            │ │ (Python)   │ │                    │ │
│  └────────────┘ └────────────┘ └────────────┘ └────────────────────┘ │
│                                                                        │
│  ┌────────────┐ ┌────────────┐ ┌──────────────────────────────────┐  │
│  │ Notif      │ │ Payment    │ │ Scraping Orchestrator             │  │
│  │ Service    │ │ Service    │ │ (Python + Celery)                 │  │
│  │ (Node.js)  │ │ (Node.js)  │ │                                   │  │
│  └────────────┘ └────────────┘ └──────────────────────────────────┘  │
└──────────────────────────────┬────────────────────────────────────────┘
                               │
┌──────────────────────────────┼────────────────────────────────────────┐
│                        DATA LAYER                                      │
│                                                                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │PostgreSQL│ │  Redis   │ │Pinecone/ │ │  S3/     │ │ClickHouse│  │
│  │(Primary  │ │(Cache +  │ │Weaviate  │ │  R2      │ │(Analytics│  │
│  │ DB)      │ │ Sessions │ │(Vector   │ │(Files)   │ │ OLAP)    │  │
│  │          │ │ + Queue) │ │ Search)  │ │          │ │          │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. STACK TECHNOLOGIQUE DÉTAILLÉ

### 2.1 Frontend

| Composant | Technologie | Justification |
|-----------|------------|---------------|
| **App Mobile** | React Native + Expo | Code partagé iOS/Android, écosystème riche, hot reload |
| **Web App** | Next.js 14+ (App Router) | SSR/SSG, performance, SEO pour les pages publiques |
| **Dashboard Recruteur** | Next.js 14+ | Même stack, composants partagés |
| **State Management** | Zustand | Léger, simple, performant (pas besoin de Redux) |
| **Data Fetching** | TanStack Query (React Query) | Cache intelligent, invalidation, optimistic updates |
| **Real-time** | Socket.io Client | WebSockets pour le chat d'escouade et les notifications |
| **UI Components** | Tailwind CSS + Radix UI (web) / NativeWind (mobile) | Design system cohérent, accessible |
| **Forms** | React Hook Form + Zod | Validation robuste, performance |
| **Animations** | Framer Motion (web) / Reanimated (mobile) | UX fluide, micro-interactions |
| **Audio/Visio** | WebRTC + Daily.co / LiveKit | Appels en visio pour les mock interviews |
| **Charts** | Recharts | Graphiques pour le dashboard analytics |

### 2.2 Backend

| Composant | Technologie | Justification |
|-----------|------------|---------------|
| **API Gateway** | Kong ou AWS API Gateway | Rate limiting, auth, routing, versioning |
| **Services principaux** | Node.js (Express/Fastify) | Performance, écosystème NPM, même langage que le front |
| **Services IA** | Python (FastAPI) | Écosystème ML/IA natif, async, rapide |
| **Message Queue** | Redis Streams ou RabbitMQ | Communication inter-services, jobs asynchrones |
| **Task Queue** | Celery (Python) + Redis | Jobs longs (scraping, génération IA) |
| **Scraping** | Playwright (Python) + Scrapy | Scraping robuste, headless browser quand nécessaire |
| **Auth** | JWT (access + refresh tokens) + bcrypt | Standard sécurisé |
| **Email** | Resend / SendGrid | Emails transactionnels et notifications |
| **Push Notifications** | Firebase Cloud Messaging (FCM) + APNs | Notifications push iOS/Android |

### 2.3 IA & Machine Learning

| Composant | Technologie | Justification |
|-----------|------------|---------------|
| **LLM Principal** | OpenAI GPT-4o / Claude 3.5 | Qualité de génération (lettres, analyses, conversations) |
| **LLM Rapide (tâches simples)** | GPT-4o-mini / Claude Haiku / Mistral | Résumés, classifications, coût réduit |
| **Embeddings** | OpenAI text-embedding-3-large | Recherche sémantique d'offres et de profils |
| **Vector Database** | Pinecone ou Weaviate | Stockage et recherche des embeddings |
| **Speech-to-Text** | OpenAI Whisper API | Transcription des vocaux et simulations d'entretien |
| **Text-to-Speech** | ElevenLabs / OpenAI TTS | Voix du recruteur IA dans les simulations |
| **Fine-tuning** | OpenAI Fine-tuning / LoRA | Modèles spécialisés sur les données d'entretien accumulées |
| **ML Ops** | MLflow / Weights & Biases | Suivi des modèles, expérimentation |

### 2.4 Base de Données

| DB | Usage | Justification |
|----|-------|---------------|
| **PostgreSQL** | Données relationnelles (users, offres, candidatures, escouades, éclaireurs) | ACID, robuste, scalable, extensions JSON |
| **Redis** | Cache, sessions, file d'attente de messages, rate limiting | Ultra-rapide, pub/sub pour le temps réel |
| **Pinecone/Weaviate** | Embeddings vectoriels (offres, profils, compétences) | Recherche sémantique performante |
| **ClickHouse** | Analytics (statistiques collectives, patterns, reporting) | OLAP colonaire, requêtes analytiques ultra-rapides |
| **S3 / Cloudflare R2** | Fichiers (CVs, photos, enregistrements audio) | Stockage objet scalable et économique |

### 2.5 Infrastructure

| Composant | Technologie | Justification |
|-----------|------------|---------------|
| **Cloud** | AWS (primaire) ou GCP | Scalabilité, services managés |
| **Containers** | Docker + Kubernetes (EKS) | Orchestration des microservices |
| **CI/CD** | GitHub Actions | Automatisation des déploiements |
| **Monitoring** | Datadog ou Grafana + Prometheus | Observabilité complète |
| **Logging** | ELK Stack (Elasticsearch, Logstash, Kibana) | Centralisation des logs |
| **Error Tracking** | Sentry | Détection et remontée des erreurs en temps réel |
| **CDN** | Cloudflare | Performance globale, DDoS protection |
| **DNS** | Cloudflare DNS | Rapidité, fiabilité |
| **Secrets** | AWS Secrets Manager / HashiCorp Vault | Gestion sécurisée des clés API |

---

## 3. ARCHITECTURE DES MICROSERVICES

### 3.1 Auth Service (Node.js)

```
Responsabilités :
├── Inscription (email, Google, Apple)
├── Connexion (JWT access + refresh tokens)
├── Vérification email
├── Réinitialisation mot de passe
├── MFA (optionnel)
├── Gestion des sessions
└── Rôles (candidat, éclaireur, recruteur, admin)

Dépendances :
├── PostgreSQL (users table)
├── Redis (sessions, tokens blacklist)
└── Email Service (Resend)
```

### 3.2 Profile Service (Node.js)

```
Responsabilités :
├── Gestion du profil candidat
│   ├── Informations personnelles
│   ├── Compétences
│   ├── Expériences
│   ├── Formation
│   ├── Préférences de recherche
│   └── Score de préparation
├── Import/parsing de CV (PDF/DOCX)
├── Import LinkedIn
├── Gestion du profil recruteur
└── Gestion du profil éclaireur

Dépendances :
├── PostgreSQL (profiles, skills, experiences)
├── S3 (stockage des CVs)
├── EDGE Agent Service (pour l'extraction IA du CV)
└── Pinecone (embeddings du profil pour le matching)
```

### 3.3 Job Search Service (Python)

```
Responsabilités :
├── Réception des offres scrapées
├── Déduplication des offres
├── Classification (secteur, niveau, type de contrat)
├── Détection d'arnaques
├── Détection d'offres fantômes
├── Calcul du score de matching (profil vs offre)
├── Recommandation personnalisée
└── Recherche et filtres avancés

Dépendances :
├── PostgreSQL (jobs table)
├── Pinecone (embeddings des offres)
├── Redis (cache des résultats de recherche)
├── Scraping Orchestrator (source des offres)
└── EDGE Agent Service (analyse IA)
```

### 3.4 EDGE Agent Service (Python — le coeur IA)

```
Responsabilités :
├── Génération de CV adapté
├── Génération de lettre de motivation ciblée
├── Analyse d'entreprise (culture, actus, valeurs)
├── Estimation du processus de recrutement
├── Estimation salariale
├── Conversation avec le candidat (onboarding, coaching)
├── Analyse post-rejet et plan d'amélioration
├── Génération de messages de relance
├── Détection anti-IA dans les textes générés
└── Orchestration des prompts et agents IA

Dépendances :
├── OpenAI API / Anthropic API
├── Pinecone (contexte entreprise, historique)
├── PostgreSQL (historique des candidatures, collective intelligence)
├── Redis (cache des analyses entreprise)
└── Scraping Orchestrator (enrichissement des données entreprise)
```

### 3.5 Squad Service (Node.js)

```
Responsabilités :
├── Algorithme de formation des escouades
├── Gestion du cycle de vie (création, dissolution, reformation)
├── Chat temps réel (texte + vocaux)
├── Appels visio (intégration Daily.co/LiveKit)
├── Animation IA du groupe
├── Détection d'inactivité
├── Anti-compétition (vérification des offres)
├── Célébrations et badges
└── Modération IA

Dépendances :
├── PostgreSQL (squads, members, messages)
├── Redis (pub/sub pour le temps réel)
├── Socket.io (WebSockets)
├── S3 (vocaux, fichiers partagés)
├── EDGE Agent Service (animation IA)
└── Daily.co/LiveKit (visio)
```

### 3.6 Scout Service (Node.js)

```
Responsabilités :
├── Inscription des éclaireurs
├── Vérification de l'entreprise
├── Questionnaire initial et mises à jour
├── Chat anonyme éclaireur ↔ candidat
├── Système de crédits
├── Notation et badges
├── Anonymisation zero-knowledge
└── Alertes quand un candidat postule

Dépendances :
├── PostgreSQL (scouts, companies, Q&A)
├── Redis (crédits, sessions anonymes)
└── Notification Service
```

### 3.7 Interview Prep Service (Python)

```
Responsabilités :
├── Génération de questions d'entretien personnalisées
├── Simulation d'entretien vocale (recruteur IA)
├── Analyse des réponses (contenu, structure, tics)
├── Scoring post-simulation
├── Rapport détaillé et recommandations
├── Coaching de négociation salariale
└── Brief pré-entretien

Dépendances :
├── OpenAI API (GPT-4o pour la simulation)
├── Whisper API (transcription des réponses)
├── ElevenLabs/OpenAI TTS (voix du recruteur)
├── PostgreSQL (historique des simulations)
├── Collective Intelligence DB (questions fréquentes par entreprise)
└── Scout Service (infos éclaireur intégrées dans la simulation)
```

### 3.8 Scraping Orchestrator (Python)

```
Responsabilités :
├── Orchestration des scrapers (Celery workers)
├── Scrapers par plateforme :
│   ├── LinkedIn Jobs Scraper
│   ├── Indeed Scraper
│   ├── Glassdoor Scraper
│   ├── Welcome to the Jungle Scraper
│   ├── Sites carrières Scraper (configurable par domaine)
│   ├── Twitter/X Scraper (posts "on recrute")
│   ├── Telegram Bot Monitor
│   ├── Discord Bot Monitor
│   └── Pôle Emploi / APIs gouvernementales
├── Normalisation des offres
├── Enrichissement des données entreprise
├── Scheduling et retry logic
└── Respect des rate limits et des robots.txt

Dépendances :
├── Celery + Redis (task queue)
├── Playwright (headless browser)
├── Scrapy (scraping structuré)
├── PostgreSQL (offres brutes et normalisées)
├── Proxy rotation service
└── Job Search Service (destination des offres)
```

### 3.9 Notification Service (Node.js)

```
Responsabilités :
├── Notifications push (iOS/Android)
├── Notifications in-app
├── Emails transactionnels
├── Gestion des préférences de notification
├── Anti-spam (max 10 push/jour)
└── Templates de notifications par type

Dépendances :
├── FCM (Firebase Cloud Messaging) pour Android
├── APNs pour iOS
├── Resend/SendGrid pour les emails
├── Redis (queue de notifications)
└── PostgreSQL (préférences, historique)
```

### 3.10 Analytics Service (Python)

```
Responsabilités :
├── Statistiques individuelles (taux de réponse, conversion)
├── Intelligence collective (patterns de réussite)
├── Analytics B2B (attractivité des offres)
├── Rapports et dashboards
├── Détection de tendances du marché
└── Export de données

Dépendances :
├── ClickHouse (OLAP analytics)
├── PostgreSQL (source de données)
├── Redis (cache des calculs récurrents)
└── Grafana (dashboards internes)
```

### 3.11 Payment Service (Node.js)

```
Responsabilités :
├── Gestion des abonnements (freemium → premium)
├── Paiement B2B (entreprises, recruteurs)
├── Facturation et reçus
├── Gestion des crédits éclaireurs
└── Webhooks Stripe

Dépendances :
├── Stripe (paiements)
├── PostgreSQL (subscriptions, invoices)
└── Notification Service (emails de confirmation)
```
### 3.12 Admin Service (Node.js) ✅

```
Responsabilités :
├── Authentification admin dédiée (bcrypt + JWT 2h)
├── Dashboard de statistiques plateforme
│   ├── Total utilisateurs, offres, candidatures, escouades
│   ├── Répartition par rôle et abonnement
│   ├── Inscriptions et activité récentes
├── Gestion des utilisateurs
│   ├── Liste paginée avec filtres (rôle, abonnement, recherche)
│   ├── Détail utilisateur complet
│   ├── Modification de rôle
│   ├── Modification d'abonnement
│   └── Suppression d'utilisateur
└── Guard de sécurité (preHandler requireRole ADMIN)

Dépendances :
├── PostgreSQL (users, profiles, stats)
├── Auth middleware (JWT + role guard)
└── bcryptjs (vérification mot de passe admin)
```
---

## 4. SCHÉMA DE BASE DE DONNÉES (SIMPLIFIÉ)

```sql
-- UTILISATEURS
users
├── id (UUID PK)
├── email (UNIQUE)
├── password_hash
├── role (candidate | scout | recruiter | admin)
├── created_at
├── last_active_at
└── subscription_tier (free | premium)

-- PROFILS CANDIDATS
candidate_profiles
├── id (UUID PK)
├── user_id (FK → users)
├── first_name
├── last_name
├── title (ex: "Développeur React")
├── bio
├── location_city
├── location_country
├── remote_preference (remote | hybrid | onsite)
├── salary_min
├── salary_max
├── years_experience
├── preparation_score (0-100)
├── profile_embedding (vector reference)
└── updated_at

-- COMPÉTENCES
skills
├── id (PK)
├── candidate_id (FK)
├── name
├── level (beginner | intermediate | advanced | expert)
└── years

-- EXPÉRIENCES
experiences
├── id (PK)
├── candidate_id (FK)
├── company_name
├── title
├── start_date
├── end_date
├── description
└── is_current

-- OFFRES D'EMPLOI
jobs
├── id (UUID PK)
├── title
├── company_id (FK → companies)
├── description
├── requirements
├── salary_min
├── salary_max
├── location_city
├── location_country
├── remote_type
├── contract_type (CDI | CDD | freelance | stage)
├── source_platform
├── source_url
├── is_active
├── is_ghost (détecté comme fantôme)
├── is_scam (détecté comme arnaque)
├── job_embedding (vector reference)
├── scraped_at
└── expires_at

-- ENTREPRISES
companies
├── id (UUID PK)
├── name
├── website
├── industry
├── size_range
├── location
├── glassdoor_rating
├── culture_summary (généré par IA)
├── avg_recruitment_duration_days
├── avg_response_rate
├── avg_salary_offered_json
└── updated_at

-- CANDIDATURES
applications
├── id (UUID PK)
├── candidate_id (FK)
├── job_id (FK)
├── status (draft | sent | viewed | interview | offer | accepted | rejected)
├── cv_version_url (S3 path)
├── cover_letter_text
├── company_analysis_json
├── match_score (0-100)
├── sent_at
├── last_status_change_at
├── rejection_reason (IA analysis)
├── notes
└── created_at

-- ESCOUADES
squads
├── id (UUID PK)
├── name
├── domain
├── level
├── status (active | dissolved)
├── created_at
└── dissolved_at

-- MEMBRES D'ESCOUADE
squad_members
├── id (PK)
├── squad_id (FK)
├── candidate_id (FK)
├── joined_at
├── left_at
├── is_active
└── role (member | champion)

-- MESSAGES D'ESCOUADE
squad_messages
├── id (UUID PK)
├── squad_id (FK)
├── sender_id (FK → users)
├── content_text
├── content_audio_url (S3)
├── message_type (text | voice | system | celebration)
└── created_at

-- ÉCLAIREURS
scouts
├── id (UUID PK)
├── user_id (FK)
├── company_id (FK)
├── is_verified
├── anonymous_alias
├── credits
├── rating_avg
├── hired_date
├── questionnaire_json
└── created_at

-- CONVERSATIONS ÉCLAIREUR-CANDIDAT
scout_conversations
├── id (UUID PK)
├── scout_id (FK)
├── candidate_id (FK)
├── job_id (FK)
└── created_at

scout_messages
├── id (UUID PK)
├── conversation_id (FK)
├── sender_type (scout | candidate)
├── content
└── created_at

-- SIMULATIONS D'ENTRETIEN
interview_simulations
├── id (UUID PK)
├── candidate_id (FK)
├── job_id (FK)
├── type (hr | technical | case | culture | negotiation)
├── duration_seconds
├── score (0-100)
├── transcript_json
├── analysis_json
├── audio_url (S3)
└── created_at

-- INTELLIGENCE COLLECTIVE
collective_insights
├── id (UUID PK)
├── company_id (FK)
├── insight_type (interview_question | salary_data | process_info | timing_pattern)
├── content_json
├── source_count (nombre de data points)
├── confidence_score
└── updated_at

-- NOTIFICATIONS
notifications
├── id (UUID PK)
├── user_id (FK)
├── type
├── title
├── body
├── data_json
├── is_read
├── sent_at
└── read_at
```

---

## 5. SÉCURITÉ

### 5.1 Architecture de Sécurité

```
CLIENT → HTTPS (TLS 1.3) → API GATEWAY
                               │
                     ┌─────────┴─────────┐
                     │ Rate Limiting      │
                     │ IP Blacklisting    │
                     │ JWT Validation     │
                     │ CORS Policy        │
                     │ Input Sanitization │
                     └─────────┬─────────┘
                               │
                          MICROSERVICES
                               │
                     ┌─────────┴─────────┐
                     │ Service-to-Service │
                     │ Auth (mTLS)        │
                     │ Principle of Least │
                     │ Privilege          │
                     └─────────┬─────────┘
                               │
                          DATA LAYER
                               │
                     ┌─────────┴─────────┐
                     │ Encryption at Rest │
                     │ (AES-256)          │
                     │ Access Control     │
                     │ Audit Logging      │
                     └───────────────────┘
```

### 5.2 Anonymat des Éclaireurs (Zero-Knowledge)

```
Principe :
- L'éclaireur est identifié par un pseudo aléatoire par conversation
- Le lien user_id ↔ anonymous_alias est chiffré avec une clé
  que seul l'éclaireur possède
- Les messages sont chiffrés bout-en-bout (E2EE)
- Même un admin HIREDGE ne peut pas identifier un éclaireur 
  à partir de ses messages
- Si l'éclaireur supprime son compte, tous ses messages restent
  mais sont définitivement orphelins
```

### 5.3 Protection des Données

- **RGPD** : consentement explicite, droit à l'oubli, export des données, DPO désigné
- **Chiffrement** : AES-256 au repos, TLS 1.3 en transit
- **Pas de vente de données** : les données agrégées (intelligence collective) sont anonymisées de manière irréversible
- **Audit trail** : toutes les actions sensibles sont loguées
- **Pentest** : audit de sécurité trimestriel

---

## 6. SCALABILITÉ

### 6.1 Stratégie

```
Phase 1 (0-50K users) :
  - Monolithe modulaire (pas encore de microservices)
  - PostgreSQL single instance
  - Redis single instance
  - Déploiement sur Railway/Render ou AWS EC2

Phase 2 (50K-500K users) :
  - Split en microservices (les services les plus sollicités d'abord)
  - PostgreSQL avec read replicas
  - Redis cluster
  - Kubernetes pour l'orchestration

Phase 3 (500K-5M users) :
  - Full microservices
  - Database sharding par région
  - Multi-region deployment
  - CDN global
  - Auto-scaling sur le scraping et l'IA
```

### 6.2 Optimisation des Coûts IA

```
Stratégie de routing des LLMs :

Tâche simple (classification, résumé court) 
  → GPT-4o-mini / Claude Haiku (~$0.001/requête)

Tâche moyenne (analyse d'offre, relance)
  → GPT-4o-mini / Claude Sonnet (~$0.005/requête)

Tâche complexe (lettre de motivation, simulation d'entretien)
  → GPT-4o / Claude Opus (~$0.03/requête)

Cache agressif :
  - Analyse d'entreprise → cache 7 jours
  - Questions d'entretien par entreprise → cache 30 jours
  - Profil candidat embedding → recalcul uniquement si profil modifié
```

---

## 7. COMMUNICATION INTER-SERVICES

```
Synchrone (HTTP/gRPC) :
  - Auth → Profile (vérification de l'identité)
  - Client → API Gateway → Service (requêtes utilisateur)

Asynchrone (Redis Streams / RabbitMQ) :
  - Scraping Orchestrator → Job Search Service (nouvelles offres)
  - Application créée → Analytics Service (mise à jour des stats)
  - Membre embauché → Scout Service (proposition éclaireur)
  - Membre embauché → Squad Service (célébration + reformation)

Temps réel (WebSockets / Socket.io) :
  - Squad Service → Clients (messages de chat)
  - Notification Service → Clients (notifications push in-app)
  - Interview Prep → Client (simulation vocale en streaming)
```

---

*Document d'architecture — Version 1.1*
