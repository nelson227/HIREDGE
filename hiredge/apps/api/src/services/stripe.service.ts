import Stripe from 'stripe';
import { config } from '../config/env';
import prisma from '../db/prisma';
import redis from '../lib/redis';
import { emailService } from './email.service';
import { AppError } from './auth.service';

const stripe = config.stripe.secretKey
  ? new Stripe(config.stripe.secretKey, { apiVersion: '2026-02-25.clover' })
  : null;

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://hiredge.app';

export class StripeService {
  private ensureStripe(): Stripe {
    if (!stripe) throw new AppError('STRIPE_NOT_CONFIGURED', 'Stripe n\'est pas configuré', 500);
    return stripe;
  }

  async createCheckoutSession(userId: string, email: string) {
    const s = this.ensureStripe();

    if (!config.stripe.priceId) {
      throw new AppError('STRIPE_NO_PRICE', 'Aucun plan premium configuré', 500);
    }

    // Check if user already premium
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('USER_NOT_FOUND', 'Utilisateur introuvable', 404);
    if (user.subscriptionTier === 'PREMIUM') {
      throw new AppError('ALREADY_PREMIUM', 'Vous êtes déjà abonné Premium', 400);
    }

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await s.customers.create({ email, metadata: { userId } });
      customerId = customer.id;
      await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } });
    }

    const session = await s.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: config.stripe.priceId, quantity: 1 }],
      success_url: `${FRONTEND_URL}/dashboard?payment=success`,
      cancel_url: `${FRONTEND_URL}/pricing?payment=cancelled`,
      metadata: { userId },
    });

    return { url: session.url, sessionId: session.id };
  }

  async createPortalSession(userId: string) {
    const s = this.ensureStripe();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.stripeCustomerId) {
      throw new AppError('NO_SUBSCRIPTION', 'Aucun abonnement trouvé', 400);
    }

    const session = await s.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${FRONTEND_URL}/settings`,
    });

    return { url: session.url };
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    const s = this.ensureStripe();

    if (!config.stripe.webhookSecret) {
      throw new AppError('STRIPE_WEBHOOK_NOT_CONFIGURED', 'Webhook secret non configuré', 500);
    }

    const event = s.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (!userId) break;

        await prisma.$transaction([
          prisma.user.update({
            where: { id: userId },
            data: { subscriptionTier: 'PREMIUM' },
          }),
          prisma.payment.create({
            data: {
              userId,
              stripeCustomerId: session.customer as string,
              stripeSessionId: session.id,
              amount: session.amount_total || 0,
              currency: session.currency || 'cad',
              status: 'COMPLETED',
              tier: 'PREMIUM',
            },
          }),
        ]);

        // Clear user cache
        try { await redis.del(`auth:user:${userId}`); } catch {}

        // Send confirmation email
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: { candidateProfile: { select: { firstName: true } } },
        });
        if (user) {
          emailService.sendSubscriptionConfirmation(
            user.email,
            user.candidateProfile?.firstName || '',
          ).catch(() => {});
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: { subscriptionTier: 'FREE' },
        });

        // Clear cache for this user
        const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
        if (user) {
          try { await redis.del(`auth:user:${user.id}`); } catch {}
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Log but don't downgrade immediately — Stripe retries
        console.warn(`[Stripe] Payment failed for customer ${customerId}`);
        break;
      }
    }
  }
}

export const stripeService = new StripeService();
