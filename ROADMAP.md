# HIREDGE — Roadmap (Plan de Développement)

---

## Vue d'Ensemble

```
2026 Q2 ──► 2026 Q3 ──► 2026 Q4 ──► 2027 Q1 ──► 2027 Q2 ──► 2027+
  MVP        BETA       LAUNCH V1    SCALE       EXPAND     DOMINATE
```

---

## PHASE 0 — FONDATIONS (Mois 1-2 : Avril-Mai 2026)

### Objectif : Poser les bases techniques et valider le concept

#### Semaine 1-2 : Setup & Infrastructure
- [x] Initialiser le monorepo (Turborepo + npm workspaces) ✅
- [x] Setup CI/CD (GitHub Actions — 5 jobs) ✅
- [x] Configurer l'infrastructure cloud (Railway pour API + PostgreSQL, Vercel pour Web) ✅
- [x] Créer la base de données PostgreSQL + Redis ✅
- [x] Setup du projet React Native (Expo 51) ✅
- [x] Setup du projet Next.js (Next.js 14 App Router) ✅
- [x] Setup du backend Node.js (Fastify 5 + TypeScript) ✅
- [ ] Setup du service Python (IA) — non requis, agents IA intégrés en Node.js
- [x] Configurer les environnements (dev, staging, prod) ✅

#### Semaine 3-4 : Auth & Profil
- [x] Implémenter l'authentification (JWT + refresh tokens) ✅
- [x] Créer le système de profil candidat ✅
- [x] Upload de photo de profil (avatar JPG/PNG/WebP, affiché dans profil, chat, sidebar) ✅
- [ ] Développer le parsing de CV (PDF/DOCX → données structurées via IA)
- [x] Créer l'onboarding conversationnel avec EDGE ✅
- [x] Implémenter le score de préparation ✅
- [x] Tests unitaires et d'intégration (Vitest, 25 tests) ✅

#### Semaine 5-6 : Agent EDGE Core
- [x] Développer le pipeline de prompts pour la conversation EDGE ✅
- [x] Implémenter la génération de CV adapté ✅
- [x] Implémenter la génération de lettre de motivation ciblée ✅
- [x] Créer le système de matching offre/profil (scoring multi-critère) ✅
- [x] Développer l'analyse d'entreprise automatique ✅
- [ ] Tests de qualité des sorties IA

#### Semaine 7-8 : Scraping v1
- [x] Intégrer l'API Adzuna (Canada, illimité) ✅
- [x] Intégrer JSearch / RapidAPI (LinkedIn, Indeed, Glassdoor) ✅
- [ ] Développer le crawler de sites carrières (top 100 entreprises cibles)
- [x] Implémenter la déduplication d'offres ✅
- [ ] Implémenter la détection d'arnaques (patterns basiques)
- [x] Stocker et indexer les offres dans PostgreSQL ✅ (120+ offres Canada)

### Livrables Phase 0 :
- ✅ App fonctionnelle (inscription, profil, import CV)
- ✅ Agent EDGE qui recommande des offres et génère des dossiers
- ✅ ~10 000 offres scrapées et indexées
- ✅ Infrastructure stable

---

## PHASE 1 — MVP (Mois 3-4 : Juin-Juillet 2026)

### Objectif : MVP testable avec les premiers utilisateurs

#### Candidatures
- [x] Pipeline de candidature complet (draft → validation → envoi) ✅
- [x] Dashboard kanban de suivi ✅
- [ ] Système de relance intelligente
- [x] Notifications push (offres compatibles, relances) ✅
- [x] Historique et statistiques personnelles ✅

#### Escouades v1
- [x] Algorithme de formation des escouades (suggestions IA) ✅
- [x] Chat de groupe temps réel (texte) ✅
- [x] Messages vocaux (enregistrement + lecture) ✅
- [ ] Système d'animation IA (questions du jour, défis)
- [ ] Détection d'inactivité et relance
- [ ] Événement de célébration quand un membre est embauché

#### Éclaireurs v1
- [x] Inscription comme éclaireur ✅
- [x] Questionnaire initial ✅
- [x] Chat anonyme éclaireur ↔ candidat (basique) ✅
- [x] Système de crédits ✅

#### UI/UX Mobile
- [x] Écrans d'onboarding (5 étapes) ✅
- [x] Feed d'offres recommandées ✅
- [x] Écran de dossier de candidature ✅
- [x] Écran escouade (chat) ✅
- [x] Écran dashboard / pipeline ✅
- [x] Écran notifications ✅
- [x] Design system complet (Button, Input, Card, Badge, Avatar, EmptyState) ✅

### Tests & Validation
- [ ] Beta fermée : 50-100 utilisateurs (étudiants en informatique)
- [ ] Recueillir le feedback (interviews, surveys)
- [ ] Mesurer les KPIs : taux d'envoi de candidature, engagement escouade
- [ ] Itérer sur les retours

### Livrables Phase 1 :
- ✅ MVP complet testable sur iOS et Android
- ✅ Escouades fonctionnelles
- ✅ Éclaireurs basiques
- ✅ 50-100 beta testeurs actifs
- ✅ Premiers retours utilisateurs

---

## PHASE 2 — BETA PUBLIQUE (Mois 5-6 : Août-Septembre 2026)

### Objectif : Ouvrir à 1000+ utilisateurs, polir l'expérience

#### Amélioration de l'Agent EDGE
- [ ] Scraper LinkedIn Jobs (API ou scraping avancé)
- [ ] Scraper Glassdoor
- [ ] Détection d'offres dans les posts Twitter/X
- [ ] Détection d'offres fantômes (ML)
- [ ] Amélioration de la qualité des lettres (feedback loop)
- [ ] Détection anti-IA dans les textes générés
- [ ] Estimation du processus de recrutement par entreprise

#### Préparation Entretiens
- [x] Simulation d'entretien IA (multi-phase, personnage configurable) ✅
- [ ] Transcription Whisper des réponses (vocal)
- [x] Analyse des réponses (contenu, structure, évaluation temps réel) ✅
- [x] Rapport post-simulation détaillé ✅
- [ ] Questions fréquentes par entreprise (intelligence collective)
- [ ] Brief pré-entretien (J-1 notification)

#### Escouades v2 ✅
- [x] Appels visio intégrés (Jitsi Meet, nouvel onglet) ✅
- [x] Multi-escouades (jusqu'à 5 par utilisateur) ✅
- [x] Layout 3 panneaux style WhatsApp ✅
- [x] Réactions emoji (8 emojis rapides au survol) ✅
- [x] Répondre à un message (citation + scroll au message original) ✅
- [x] Menu contextuel (Répondre, Copier, Réagir, Épingler, Important, Supprimer) ✅
- [x] Suppression (pour moi / pour tous avec règle 1h) ✅
- [x] Épingler et marquer comme important ✅
- [x] Événements planifiés (réunions, appels, revues) ✅
- [ ] Mock interviews en escouade
- [ ] Système de défis hebdomadaires
- [ ] Non-compétition : détection de chevauchement d'offres
- [ ] Reformation dynamique (remplacement de membres)

#### Intelligence Collective v1
- [ ] Base de données des entreprises enrichie (stats anonymisées)
- [ ] Fiche entreprise : taux de réponse, durée du processus, salaires
- [ ] Patterns de réussite détectés par l'IA
- [ ] Insights temporels (meilleur moment pour postuler)

#### Négociation Salariale
- [ ] Base de données salariale (données éclaireurs + candidatures)
- [ ] Affichage de la fourchette réelle par poste/entreprise
- [ ] Coach de négociation IA (simulation)

#### Web App ✅
- [x] Version web complète (Next.js 14, App Router, Tailwind, Radix UI) ✅
- [x] Dashboard candidat web (15+ pages) ✅
- [x] Responsive design (mobile-first) ✅
- [x] Déployé sur Vercel ✅

### Croissance
- [ ] Programme de parrainage (invite un ami → 1 mois premium gratuit)
- [ ] Partenariats avec 5-10 universités/écoles
- [ ] Contenu viral : partage des célébrations d'embauche
- [ ] SEO : pages publiques des fiches entreprises

### Livrables Phase 2 :
- ✅ 1000-5000 utilisateurs actifs
- ✅ Préparation entretiens fonctionnelle
- ✅ Intelligence collective qui commence à être utile
- ✅ Beta publique ouverte
- ✅ Web app fonctionnelle

---

## PHASE 3 — LANCEMENT V1 (Mois 7-9 : Octobre-Décembre 2026)

### Objectif : Lancement officiel, monétisation, 10K+ utilisateurs

#### Monétisation
- [ ] Intégration Stripe (abonnements)
- [ ] Plan freemium défini et implémenté :
  - **Gratuit** : 3 candidatures EDGE/mois, escouade basique, 1 simulation/mois
  - **Premium** (12.99€/mois) : illimité + éclaireurs + simulations + analytics
- [ ] Page de pricing et tunnel de conversion
- [ ] Essai gratuit 14 jours du premium

#### Dashboard Recruteur (B2B v1)
- [ ] Inscription recruteur
- [ ] Publication d'offres
- [ ] Accès aux candidats matchés
- [ ] Score de préparation visible (candidat a fait des simulations)
- [ ] Communication directe
- [ ] Plan tarifaire B2B

#### Améliorations IA
- [ ] Fine-tuning d'un modèle sur les données de candidatures accumulées
- [ ] Amélioration continue des lettres basée sur les taux de réponse
- [ ] Analyse post-rejet automatique
- [ ] Recommandations de compétences à développer

#### Gamification
- [ ] Système de badges
- [ ] Streaks d'activité
- [ ] Classement des éclaireurs les plus utiles
- [ ] Profil public (optionnel) avec badges et stats

#### Marketing & Croissance
- [ ] Lancement sur Product Hunt
- [ ] PR dans la presse tech française et africaine
- [ ] Programme ambassadeurs dans les universités
- [ ] Référencement App Store et Google Play optimisé (ASO)
- [ ] Contenu TikTok/Instagram : histoires de réussite HIREDGE
- [ ] Publicité ciblée (Meta Ads, Google Ads)

### Livrables Phase 3 :
- ✅ Lancement officiel V1
- ✅ Monétisation active (premium + B2B)
- ✅ 10 000-30 000 utilisateurs
- ✅ 500+ entreprises avec des fiches enrichies
- ✅ 100+ éclaireurs actifs
- ✅ Disponible sur iOS, Android, Web

---

## PHASE 4 — SCALE (Mois 10-12 : Janvier-Mars 2027)

### Objectif : 100K utilisateurs, architecture scalable

#### Technique
- [ ] Migration vers microservices (si pas déjà fait)
- [ ] PostgreSQL read replicas
- [ ] Redis cluster
- [ ] Kubernetes (EKS)
- [ ] Monitoring avancé (Datadog)
- [ ] Auto-scaling sur les workers IA et scraping
- [ ] Optimisation des coûts IA (routing intelligent des LLMs)

#### Fonctionnalités
- [ ] Scraping de groupes Telegram et Discord (jobs)
- [ ] Monitoring de newsletters emploi
- [ ] Scraping d'APIs gouvernementales (Pôle Emploi, etc.)
- [ ] Mode "invisible" pour les candidats passifs (les recruteurs viennent à eux)
- [ ] Comparateur d'offres (côte à côte)
- [ ] Débrief post-entretien IA
- [ ] Export des données personnelles (RGPD)

#### Expansion géographique
- [ ] Adaptation pour le marché anglophone (UK, US, Canada anglophone)
- [ ] Adaptation pour l'Afrique francophone (Côte d'Ivoire, Sénégal, Cameroun)
- [ ] Job boards locaux par pays
- [ ] Traduction de l'app en anglais
- [ ] Adaptation des données salariales par pays/devise

#### B2B v2
- [ ] Offres sponsorisées (mise en avant payante)
- [ ] Analytics recruteur (attractivité de l'offre vs marché)
- [ ] Intégration avec les ATS (Workday, Greenhouse, Lever)
- [ ] API recruteur

### Livrables Phase 4 :
- ✅ 100 000+ utilisateurs
- ✅ Architecture scalable
- ✅ Présence dans 5+ pays
- ✅ Version anglaise
- ✅ 500+ entreprises B2B

---

## PHASE 5 — EXPANSION (2027 Q2+)

### Objectif : Devenir LE standard de la recherche d'emploi

#### Fonctionnalités avancées
- [ ] IA vocale temps réel (conversation naturelle avec EDGE)
- [ ] Wearable companion (Apple Watch : notifications + quick actions)
- [ ] Intégration calendrier (Google Calendar, Outlook) pour les entretiens
- [ ] Mode freelance (missions courtes en plus des CDI/CDD)
- [ ] Recommandations de formations (partenariats avec des MOOC)
- [ ] Tableau de bord de carrière long terme (pas juste la recherche active)

#### Social v3
- [ ] Stories d'escouade (partage de victoires, tips du jour)
- [ ] Forum par domaine (questions/réponses communautaires)
- [ ] Événements virtuels (meetups d'escouades, ateliers CV, etc.)
- [ ] Programme de mentorat structuré

#### B2B v3
- [ ] Intelligence marché pour les RH (tendances salariales, rareté des compétences)
- [ ] Employer branding : pages entreprise riches et personnalisables
- [ ] Campagnes de recrutement ciblées
- [ ] Programme "HIREDGE Certified Employer" (label entreprise)

#### International
- [ ] 15+ pays couverts
- [ ] Espagnol, Portugais, Arabe
- [ ] Équipes locales dans les marchés clés
- [ ] Partenariats gouvernementaux (agences pour l'emploi)

---

## MÉTRIQUES DE SUIVI PAR PHASE

| Métrique | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 |
|----------|---------|---------|---------|---------|---------|
| **Utilisateurs inscrits** | 100 | 5 000 | 30 000 | 100 000 | 500 000+ |
| **MAU** | 50 | 2 000 | 15 000 | 50 000 | 250 000+ |
| **Escouades actives** | 10 | 300 | 2 000 | 8 000 | 40 000+ |
| **Éclaireurs** | 5 | 50 | 200 | 1 000 | 5 000+ |
| **Taux d'embauche** | Mesure | 20% | 30% | 35% | 40% |
| **Offres indexées** | 10K | 100K | 500K | 2M | 10M+ |
| **Entreprises B2B** | 0 | 10 | 100 | 500 | 2 000+ |
| **MRR** | 0€ | 500€ | 15K€ | 80K€ | 500K€+ |
| **Taux conversion premium** | N/A | 3% | 6% | 8% | 10% |
| **NPS** | Mesure | 40 | 55 | 60 | 65+ |

---

## PRIORISATION DES RISQUES

### Risques critiques à adresser en Phase 0-1

| Risque | Mitigation | Phase |
|--------|-----------|-------|
| **Qualité des sorties IA insuffisante** | Tests intensifs, feedback loop, comparaison avec des lettres humaines | Phase 0 |
| **Scraping bloqué par les plateformes** | Proxy rotation, respect des rate limits, fallback sur les API officielles, contribution utilisateur | Phase 0-1 |
| **Escouades inactives** | Animation IA agressive, reformation rapide, onboarding engageant | Phase 1 |
| **Pas assez d'éclaireurs au lancement** | Recruter manuellement les 50 premiers, incentives forts, partenariats | Phase 2 |
| **Coûts IA trop élevés** | Routing LLM (tâche simple → modèle léger), cache agressif, limites freemium | Phase 1-3 |
| **Adoption lente** | Marketing grassroots (universités), contenu viral, parrainage, Product Hunt | Phase 3 |

---

## ÉQUIPE NÉCESSAIRE PAR PHASE

### Phase 0-1 (MVP) — 3-5 personnes
- 1 Fullstack Lead (React Native + Node.js)
- 1 Backend/IA Engineer (Python + LLMs)
- 1 Frontend Mobile (React Native)
- 1 Designer UI/UX
- (optionnel) 1 DevOps/Infra

### Phase 2-3 (Beta → Launch) — 6-10 personnes
- + 1 Backend Engineer
- + 1 Data Engineer (scraping, pipelines)
- + 1 QA Engineer
- + 1 Growth/Marketing
- + 1 Community Manager (escouades, éclaireurs)

### Phase 4-5 (Scale) — 15-25 personnes
- + Équipe IA dédiée (2-3 ML Engineers)
- + Équipe Scraping dédiée
- + Équipe B2B (sales, account management)
- + Équipe internationale
- + Équipe support client

---

*Document roadmap — Version 1.0*
