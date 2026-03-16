# HIREDGE — Workflow (Parcours Utilisateur Complets)

---

## 1. PARCOURS CANDIDAT — De l'Inscription à l'Embauche

### 1.1 Inscription & Onboarding

```
┌──────────────────────────────────────────────────────────┐
│                    ÉCRAN D'ACCUEIL                         │
│                                                            │
│  "Ne cherche plus un emploi seul."                        │
│                                                            │
│  [S'inscrire avec Google]                                 │
│  [S'inscrire avec Apple]                                  │
│  [S'inscrire avec Email]                                  │
│                                                            │
│  Déjà un compte ? Se connecter                            │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│               CONVERSATION AVEC EDGE                      │
│                                                            │
│  EDGE : "Salut ! 👋 Je suis EDGE, ton agent personnel.   │
│  Je vais apprendre à te connaître pour trouver les        │
│  offres parfaites. On commence ?"                         │
│                                                            │
│  EDGE : "D'abord, tu as un CV ? Tu peux l'uploader        │
│  et je fais le reste, ou on construit ton profil           │
│  ensemble en discutant."                                   │
│                                                            │
│  [📄 Uploader mon CV]  [💬 Discutons plutôt]              │
└──────────────────────────────────────────────────────────┘
```

**Option A : Upload CV**
1. L'utilisateur upload un PDF/DOCX
2. L'IA extrait en < 5 secondes : nom, titre, compétences, expériences, formation
3. L'IA affiche un résumé structuré et demande confirmation/corrections
4. L'IA pose les questions complémentaires non couvertes par le CV

**Option B : Conversation guidée**
1. EDGE pose des questions en langage naturel :
   - *"Quel métier tu fais ou veux faire ?"*
   - *"T'as combien d'années d'expérience ?"*
   - *"Tu préfères bosser en remote, au bureau, ou un mix ?"*
   - *"C'est quoi ton salaire minimum acceptable ?"*
   - *"Dans quel coin tu cherches ?"*
   - *"T'as des langues parlées en plus ?"*
   - *"Qu'est-ce qui est le plus important pour toi dans un job ?"*
2. L'IA structure automatiquement le profil
3. Durée totale : 3-5 minutes max

**Fin de l'onboarding :**
```
┌──────────────────────────────────────────────────────────┐
│  EDGE : "Ton profil est prêt ! Voici ton score de        │
│  préparation :"                                           │
│                                                            │
│  📊 Score de préparation : 68/100                         │
│                                                            │
│  ✅ Profil complété                                       │
│  ✅ Compétences identifiées (12)                          │
│  ⚠️ Pas de portfolio/projets → +15 points si tu ajoutes  │
│  ⚠️ Photo professionnelle manquante → +7 points           │
│  ❌ Pas de lettre de motivation type → +10 points         │
│                                                            │
│  "Je vais maintenant te trouver les meilleures offres.    │
│   En attendant, rejoins ton escouade !"                   │
│                                                            │
│  [👥 Rejoindre mon escouade]  [📋 Voir mes offres]       │
└──────────────────────────────────────────────────────────┘
```

---

### 1.2 Découverte des Offres

```
Flux quotidien :
                                                    
   EDGE scrape en continu ──► Matching IA ──► Filtrage ──► Top offres du jour
        (toutes sources)       (scoring)      (>60%)       (notification push)
                                                    
                                                    ▼
                                                    
                          ┌────────────────────────────┐
                          │    NOTIFICATION PUSH         │
                          │                              │
                          │  "3 nouvelles offres pour    │
                          │   toi aujourd'hui. La        │
                          │   meilleure : 91% match !"   │
                          └────────────────────────────┘
                                        │
                                        ▼
                          ┌────────────────────────────┐
                          │    ÉCRAN "MES OFFRES"        │
                          │                              │
                          │  ⭐ TechCorp — Dev React     │
                          │     91% match | CDI | 42-48K │
                          │     [Voir le dossier]        │
                          │                              │
                          │  📌 DataFlow — Data Analyst  │
                          │     78% match | CDI | 38-42K │
                          │     [Voir le dossier]        │
                          │                              │
                          │  📌 StartupXYZ — Fullstack   │
                          │     65% match | CDD | 35-40K │
                          │     [Voir le dossier]        │
                          └────────────────────────────┘
```

### 1.3 Workflow de Candidature

```
Candidat clique "Voir le dossier"
            │
            ▼
┌──────────────────────────────────────────────────────────┐
│                  DOSSIER DE CANDIDATURE                    │
│                                                            │
│  📊 Compatibilité : 91%                                  │
│  🏢 TechCorp SAS — Développeur React Senior              │
│                                                            │
│  ┌─────────────────────────────────────────────────┐      │
│  │ Onglet 1 : CV ADAPTÉ                            │      │
│  │ → Prévisualisation du CV réorganisé pour ce     │      │
│  │   poste. Les compétences React et TypeScript     │      │
│  │   sont mises en premier.                         │      │
│  │ [✏️ Modifier]  [✅ Valider]                     │      │
│  └─────────────────────────────────────────────────┘      │
│                                                            │
│  ┌─────────────────────────────────────────────────┐      │
│  │ Onglet 2 : LETTRE DE MOTIVATION                 │      │
│  │ → Texte personnalisé mentionnant le lancement    │      │
│  │   récent de l'outil IA de TechCorp.              │      │
│  │ [✏️ Modifier]  [✅ Valider]                     │      │
│  └─────────────────────────────────────────────────┘      │
│                                                            │
│  ┌─────────────────────────────────────────────────┐      │
│  │ Onglet 3 : FICHE ENTREPRISE                     │      │
│  │ → Culture, actus, Glassdoor, red flags           │      │
│  └─────────────────────────────────────────────────┘      │
│                                                            │
│  ┌─────────────────────────────────────────────────┐      │
│  │ Onglet 4 : PROCESSUS PRÉVU                      │      │
│  │ → 5 étapes, 18 jours, questions fréquentes       │      │
│  └─────────────────────────────────────────────────┘      │
│                                                            │
│  ┌─────────────────────────────────────────────────┐      │
│  │ Onglet 5 : ÉCLAIREUR DISPONIBLE 🔵              │      │
│  │ → 1 éclaireur chez TechCorp. Poser une question? │      │
│  │ [💬 Contacter l'éclaireur]                       │      │
│  └─────────────────────────────────────────────────┘      │
│                                                            │
│  ┌─────────────────────────────────────────────────┐      │
│  │ Onglet 6 : SALAIRE                              │      │
│  │ → Fourchette réelle : 42-48K€                    │      │
│  │ → Conseil : "Avec ton profil, vise 45K€"         │      │
│  └─────────────────────────────────────────────────┘      │
│                                                            │
│  ════════════════════════════════════════════              │
│  [🚀 POSTULER]  [💾 Sauvegarder]  [❌ Passer]            │
└──────────────────────────────────────────────────────────┘
            │
            ▼ (si "POSTULER")
┌──────────────────────────────────────────────────────────┐
│  EDGE : "Tout est prêt ! Je vais envoyer :               │
│  - Ton CV adapté ✓                                        │
│  - Ta lettre de motivation ✓                              │
│  - Via le formulaire du site carrière de TechCorp         │
│                                                            │
│  Tu confirmes ?"                                          │
│                                                            │
│  [✅ Confirmer et envoyer]  [✏️ Revoir encore]            │
└──────────────────────────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────────────────────────┐
│  ✅ Candidature envoyée !                                 │
│                                                            │
│  Ta candidature chez TechCorp est maintenant dans          │
│  ton pipeline. Je la surveille.                           │
│                                                            │
│  📅 Relance prévue dans 8 jours si pas de réponse.       │
│  📊 Taux de réponse historique : 34%                      │
│                                                            │
│  [📋 Voir mon pipeline]  [🎯 Préparer l'entretien]      │
└──────────────────────────────────────────────────────────┘
```

---

### 1.4 Workflow Post-Candidature

```
PIPELINE KANBAN :

┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ POSTULÉE │→ │   VUE    │→ │ENTRETIEN │→ │  OFFRE   │→ │ RÉSULTAT │
│          │  │          │  │          │  │          │  │          │
│ TechCorp │  │ DataCo   │  │ StartX   │  │          │  │ Refusé:  │
│ BankSA   │  │          │  │          │  │          │  │ OldCorp  │
│ AppDev   │  │          │  │          │  │          │  │          │
└──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘

Jour 1  : Candidature envoyée → Statut "POSTULÉE"
Jour 3  : EDGE détecte que quelqu'un de TechCorp a consulté le profil
          → Notification : "Bon signe ! Quelqu'un de TechCorp a vu ton profil"
          → Statut passe à "VUE"
Jour 8  : Pas de réponse → EDGE propose un message de relance
          → "Bonjour, je me permets de vous relancer concernant ma 
             candidature pour le poste de Dev React. J'ai notamment 
             approfondi [X] depuis ma candidature..."
          → Candidat valide → EDGE envoie
Jour 10 : Réponse reçue → Entretien planifié !
          → Statut passe à "ENTRETIEN"  
          → EDGE : "Super ! Ton entretien est le 15 mars à 14h.
             Je te prépare un brief et on lance une simulation ?"
Jour 14 : J-1 → Notification :
          "Ton entretien chez TechCorp est DEMAIN à 14h.
           Rappel :
           - Mentionne leur outil IA lancé récemment
           - Le manager aime les gens directs (source : éclaireur)
           - Prépare 2 questions à poser
           - Ton escouade te souhaite bonne chance ! 💪"
Jour 15 : Post-entretien → EDGE : "Comment ça s'est passé ?"
          → L'utilisateur fait son débrief
          → L'IA analyse et conseille pour la suite
Jour 22 : Offre reçue !
          → Statut "OFFRE"
          → EDGE lance le module de négociation salariale
Jour 25 : Contrat signé 🎉
          → Statut "EMBAUCHÉ"
          → Célébration dans l'escouade
          → Proposition de devenir éclaireur pour TechCorp
```

---

## 2. PARCOURS ESCOUADE

### 2.1 Rejoindre une Escouade

```
┌──────────────────────────────────────────────────────────┐
│  EDGE : "J'ai trouvé ton escouade idéale !"              │
│                                                            │
│  👥 ESCOUADE #4721 — "Les Développeurs de l'Ouest"       │
│                                                            │
│  Membres :                                                │
│  👤 Aminata — Dev React Junior — Douala (toi!)            │
│  👤 Marc — Dev React Junior — Lyon                        │
│  👤 Sarah — Dev Frontend Junior — Paris                   │
│  👤 Kofi — Dev JavaScript Junior — Abidjan                │
│  👤 Léa — Dev React Junior — Montréal                     │
│  👤 Omar — Dev Frontend Junior — Casablanca               │
│                                                            │
│  Vous cherchez tous un premier poste en dev frontend.     │
│  L'IA a vérifié : vos offres cibles ne se chevauchent    │
│  pas (marchés géographiques différents).                   │
│                                                            │
│  [👋 Rejoindre et se présenter]                           │
└──────────────────────────────────────────────────────────┘
```

### 2.2 Vie Quotidienne de l'Escouade

```
LUNDI MATIN — IA Animation :
"Nouvelle semaine ! 🔥 Comment s'est passé votre weekend ?
 Objectif de la semaine : chacun envoie au moins 2 candidatures.
 Qui commence ?"

MARDI — Partage d'info :
Marc : "J'ai passé un entretien chez Capgemini Lyon.
        Questions posées : 
        1. Différence entre state et props en React
        2. Expliquer le virtual DOM
        3. Un cas pratique de formulaire
        Ambiance cool, la RH était sympa."

Sarah : "Merci ! Je postule chez Capgemini Paris, 
         ça va me servir 🙏"

MERCREDI — Mock interview :
IA : "Qui veut faire une simulation aujourd'hui ?
      Omar a un entretien vendredi."

Kofi : "Je veux bien jouer le recruteur pour Omar !"

→ Visio lancée. Kofi pose les questions (briefé par l'IA).
  Omar répond. Les autres observent et notent.
  Débrief collectif.

VENDREDI — Célébration :
Léa : "LES GARS !!! J'AI REÇU UNE OFFRE !!! 
       CDI chez Shopify à Montréal ! 45K CAD !"

→ Confettis dans le chat 🎉
→ IA : "Félicitations Léa ! 🏆 Tu deviens éclaireur 
        pour Shopify. Ton escouade est fière !"
→ Tout le monde envoie des vocaux de félicitations
```

---

## 3. PARCOURS ÉCLAIREUR

```
Léa vient d'être embauchée chez Shopify
                │
                ▼
┌──────────────────────────────────────────────────────────┐
│  EDGE : "Félicitations pour ton embauche ! 🎉             │
│  Tu peux maintenant aider d'autres candidats en           │
│  devenant éclaireur pour Shopify."                        │
│                                                            │
│  En devenant éclaireur :                                  │
│  ✓ Tu es 100% anonyme                                    │
│  ✓ Tu gagnes des crédits (utiles si tu recherches plus   │
│    tard)                                                   │
│  ✓ Tu aides quelqu'un comme toi l'a été                  │
│                                                            │
│  [🔦 Devenir éclaireur]  [Pas maintenant]                │
└──────────────────────────────────────────────────────────┘
                │
                ▼ (accepte)
┌──────────────────────────────────────────────────────────┐
│  QUESTIONNAIRE INITIAL (5 min)                            │
│                                                            │
│  1. "Comment s'est passé le recrutement chez Shopify ?"   │
│     [Texte libre ou vocal]                                │
│                                                            │
│  2. "Combien d'étapes d'entretien ?"                      │
│     [1] [2] [3] [4] [5+]                                  │
│                                                            │
│  3. "Quel type d'entretien ?"                             │
│     [x] RH  [x] Technique  [ ] Cas pratique  [x] Culture │
│                                                            │
│  4. "Comment décrirais-tu la culture en 3 mots ?"         │
│     [Innovation] [Autonomie] [Bienveillance]              │
│                                                            │
│  5. "Le conseil #1 que tu donnerais à un candidat ?"      │
│     [Texte libre]                                         │
│                                                            │
│  6. "Fourchette salariale réelle pour ton niveau ?"       │
│     [Min: ___] [Max: ___]                                 │
│                                                            │
│  7. "Red flags à connaître ?"                             │
│     [Texte libre — optionnel]                             │
│                                                            │
│  [✅ Soumettre — +50 crédits]                             │
└──────────────────────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────┐
│  3 semaines plus tard...                                  │
│                                                            │
│  Notification : "Un candidat postule chez Shopify pour    │
│  un poste similaire au tien. Il a une question."          │
│                                                            │
│  Candidat anonyme : "Salut ! L'entretien technique, ils   │
│  demandent de coder en live ou c'est un take-home ?"      │
│                                                            │
│  Léa (anonyme) : "C'est un take-home de 4h. Ils te       │
│  donneront un projet React à compléter. Concentre-toi     │
│  sur la qualité du code plus que la complétude, ils       │
│  préfèrent ça."                                           │
│                                                            │
│  [+10 crédits gagnés]                                     │
└──────────────────────────────────────────────────────────┘
```

---

## 4. PARCOURS PRÉPARATION ENTRETIEN

```
Omar a un entretien chez Orange dans 3 jours
                │
                ▼
┌──────────────────────────────────────────────────────────┐
│  EDGE : "Ton entretien chez Orange est dans 3 jours.     │
│  Voici ton plan de préparation :"                         │
│                                                            │
│  📋 J-3 : Lis la fiche entreprise + contacte l'éclaireur │
│  📋 J-2 : Fais une simulation IA (30 min)                │
│  📋 J-1 : Mock interview avec ton escouade               │
│  📋 Jour J : Relis le brief de dernière minute            │
│                                                            │
│  [🎯 Commencer la préparation]                            │
└──────────────────────────────────────────────────────────┘
                │
                ▼
JOUR J-3 : Lecture de la fiche + chat avec éclaireur
JOUR J-2 : Simulation IA
                │
                ▼
┌──────────────────────────────────────────────────────────┐
│  SIMULATION IA — Entretien Orange                         │
│                                                            │
│  🎙️ [En cours — 12:34]                                   │
│                                                            │
│  IA-Recruteur : "Bonjour Omar, parlez-moi de votre       │
│  parcours et de ce qui vous amène chez Orange."           │
│                                                            │
│  [🔴 Répondre en vocal]                                   │
│                                                            │
│  (Omar répond...)                                         │
│                                                            │
│  IA-Recruteur : "Intéressant. Pouvez-vous me donner      │
│  un exemple concret de projet technique complexe que      │
│  vous avez géré ?"                                        │
│                                                            │
│  [🔴 Répondre]                                            │
│                                                            │
│  (15 minutes plus tard...)                                │
│                                                            │
│  IA : "Simulation terminée ! Voici ton analyse..."        │
└──────────────────────────────────────────────────────────┘
                │
                ▼
JOUR J-1 : Mock interview en escouade (visio)
JOUR J   : Brief de dernière minute envoyé en push à 8h
                │
                ▼
POST-ENTRETIEN :
┌──────────────────────────────────────────────────────────┐
│  EDGE : "Comment ça s'est passé ?"                        │
│                                                            │
│  [😄 Très bien]  [😐 Moyen]  [😰 Pas top]               │
│                                                            │
│  EDGE : "Raconte-moi. Quelles questions ils ont posées ?  │
│  Comment tu as répondu ?"                                  │
│                                                            │
│  (Omar dicte son retour en vocal)                         │
│                                                            │
│  EDGE : "D'après ton retour, je pense que ça s'est bien   │
│  passé. Ta réponse sur le projet technique était solide.   │
│  Pour l'avenir, essaie de quantifier tes résultats :      │
│  au lieu de dire 'j'ai amélioré les performances', dis    │
│  'j'ai réduit le temps de chargement de 3s à 0.8s'."     │
│                                                            │
│  " Je partage ces questions (anonymement) dans notre      │
│  base collective pour aider les prochains candidats."     │
└──────────────────────────────────────────────────────────┘
```

---

## 5. PARCOURS RECRUTEUR (B2B)

```
Sophie (RH chez TechCorp) s'inscrit côté recruteur
                │
                ▼
┌──────────────────────────────────────────────────────────┐
│  DASHBOARD RECRUTEUR                                      │
│                                                            │
│  📋 Mes offres actives : 3                                │
│  👥 Candidats matchés : 47                                │
│  📊 Taux de compatibilité moyen : 76%                     │
│  ⭐ Candidats "préparés" (simulé entretien) : 12          │
│                                                            │
│  [+ Publier une nouvelle offre]                           │
│                                                            │
│  ─── Offre : Dev React Senior ───                         │
│  👀 Vues : 234 | 📩 Candidatures : 18 | ⭐ Top match : 5 │
│                                                            │
│  Candidats recommandés :                                   │
│  1. Candidat #4821 — 94% match — ⭐ Préparé (3 simul.)   │
│  2. Candidat #2910 — 89% match — ⭐ Préparé (1 simul.)   │
│  3. Candidat #1567 — 87% match — Non préparé              │
│                                                            │
│  [👁️ Voir profil]  [💬 Contacter]                        │
└──────────────────────────────────────────────────────────┘
```

---

## 6. WORKFLOW DE NÉGOCIATION SALARIALE

```
Omar reçoit une offre de Orange : 38K€
                │
                ▼
┌──────────────────────────────────────────────────────────┐
│  EDGE : "Félicitations pour l'offre ! 🎉                 │
│  Avant d'accepter, analysons ensemble."                   │
│                                                            │
│  💰 Offre : 38 000€ brut/an                              │
│  📊 Marché pour ce poste à Casablanca :                   │
│      Bas : 35K | Médiane : 40K | Haut : 46K              │
│                                                            │
│  ⚠️ L'offre est EN DESSOUS de la médiane.                │
│                                                            │
│  💡 "Avec ton profil (3 ans d'XP, TypeScript), tu peux    │
│  raisonnablement demander 42-44K€.                        │
│  Voici comment formuler ta contre-proposition :"          │
│                                                            │
│  ──────────────────────────────────────────────           │
│  "Je vous remercie pour cette offre qui confirme          │
│  l'intérêt mutuel. Après réflexion et au regard de        │
│  mon expérience en [X] et [Y], et de la fourchette        │
│  marché pour ce type de poste, je souhaiterais discuter   │
│  d'une rémunération de 43K€. Je suis convaincu que..."   │
│  ──────────────────────────────────────────────           │
│                                                            │
│  [📝 Personnaliser ce message]                            │
│  [🎭 Simuler la négociation d'abord]                     │
│  [✅ Accepter l'offre telle quelle]                       │
└──────────────────────────────────────────────────────────┘
```

---

## 8. PARCOURS ADMINISTRATEUR ✅

### 8.1 Connexion Admin

```
Administrateur accède à /admin
                │
                ▼
┌──────────────────────────────────────────────────────────┐
│  GUARD : Vérification sessionStorage('adminToken')        │
│                                                            │
│  Token absent ? → Redirection vers /admin/login            │
│  Token présent ? → Vérification rôle ADMIN via API         │
│                    → Si OK : afficher le dashboard          │
│                    → Si KO : redirection vers /admin/login  │
└──────────────────────────────────────────────────────────┘
                │
                ▼ (redirigé vers /admin/login)
┌──────────────────────────────────────────────────────────┐
│  PAGE LOGIN ADMIN                                         │
│                                                            │
│  🛡️                                                      │
│  "Administration HIREDGE"                                 │
│                                                            │
│  [ Email admin          ]                                 │
│  [ Mot de passe     👁️ ]                                 │
│                                                            │
│  [ 🔐 Se connecter ]                                     │
│                                                            │
│  → Appel POST /admin/verify-access                        │
│  → Si succès : stockage adminToken en sessionStorage       │
│  → Redirection vers /admin                                │
│                                                            │
│  → Si échec : "Email ou mot de passe incorrect"           │
└──────────────────────────────────────────────────────────┘
```

### 8.2 Dashboard Admin

```
┌──────────────────────────────────────────────────────────┐
│  PANNEAU D'ADMINISTRATION                                 │
│                                                            │
│  📊 Statistiques Plateforme                               │
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ 247      │  │ 1834     │  │ 523      │  │ 45       │ │
│  │ Users    │  │ Jobs     │  │ Applis   │  │ Squads   │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
│                                                            │
│  Par rôle : CANDIDATE 230 | SCOUT 10 | RECRUITER 5       │
│  Par abonnement : FREE 200 | PREMIUM 47                   │
│  Inscrits 7j : 12 | Actifs 7j : 89                       │
│                                                            │
│  [📋 Gérer les utilisateurs]                              │
└──────────────────────────────────────────────────────────┘
```

### 8.3 Gestion des Utilisateurs

```
┌──────────────────────────────────────────────────────────┐
│  GESTION DES UTILISATEURS                                 │
│                                                            │
│  [ 🔍 Rechercher par email ou nom... ]                    │
│  [ Rôle ▼ ] [ Abonnement ▼ ] [ Trier par ▼ ]            │
│                                                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Email              │ Rôle      │ Abo    │ Actions  │  │
│  ├────────────────────┼───────────┼────────┼──────────┤  │
│  │ user1@email.com    │ CANDIDATE │ FREE   │ 📝 🗑️   │  │
│  │ scout@email.com    │ SCOUT     │ PREMIUM│ 📝 🗑️   │  │
│  │ admin@hiredge.app  │ ADMIN     │ PREMIUM│ 📝       │  │
│  └────────────────────────────────────────────────────┘  │
│                                                            │
│  Actions disponibles :                                    │
│  📝 Modifier : changer rôle (CANDIDATE/SCOUT/RECRUITER/  │
│     ADMIN) ou abonnement (FREE/PREMIUM)                   │
│  🗑️ Supprimer : suppression avec confirmation             │
│                                                            │
│  ◀ Page 1 / 13 ▶                                         │
└──────────────────────────────────────────────────────────┘
```

### 8.4 Sécurité Admin

```
Mesures de sécurité :
├── Mot de passe admin hashé avec bcrypt (coût 12)
├── Token JWT dédié (2h d'expiration, distinct du token utilisateur)
├── Stockage en sessionStorage (pas localStorage — non persistant)
├── Double vérification : token admin + rôle ADMIN en base
├── Nettoyage automatique : token admin supprimé lors du logout principal
└── Endpoint verify-access placé AVANT le preHandler requireRole('ADMIN')
```

---

## 9. WORKFLOW COMPLET — SCHÉMA GLOBAL

```
INSCRIPTION ──► PROFIL IA ──► ESCOUADE ASSIGNÉE
                   │                    │
                   ▼                    ▼
              EDGE CHERCHE        COHÉSION GROUPE
              (scraping 24/7)     (icebreakers, défis)
                   │                    │
                   ▼                    │
            OFFRES MATCHÉES ◄───────────┘
                   │            (partage d'offres entre membres)
                   ▼
         DOSSIER DE CANDIDATURE
         (CV + lettre + fiche entreprise)
                   │
                   ├──► ÉCLAIREUR DISPONIBLE ? ──► Chat anonyme
                   │
                   ▼
        VALIDATION HUMAINE + ENVOI
                   │
                   ▼
           SUIVI PIPELINE
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
    PAS DE      SIGNAL     ENTRETIEN
    RÉPONSE    POSITIF     PLANIFIÉ
        │          │          │
        ▼          │          ▼
    RELANCE        │     PRÉPARATION
    INTELLIGENTE   │     (IA + escouade + éclaireur)
        │          │          │
        └──────────┼──────────┘
                   ▼
              RÉSULTAT
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
     REFUSÉ     OFFRE      EN ATTENTE
        │       REÇUE          │
        ▼          │          ▼
    ANALYSE     NÉGO       PATIENCE
    + PLAN     SALARIALE   + RELANCE
    D'AMÉLIO       │
        │          ▼
        │      EMBAUCHÉ ! 🎉
        │          │
        │          ├──► Célébration escouade
        │          ├──► Devenir éclaireur
        │          └──► Données enrichissent la base collective
        │
        └──► Retour à EDGE CHERCHE (cycle continue)
```

---

*Document de workflow — Version 1.1*
