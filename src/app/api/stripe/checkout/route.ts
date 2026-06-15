import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { stripe } from '@/lib/stripe';

const PLAN_PRICES: Record<string, Record<string, number>> = {
  FREE:     { monthly: 35000,  annual: 336000  },
  PRO:      { monthly: 45000,  annual: 432000  },
  BUSINESS: { monthly: 55000,  annual: 528000  },
};

const AI_PRICES: Record<string, number> = {
  basic: 0, medium: 10000, premium: 20000,
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const user = await db.user.findFirst({
      where: { id: session.user.id },
      include: { workspace: true },
    });
    if (!user?.workspace) return NextResponse.json({ error: 'Workspace no encontrado' }, { status: 404 });
    const ws = user.workspace;

    const body = await req.json();
    const { plan = 'FREE', billingCycle = 'monthly', aiTier = 'basic', extraClients = 0 } = body;

    if (plan === 'ENTERPRISE') {
      return NextResponse.json({ error: 'Contacta a ventas para Enterprise' }, { status: 400 });
    }

    // Obtener o crear customer en Stripe
    let customerId = ws.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email || '',
        name:  ws.name,
        metadata: { workspaceId: ws.id, userId: session.user.id },
      });
      customerId = customer.id;
      await db.workspace.update({ where: { id: ws.id }, data: { stripeCustomerId: customerId } });
    }

    const planPrice   = PLAN_PRICES[plan]?.[billingCycle] ?? 35000;
    const aiPrice     = AI_PRICES[aiTier] ?? 0;
    const addonPrice  = extraClients * 10000;
    const totalAmount = planPrice + aiPrice + addonPrice;

    const trialEnd = ws.trialEndsAt && new Date(ws.trialEndsAt) > new Date()
      ? Math.floor(new Date(ws.trialEndsAt).getTime() / 1000)
      : undefined;

    const planLabel = { FREE: 'Clásico', PRO: 'Pro', BUSINESS: 'Business' }[plan] || plan;
    const cycleLabel = billingCycle === 'annual' ? 'Anual' : 'Mensual';

    const checkoutSession = await stripe.checkout.sessions.create({
      customer:             customerId,
      mode:                 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency:    'mxn',
          unit_amount: totalAmount,
          recurring: { interval: billingCycle === 'annual' ? 'year' : 'month' },
          product_data: {
            name:        `Weeklink ${planLabel} — ${cycleLabel}`,
            description: `Plan ${planLabel} · IA ${aiTier}${extraClients > 0 ? ` · +${extraClients * 4} clientes extra` : ''}`,
          },
        },
        quantity: 1,
      }],
      success_url: 'https://boostmarketingboost.com/billing?success=1',
      cancel_url:  'https://boostmarketingboost.com/billing?canceled=1',
      subscription_data: {
        ...(trialEnd ? { trial_end: trialEnd } : {}),
        metadata: { workspaceId: ws.id, plan, billingCycle, aiTier, extraClients: String(extraClients) },
      },
      metadata: { workspaceId: ws.id, plan, billingCycle, aiTier, extraClients: String(extraClients) },
      locale: 'es',
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error('[stripe/checkout]', error);
    return NextResponse.json({ error: error.message || 'Error al crear checkout' }, { status: 500 });
  }
}
