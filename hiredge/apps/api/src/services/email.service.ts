import { Resend } from 'resend';
import { config } from '../config/env';

const resend = new Resend(config.email.resendApiKey);
const FROM = config.email.fromEmail;
const APP_NAME = 'HIREDGE';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://hiredge.app';

export class EmailService {
  private async send(to: string, subject: string, html: string) {
    if (!config.email.resendApiKey) {
      console.warn('[EmailService] RESEND_API_KEY not set — skipping email');
      return;
    }
    await resend.emails.send({ from: FROM, to, subject, html });
  }

  async sendEmailVerification(to: string, token: string) {
    const link = `${FRONTEND_URL}/verify-email?token=${encodeURIComponent(token)}`;
    await this.send(to, `${APP_NAME} — Vérifiez votre email`, `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#111;">Bienvenue sur ${APP_NAME} !</h2>
        <p>Cliquez sur le bouton ci-dessous pour vérifier votre adresse email :</p>
        <a href="${link}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin:16px 0;">
          Vérifier mon email
        </a>
        <p style="color:#666;font-size:13px;">Ce lien expire dans 24 heures. Si vous n'avez pas créé de compte, ignorez cet email.</p>
      </div>
    `);
  }

  async sendPasswordReset(to: string, token: string) {
    const link = `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
    await this.send(to, `${APP_NAME} — Réinitialisation du mot de passe`, `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#111;">Réinitialisation du mot de passe</h2>
        <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous :</p>
        <a href="${link}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin:16px 0;">
          Réinitialiser mon mot de passe
        </a>
        <p style="color:#666;font-size:13px;">Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email.</p>
      </div>
    `);
  }

  async sendWelcome(to: string, firstName: string) {
    await this.send(to, `Bienvenue sur ${APP_NAME}, ${firstName} !`, `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#111;">Bienvenue, ${firstName} ! 🎉</h2>
        <p>Votre compte ${APP_NAME} est prêt. Voici ce que vous pouvez faire :</p>
        <ul style="line-height:1.8;">
          <li>📄 Téléchargez votre CV pour que EDGE vous trouve les meilleures offres</li>
          <li>🎯 Recevez des recommandations d'emploi personnalisées</li>
          <li>🎭 Préparez vos entretiens avec notre simulateur IA</li>
          <li>🤝 Rejoignez une escouade pour vous motiver</li>
        </ul>
        <a href="${FRONTEND_URL}/dashboard" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin:16px 0;">
          Commencer
        </a>
      </div>
    `);
  }

  async sendSubscriptionConfirmation(to: string, firstName: string) {
    await this.send(to, `${APP_NAME} — Abonnement Premium activé`, `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#111;">Bienvenue en Premium, ${firstName} ! 🚀</h2>
        <p>Votre abonnement Premium est maintenant actif. Vous avez accès à :</p>
        <ul style="line-height:1.8;">
          <li>♾️ Candidatures illimitées</li>
          <li>🎯 Matching avancé avec IA</li>
          <li>✍️ Lettres de motivation personnalisées illimitées</li>
          <li>🎭 Simulations d'entretien avancées</li>
          <li>🔭 Accès aux éclaireurs d'entreprise</li>
        </ul>
        <p>Bonne recherche d'emploi !</p>
      </div>
    `);
  }
}

export const emailService = new EmailService();
