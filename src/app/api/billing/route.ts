import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from '@/core/auth/require-workspace';
import { rateLimit } from '@/lib/security/rate-limit';
import { db } from '@/lib/db';
import { PLANS, AI_TIERS, EXTRA_CLIENTS_PRICE } from '@/lib/billing-constants';

// GET — estado del workspace (plan, trial, addons)
export async function GET(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 30, windowMs: 60_000, identifier: 'billing-get' });
  if (!rl.success) return rl.response;

  const result = await requireWorkspace({ roles: ['ADMIN'] });
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;

  const ws = await db.workspace.findFirst({
    where: { id: workspaceId },
    select: {
      plan: true,
      trialEndsAt: true,
      isFoundingMember: true,
      billingCycle: true,
      extraClients: true,
      aiTier: true,
      stripeCustomerId: true,
      stripeSubId: true,
      _count: { select: { clients: true, users: true } },
    },
  });

  if (!ws) return NextResponse.json({ error: 'Workspace no encontrado' }, { status: 404 });

  const now = new Date();
  const trialActive   = ws.trialEndsAt ? ws.trialEndsAt > now : false;
  const trialDaysLeft = ws.trialEndsAt
    ? Math.max(0, Math.ceil((ws.trialEndsAt.getTime() - now.getTime()) / 86_400_000))
    : 0;

  const planKey = (ws.plan || 'FREE') as keyof typeof PLANS;
  const aiKey   = (ws.aiTier || 'basic') as keyof typeof AI_TIERS;
  const cycle   = ws.billingCycle === 'annual' ? 'annual' : 'monthly';

  const planPrice  = PLANS[planKey]?.[cycle] ?? 0;
  const aiPrice    = cycle === 'annual'
    ? Math.round((AI_TIERS[aiKey]?.monthly ?? 0) * 12 * 0.8)
    : (AI_TIERS[aiKey]?.monthly ?? 0);
  const addonPrice = (ws.extraClients ?? 0) * EXTRA_CLIENTS_PRICE * (cycle === 'annual' ? 10 : 1);
  const total      = planPrice + aiPrice + addonPrice;

  return NextResponse.json({
    plan:             ws.plan,
    planInfo:         PLANS[planKey],
    trialActive,
    trialDaysLeft,
    trialEndsAt:      ws.trialEndsAt,
    isFoundingMember: ws.isFoundingMember,
    billingCycle:     cycle,
    extraClients:     ws.extraClients,
    aiTier:           ws.aiTier,
    aiTierInfo:       AI_TIERS[aiKey],
    hasStripe:        !!ws.stripeSubId,
    clientCount:      ws._count.clients,
    userCount:        ws._count.users,
    pricing: { plan: planPrice, ai: aiPrice, addons: addonPrice, total },
    plans:   PLANS,
    aiTiers: AI_TIERS,
  });
}

// POST — actualizar selección (sin Stripe todavía)
export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 10, windowMs: 60_000, identifier: 'billing-post' });
  if (!rl.success) return rl.response;

  const result = await requireWorkspace({ roles: ['ADMIN'] });
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;

  const body = await req.json();
  const { plan, billingCycle, extraClients, aiTier } = body;

  const validPlans  = Object.keys(PLANS);
  const validCycles = ['monthly', 'annual'];
  const validAi     = Object.keys(AI_TIERS);

  if (plan && !validPlans.includes(plan))
    return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });
  if (billingCycle && !validCycles.includes(billingCycle))
    return NextResponse.json({ error: 'Ciclo inválido' }, { status: 400 });
  if (aiTier && !validAi.includes(aiTier))
    return NextResponse.json({ error: 'Tier de IA inválido' }, { status: 400 });

  const updated = await db.workspace.update({
    where: { id: workspaceId },
    data: {
      ...(plan         !== undefined ? { plan }         : {}),
      ...(billingCycle !== undefined ? { billingCycle }  : {}),
      ...(extraClients !== undefined ? { extraClients: Math.max(0, parseInt(extraClients) || 0) } : {}),
      ...(aiTier       !== undefined ? { aiTier }        : {}),
    },
    select: { plan: true, billingCycle: true, extraClients: true, aiTier: true },
  });

  return NextResponse.json({ ok: true, workspace: updated });
}
