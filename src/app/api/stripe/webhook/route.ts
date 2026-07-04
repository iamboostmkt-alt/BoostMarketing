import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

// Stripe requiere el body RAW (sin parsear) para verificar la firma
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get('stripe-signature');

  // Log para debug — ver qué llega
  console.log('[stripe-webhook] recibido:', {
    hasSig: !!sig,
    hasSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    bodyLength: body.length,
  });

  if (!sig) {
    console.error('[stripe-webhook] Sin stripe-signature header');
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET no configurado en Vercel');
    // Retornar 200 para no causar reintentos — es un problema de config
    return NextResponse.json({ warning: 'Webhook secret not configured' }, { status: 200 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('[stripe-webhook] Error de firma:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  console.log(`[stripe-webhook] evento: ${event.type}`);

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId   = session.metadata?.workspaceId;
        const plan          = session.metadata?.plan || 'FREE';
        const billingCycle  = session.metadata?.billingCycle || 'monthly';
        const aiTier        = session.metadata?.aiTier || 'basic';
        const extraClients  = parseInt(session.metadata?.extraClients || '0');

        if (!workspaceId) {
          console.warn('[stripe-webhook] checkout sin workspaceId en metadata');
          break;
        }

        await db.workspace.update({
          where: { id: workspaceId },
          data: {
            plan, billingCycle, aiTier, extraClients,
            stripeSubId:      session.subscription as string,
            stripeCustomerId: session.customer as string,
          },
        });
        console.log(`[stripe-webhook] checkout OK — workspace ${workspaceId} → ${plan}`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice    = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const ws = await db.workspace.findFirst({ where: { stripeCustomerId: customerId } });
        if (!ws) { console.warn('[stripe-webhook] invoice: workspace no encontrado para customer', customerId); break; }

        const invoiceAny = invoice as any;
        const sub = invoiceAny.subscription
          ? await stripe.subscriptions.retrieve(invoiceAny.subscription as string)
          : null;

        await db.workspace.update({
          where: { id: ws.id },
          data: {
            plan:         sub?.metadata?.plan        || ws.plan,
            aiTier:       sub?.metadata?.aiTier      || ws.aiTier,
            extraClients: parseInt(sub?.metadata?.extraClients || String(ws.extraClients)),
          },
        });
        console.log(`[stripe-webhook] pago OK — workspace ${ws.id}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice    = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const ws = await db.workspace.findFirst({ where: { stripeCustomerId: customerId } });
        if (!ws) break;
        console.warn(`[stripe-webhook] pago fallido — workspace ${ws.id}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub        = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const ws = await db.workspace.findFirst({ where: { stripeCustomerId: customerId } });
        if (!ws) break;
        await db.workspace.update({
          where: { id: ws.id },
          data: { plan: 'FREE', stripeSubId: null },
        });
        console.log(`[stripe-webhook] suscripción cancelada — workspace ${ws.id} → FREE`);
        break;
      }

      case 'customer.subscription.updated': {
        const sub        = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const ws = await db.workspace.findFirst({ where: { stripeCustomerId: customerId } });
        if (!ws) break;
        await db.workspace.update({
          where: { id: ws.id },
          data: {
            plan:         sub.metadata?.plan        || ws.plan,
            aiTier:       sub.metadata?.aiTier      || ws.aiTier,
            extraClients: parseInt(sub.metadata?.extraClients || String(ws.extraClients)),
            stripeSubId:  sub.id,
          },
        });
        console.log(`[stripe-webhook] suscripción actualizada — workspace ${ws.id} → ${sub.metadata?.plan || ws.plan}`);
        break;
      }

      default:
        // Siempre retornar 200 para eventos no manejados
        console.log(`[stripe-webhook] evento no manejado (OK): ${event.type}`);
    }
  } catch (err: any) {
    console.error('[stripe-webhook] error procesando evento:', err.message, err.stack);
    // Retornar 200 de todas formas para evitar reintentos indefinidos
    // El error ya está logueado en Vercel
    return NextResponse.json({ received: true, warning: err.message }, { status: 200 });
  }

  return NextResponse.json({ received: true });
}
