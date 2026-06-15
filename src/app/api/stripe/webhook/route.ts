import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import Stripe from 'stripe';

// Next.js 14 App Router lee el body como stream automáticamente
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get('stripe-signature');

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('[webhook] signature error:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  console.log(`[webhook] evento: ${event.type}`);

  try {
    switch (event.type) {

      // ── Checkout completado — activar suscripción ─────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId = session.metadata?.workspaceId;
        const plan        = session.metadata?.plan || 'FREE';
        const billingCycle = session.metadata?.billingCycle || 'monthly';
        const aiTier      = session.metadata?.aiTier || 'basic';
        const extraClients = parseInt(session.metadata?.extraClients || '0');

        if (!workspaceId) break;

        await db.workspace.update({
          where: { id: workspaceId },
          data: {
            plan,
            billingCycle,
            aiTier,
            extraClients,
            stripeSubId:      session.subscription as string,
            stripeCustomerId: session.customer as string,
          },
        });

        console.log(`[webhook] workspace ${workspaceId} checkout completado — plan ${plan}`);
        break;
      }

      // ── Pago exitoso — workspace ACTIVE ──────────────────────────────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const ws = await db.workspace.findFirst({ where: { stripeCustomerId: customerId } });
        if (!ws) break;

        // Actualizar plan desde metadata de la suscripción
        const sub = invoice.subscription
          ? await stripe.subscriptions.retrieve(invoice.subscription as string)
          : null;

        const plan       = sub?.metadata?.plan        || ws.plan;
        const aiTier     = sub?.metadata?.aiTier      || ws.aiTier;
        const extraClients = parseInt(sub?.metadata?.extraClients || String(ws.extraClients));

        await db.workspace.update({
          where: { id: ws.id },
          data: { plan, aiTier, extraClients },
        });

        console.log(`[webhook] pago exitoso — workspace ${ws.id}`);
        break;
      }

      // ── Pago fallido — PAST_DUE ──────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice    = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const ws = await db.workspace.findFirst({ where: { stripeCustomerId: customerId } });
        if (!ws) break;

        console.log(`[webhook] pago fallido — workspace ${ws.id}`);
        // El estado PAST_DUE lo maneja Stripe automáticamente
        // después de los reintentos → subscription.deleted
        break;
      }

      // ── Suscripción cancelada — SUSPENDED ────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub        = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        const ws = await db.workspace.findFirst({ where: { stripeCustomerId: customerId } });
        if (!ws) break;

        await db.workspace.update({
          where: { id: ws.id },
          data: {
            plan:       'FREE',
            stripeSubId: null,
          },
        });

        console.log(`[webhook] suscripción cancelada — workspace ${ws.id} → FREE`);
        break;
      }

      // ── Suscripción actualizada ───────────────────────────────────────────
      case 'customer.subscription.updated': {
        const sub        = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        const ws = await db.workspace.findFirst({ where: { stripeCustomerId: customerId } });
        if (!ws) break;

        const plan       = sub.metadata?.plan        || ws.plan;
        const aiTier     = sub.metadata?.aiTier      || ws.aiTier;
        const extraClients = parseInt(sub.metadata?.extraClients || String(ws.extraClients));

        await db.workspace.update({
          where: { id: ws.id },
          data:  { plan, aiTier, extraClients, stripeSubId: sub.id },
        });

        console.log(`[webhook] suscripción actualizada — workspace ${ws.id} → ${plan}`);
        break;
      }

      default:
        console.log(`[webhook] evento no manejado: ${event.type}`);
    }
  } catch (err: any) {
    console.error('[webhook] error procesando evento:', err);
    return NextResponse.json({ error: 'Error procesando evento' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
