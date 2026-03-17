import { FastifyPluginAsync } from 'fastify';
import { stripeService } from '../services/stripe.service';
import { AppError } from '../services/auth.service';

const paymentRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /payments/create-checkout — Create a Stripe Checkout session
  fastify.post('/create-checkout', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const result = await stripeService.createCheckoutSession(request.user.id, request.user.email);
      return reply.send({ success: true, data: result });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });

  // POST /payments/portal — Create a Stripe Customer Portal session
  fastify.post('/portal', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const result = await stripeService.createPortalSession(request.user.id);
      return reply.send({ success: true, data: result });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({ success: false, error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });

  // GET /payments/status — Get subscription status
  fastify.get('/status', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.user.id },
      select: { subscriptionTier: true, stripeCustomerId: true },
    });

    const applicationCount = await fastify.prisma.application.count({
      where: { userId: request.user.id },
    });

    return reply.send({
      success: true,
      data: {
        tier: user?.subscriptionTier || 'FREE',
        hasStripeCustomer: !!user?.stripeCustomerId,
        applicationsUsed: applicationCount,
        applicationsLimit: user?.subscriptionTier === 'PREMIUM' ? null : 50,
      },
    });
  });

  // POST /payments/webhook — Stripe webhook (no auth, raw body)
  fastify.post('/webhook', {
    config: { rawBody: true },
  }, async (request, reply) => {
    const signature = request.headers['stripe-signature'] as string;
    if (!signature) {
      return reply.status(400).send({ success: false, error: { code: 'MISSING_SIGNATURE', message: 'Missing stripe-signature header' } });
    }

    try {
      const rawBody = (request as any).rawBody || Buffer.from(JSON.stringify(request.body));
      await stripeService.handleWebhook(rawBody, signature);
      return reply.send({ received: true });
    } catch (err: any) {
      fastify.log.error(err, 'Stripe webhook error');
      return reply.status(400).send({ success: false, error: { code: 'WEBHOOK_ERROR', message: err.message } });
    }
  });
};

export default paymentRoutes;
