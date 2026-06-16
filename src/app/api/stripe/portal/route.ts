import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { stripe } from '@/lib/stripe';

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
    if (!user?.workspace) {
      return NextResponse.json({ error: 'Workspace no encontrado' }, { status: 404 });
    }

    const ws = user.workspace;

    // Si no tiene customer en Stripe, ir directo al checkout
    if (!ws.stripeCustomerId) {
      return NextResponse.json({ redirectToCheckout: true });
    }

    // Crear sesión del Customer Portal de Stripe
    const portalSession = await stripe.billingPortal.sessions.create({
      customer:   ws.stripeCustomerId,
      return_url: 'https://boostmarketingboost.com/billing',
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error: any) {
    console.error('[stripe/portal]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
