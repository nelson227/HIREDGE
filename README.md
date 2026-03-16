# HIREDGE — L'Agent IA Qui Te Fait Embaucher

> **LinkedIn te dit qui tu es. Sorce postule à ta place. HIREDGE te fait embaucher — et tu n'es jamais seul dans le processus.**

---

## 🎯 Qu'est-ce que HIREDGE ?

HIREDGE est une **application mobile et web** de recherche d'emploi révolutionnaire qui combine :

1. **Un Agent IA Personnel ("EDGE")** qui travaille pour toi 24h/24 : il cherche, analyse, prépare tes candidatures et te coach
2. **L'Intelligence de Meute** : un système social unique où les candidats s'entraident au sein d'**escouades**, sont guidés par des **éclaireurs** (récemment embauchés), et bénéficient d'une **base de données collective** enrichie par chaque candidature
3. **Un accompagnement de A à Z** : de la recherche d'offres jusqu'à la négociation salariale post-embauche, en passant par la préparation aux entretiens

---

## 💡 Le Problème Que Nous Résolvons

### La recherche d'emploi en 2026 est un enfer solitaire

- **80% des candidatures** restent sans réponse
- **70% des offres** ne sont jamais publiées sur les plateformes classiques
- Les candidats envoient des **candidatures génériques** en masse (spray & pray)
- La **préparation aux entretiens** se fait seul, sans feedback
- Le **processus est opaque** : tu ne sais jamais où en est ta candidature ni pourquoi tu es refusé
- La recherche d'emploi provoque **stress, solitude et dépression**

### Ce que les solutions actuelles ne résolvent PAS

| Solution | Ce qu'elle fait | Ce qu'elle ne fait PAS |
|----------|----------------|----------------------|
| **LinkedIn** | Réseau professionnel, offres d'emploi | Ne t'accompagne pas, pas d'intelligence collective, pas de préparation |
| **Sorce** | Postulation automatique par swipe | Candidatures génériques, pas de suivi, pas de préparation entretien, écosystème fermé |
| **Indeed/Glassdoor** | Agrégation d'offres | Aucun accompagnement, aucune intelligence |
| **ChatGPT** | Aide à rédiger CV/lettres | Pas de recherche d'offres, pas de social, pas de suivi |

---

## 🚀 La Solution HIREDGE

### 1. Agent IA Personnel "EDGE"
Chaque utilisateur reçoit un agent IA qui :
- Scrape TOUTES les plateformes (LinkedIn, Indeed, sites d'entreprises, Twitter, Telegram, Discord) pour trouver des offres **invisibles** ailleurs
- Analyse chaque offre vs ton profil et ne te montre que celles où tu as une **vraie chance**
- Prépare un **dossier de candidature complet** pour chaque offre validée (CV adapté, lettre ciblée, analyse de l'entreprise, fourchette salariale réelle)
- Gère le **timing de relance** optimal et le suivi post-candidature
- Analyse tes refus et te donne un **plan d'amélioration**

### 2. Escouades (5-8 personnes)
- Groupes de candidats dans le **même domaine et niveau**, automatiquement formés par l'IA
- **Pas en compétition** (l'IA s'assure qu'ils ne postulent pas aux mêmes offres)
- Partage d'informations en temps réel (questions d'entretien, conseils, offres trouvées)
- Mock interviews collectives
- Soutien moral et motivation

### 3. Éclaireurs
- Des personnes **récemment embauchées** (< 6 mois) dans une entreprise
- Partagent anonymement des infos internes : culture, processus de recrutement, salaires réels, ce que le manager cherche vraiment
- Connectés aux candidats qui postulent dans leur entreprise
- Système de crédits réciproque

### 4. Intelligence Collective
- Chaque candidature enrichit une **base de données anonyme** sur les entreprises
- Statistiques réelles : taux d'acceptation, durée du processus, questions fréquentes, salaires proposés
- Patterns de réussite détectés par l'IA : *"Les candidats qui mentionnent X ont 34% de chances en plus chez Y"*

---

## 💰 Modèle Économique

| Source | Détails | Revenu estimé |
|--------|---------|---------------|
| **Freemium** | 1 candidature EDGE/semaine, escouade basique | Acquisition |
| **Premium Candidat** (12.99€/mois) | Agent illimité, éclaireurs, simulations avancées | Revenu principal |
| **Entreprises** | Offres sponsorisées, accès aux candidats qualifiés | B2B |
| **Recruteurs** (99-499€/mois) | Dashboard de candidats actifs et motivés | B2B |
| **Partenariats formation** | Redirection vers des formations pour combler les lacunes identifiées | Commission |

---

## 🎯 Public Cible

### Primaire
- **Chercheurs d'emploi actifs** (18-45 ans)
- **Jeunes diplômés** entrant sur le marché du travail
- **Professionnels en reconversion**

### Secondaire
- **Expatriés et immigrants** cherchant un emploi dans un nouveau pays
- **Freelances** cherchant des missions
- **Candidats passifs** ouverts aux opportunités

### Tertiaire (B2B)
- **Recruteurs** cherchant des candidats qualifiés et motivés
- **Entreprises** souhaitant attirer les meilleurs talents

---

## 🌍 Marché

- **Marché mondial du recrutement en ligne** : ~30 milliards $ (2026)
- **Nombre de chercheurs d'emploi actifs** : ~220 millions dans le monde à tout moment
- **Zones de lancement prioritaires** : France, Afrique francophone, Canada francophone, puis expansion anglophone

---

## 🏗️ Stack Technique

| Composant | Technologie | Statut |
|-----------|------------|--------|
| **Mobile** | React Native + Expo 51 | ✅ Déployé |
| **Web** | Next.js 14 (App Router) + Tailwind + Radix UI | ✅ Déployé sur Vercel |
| **Backend** | Node.js + Fastify 5 + TypeScript | ✅ Déployé sur Railway |
| **Base de données** | PostgreSQL 16 (Railway) + Redis 7 | ✅ Production |
| **ORM** | Prisma 5.22 (20 modèles, 15+ enums) | ✅ |
| **IA / LLM** | OpenAI GPT-4o / Claude (via agents) | ✅ |
| **Validation** | Zod (partagé frontend/backend via `@hiredge/shared`) | ✅ |
| **Temps réel** | Socket.io (WebSockets) | ✅ |
| **Monorepo** | Turborepo + npm workspaces | ✅ |
| **Appels vidéo** | Jitsi Meet (gratuit, nouvel onglet) | ✅ |
| **Messages vocaux** | MediaRecorder API + fichiers serveur | ✅ |
| **CI/CD** | GitHub Actions (5 jobs) | ✅ |
| **Docker** | Multi-stage build, docker-compose | ✅ |
| **Recherche sémantique** | Pinecone / Weaviate (vector DB) — prévu | 🔜 |
| **Scraping** | Adzuna API + JSearch (RapidAPI) | ✅ |

### URLs de Production

| Service | URL |
|---------|-----|
| **Web App** | https://hiredge-six.vercel.app |
| **API Backend** | https://hiredge-production.up.railway.app |
| **GitHub** | https://github.com/nelson227/HIREDGE.git |

---

## 🚀 Fonctionnalités Implémentées (Mars 2026)

### Agent IA "EDGE"
- Chat conversationnel avec détection d'intention
- Génération de dossiers de candidature (CV adapté, lettre de motivation, analyse entreprise)
- Recommandations d'offres avec scoring de compatibilité

### Offres d'emploi
- 120+ offres réelles importées (marché canadien via Adzuna)
- Recherche avec filtres (contrat, localisation, salaire)
- Système de matching profil/offre

### Candidatures
- Pipeline complet (brouillon → validation → envoi → suivi)
- Dashboard avec statistiques
- Limites par abonnement

### Escouades (Groupes de soutien)
- Création, invitation par code, rejoindre par ID
- Multi-escouades (jusqu'à 5 par utilisateur)
- **Chat WhatsApp-style** :
  - Messages texte en temps réel
  - Messages vocaux (enregistrement + lecture)
  - Réactions emoji (8 emojis rapides au survol)
  - Répondre à un message (citation cliquable qui scroll au message original)
  - Menu contextuel (Répondre, Copier, Réagir, Épingler, Important, Supprimer)
  - Suppression pour moi / pour tous (règle 1h pour suppression collective)
  - Badges épinglé 📌 et important ⭐
- Appels vidéo via Jitsi Meet
- Événements planifiés (réunions, appels, revues)
- Membres en ligne, indicateurs de statut
- Layout 3 panneaux (liste / chat / membres)

### Simulation d'entretien
- Multi-types (RH, technique, stress, culture fit)
- Personnage IA avec personnalité configurable
- Évaluation en temps réel + rapport détaillé

### Éclaireurs
- Inscription et questionnaires
- Chat anonyme avec les candidats
- Système de crédits

### Notifications
- Centre de notifications avec types/priorités
- Compteur de non-lus
- Marquer comme lu

### Profil & Onboarding
- Onboarding interactif en 5 étapes
- Profil complet (compétences, expériences, formation)
- **Photo de profil** : upload avatar (JPG/PNG/WebP), affichée partout (profil, chat, sidebar)
- Score de complétion

### Panneau d'Administration
- **Dashboard admin** : statistiques plateforme (users, jobs, candidatures, escouades)
- **Gestion utilisateurs** : liste paginée, filtres (rôle, abonnement), recherche, tri
- **Actions admin** : modifier rôle, modifier abonnement, supprimer utilisateur
- **Authentification admin dédiée** : login séparé avec email/mot de passe (bcrypt + JWT 2h)
- **Guard de sécurité** : vérification du token admin en sessionStorage + rôle ADMIN
- **Session admin** : nettoyée automatiquement lors du logout principal

---

## 📊 Métriques Clés (KPIs)

- **Taux d'embauche** : % d'utilisateurs qui trouvent un emploi via HIREDGE
- **Temps moyen jusqu'à l'embauche** : objectif = réduire de 50% vs la moyenne
- **Taux de réponse aux candidatures** : objectif > 40% (vs ~20% en moyenne)
- **Rétention des escouades** : % de membres actifs quotidiennement
- **NPS (Net Promoter Score)** : objectif > 60
- **Nombre d'éclaireurs actifs** par entreprise

---

## 🔒 Vie Privée et Éthique

- **Données personnelles chiffrées** (AES-256)
- **Les éclaireurs sont anonymes** — jamais identifiables par leur entreprise
- **RGPD / CCPA compliant**
- **Pas de vente de données** à des tiers
- **Transparence algorithmique** : l'utilisateur sait pourquoi une offre lui est recommandée
- **Anti-discrimination** : l'IA est auditée pour éliminer les biais (genre, origine, âge, école)

---

## 📞 Contact

- **Projet** : HIREDGE
- **Statut** : ✅ MVP complet — en production (Web + API + Mobile) + Panneau Admin
- **Dernière mise à jour** : Mars 2026 (Session 14)
- **Équipe** : En cours de constitution

---

*Ce document est la source de vérité pour comprendre la vision globale de HIREDGE.*
