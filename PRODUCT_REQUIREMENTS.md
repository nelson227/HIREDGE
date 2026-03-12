# HIREDGE — Product Requirements Document (PRD)

---

## 1. Vision du Produit

### 1.1 Énoncé de Vision
HIREDGE est le **premier compagnon de recherche d'emploi intelligent et social** qui combine un agent IA personnel, l'intelligence collective d'une communauté de candidats, et un accompagnement complet de la recherche d'offres jusqu'à la signature du contrat.

### 1.2 Mission
**Faire que personne ne cherche plus jamais un emploi seul.** Réduire le temps moyen de recherche d'emploi de 50% et multiplier par 3 le taux de réponse aux candidatures.

### 1.3 Proposition de Valeur Unique (UVP)
> "Un agent IA qui chasse pour toi + une escouade qui se bat avec toi + des éclaireurs qui t'ouvrent les portes = le taux d'embauche le plus élevé du marché."

---

## 2. Personas Utilisateurs

### 2.1 Persona Primaire : "Aminata" — Jeune Diplômée

| Attribut | Détail |
|----------|--------|
| **Âge** | 23 ans |
| **Situation** | Diplômée en informatique depuis 6 mois, 0 expérience pro |
| **Localisation** | Douala, Cameroun |
| **Frustrations** | Envoie 10 CV/semaine, reçoit 0 réponse. Ne sait pas comment se vendre. Se sent seule et démotivée. Les offres demandent "3 ans d'expérience" pour un poste junior. |
| **Besoins** | Savoir quelles offres cibler, comment rédiger des candidatures percutantes, être accompagnée et motivée |
| **Comportement digital** | Mobile-first, active sur WhatsApp et Instagram, consomme du contenu TikTok |
| **Citation** | *"J'ai un diplôme mais personne ne me donne ma chance. Je ne sais même pas si mon CV est bien."* |

### 2.2 Persona Secondaire : "Thomas" — Professionnel en Reconversion

| Attribut | Détail |
|----------|--------|
| **Âge** | 34 ans |
| **Situation** | 8 ans en comptabilité, veut passer dans la data science |
| **Localisation** | Lyon, France |
| **Frustrations** | Son expérience passée ne "match" pas les mots-clés des offres data. Les recruteurs ne voient pas ses compétences transférables. Il ne connaît personne dans le milieu data. |
| **Besoins** | Traduire son expérience en langage data, trouver les entreprises ouvertes aux parcours atypiques, se connecter avec des gens du milieu |
| **Comportement digital** | Web et mobile, utilise LinkedIn passivement |
| **Citation** | *"J'ai les compétences, mais mon CV raconte l'ancienne histoire. Personne ne me répond."* |

### 2.3 Persona Tertiaire : "Fatou" — Immigrante Qualifiée

| Attribut | Détail |
|----------|--------|
| **Âge** | 29 ans |
| **Situation** | Ingénieure sénégalaise installée au Canada depuis 1 an, diplôme non reconnu |
| **Localisation** | Montréal, Canada |
| **Frustrations** | Processus d'équivalence de diplôme long, discrimination subtile à l'embauche, pas de réseau local, ne connaît pas les codes du marché canadien |
| **Besoins** | Comprendre le marché local, être guidée sur les démarches, trouver des entreprises ouvertes à la diversité, connecter avec des gens qui ont vécu la même chose |
| **Citation** | *"J'ai 5 ans d'expérience en génie civil mais ici c'est comme si je repartais de zéro."* |

### 2.4 Persona B2B : "Sophie" — Recruteuse en PME

| Attribut | Détail |
|----------|--------|
| **Âge** | 31 ans |
| **Situation** | RH dans une PME de 80 personnes, recrute 15 postes/an |
| **Frustrations** | Pas de budget pour un cabinet de recrutement, noyée sous les CV non qualifiés, les bons candidats ne connaissent pas sa PME |
| **Besoins** | Accéder à des candidats **qualifiés et motivés**, pas juste des CV. Voir si le candidat a été préparé et est sérieux. |
| **Citation** | *"Je reçois 300 candidatures et 290 n'ont même pas lu la fiche de poste."* |

---

## 3. Exigences Fonctionnelles

### 3.1 Onboarding

| ID | Exigence | Priorité | Détails |
|----|----------|----------|---------|
| F-001 | Inscription rapide | P0 | Email/Google/Apple Sign-In. Moins de 60 secondes. |
| F-002 | Création de profil guidée par IA | P0 | L'IA pose des questions en conversationnel (chat) pour construire le profil. Pas de formulaire froid. L'utilisateur parle et l'IA structure. |
| F-003 | Import de CV | P0 | Upload PDF/DOCX → l'IA extrait automatiquement les informations et pré-remplit le profil. |
| F-004 | Import LinkedIn | P1 | Connexion LinkedIn pour récupérer le profil existant. |
| F-005 | Définition des préférences | P0 | Type de poste, localisation, salaire souhaité, mode (remote/hybride/présentiel), taille d'entreprise, secteurs. |
| F-006 | Évaluation initiale | P1 | L'IA évalue le profil et donne un "score de préparation" avec des recommandations immédiates. |

### 3.2 Agent IA "EDGE"

| ID | Exigence | Priorité | Détails |
|----|----------|----------|---------|
| F-010 | Recherche multi-plateforme | P0 | L'agent scrape LinkedIn, Indeed, Glassdoor, Welcome to the Jungle, sites d'entreprises, job boards spécialisés, offres dans des posts sur Twitter/X, groupes Telegram/Discord. |
| F-011 | Matching intelligent | P0 | Score de compatibilité 0-100% pour chaque offre, avec explication détaillée des forces et lacunes du candidat par rapport à l'offre. |
| F-012 | Filtrage automatique | P0 | Élimine les offres fantômes (déjà pourvues), les arnaques, les doublons. |
| F-013 | Dossier de candidature | P0 | Pour chaque offre validée, l'agent génère : CV adapté, lettre de motivation ciblée, analyse de l'entreprise (culture, actualités, valeurs), fourchette salariale réelle, processus de recrutement prévu. |
| F-014 | Personnalisation du CV | P0 | Réorganisation du CV pour mettre en avant les compétences pertinentes pour CE poste spécifique. Sans mentir. |
| F-015 | Lettre de motivation ciblée | P0 | Fait référence aux projets récents de l'entreprise, à ses valeurs, connecte l'expérience du candidat au besoin spécifique. Style naturel, pas "IA-flavored". |
| F-016 | Validation humaine | P0 | Le candidat DOIT valider/modifier chaque élément avant envoi. Jamais d'envoi automatique sans consentement. |
| F-017 | Envoi multi-canal | P1 | L'agent envoie via le canal approprié : formulaire en ligne, email, plateforme ATS. |
| F-018 | Détection anti-IA | P1 | Le texte généré passe un test de détection IA et est reformulé jusqu'à être indétectable. |
| F-019 | Offres cachées | P1 | Détection d'offres dans des posts sociaux, newsletters, et événements non référencés sur les job boards classiques. |
| F-020 | Notifications push | P0 | Alerte quand une offre très compatible apparaît (>80% match). |

### 3.3 Escouades

| ID | Exigence | Priorité | Détails |
|----|----------|----------|---------|
| F-030 | Formation automatique | P0 | L'IA forme des escouades de 5-8 personnes basées sur : domaine, niveau d'expérience, localisation, objectifs similaires. |
| F-031 | Non-compétition | P0 | L'IA vérifie que les membres d'une escouade ne postulent pas aux mêmes offres. Si conflit, alerte et médiation. |
| F-032 | Chat de groupe | P0 | Messagerie temps réel (texte + vocaux + images). |
| F-033 | Visio spontanée | P1 | Appel vidéo intégré pour les mock interviews et les réunions d'escouade. |
| F-034 | Partage d'informations | P0 | Les membres partagent : questions d'entretien, infos sur les entreprises, offres trouvées, conseils. |
| F-035 | Animation IA | P1 | L'IA anime le groupe : pose la question du jour, lance des défis, félicite les progrès, détecte les membres inactifs et les relance. |
| F-036 | Célébration | P0 | Quand un membre décroche un emploi, notification spéciale à toute l'escouade + célébration in-app. |
| F-037 | Reformation dynamique | P1 | Si un membre est embauché ou inactif, il est remplacé. L'escouade reste toujours à 5-8 membres actifs. |
| F-038 | Historique d'escouade | P2 | Accès aux conversations et infos partagées même après dissolution de l'escouade. |

### 3.4 Éclaireurs

| ID | Exigence | Priorité | Détails |
|----|----------|----------|---------|
| F-040 | Inscription éclaireur | P0 | Toute personne embauchée via HIREDGE (ou inscrite manuellement) depuis < 6 mois peut devenir éclaireur pour son entreprise. |
| F-041 | Anonymat garanti | P0 | L'éclaireur n'est JAMAIS identifiable par son entreprise. Pas de nom, pas de département spécifique. |
| F-042 | Questionnaire structuré | P0 | L'IA pose des questions précises à l'éclaireur : processus de recrutement, culture, ce que le manager cherche, salaires, ambiance, red/green flags. |
| F-043 | Matching éclaireur-candidat | P0 | Quand un candidat postule dans une entreprise où il y a un éclaireur, connexion automatique (chat anonyme). |
| F-044 | Système de crédits | P1 | L'éclaireur gagne des crédits pour chaque aide fournie → utilisables quand il cherchera lui-même un emploi. |
| F-045 | Vérification | P1 | Vérification que l'éclaireur travaille bien dans l'entreprise déclarée (email professionnel, badge, contrat). |
| F-046 | Notation | P1 | Les candidats notent l'utilité de l'info reçue → les meilleurs éclaireurs sont mis en avant. |

### 3.5 Intelligence Collective

| ID | Exigence | Priorité | Détails |
|----|----------|----------|---------|
| F-050 | Base de données entreprises | P0 | Chaque candidature enrichit automatiquement la fiche entreprise : durée du processus, nombre d'étapes, questions posées, salaire proposé, résultat. |
| F-051 | Anonymisation totale | P0 | Aucune donnée personnelle dans les statistiques. Tout est agrégé et anonyme. |
| F-052 | Fiche entreprise | P0 | Pour chaque entreprise : score de difficulté (1-10), durée moyenne du processus, taux de réponse, salaires réels, questions fréquentes, avis des éclaireurs. |
| F-053 | Patterns de réussite | P1 | L'IA détecte les patterns qui mènent à l'embauche par entreprise : *"Les candidats qui mentionnent [X] ont +34% de chances"*. |
| F-054 | Insights temporels | P1 | *"Postuler le lundi matin chez les grandes entreprises = +18% de taux de réponse"*. |
| F-055 | Comparaison | P2 | Comparer deux entreprises sur tous les critères. |

### 3.6 Préparation aux Entretiens

| ID | Exigence | Priorité | Détails |
|----|----------|----------|---------|
| F-060 | Simulation IA | P0 | L'IA joue le rôle du recruteur, pose des questions probables pour CE poste dans CETTE entreprise (basées sur les données collectives). |
| F-061 | Analyse vocale | P1 | Analyse du contenu, de la structure, des tics de langage, de la confiance, de la durée de réponse. |
| F-062 | Feedback détaillé | P0 | Après chaque simulation : points forts, points à améliorer, reformulations suggérées, score. |
| F-063 | Mock interview en escouade | P1 | Un membre joue le recruteur, les autres observent et donnent du feedback en live. |
| F-064 | Mode stress | P2 | Simulation avec interruptions, questions pièges, pression temporelle. |
| F-065 | Replay | P1 | Revoir sa simulation avec annotations IA + feedback de l'escouade. |
| F-066 | Brief pré-entretien | P0 | 24h avant un vrai entretien : résumé de l'entreprise, questions probables, conseils de l'éclaireur, encouragements de l'escouade. |
| F-067 | Débrief post-entretien | P1 | Après un entretien réel : l'IA pose des questions sur comment ça s'est passé, analyse et donne des conseils pour la suite. |

### 3.7 Suivi des Candidatures

| ID | Exigence | Priorité | Détails |
|----|----------|----------|---------|
| F-070 | Dashboard kanban | P0 | Pipeline visuel : Repérée → Dossier prêt → Postulée → Vue → Entretien → Offre → Acceptée/Refusée. |
| F-071 | Détection de signaux | P1 | L'IA surveille si quelqu'un de l'entreprise a consulté le profil (LinkedIn)/ouvert le mail (pixel tracking opt-in). |
| F-072 | Relance intelligente | P0 | Message de relance pré-rédigé, personnalisé, envoyé au timing optimal calculé par l'IA (basé sur les données historiques de l'entreprise). |
| F-073 | Analyse post-rejet | P1 | Quand refusé, l'IA analyse les patterns et suggère des amélirations : *"Tu es refusé 60% du temps au stade technique. Voici un plan."* |
| F-074 | Statistiques personnelles | P0 | Taux de réponse, taux de conversion par étape, temps moyen, types de postes qui répondent le plus. |
| F-075 | Export | P2 | Exporter l'historique de ses candidatures en CSV/PDF. |

### 3.8 Négociation Salariale

| ID | Exigence | Priorité | Détails |
|----|----------|----------|---------|
| F-080 | Données salariales réelles | P0 | Salaires réels anonymisés par poste/ville/expérience/entreprise (alimentés par les éclaireurs et les résultats de candidatures). |
| F-081 | Coach de négociation IA | P1 | Simulation de négociation salariale avec l'IA. Stratégies, arguments, contre-arguments. |
| F-082 | Comparaison d'offres | P1 | Si le candidat a plusieurs offres, l'IA compare (salaire, avantages, culture, évolution de carrière) et conseille. |

---

## 4. Exigences Non-Fonctionnelles

### 4.1 Performance
| ID | Exigence | Métrique |
|----|----------|---------|
| NF-001 | Temps de chargement de l'app | < 2 secondes |
| NF-002 | Génération d'un dossier de candidature | < 30 secondes |
| NF-003 | Réponse du chat IA | < 3 secondes |
| NF-004 | Rafraîchissement des offres | Toutes les 30 minutes |
| NF-005 | Disponibilité du service | 99.9% uptime |

### 4.2 Scalabilité
| ID | Exigence | Métrique |
|----|----------|---------|
| NF-010 | Utilisateurs simultanés | Supporter 100K+ utilisateurs simultanés à la V2 |
| NF-011 | Croissance de la base | Architecture pensée pour 10M+ utilisateurs |
| NF-012 | Multi-langue | Français, Anglais, Espagnol dès la V1 |
| NF-013 | Multi-pays | Adaptation des offres et des données par pays |

### 4.3 Sécurité
| ID | Exigence | Métrique |
|----|----------|---------|
| NF-020 | Chiffrement des données | AES-256 au repos, TLS 1.3 en transit |
| NF-021 | Authentification | JWT + refresh tokens, MFA optionnel |
| NF-022 | Anonymat des éclaireurs | Zero-knowledge : même HIREDGE ne peut pas lier un éclaireur à ses messages |
| NF-023 | RGPD/CCPA | Droit à l'oubli, export des données, consentement explicite |
| NF-024 | Audit de sécurité | Pentest annuel minimum |
| NF-025 | Données IA | Les données utilisateur ne sont PAS utilisées pour entraîner des modèles tiers |

### 4.4 Accessibilité
| ID | Exigence | Métrique |
|----|----------|---------|
| NF-030 | Mobile-first | 100% des fonctionnalités accessibles sur mobile |
| NF-031 | Mode offline | Consultation du dashboard et des dossiers sans connexion |
| NF-032 | Accessibilité | WCAG 2.1 AA minimum |
| NF-033 | Mode sombre | Thème clair/sombre |
| NF-034 | Bande passante faible | L'app fonctionne sur une connexion 3G (important pour l'Afrique) |

---

## 5. Contraintes et Hypothèses

### 5.1 Contraintes
- Le scraping de certaines plateformes (LinkedIn) peut être juridiquement limité → prévoir des API officielles ou des partenariats
- Les LLMs ont des coûts par requête → optimiser l'usage (cache, modèles légers pour les tâches simples)
- L'anonymat des éclaireurs est CRITIQUE : si un scandale de leak survient, la confiance est détruite

### 5.2 Hypothèses
- Les candidats sont prêts à partager leurs données de candidature en échange de l'intelligence collective
- Les personnes récemment embauchées sont motivées à devenir éclaireurs (crédits + altruisme)
- Le modèle freemium convertit à 5-8% en premium (standard secteur)
- Les entreprises sont prêtes à payer pour accéder à des candidats qualifiés et préparés

---

## 6. Critères de Succès (12 premiers mois)

| Métrique | Objectif |
|----------|----------|
| Utilisateurs inscrits | 100 000 |
| Utilisateurs actifs mensuels (MAU) | 40 000 |
| Taux de conversion premium | 6% |
| Nombre d'escouades actives | 5 000 |
| Nombre d'éclaireurs actifs | 2 000 |
| Taux d'embauche (utilisateurs qui trouvent un emploi) | 35% en 3 mois |
| NPS | > 55 |
| Taux de rétention J30 | > 40% |
| Entreprises B2B | 200 |

---

## 7. Risques et Mitigations

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| Problèmes juridiques de scraping | Élevé | Moyen | Privilégier les API officielles, partenariats, données contribuées par les utilisateurs |
| Fuite d'identité d'un éclaireur | Critique | Faible | Architecture zero-knowledge, audits, chiffrement bout-en-bout |
| Coûts IA trop élevés | Élevé | Moyen | Modèles légers (Phi, Mistral) pour les tâches simples, cache agressif, limites freemium |
| Escouades inactives/toxiques | Moyen | Moyen | Modération IA, reformation dynamique, signalement |
| Candidatures IA détectées par les recruteurs | Élevé | Moyen | Style naturel, validation humaine obligatoire, détection anti-IA intégrée |
| Faible adoption initiale | Élevé | Moyen | Lancement ciblé (une ville/un domaine), marketing grassroots, partenariats universités |

---

*Document de référence produit — Version 1.0*
