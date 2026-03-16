# HIREDGE — Features (Fonctionnalités Détaillées)

---

## 1. AGENT IA "EDGE" — Ton Chasseur Personnel

### 1.1 Recherche Multi-Plateforme

**Description :** L'agent EDGE scrape et agrège les offres d'emploi de toutes les sources existantes, y compris les offres "cachées" introuvables sur les job boards classiques.

**Sources scrapées :**
| Source | Méthode | Fréquence |
|--------|---------|-----------|
| LinkedIn Jobs | API officielle / scraping | Toutes les 30 min |
| Indeed | Scraping / API | Toutes les 30 min |
| Glassdoor | Scraping | Toutes les heures |
| Welcome to the Jungle | API partenaire | Toutes les 30 min |
| Sites carrières d'entreprises | Crawler personnalisé | Quotidien |
| Twitter/X | Analyse de posts mentionnant "on recrute", "we're hiring" | Temps réel |
| Groupes Telegram | Bot d'analyse des messages dans des groupes emploi | Temps réel |
| Serveurs Discord | Bot d'analyse des channels #jobs | Temps réel |
| Pôle Emploi / ANPE / Job boards gouvernementaux | API / scraping | Quotidien |
| Newsletters spécialisées | Parsing automatique d'emails | Quotidien |

**Détails techniques :**
- Déduplication intelligente (même offre publiée sur 3 plateformes = 1 seule offre)
- Détection d'offres fantômes : si l'offre est publiée depuis > 90 jours ou si l'entreprise a récemment embauché sur ce poste → marquée comme "probablement pourvue"
- Détection d'arnaques : patterns connus (salaire irréaliste, demande d'argent, email suspect)
- Classification automatique par secteur, niveau, localisation, type de contrat

### 1.2 Matching Intelligent

**Description :** Chaque offre reçoit un score de compatibilité 0-100% basé sur une analyse profonde.

**Critères analysés :**
- **Compétences techniques** : match entre les compétences du candidat et celles demandées (exactes + proches)
- **Expérience** : années d'expérience, types de postes précédents, taille d'entreprises
- **Soft skills** : extraits du profil et des évaluations d'escouade
- **Culture fit** : valeurs de l'entreprise (extraites des reviews Glassdoor, site web, réseaux sociaux) vs préférences du candidat
- **Localisation** : distance, temps de trajet, compatibilité remote
- **Salaire** : estimation du salaire offert vs attentes du candidat
- **Probabilité d'embauche** : basée sur les données collectives (taux d'acceptation des profils similaires)

**Affichage :**
```
📊 Score de compatibilité : 87%

✅ Forces (ce qui match) :
   - React.js : 3 ans d'expérience (demandé : 2 ans) ✓
   - Expérience e-commerce (leur secteur) ✓
   - Remote OK ✓

⚠️ Lacunes (ce qui manque) :
   - Docker : non mentionné sur ton profil
     → Mini-formation recommandée : "Docker en 2h" (lien)
   - TypeScript : débutant, ils veulent intermédiaire
     → Projet suggéré pour monter en compétence

📈 Probabilité d'embauche estimée : 23%
   (basé sur 47 candidatures similaires pour cette entreprise)
```

### 1.3 Dossier de Candidature Complet

**Description :** Pour chaque offre que le candidat valide, l'agent prépare un dossier clé en main.

**Contenu du dossier :**

#### a) CV Adapté
- Réorganisation des sections pour mettre en avant les compétences pertinentes
- Ajout de mots-clés ATS (Applicant Tracking System) de l'offre
- Mise en forme optimisée pour passer les filtres automatiques
- **Ne ment jamais** : ne rajoute pas de compétences fictives, mais reformule l'existant pour mieux matcher

#### b) Lettre de Motivation Chirurgicale
- Référence aux projets récents de l'entreprise (scrape des actualités, communiqués de presse, posts LinkedIn de l'entreprise)
- Connexion entre l'expérience du candidat et le besoin SPÉCIFIQUE de l'offre
- Ton adapté à la culture de l'entreprise (startup décontractée vs corporate formelle)
- Passage d'un test anti-détection IA (reformulation pour un style naturel et unique)

#### c) Analyse de l'Entreprise
```
🏢 Fiche Entreprise : TechCorp SAS

📍 Localisation : Paris 9e (Métro Grands Boulevards)
👥 Taille : 120 employés
💰 Dernière levée de fonds : 15M€ Série A (mars 2025)
🌡️ Score Glassdoor : 3.8/5 (67 avis)
📈 Croissance : +40% d'effectifs en 1 an
🎨 Culture : "Move fast", ambiance startup, open space, afterworks fréquents

🔍 Actualités récentes :
   - Lancement de leur nouveau produit IA (février 2026)
   - Partenariat avec Orange (janvier 2026)
   - Recrutent massivement sur la tech

⚠️ Red flags signalés (éclaireurs) :
   - Heures supp fréquentes en période de release
   - Management parfois désorganisé

💡 Conseil EDGE : Mentionne leur nouveau produit IA dans ta lettre.
   Le CTO a posté sur LinkedIn qu'il est passionné par l'IA 
   conversationnelle → angle à exploiter.
```

#### d) Processus de Recrutement Prévu
```
📋 Processus estimé chez TechCorp (basé sur 12 data points) :

Étape 1 : Screening CV (3-5 jours)
Étape 2 : Call RH (15 min) — questions classiques motivation
Étape 3 : Test technique (coding challenge à la maison, 3h)
Étape 4 : Entretien technique (1h, visio, avec le lead dev)
Étape 5 : Entretien culture fit (30 min, avec le CTO)

⏱️ Durée totale moyenne : 18 jours
💰 Salaire proposé habituellement : 42-48K€
📊 Taux de réponse après candidature : 34%
```

#### e) Fourchette Salariale Réelle
- Compilée à partir des données des éclaireurs + résultats de négociation anonymisés
- Fourchette basse / médiane / haute pour ce poste dans cette localisation

### 1.4 Suivi Post-Candidature

**Description :** L'agent ne s'arrête pas à l'envoi. Il surveille et agit.

**Fonctionnalités :**
- **Timeline de suivi** : chaque candidature est trackée dans un pipeline visuel
- **Détection de signaux** : si quelqu'un de l'entreprise consulte le profil LinkedIn du candidat → notification *"Quelqu'un de TechCorp a consulté ton profil. Bon signe !"*
- **Relance intelligente** : au bout de X jours (calculé par entreprise), l'IA propose un message de relance personnalisé
- **Analyse post-rejet** : détection de patterns dans les refus et plan d'amélioration

---

## 2. ESCOUADES — L'Intelligence de Meute

### 2.1 Formation des Escouades

**Algorithme de matching :**
- **Domaine** : même secteur ou métier (ex: tous développeurs, tous commerciaux)
- **Niveau** : même séniorité (±2 ans d'expérience)
- **Localisation** : même zone géographique ou même marché cible
- **Objectifs** : types de postes similaires
- **Personnalité** : diversité de profils au sein du groupe (pas que des introvertis ou que des leaders)
- **Anti-compétition** : l'IA vérifie que les offres ciblées ne se chevauchent pas

**Taille optimale :** 5-8 personnes (étudié : au-delà de 8, l'engagement chute)

### 2.2 Cycle de Vie d'une Escouade

```
Jour 1 : Formation + Icebreaker IA
  → "Présentez-vous en 30 secondes audio. Partagez votre plus gros 
     challenge dans votre recherche."

Jours 2-7 : Phase de cohésion
  → Défis quotidiens ("Trouvez chacun 1 offre que vous recommanderiez 
     à un autre membre")
  → L'IA anime avec des questions et des tips

Semaine 2+ : Mode croisière
  → Partage naturel d'infos, soutien, mock interviews
  → L'IA intervient moins mais détecte les baisses d'activité

Quand un membre est embauché :
  → Célébration collective (confettis in-app, message du groupe)
  → Le membre devient éclaireur pour son entreprise
  → Nouveau membre intègre l'escouade

Quand un membre est inactif >7 jours :
  → Rappel doux → Rappel IA → Appel du groupe → Remplacement si >14 jours
```

### 2.3 Activités d'Escouade

| Activité | Description | Fréquence |
|----------|-------------|-----------|
| **Check-in quotidien** | Chaque membre partage son avancement en 1 phrase | Quotidien |
| **Partage d'offres** | "J'ai trouvé ça, ça pourrait intéresser [Membre]" | Continu |
| **Retour d'entretien** | Après un entretien réel : débrief au groupe | Après chaque entretien |
| **Mock interview** | 1 joue le recruteur, l'autre répond, les autres jugent | Hebdomadaire |
| **Revue de CV/lettre** | Un membre soumet son CV → le groupe donne du feedback | Sur demande |
| **Défi hebdomadaire** | "Cette semaine : chacun postule à 3 offres hors de sa zone de confort" | Hebdomadaire |
| **Célébration** | Quand quelqu'un reçoit un entretien ou une offre | Ponctuel |

### 2.4 Communication ✅ IMPLÉMENTÉ

- **Chat texte** : messagerie instantanée de groupe ✅
- **Messages vocaux** : enregistrement via micro, lecture intégrée (comme WhatsApp) ✅
- **Visio intégrée** : appels Jitsi Meet ouverts dans un nouvel onglet, lien partagé automatiquement au groupe ✅
- **Réactions emoji** : 8 emojis rapides au survol (👍❤️😂😮😢🙏🔥🎉), toggle, compteur groupé ✅
- **Répondre à un message** : citation avec nom de l'auteur et aperçu, clic pour scroller au message original ✅
- **Menu contextuel complet** : Répondre, Copier, Réagir, Épingler, Marquer important, Supprimer ✅
- **Épingler des messages** : badge 📌 visible sous le message ✅
- **Marquer comme important** : badge ⭐ visible sous le message ✅
- **Suppression intelligente** : ✅
  - Message propre < 1h → supprimer pour moi OU pour tous
  - Message propre > 1h → supprimer pour moi uniquement
- **Photos de profil** : affichées dans les bulles de message et la liste des membres (remplace les initiales) ✅
  - Message d'autrui → supprimer pour moi uniquement
  - Messages supprimés pour tous → affichage "🚫 Ce message a été supprimé"
- **Partage de fichiers** : CV, lettres, screenshots de conversations avec des recruteurs (prévu)
- **Événements planifiés** : réunions vidéo, appels, revues CV avec formulaire intégré ✅

---

## 3. ÉCLAIREURS — Les Yeux à l'Intérieur

### 3.1 Devenir Éclaireur

**Conditions :**
- Avoir été embauché dans les 6 derniers mois (vérifiable)
- Accepter les conditions d'anonymat et d'éthique
- Remplir le questionnaire initial sur l'entreprise

**Questionnaire initial (rempli une fois) :**
1. Quel est le processus de recrutement typique ? (nombre d'étapes, durée, types d'entretiens)
2. Comment décrieriez-vous la culture de l'entreprise en 3 mots ?
3. Qu'est-ce que le manager apprécie le plus chez un candidat ?
4. Quel est le "red flag" qui fait éliminer un candidat ?
5. Fourchette salariale réelle pour les postes de votre niveau ?
6. Ambiance de travail ? Horaires ? Flexibilité ?
7. Qu'est-ce que vous auriez aimé savoir avant de postuler ?

### 3.2 Interactions Éclaireur ↔ Candidat

- **Chat anonyme** : le candidat qui postule dans l'entreprise de l'éclaireur peut lui poser des questions
- L'éclaireur voit : "Un candidat postule pour un poste de [Dev React] chez [votre entreprise]"
- L'éclaireur ne voit PAS : le nom, le CV, ou les détails personnels du candidat
- Le candidat ne voit PAS : le nom, le département précis de l'éclaireur
- **Templates de questions** : l'app suggère les meilleures questions à poser

### 3.3 Système de Crédits Éclaireurs

| Action | Crédits gagnés |
|--------|---------------|
| Remplir le questionnaire initial | +50 |
| Répondre à une question d'un candidat | +10 par question |
| Mise à jour trimestrielle des infos | +30 |
| Être noté 5 étoiles par un candidat | +20 |
| Recevoir un "merci, j'ai été embauché grâce à tes conseils" | +100 |

**Utilisation des crédits :**
- Accès prioritaire aux éclaireurs quand l'éclaireur cherche lui-même un emploi
- Fonctionnalités premium gratuites
- Badge "Éclaireur Gold" sur le profil

---

## 4. PRÉPARATION AUX ENTRETIENS

### 4.1 Simulation IA Solo

**Déroulement :**
1. Le candidat sélectionne l'offre pour laquelle il veut se préparer
2. L'IA charge le contexte : offre, entreprise, données collectives, infos éclaireur
3. L'IA joue le rôle du recruteur avec la personnalité et le style de l'entreprise
4. Entretien simulé en **vocal** (15-45 min selon le type)
5. Analyse complète post-simulation

**Types de simulations :**
| Type | Durée | Contenu |
|------|-------|---------|
| **RH / Motivation** | 15-20 min | Parcours, motivation, projet professionnel, qualités/défauts |
| **Technique** | 30-45 min | Questions techniques spécifiques au poste, résolution de problèmes |
| **Cas pratique** | 30 min | Mise en situation réelle (analyse de données, stratégie marketing, etc.) |
| **Culture fit** | 15 min | Questions sur les valeurs, le travail d'équipe, la gestion de conflit |
| **Managérial** | 20 min | Leadership, gestion d'équipe, prise de décision |
| **Négociation** | 15 min | Simulation de négociation salariale |

**Rapport post-simulation :**
```
📋 Rapport de simulation — Entretien RH TechCorp

🎯 Score global : 72/100

✅ Points forts :
   - Présentation de ton parcours : claire et concise (2 min, parfait)
   - Motivation pour le poste : sincère et spécifique
   - Question posée au recruteur : pertinente et originale

⚠️ Points à améliorer :
   - "Parlez-moi d'un échec" : ta réponse manquait la partie 
     "ce que j'ai appris". Reformulation suggérée : [...]
   - Tu as dit "euh" 23 fois. Essaie de faire des pauses silencieuses 
     plutôt que de remplir.
   - Durée de réponse moyenne : 3 min 20 → trop long. 
     Vise 1 min 30 - 2 min par réponse.

💬 Questions les plus probables pour le vrai entretien :
   1. "Pourquoi TechCorp et pas un grand groupe ?" (posée 8 fois sur 12)
   2. "Comment tu restes à jour techniquement ?" (posée 6 fois sur 12)
   3. "Décris un projet dont tu es fier" (posée 10 fois sur 12)

🎯 Prochaines étapes :
   → Refais la simulation en corrigeant les 3 points
   → Demande un mock interview à ton escouade
```

### 4.2 Mock Interview en Escouade

**Déroulement :**
1. Un membre volontaire joue le recruteur (briefé par l'IA avec les questions probables)
2. Le candidat répond en visio
3. Les autres membres observent et prennent des notes
4. L'IA analyse en temps réel (tics, durée, contenu)
5. Débrief collectif : chaque observateur donne 1 point fort + 1 conseil
6. L'IA synthétise le tout

---

## 5. NÉGOCIATION SALARIALE

### 5.1 Base de Données Salariale

**Sources de données :**
- Salaires négociés par les utilisateurs HIREDGE (anonymisés)
- Rapports des éclaireurs
- Données publiques (conventions collectives, études sectorielles)
- Scraping d'offres avec salaire affiché

**Granularité :**
```
💰 Développeur React Junior — Paris (2026)

Fourchette marché : 35K - 48K€ brut/an
Médiane :          41K€
Chez TechCorp :    40K - 46K€ (basé sur 5 data points)

📊 Facteurs qui augmentent le salaire :
   + TypeScript : +3-4K en moyenne
   + Expérience API REST : +2K
   + Portfolio de projets open source : +2-3K
   
🎯 Conseil : Avec ton profil, demande 43K€. 
   Ne descends pas en dessous de 40K€.
   Ils ont la marge, dernier candidat accepté à 44K€ (source : éclaireur).
```

### 5.2 Coach de Négociation IA

- Simulation de négociation salariale
- L'IA joue le RH qui essaie de proposer moins
- Entraînement aux techniques : ancrage, silence, alternative, package global
- Scripts prêts : *"Ce que je propose c'est... et voici pourquoi..."*

---

## 6. TABLEAU DE BORD & ANALYTICS

### 6.1 Dashboard Personnel

**Widgets :**
- **Pipeline Kanban** : toutes tes candidatures par étape
- **Score EDGE** : évolution de la qualité de ton profil et de tes candidatures
- **Statistiques** : taux de réponse, taux d'entretien, temps moyen de réponse
- **Activité d'escouade** : dernières infos partagées par le groupe
- **Notifications EDGE** : nouvelles offres recommandées, relances à envoyer
- **Calendrier** : entretiens planifiés, deadlines de candidature
- **Objectifs** : suivi des objectifs hebdomadaires (candidatures envoyées, simulations faites)

### 6.2 Analytics Avancés (Premium)

- Comparaison de tes stats avec la moyenne des candidats dans ton domaine
- Heatmap des meilleurs moments pour postuler
- Évolution de ton taux de réponse dans le temps
- Corrélation entre les types de personnalisation et le taux de succès

---

## 7. NOTIFICATIONS & ENGAGEMENT

### 7.1 Types de Notifications

| Notification | Trigger | Canal |
|-------------|---------|-------|
| **Offre ultra-compatible** | Score > 85% | Push immédiat |
| **Offre compatible** | Score 60-85% | Résumé quotidien |
| **Relance à envoyer** | Timing optimal atteint | Push |
| **Signal positif** | Profil consulté par l'entreprise | Push immédiat |
| **Entretien demain** | J-1 avant entretien | Push + email avec brief |
| **Message d'escouade** | Nouveau message dans le groupe | Push (configurable) |
| **Question d'un candidat** (éclaireur) | Un candidat a posé une question | Push |
| **Membre embauché** | Un membre de l'escouade a décroché | Push + célébration |
| **Défi hebdomadaire** | Lundi matin | Push |
| **Check-in quotidien** | Selon les préférences | Push |

### 7.2 Anti-Addiction

- Maximum 10 notifications push/jour (configurable)
- Mode "focus" : désactive les notifications sauf urgences
- Pas de scroll infini — le feed d'offres est limité aux recommandations pertinentes
- Rappel de prendre soin de soi : *"Tu as envoyé 5 candidatures cette semaine, c'est super. Prends une pause."*

---

## 8. FONCTIONNALITÉS B2B (Recruteurs/Entreprises)

### 8.1 Dashboard Recruteur

- Publication d'offres optimisées (l'IA aide à rédiger des offres attractives)
- Accès aux candidats qui ont matché avec l'offre et validé le partage de leur profil
- **Score de préparation** : voir si le candidat s'est préparé (simulations faites, profil complet)
- Statistiques sur l'attractivité de l'offre vs le marché
- Communication directe avec les candidats intéressés

### 8.2 Offres Sponsorisées

- Mise en avant de l'offre auprès des candidats les plus compatibles
- Garantie de visibilité (nombre de vues minimum)
- Analytics détaillés (vues, clics, candidatures, taux de conversion)

---

## 9. GAMIFICATION

### 9.1 Système de Badges

| Badge | Condition |
|-------|-----------|
| 🎯 **Premier pas** | Première candidature envoyée |
| 🔥 **En feu** | 5 candidatures en 1 semaine |
| 🤝 **Coéquipier** | 10 messages utiles en escouade |
| 🎭 **Simulateur** | 5 mock interviews passées |
| 🏅 **Éclaireur Bronze** | 5 candidats aidés |
| 🥇 **Éclaireur Gold** | 20 candidats aidés + note > 4.5/5 |
| 🎉 **Vainqueur** | Emploi décroché via HIREDGE |
| 🫡 **Mentor** | 3 membres d'escouade embauchés |
| 📈 **Progression** | Taux de réponse doublé en 1 mois |

### 9.2 Streaks

- **Streak d'activité** : nombre de jours consécutifs avec au moins 1 action (candidature, simulation, message d'escouade)
- Motivation douce, pas de pression toxique

---

## 10. PANNEAU D'ADMINISTRATION ✅ IMPLÉMENTÉ

### 10.1 Authentification Admin Dédiée

- **Login séparé** : page `/admin/login` avec email et mot de passe
- **Sécurité renforcée** : mot de passe hashé avec bcrypt, token JWT dédié (2h d'expiration)
- **Stockage session** : token admin stocké en `sessionStorage` (non persistant entre onglets)
- **Guard automatique** : redirection vers `/admin/login` si pas de token valide
- **Nettoyage session** : token admin supprimé automatiquement lors du logout principal

### 10.2 Dashboard Admin

**Statistiques plateforme :**
- Nombre total d'utilisateurs, d'offres, de candidatures, d'escouades
- Répartition par rôle (CANDIDATE, SCOUT, RECRUITER, ADMIN)
- Répartition par abonnement (FREE, PREMIUM)
- Inscriptions récentes (7 derniers jours)
- Utilisateurs actifs (7 derniers jours)

### 10.3 Gestion des Utilisateurs

**Fonctionnalités :**
- **Liste paginée** : tous les utilisateurs avec leur rôle, abonnement, date d'inscription
- **Recherche** : filtrer par email ou nom
- **Filtres** : par rôle (CANDIDATE, SCOUT, RECRUITER, ADMIN) et par abonnement (FREE, PREMIUM)
- **Tri** : par date d'inscription, dernière activité, email
- **Détail utilisateur** : profil complet avec statistiques d'activité
- **Modifier le rôle** : promouvoir/rétrograder un utilisateur
- **Modifier l'abonnement** : changer le tier d'abonnement
- **Supprimer un utilisateur** : suppression avec confirmation

### 10.4 Endpoints API Admin

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/admin/verify-access` | POST | Authentification admin (bcrypt + JWT) |
| `/admin/stats` | GET | Statistiques globales de la plateforme |
| `/admin/users` | GET | Liste paginée des utilisateurs (filtres, recherche, tri) |
| `/admin/users/:id` | GET | Détail d'un utilisateur |
| `/admin/users/:id/role` | PATCH | Modifier le rôle d'un utilisateur |
| `/admin/users/:id/subscription` | PATCH | Modifier l'abonnement d'un utilisateur |
| `/admin/users/:id` | DELETE | Supprimer un utilisateur |

---

*Document de features — Version 1.1*
