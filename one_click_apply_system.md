# 🚀 Système de candidature intelligente (One-Click Apply Engine)

## 🎯 Objectif
Permettre à un utilisateur de postuler à une offre d’emploi/stage en un minimum d’actions, avec :
- automatisation maximale,
- intervention minimale si nécessaire,
- suivi fiable des candidatures.

---

# 🧠 Principe global

Le système repose sur une architecture **hybride** :

1. Intégration API ATS (Automatique)
2. Automatisation navigateur (Fallback)
3. Intervention utilisateur (Human-in-the-loop)
4. Suivi intelligent (Webhooks + Email + Logs)

---

# 🧩 CAS D’UTILISATION DU BOUTON "POSTULER"

## 🟢 CAS 1 : ATS intégré (100% automatique)

### Conditions
- Offre provenant d’un ATS supporté :
  - Greenhouse
  - Lever
  - Ashby

### Flow
1. Click sur "Postuler"
2. Backend détecte la source ATS
3. Récupération des champs requis via API
4. Mapping avec profil utilisateur
5. Soumission automatique via API
6. Retour succès / erreur

---

## 🟡 CAS 2 : ATS sans API ou site custom

### Flow
1. Lancement d’un agent navigateur (Playwright)
2. Remplissage automatique
3. Détection des blocages (CAPTCHA, compte, OTP)

---

## 🔴 CAS 3 : Intervention utilisateur

### Flow
1. Pause automatisation
2. Intervention utilisateur
3. Reprise automatique

---

# 🧾 PROFIL CANDIDAT NORMALISÉ

```json
{
  "first_name": "",
  "last_name": "",
  "email": "",
  "phone": "",
  "resume": "",
  "cover_letter": "",
  "linkedin": ""
}
```

---

# 🏗️ ARCHITECTURE

## Backend Modules
- ATS Detector
- Application Orchestrator
- Field Mapper
- Browser Automation
- Tracking Engine

---

# 📊 STATUTS

- draft
- submitting
- submitted
- action_required
- failed
- interview
- rejected
- hired

---

# 🔔 SUIVI

- Webhooks ATS
- Polling API
- Analyse emails

---

# 🔚 CONCLUSION

Approche hybride obligatoire pour robustesse.
