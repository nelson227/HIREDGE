# HIREDGE — API Reference

---

## Base URL

```
Production : https://api.hiredge.app/v1
Staging    : https://api-staging.hiredge.app/v1
```

## Authentification

Toutes les requêtes (sauf login/register) nécessitent un header :
```
Authorization: Bearer <access_token>
```

Les tokens sont des JWT avec une durée de 15 minutes (access) et 30 jours (refresh).

---

## 1. AUTH SERVICE

### POST /auth/register
Inscription d'un nouvel utilisateur.

**Body :**
```json
{
  "email": "aminata@email.com",
  "password": "SecureP@ss123",
  "role": "candidate",
  "locale": "fr"
}
```

**Response 201 :**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-xxx",
      "email": "aminata@email.com",
      "role": "candidate",
      "created_at": "2026-03-12T10:00:00Z"
    },
    "tokens": {
      "access_token": "eyJhbG...",
      "refresh_token": "eyJhbG...",
      "expires_in": 900
    }
  }
}
```

**Erreurs :**
| Code | Message |
|------|---------|
| 400 | Validation error (email format, password strength) |
| 409 | Email already registered |

---

### POST /auth/login
Connexion.

**Body :**
```json
{
  "email": "aminata@email.com",
  "password": "SecureP@ss123"
}
```

**Response 200 :**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-xxx",
      "email": "aminata@email.com",
      "role": "candidate"
    },
    "tokens": {
      "access_token": "eyJhbG...",
      "refresh_token": "eyJhbG...",
      "expires_in": 900
    }
  }
}
```

---

### POST /auth/refresh
Rafraîchir le token d'accès.

**Body :**
```json
{
  "refresh_token": "eyJhbG..."
}
```

**Response 200 :**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbG...",
    "expires_in": 900
  }
}
```

---

### POST /auth/logout
Déconnexion (invalide le refresh token).

**Response 200 :**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### POST /auth/forgot-password
Demande de réinitialisation.

**Body :**
```json
{
  "email": "aminata@email.com"
}
```

**Response 200 :** (toujours 200 pour ne pas révéler si l'email existe)
```json
{
  "success": true,
  "message": "If this email exists, a reset link has been sent"
}
```

---

### POST /auth/reset-password
Réinitialiser le mot de passe.

**Body :**
```json
{
  "token": "reset-token-xxx",
  "new_password": "NewSecureP@ss456"
}
```

---

## 2. PROFILE SERVICE

### GET /profile/me
Récupérer son profil complet.

**Response 200 :**
```json
{
  "success": true,
  "data": {
    "id": "uuid-xxx",
    "first_name": "Aminata",
    "last_name": "Ngo",
    "title": "Développeuse React",
    "bio": "Passionnée par le frontend...",
    "location": {
      "city": "Douala",
      "country": "CM"
    },
    "preferences": {
      "remote": "hybrid",
      "salary_min": 350000,
      "salary_max": 500000,
      "currency": "XAF",
      "contract_types": ["CDI"],
      "sectors": ["tech", "fintech"]
    },
    "skills": [
      { "name": "React.js", "level": "intermediate", "years": 2 },
      { "name": "JavaScript", "level": "advanced", "years": 3 },
      { "name": "TypeScript", "level": "beginner", "years": 0.5 }
    ],
    "experiences": [
      {
        "id": "exp-uuid",
        "company": "Stage chez TechStartup",
        "title": "Développeuse Frontend Stagiaire",
        "start_date": "2025-01",
        "end_date": "2025-06",
        "description": "Développement d'interfaces React...",
        "is_current": false
      }
    ],
    "education": [
      {
        "institution": "Université de Douala",
        "degree": "Licence en Génie Informatique",
        "year": 2025
      }
    ],
    "preparation_score": 68,
    "preparation_tips": [
      "Ajoute un portfolio de projets (+15 pts)",
      "Ajoute une photo professionnelle (+7 pts)"
    ],
    "created_at": "2026-03-12T10:00:00Z",
    "updated_at": "2026-03-12T10:30:00Z"
  }
}
```

---

### PUT /profile/me
Mettre à jour son profil.

**Body (partiel accepté) :**
```json
{
  "title": "Développeuse React & TypeScript",
  "preferences": {
    "salary_min": 400000
  }
}
```

---

### POST /profile/import-cv
Importer et parser un CV.

**Body : multipart/form-data**
```
file: cv.pdf (max 10MB, PDF ou DOCX)
```

**Response 200 :**
```json
{
  "success": true,
  "data": {
    "extracted": {
      "name": "Aminata Ngo",
      "title": "Développeuse React",
      "skills": ["React.js", "JavaScript", "HTML", "CSS", "Git"],
      "experiences": [...],
      "education": [...]
    },
    "confidence": 0.92,
    "message": "CV parsé avec succès. Vérifiez et complétez les informations."
  }
}
```

---

## 3. JOB SEARCH SERVICE

### GET /jobs
Liste des offres recommandées pour le candidat.

**Query params :**
| Param | Type | Description |
|-------|------|-------------|
| page | int | Page (default: 1) |
| limit | int | Par page (default: 20, max: 50) |
| min_match | int | Score minimum (default: 50) |
| sort | string | "match_desc" | "date_desc" | "salary_desc" |
| remote | string | "remote" | "hybrid" | "onsite" |
| contract | string | "CDI" | "CDD" | "freelance" | "stage" |
| location | string | Ville ou pays |
| q | string | Recherche textuelle |

**Response 200 :**
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "id": "job-uuid-1",
        "title": "Développeur React Senior",
        "company": {
          "id": "comp-uuid",
          "name": "TechCorp SAS",
          "logo_url": "https://...",
          "glassdoor_rating": 3.8,
          "size": "50-200"
        },
        "location": {
          "city": "Paris",
          "country": "FR",
          "remote_type": "hybrid"
        },
        "salary": {
          "min": 42000,
          "max": 48000,
          "currency": "EUR",
          "is_estimated": false
        },
        "contract_type": "CDI",
        "match_score": 91,
        "match_details": {
          "strengths": ["React.js expérience", "E-commerce background"],
          "gaps": ["Docker non mentionné", "TypeScript intermédiaire"],
          "hire_probability": 0.23
        },
        "has_scout": true,
        "scout_count": 1,
        "source": "linkedin",
        "posted_at": "2026-03-10T08:00:00Z",
        "is_ghost": false,
        "is_scam": false
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 47,
      "total_pages": 3
    }
  }
}
```

---

### GET /jobs/:id
Détail complet d'une offre.

**Response 200 :**
```json
{
  "success": true,
  "data": {
    "id": "job-uuid-1",
    "title": "Développeur React Senior",
    "company": {
      "id": "comp-uuid",
      "name": "TechCorp SAS",
      "description": "Startup fintech fondée en 2020...",
      "website": "https://techcorp.com",
      "logo_url": "...",
      "industry": "Fintech",
      "size": "50-200",
      "glassdoor_rating": 3.8,
      "culture_summary": "Ambiance startup, move fast...",
      "recent_news": [
        "Lancement d'un outil IA (fév 2026)",
        "Partenariat Orange (jan 2026)"
      ]
    },
    "description": "Nous recherchons un développeur React...",
    "requirements": ["3+ ans React", "TypeScript", "REST APIs"],
    "nice_to_have": ["Docker", "AWS", "GraphQL"],
    "benefits": ["Remote 2j/semaine", "Tickets restaurant", "RTT"],
    "salary": { "min": 42000, "max": 48000, "currency": "EUR" },
    "location": { "city": "Paris 9e", "country": "FR", "remote_type": "hybrid" },
    "contract_type": "CDI",
    "source_url": "https://...",
    "posted_at": "2026-03-10T08:00:00Z",
    "match_score": 91,
    "match_details": {...},
    "recruitment_process": {
      "estimated_steps": 5,
      "estimated_duration_days": 18,
      "steps": [
        { "name": "Screening CV", "duration": "3-5 jours" },
        { "name": "Call RH", "duration": "15 min" },
        { "name": "Test technique", "duration": "3h take-home" },
        { "name": "Entretien technique", "duration": "1h visio" },
        { "name": "Culture fit", "duration": "30 min" }
      ],
      "response_rate": 0.34,
      "common_questions": [
        "Pourquoi TechCorp ?",
        "Décrivez un projet dont vous êtes fier",
        "Comment restez-vous à jour ?"
      ],
      "data_points": 12,
      "confidence": "high"
    },
    "salary_insights": {
      "market_low": 38000,
      "market_median": 43000,
      "market_high": 52000,
      "company_range": [42000, 48000],
      "recommendation": "Avec ton profil, vise 45K€",
      "data_points": 8
    },
    "scout_available": true,
    "scout_count": 1
  }
}
```

---

## 4. APPLICATION SERVICE (Candidatures)

### POST /applications
Créer une candidature (préparer le dossier).

**Body :**
```json
{
  "job_id": "job-uuid-1"
}
```

**Response 201 :**
```json
{
  "success": true,
  "data": {
    "id": "app-uuid-1",
    "status": "draft",
    "job_id": "job-uuid-1",
    "match_score": 91,
    "dossier": {
      "adapted_cv": {
        "url": "https://s3.../cv-adapted-uuid.pdf",
        "changes_summary": "Compétences React et TypeScript mises en avant, section e-commerce enrichie"
      },
      "cover_letter": {
        "text": "Madame, Monsieur,\n\nVotre récent lancement d'un outil IA...",
        "key_points": [
          "Référence au lancement IA récent",
          "Connexion expérience e-commerce",
          "Projet personnel React mentionné"
        ]
      },
      "company_analysis": {...},
      "process_info": {...},
      "salary_insights": {...}
    },
    "created_at": "2026-03-12T14:00:00Z"
  }
}
```

---

### PUT /applications/:id
Modifier le dossier (CV, lettre, etc.) avant envoi.

**Body :**
```json
{
  "cover_letter_text": "Texte modifié par le candidat...",
  "notes": "J'ai ajouté une référence à mon projet perso"
}
```

---

### POST /applications/:id/send
Envoyer la candidature (après validation humaine).

**Response 200 :**
```json
{
  "success": true,
  "data": {
    "id": "app-uuid-1",
    "status": "sent",
    "sent_at": "2026-03-12T14:30:00Z",
    "sent_via": "company_website_form",
    "next_followup_date": "2026-03-20T09:00:00Z",
    "message": "Candidature envoyée ! Je la surveille. Relance prévue le 20 mars si pas de réponse."
  }
}
```

---

### GET /applications
Liste de toutes mes candidatures (pipeline).

**Query params :** status, page, limit, sort

**Response 200 :**
```json
{
  "success": true,
  "data": {
    "applications": [
      {
        "id": "app-uuid-1",
        "job_title": "Dev React Senior",
        "company_name": "TechCorp",
        "status": "sent",
        "match_score": 91,
        "sent_at": "2026-03-12T14:30:00Z",
        "next_action": {
          "type": "followup",
          "date": "2026-03-20T09:00:00Z",
          "message": "Relance à envoyer"
        },
        "signals": [
          {
            "type": "profile_viewed",
            "date": "2026-03-14T11:00:00Z",
            "detail": "Quelqu'un de TechCorp a consulté ton profil"
          }
        ]
      }
    ],
    "stats": {
      "total": 12,
      "by_status": {
        "draft": 2,
        "sent": 5,
        "viewed": 2,
        "interview": 1,
        "offer": 0,
        "rejected": 2
      },
      "response_rate": 0.42,
      "avg_response_days": 6.3
    }
  }
}
```

---

### POST /applications/:id/followup
Envoyer un message de relance.

**Body :**
```json
{
  "message": "Bonjour, je me permets de vous relancer...",
  "use_ai_suggestion": true
}
```

---

### PUT /applications/:id/status
Mettre à jour le statut manuellement.

**Body :**
```json
{
  "status": "interview",
  "interview_date": "2026-03-25T14:00:00Z",
  "notes": "Entretien technique en visio"
}
```

---

## 5. SQUAD SERVICE (Escouades)

### GET /squads/me
Récupérer son escouade actuelle.

**Response 200 :**
```json
{
  "success": true,
  "data": {
    "id": "squad-uuid",
    "name": "Les Développeurs de l'Ouest",
    "domain": "Frontend Development",
    "level": "Junior",
    "members": [
      {
        "id": "member-uuid-1",
        "first_name": "Aminata",
        "title": "Dev React Junior",
        "location": "Douala, CM",
        "is_active": true,
        "last_active": "2026-03-12T13:00:00Z",
        "is_self": true
      },
      {
        "id": "member-uuid-2",
        "first_name": "Marc",
        "title": "Dev React Junior",
        "location": "Lyon, FR",
        "is_active": true,
        "last_active": "2026-03-12T12:45:00Z"
      }
    ],
    "member_count": 6,
    "created_at": "2026-03-05T10:00:00Z",
    "stats": {
      "total_applications_sent": 34,
      "total_interviews": 8,
      "members_hired": 1
    }
  }
}
```

---

### GET /squads/:id/messages
Récupérer les messages du chat d'escouade.

**Query params :** before (cursor), limit (default 50)

**Response 200 :**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg-uuid-1",
        "sender": {
          "id": "member-uuid-2",
          "first_name": "Marc"
        },
        "type": "text",
        "content": "J'ai passé un entretien chez Capgemini ! Les questions : ...",
        "created_at": "2026-03-12T14:00:00Z",
        "reactions": [
          { "emoji": "🔥", "count": 3 },
          { "emoji": "👏", "count": 2 }
        ]
      },
      {
        "id": "msg-uuid-2",
        "sender": { "id": "system", "first_name": "EDGE" },
        "type": "system",
        "content": "Défi du jour : Chacun partage 1 offre qu'il recommande à un autre membre!",
        "created_at": "2026-03-12T08:00:00Z"
      }
    ],
    "has_more": true,
    "next_cursor": "msg-uuid-0"
  }
}
```

---

### POST /squads/:id/messages
Envoyer un message.

**Body (texte) :**
```json
{
  "type": "text",
  "content": "Merci Marc ! Super utile pour Capgemini"
}
```

**Body (vocal) : multipart/form-data**
```
type: voice
audio: recording.m4a (max 5MB, max 90s)
```

---

### POST /squads/:id/call
Lancer un appel visio d'escouade.

**Response 200 :**
```json
{
  "success": true,
  "data": {
    "room_url": "https://daily.co/room-xyz",
    "room_token": "eyJ...",
    "expires_at": "2026-03-12T16:00:00Z"
  }
}
```

---

## 6. SCOUT SERVICE (Éclaireurs)

### POST /scouts/register
S'inscrire comme éclaireur.

**Body :**
```json
{
  "company_name": "Shopify",
  "hired_date": "2026-02-01",
  "verification_method": "work_email",
  "work_email": "lea@shopify.com"
}
```

---

### POST /scouts/questionnaire
Remplir le questionnaire initial.

**Body :**
```json
{
  "recruitment_steps": 4,
  "step_types": ["hr", "technical", "case", "culture"],
  "culture_words": ["innovation", "autonomie", "bienveillance"],
  "top_advice": "Concentre-toi sur la qualité du code plus que la complétude",
  "salary_range": { "min": 40000, "max": 50000, "currency": "CAD" },
  "red_flags": "Heures supp fréquentes en période de release",
  "process_duration_days": 21
}
```

---

### GET /scouts/conversations
Mes conversations en cours (en tant qu'éclaireur).

**Response 200 :**
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "conv-uuid",
        "candidate_anonymous_name": "Candidat #4821",
        "job_title": "Développeur React",
        "last_message": "L'entretien technique, c'est en live ou take-home ?",
        "unread_count": 1,
        "created_at": "2026-03-11T09:00:00Z"
      }
    ]
  }
}
```

---

### POST /scouts/conversations/:id/messages
Répondre à un candidat (anonymement).

**Body :**
```json
{
  "content": "C'est un take-home de 4h. Projet React à compléter..."
}
```

---

## 7. INTERVIEW PREP SERVICE

### POST /interviews/simulate
Lancer une simulation d'entretien.

**Body :**
```json
{
  "job_id": "job-uuid-1",
  "type": "hr",
  "duration_minutes": 20,
  "difficulty": "medium",
  "language": "fr"
}
```

**Response 200 :**
```json
{
  "success": true,
  "data": {
    "session_id": "sim-uuid",
    "websocket_url": "wss://api.hiredge.app/v1/interviews/sim-uuid/stream",
    "first_message": {
      "role": "interviewer",
      "text": "Bonjour, merci d'avoir pris le temps. Pouvez-vous vous présenter et me parler de votre parcours ?",
      "audio_url": "https://..."
    }
  }
}
```

**WebSocket flow :**
```
Client → Server : { "type": "audio", "data": <base64 audio chunk> }
Server → Client : { "type": "transcription", "text": "Mon parcours..." }
Server → Client : { "type": "interviewer_response", "text": "...", "audio_url": "..." }
... (boucle pendant la durée de la simulation)
Server → Client : { "type": "simulation_complete", "report_id": "report-uuid" }
```

---

### GET /interviews/reports/:id
Récupérer le rapport post-simulation.

**Response 200 :**
```json
{
  "success": true,
  "data": {
    "id": "report-uuid",
    "session_id": "sim-uuid",
    "job_title": "Dev React Senior @ TechCorp",
    "type": "hr",
    "duration_seconds": 1140,
    "overall_score": 72,
    "scores": {
      "content_quality": 78,
      "structure": 65,
      "confidence": 70,
      "specificity": 80,
      "conciseness": 60
    },
    "strengths": [
      "Présentation claire et concise",
      "Motivation sincère et spécifique au poste",
      "Bonne question posée au recruteur"
    ],
    "improvements": [
      {
        "issue": "Réponse sur les échecs manque la leçon apprise",
        "suggestion": "Utilise la méthode STAR : Situation, Tâche, Action, Résultat",
        "example": "Lors de mon stage, j'ai sous-estimé la complexité de..."
      },
      {
        "issue": "23 occurrences de 'euh'",
        "suggestion": "Fais des pauses silencieuses plutôt que de remplir"
      },
      {
        "issue": "Réponses trop longues (moyenne 3 min 20)",
        "suggestion": "Vise 1 min 30 - 2 min par réponse"
      }
    ],
    "transcript": [
      { "role": "interviewer", "text": "Présentez-vous...", "timestamp": 0 },
      { "role": "candidate", "text": "Bonjour, je suis...", "timestamp": 5 }
    ],
    "likely_questions_for_real_interview": [
      "Pourquoi TechCorp et pas un grand groupe ?",
      "Comment restez-vous à jour techniquement ?",
      "Décrivez un projet dont vous êtes fier"
    ]
  }
}
```

---

## 8. NOTIFICATION SERVICE

### GET /notifications
Récupérer ses notifications.

**Query params :** page, limit, unread_only (bool)

**Response 200 :**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif-uuid",
        "type": "job_match_high",
        "title": "Offre ultra-compatible ! 🎯",
        "body": "Dev React Senior chez TechCorp — 91% match",
        "data": { "job_id": "job-uuid-1" },
        "is_read": false,
        "sent_at": "2026-03-12T08:00:00Z"
      },
      {
        "id": "notif-uuid-2",
        "type": "squad_celebration",
        "title": "Léa a décroché un emploi ! 🎉",
        "body": "CDI chez Shopify — félicite-la !",
        "data": { "squad_id": "squad-uuid", "member_id": "member-uuid" },
        "is_read": true,
        "sent_at": "2026-03-11T15:00:00Z"
      }
    ],
    "unread_count": 3
  }
}
```

---

### PUT /notifications/:id/read
Marquer comme lue.

### PUT /notifications/preferences
Mettre à jour les préférences de notification.

**Body :**
```json
{
  "push_enabled": true,
  "email_enabled": true,
  "max_push_per_day": 10,
  "quiet_hours": { "start": "22:00", "end": "07:00" },
  "types": {
    "job_match_high": { "push": true, "email": true },
    "job_match_medium": { "push": false, "email": true },
    "squad_message": { "push": true, "email": false },
    "followup_reminder": { "push": true, "email": true }
  }
}
```

---

## 9. ANALYTICS SERVICE

### GET /analytics/me
Statistiques personnelles du candidat.

**Response 200 :**
```json
{
  "success": true,
  "data": {
    "period": "last_30_days",
    "applications": {
      "total_sent": 12,
      "response_rate": 0.42,
      "interview_rate": 0.25,
      "avg_response_days": 6.3,
      "by_status": {
        "sent": 5,
        "viewed": 2,
        "interview": 3,
        "rejected": 2,
        "offer": 0
      }
    },
    "preparation": {
      "simulations_done": 4,
      "avg_simulation_score": 72,
      "score_progression": [65, 68, 72, 78],
      "squad_mock_interviews": 2
    },
    "trends": {
      "response_rate_trend": "improving",
      "best_performing_job_type": "Frontend Developer",
      "best_performing_company_size": "50-200",
      "best_day_to_apply": "monday",
      "best_time_to_apply": "09:00-11:00"
    },
    "recommendations": [
      "Ton taux de réponse a augmenté de 15% ce mois. Continue !",
      "Tu es refusé 60% du temps au stade technique. Fais plus de simulations techniques.",
      "Les PME te répondent 2x plus que les grands groupes. Cible-les en priorité."
    ]
  }
}
```

---

### GET /analytics/company/:id
Intelligence collective sur une entreprise.

**Response 200 :**
```json
{
  "success": true,
  "data": {
    "company_id": "comp-uuid",
    "company_name": "TechCorp SAS",
    "data_points": 47,
    "confidence": "high",
    "recruitment": {
      "avg_duration_days": 18,
      "response_rate": 0.34,
      "steps": [
        { "name": "CV Screening", "avg_duration_days": 4 },
        { "name": "RH Call", "avg_duration_days": 3 },
        { "name": "Technical Test", "avg_duration_days": 5 },
        { "name": "Technical Interview", "avg_duration_days": 3 },
        { "name": "Culture Fit", "avg_duration_days": 3 }
      ]
    },
    "salary": {
      "junior": { "min": 35000, "median": 40000, "max": 45000 },
      "mid": { "min": 42000, "median": 48000, "max": 55000 },
      "senior": { "min": 52000, "median": 58000, "max": 68000 }
    },
    "common_questions": [
      { "question": "Pourquoi TechCorp ?", "frequency": 0.67 },
      { "question": "Projet dont vous êtes fier", "frequency": 0.83 },
      { "question": "Comment restez-vous à jour ?", "frequency": 0.50 }
    ],
    "success_patterns": [
      "Mentionner un projet personnel augmente les chances de +34%",
      "Poser des questions sur la stack technique est valorisé"
    ],
    "scout_insights_available": true
  }
}
```

---

## 10. PAYMENT SERVICE

### POST /payments/subscribe
Souscrire à un abonnement premium.

**Body :**
```json
{
  "plan": "premium_monthly",
  "payment_method_id": "pm_stripe_xxx"
}
```

### DELETE /payments/subscribe
Annuler l'abonnement.

### GET /payments/invoices
Historique des factures.

---

## 11. WEBHOOKS (Pour les intégrations)

### Événements disponibles

| Événement | Description |
|-----------|-------------|
| `application.sent` | Candidature envoyée |
| `application.status_changed` | Statut de candidature modifié |
| `interview.scheduled` | Entretien planifié |
| `offer.received` | Offre reçue |
| `member.hired` | Membre d'escouade embauché |
| `scout.question_received` | Question reçue (pour l'éclaireur) |

---

## 12. RATE LIMITS

| Endpoint | Limite |
|----------|--------|
| Auth endpoints | 10 req/min |
| Profile endpoints | 60 req/min |
| Job search | 30 req/min |
| Application actions | 20 req/min |
| Squad messages | 60 req/min |
| IA endpoints (simulations, génération) | 10 req/min |
| Global | 300 req/min par user |

---

## 13. CODES D'ERREUR

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email format is invalid",
    "details": [
      { "field": "email", "message": "Must be a valid email address" }
    ]
  }
}
```

| Code HTTP | Error Code | Description |
|-----------|-----------|-------------|
| 400 | VALIDATION_ERROR | Données invalides |
| 401 | UNAUTHORIZED | Token manquant ou expiré |
| 403 | FORBIDDEN | Pas les permissions |
| 404 | NOT_FOUND | Ressource inexistante |
| 409 | CONFLICT | Déjà existant (email, candidature) |
| 429 | RATE_LIMITED | Trop de requêtes |
| 500 | INTERNAL_ERROR | Erreur serveur |

---

## 14. ADMIN SERVICE ✅

> Endpoints réservés aux administrateurs. Nécessite un rôle `ADMIN` (sauf `verify-access`).

### POST /admin/verify-access
Authentification admin dédiée (sans preHandler ADMIN).

**Body :**
```json
{
  "email": "admin@hiredge.app",
  "password": "MotDePasseAdmin"
}
```

**Response 200 :**
```json
{
  "success": true,
  "data": {
    "adminToken": "eyJhbG..."
  }
}
```

**Erreurs :**
| Code | Message |
|------|---------|
| 400 | Email et mot de passe requis |
| 401 | Identifiants admin invalides |

**Notes :**
- Le mot de passe est vérifié via bcrypt (hash stocké côté serveur)
- Le token JWT retourné a une durée de vie de 2 heures
- Ce token est distinct du token d'authentification utilisateur classique
- Stocké en `sessionStorage` côté client (non persistant entre onglets)

---

### GET /admin/stats
Statistiques globales de la plateforme.

**Response 200 :**
```json
{
  "success": true,
  "data": {
    "totalUsers": 247,
    "totalJobs": 1834,
    "totalApplications": 523,
    "totalSquads": 45,
    "recentSignups": 12,
    "activeUsersLast7d": 89,
    "usersByRole": {
      "CANDIDATE": 230,
      "SCOUT": 10,
      "RECRUITER": 5,
      "ADMIN": 2
    },
    "usersBySubscription": {
      "FREE": 200,
      "PREMIUM": 47
    }
  }
}
```

---

### GET /admin/users
Liste des utilisateurs avec pagination et filtres.

**Query params :**
| Param | Type | Description |
|-------|------|-------------|
| page | int | Page (default: 1) |
| limit | int | Par page (default: 20) |
| search | string | Recherche par email ou nom |
| role | string | Filtrer par rôle (CANDIDATE, SCOUT, RECRUITER, ADMIN) |
| subscriptionTier | string | Filtrer par abonnement (FREE, PREMIUM) |
| sortBy | string | Champ de tri (createdAt, lastActiveAt, email) |
| sortOrder | string | Ordre de tri (asc, desc) |

**Response 200 :**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-xxx",
      "email": "user@example.com",
      "role": "CANDIDATE",
      "subscriptionTier": "FREE",
      "createdAt": "2026-03-01T10:00:00Z",
      "lastActiveAt": "2026-03-12T14:00:00Z",
      "profile": {
        "firstName": "Aminata",
        "lastName": "Ngo",
        "title": "Dev React"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 247,
    "totalPages": 13
  }
}
```

---

### GET /admin/users/:id
Détail complet d'un utilisateur.

---

### PATCH /admin/users/:id/role
Modifier le rôle d'un utilisateur.

**Body :**
```json
{
  "role": "ADMIN"
}
```

---

### PATCH /admin/users/:id/subscription
Modifier l'abonnement d'un utilisateur.

**Body :**
```json
{
  "subscriptionTier": "PREMIUM"
}
```

---

### DELETE /admin/users/:id
Supprimer un utilisateur.

**Response 200 :**
```json
{
  "success": true,
  "message": "Utilisateur supprimé"
}
```

---

*Document API — Version 1.1*
