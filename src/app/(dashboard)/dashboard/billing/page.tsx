'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap, Shield, Sparkles, Brain, Bot, Plus, Minus,
  ReceiptText, HelpCircle, ArrowRight, Check, Lock,
  RefreshCcw, ChevronDown, ChevronUp, Star,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Tipos ────────────────────────────────────────────────────────────────────
type PlanKey = 'FREE' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';
type AiKey   = 'basic' | 'medium' | 'premium';
type Cycle   = 'monthly' | 'annual';

interface BillingState {
  plan: PlanKey;
  trialActive: boolean;
  trialDaysLeft: number;
  trialEndsAt: string | null;
  isFoundingMember: boolean;
  billingCycle: Cycle;
  extraClients: number;
  aiTier: AiKey;
  hasStripe: boolean;
  clientCount: number;
  userCount: number;
  pricing: { plan: number; ai: number; addons: number; total: number };
}

const PLANS = {
  FREE:       { label: 'Clásico',   monthly: 0,    annual: 0,    clients: 3,   users: 5,   features: ['3 cuentas', '5 usuarios', 'Tareas y calendario', 'Chat interno', 'Portal cliente'] },
  PRO:        { label: 'Pro',       monthly: 299,  annual: 2870, clients: 10,  users: 15,  features: ['10 cuentas', '15 usuarios', 'Todo de Clásico', 'IA Básica incluida', 'Proyectos y milestones', 'Reportes mensuales'] },
  BUSINESS:   { label: 'Business',  monthly: 549,  annual: 5270, clients: 999, users: 999, features: ['Cuentas ilimitadas', 'Usuarios ilimitados', 'Todo de Pro', 'IA Premium', 'Analytics avanzados', 'Soporte prioritario', 'Precio Founding disponible'] },
  ENTERPRISE: { label: 'Enterprise',monthly: 0,    annual: 0,    clients: 999, users: 999, features: ['Todo de Business', 'SLA personalizado', 'Onboarding dedicado', 'Integraciones custom', 'Facturación por empresa', 'Manager de cuenta'] },
} as const;

const AI_TIERS = {
  basic:   { label: 'IA Básica',   monthly: 0,   desc: 'Gemini + Llama — ideal para resúmenes y búsqueda', color: '#22C55E', icon: Bot },
  medium:  { label: 'IA Mediana',  monthly: 100, desc: 'Agrega DeepSeek V3 — más potencia para agencias en crecimiento', color: '#3B82F6', icon: Brain },
  premium: { label: 'IA Premium',  monthly: 200, desc: 'Claude Sonnet + todos los modelos — máxima inteligencia', color: '#8B5CF6', icon: Sparkles },
} as const;

const FAQ = [
  { q: '¿Qué pasa después del trial?', a: 'Al terminar los 15 días, si no elegiste un plan, el workspace pasa a plan Clásico (gratis) con las limitaciones correspondientes. No se cobra nada automáticamente.' },
  { q: '¿Qué incluye el precio Founding?', a: 'Los primeros 20 clientes obtienen el precio de Business bloqueado de por vida mientras mantengan su suscripción activa. Los siguientes 100 conservan el precio durante 18 meses.' },
  { q: '¿Puedo cambiar de plan en cualquier momento?', a: 'Sí. Los upgrades aplican inmediatamente. Los downgrades aplican al final del ciclo de facturación actual. Stripe prorratea automáticamente.' },
  { q: '¿Qué incluye cada nivel de IA?', a: 'Básica: Gemini 2.0 Flash y Llama 3.3 70B. Mediana: agrega DeepSeek V3. Premium: agrega Claude Sonnet 4 y procesamiento prioritario.' },
  { q: '¿Qué pasa si cancelo?', a: 'Puedes cancelar en cualquier momento. Conservas acceso hasta el final del período pagado. Tus datos se guardan 30 días después de la cancelación.' },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function formatMXN(n: number) {
  return n === 0 ? 'Gratis' : `$${n.toLocaleString('es-MX')} MXN`;
}

// ── Componente principal ───────────────────────────────────────────────────
export default function BillingPage() {
  const router = useRouter();
  const [data, setData]           = useState<BillingState | null>(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);

  // Selecciones locales (antes de guardar/pagar)
  const [selPlan, setSelPlan]         = useState<PlanKey>('FREE');
  const [selCycle, setSelCycle]       = useState<Cycle>('monthly');
  const [selAi, setSelAi]             = useState<AiKey>('basic');
  const [selExtra, setSelExtra]       = useState(0);
  const [faqOpen, setFaqOpen]         = useState<number | null>(null);
  const [showBenefits, setShowBenefits] = useState(false);

  const fetchBilling = useCallback(async () => {
    try {
      const r = await fetch('/api/billing');
      if (r.ok) {
        const d = await r.json();
        setData(d);
        setSelPlan(d.plan);
        setSelCycle(d.billingCycle);
        setSelAi(d.aiTier);
        setSelExtra(d.extraClients);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBilling(); }, [fetchBilling]);

  // Calcular precio en tiempo real
  const planPrice  = selCycle === 'annual'
    ? Math.round((PLANS[selPlan]?.monthly ?? 0) * 12 * 0.8)
    : (PLANS[selPlan]?.monthly ?? 0);
  const aiPrice    = selCycle === 'annual'
    ? Math.round((AI_TIERS[selAi]?.monthly ?? 0) * 12 * 0.8)
    : (AI_TIERS[selAi]?.monthly ?? 0);
  const addonPrice = selExtra * 100 * (selCycle === 'annual' ? 10 : 1);
  const total      = planPrice + aiPrice + addonPrice;
  const annualSavings = selCycle === 'annual'
    ? Math.round(((PLANS[selPlan]?.monthly ?? 0) + (AI_TIERS[selAi]?.monthly ?? 0) + selExtra * 100) * 12 * 0.2)
    : 0;

  const handleContinue = async () => {
    if (selPlan === 'FREE') {
      toast.info('El plan Clásico es gratis. Selecciona Pro, Business o Enterprise para continuar.');
      return;
    }
    if (selPlan === 'ENTERPRISE') {
      toast.info('Contacta a ventas para Enterprise.');
      return;
    }
    setSaving(true);
    try {
      const r = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selPlan, billingCycle: selCycle, extraClients: selExtra, aiTier: selAi }),
      });
      if (r.ok) {
        toast.success('Preferencias guardadas. Stripe checkout próximamente.');
        fetchBilling();
      } else {
        toast.error('Error al guardar');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        ))}
      </div>
    );
  }

  const isTrialActive  = data?.trialActive ?? false;
  const daysLeft       = data?.trialDaysLeft ?? 0;
  const isFounder      = data?.isFoundingMember ?? false;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 max-w-[1400px]">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-1">Weeklink</p>
          <h1 className="text-xl font-semibold text-white/90">Billing & Suscripción</h1>
          <p className="text-sm text-white/40 mt-0.5">Gestiona tu plan y el crecimiento de tu agencia</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] text-white/50 border border-white/[0.08] hover:bg-white/[0.04] transition-colors"
            onClick={() => toast.info('Historial de facturas — próximamente')}
          >
            <ReceiptText className="w-3.5 h-3.5" strokeWidth={1.75} />
            Historial
          </button>
          <button
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] text-white/50 border border-white/[0.08] hover:bg-white/[0.04] transition-colors"
            onClick={() => router.push('/dashboard/settings')}
          >
            <HelpCircle className="w-3.5 h-3.5" strokeWidth={1.75} />
            Ayuda
          </button>
        </div>
      </div>

      {/* ── Trial Banner ─────────────────────────────────────────── */}
      {isTrialActive && (
        <div
          className="rounded-2xl border border-white/[0.06] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(139,92,246,0.03) 100%)' }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0" style={{ background: 'rgba(139,92,246,0.15)' }}>
              <Shield className="w-5 h-5 text-purple-400" strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[14px] font-medium text-white/90">
                  Tu prueba gratuita termina en <span className="text-purple-300 font-semibold">{daysLeft} día{daysLeft !== 1 ? 's' : ''}</span>
                </p>
                {isFounder && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(139,92,246,0.2)', color: '#c4b5fd' }}>
                    ✦ Founding Eligible
                  </span>
                )}
              </div>
              <p className="text-[12px] text-white/40 mt-0.5">Disfruta acceso ilimitado. Elige tu plan antes de que termine.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowBenefits(true)}
              className="text-[12px] text-purple-400 hover:text-purple-300 transition-colors"
            >
              Ver beneficios →
            </button>
            <button
              onClick={() => document.getElementById('plan-selector')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-medium text-white transition-colors"
              style={{ background: '#8B5CF6' }}
            >
              Elegir plan
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Layout principal: Izquierda + Derecha ────────────────── */}
      <div className="flex gap-6 items-start flex-col xl:flex-row">

        {/* ═══ IZQUIERDA ═══════════════════════════════════════════ */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Selector ciclo */}
          <div id="plan-selector" className="flex items-center gap-3">
            <div className="flex items-center rounded-xl border border-white/[0.08] p-1" style={{ background: 'rgba(255,255,255,0.03)' }}>
              {(['monthly', 'annual'] as Cycle[]).map(c => (
                <button
                  key={c}
                  onClick={() => setSelCycle(c)}
                  className="relative rounded-lg px-4 py-1.5 text-[12px] font-medium transition-all"
                  style={selCycle === c
                    ? { background: '#8B5CF6', color: '#fff' }
                    : { color: 'rgba(255,255,255,0.5)' }}
                >
                  {c === 'monthly' ? 'Mensual' : 'Anual'}
                  {c === 'annual' && (
                    <span className="ml-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.2)', color: '#4ade80' }}>
                      −20%
                    </span>
                  )}
                </button>
              ))}
            </div>
            {selCycle === 'annual' && annualSavings > 0 && (
              <p className="text-[12px] text-emerald-400/80">
                Ahorras {formatMXN(annualSavings)}/año
              </p>
            )}
          </div>

          {/* Cards de planes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-4">
            {(Object.entries(PLANS) as [PlanKey, typeof PLANS[PlanKey]][]).map(([key, info]) => {
              const isSelected   = selPlan === key;
              const isCurrent    = data?.plan === key;
              const isMostPop    = key === 'BUSINESS';
              const price        = selCycle === 'annual'
                ? Math.round(info.monthly * 12 * 0.8)
                : info.monthly;

              return (
                <div
                  key={key}
                  onClick={() => key !== 'ENTERPRISE' && setSelPlan(key)}
                  className="relative rounded-2xl border p-5 transition-all cursor-pointer"
                  style={{
                    background: isSelected
                      ? 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(139,92,246,0.05) 100%)'
                      : 'rgba(255,255,255,0.02)',
                    borderColor: isSelected ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.06)',
                    boxShadow: isSelected ? '0 0 0 1px rgba(139,92,246,0.2)' : 'none',
                    transform: isSelected ? 'translateY(-1px)' : 'none',
                  }}
                >
                  {/* Badges */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      {isMostPop && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 inline-block" style={{ background: 'rgba(139,92,246,0.2)', color: '#c4b5fd' }}>
                          <Sparkles className="w-2.5 h-2.5 inline mr-1" />
                          Más popular
                        </span>
                      )}
                      {isCurrent && !isMostPop && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 inline-block" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                          Plan actual
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full shrink-0" style={{ background: '#8B5CF6' }}>
                        <Check className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                      </div>
                    )}
                  </div>

                  <h3 className="text-[15px] font-semibold text-white/90 mb-1">{info.label}</h3>

                  {key === 'ENTERPRISE' ? (
                    <p className="text-[13px] text-white/40 mb-4">Hablemos de tu operación</p>
                  ) : (
                    <div className="mb-4">
                      <span className="text-[26px] font-semibold text-white/90">
                        {price === 0 ? 'Gratis' : `$${price.toLocaleString('es-MX')}`}
                      </span>
                      {price > 0 && (
                        <span className="text-[12px] text-white/30 ml-1">
                          MXN/{selCycle === 'annual' ? 'año' : 'mes'}
                        </span>
                      )}
                      {selCycle === 'annual' && info.monthly > 0 && (
                        <p className="text-[11px] text-white/25 mt-0.5">
                          equivale a ${Math.round(price / 12).toLocaleString('es-MX')}/mes
                        </p>
                      )}
                    </div>
                  )}

                  <ul className="space-y-1.5 mb-4">
                    {info.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] text-white/55">
                        <Check className="w-3.5 h-3.5 text-purple-400/70 shrink-0 mt-0.5" strokeWidth={2} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {key === 'ENTERPRISE' ? (
                    <button
                      onClick={e => { e.stopPropagation(); toast.info('Contactar ventas — próximamente'); }}
                      className="w-full rounded-xl py-2 text-[12px] font-medium border border-white/[0.1] text-white/60 hover:text-white hover:border-white/[0.2] transition-colors"
                    >
                      Contactar ventas
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelPlan(key)}
                      className="w-full rounded-xl py-2 text-[12px] font-medium transition-all"
                      style={isSelected
                        ? { background: '#8B5CF6', color: '#fff' }
                        : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}
                    >
                      {isSelected ? '✓ Seleccionado' : 'Seleccionar plan'}
                    </button>
                  )}

                  {key === 'BUSINESS' && isFounder && (
                    <p className="text-[10px] text-purple-400/60 mt-2 text-center">✦ Precio Founding disponible para ti</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Clientes adicionales */}
          {selPlan !== 'FREE' && selPlan !== 'ENTERPRISE' && PLANS[selPlan].clients < 999 && (
            <div className="rounded-2xl border border-white/[0.06] p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-[14px] font-medium text-white/85">Clientes adicionales</h3>
                  <p className="text-[12px] text-white/40 mt-0.5">+4 cuentas por bloque · $100 MXN/mes por bloque</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelExtra(Math.max(0, selExtra - 1))}
                    className="h-8 w-8 rounded-lg flex items-center justify-center border border-white/[0.08] text-white/50 hover:text-white hover:border-white/[0.2] transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <div className="text-center min-w-[80px]">
                    <p className="text-[15px] font-semibold text-white/90">{PLANS[selPlan].clients + selExtra * 4} cuentas</p>
                    <p className="text-[10px] text-white/30">+{selExtra * 4} extra</p>
                  </div>
                  <button
                    onClick={() => setSelExtra(selExtra + 1)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center border border-white/[0.08] text-white/50 hover:text-white hover:border-purple-500/50 transition-colors"
                    style={{ background: selExtra > 0 ? 'rgba(139,92,246,0.1)' : undefined }}
                  >
                    <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Selector de IA */}
          {selPlan !== 'FREE' && (
            <div className="space-y-3">
              <div>
                <h3 className="text-[14px] font-medium text-white/85">Capacidad de IA</h3>
                <p className="text-[12px] text-white/40 mt-0.5">Elige el nivel de inteligencia para tu agencia</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(Object.entries(AI_TIERS) as [AiKey, typeof AI_TIERS[AiKey]][]).map(([key, tier]) => {
                  const isSelAi = selAi === key;
                  const Icon = tier.icon;
                  const price = selCycle === 'annual'
                    ? Math.round(tier.monthly * 12 * 0.8)
                    : tier.monthly;
                  return (
                    <div
                      key={key}
                      onClick={() => setSelAi(key)}
                      className="rounded-xl border p-4 cursor-pointer transition-all"
                      style={{
                        borderColor: isSelAi ? tier.color + '60' : 'rgba(255,255,255,0.06)',
                        background: isSelAi ? tier.color + '12' : 'rgba(255,255,255,0.02)',
                        transform: isSelAi ? 'translateY(-1px)' : 'none',
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: tier.color + '20' }}>
                          <Icon className="w-4 h-4" strokeWidth={1.75} style={{ color: tier.color }} />
                        </div>
                        {isSelAi && <Check className="w-4 h-4" style={{ color: tier.color }} strokeWidth={2.5} />}
                      </div>
                      <p className="text-[13px] font-medium text-white/85 mb-1">{tier.label}</p>
                      <p className="text-[11px] text-white/40 mb-2 leading-relaxed">{tier.desc}</p>
                      <p className="text-[12px] font-semibold" style={{ color: price === 0 ? '#4ade80' : tier.color }}>
                        {price === 0 ? 'Incluido' : `+$${price.toLocaleString('es-MX')}`}
                        {price > 0 && <span className="text-[10px] font-normal text-white/30 ml-0.5">/{selCycle === 'annual' ? 'año' : 'mes'}</span>}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* FAQ */}
          <div className="space-y-2">
            <h3 className="text-[13px] font-medium text-white/50 uppercase tracking-widest">Preguntas frecuentes</h3>
            {FAQ.map((item, i) => (
              <div key={i} className="rounded-xl border border-white/[0.06] overflow-hidden">
                <button
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-[13px] text-white/70">{item.q}</span>
                  {faqOpen === i
                    ? <ChevronUp className="w-4 h-4 text-white/30 shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-white/30 shrink-0" />}
                </button>
                {faqOpen === i && (
                  <div className="px-4 pb-3 text-[12px] text-white/40 leading-relaxed border-t border-white/[0.04]" style={{ paddingTop: 12 }}>
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Founding program */}
          <div
            className="rounded-2xl border border-purple-500/20 p-5"
            style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(139,92,246,0.02) 100%)' }}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0" style={{ background: 'rgba(139,92,246,0.15)' }}>
                <Star className="w-4.5 h-4.5 text-purple-400" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <h3 className="text-[14px] font-medium text-white/85 mb-1">Programa Founding</h3>
                <p className="text-[12px] text-white/45 leading-relaxed">
                  Los primeros 20 clientes obtienen precio de Business bloqueado de por vida.
                  Los siguientes 100 conservan el precio Founding durante 18 meses.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full" style={{ width: '40%', background: '#8B5CF6' }} />
                  </div>
                  <span className="text-[11px] text-white/40">8 de 20 lugares</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer legal */}
          <p className="text-[11px] text-white/20 leading-relaxed pb-4">
            Weeklink Founding Beta. Algunas funcionalidades pueden evolucionar durante esta etapa.
            No recomendamos almacenar información crítica sin respaldos externos.{' '}
            <button onClick={() => {}} className="underline hover:text-white/40 transition-colors">Términos</button>
            {' · '}
            <button onClick={() => {}} className="underline hover:text-white/40 transition-colors">Privacidad</button>
          </p>
        </div>

        {/* ═══ DERECHA — Resumen sticky ════════════════════════════ */}
        <div className="xl:w-[320px] shrink-0 xl:sticky xl:top-4">
          <div
            className="rounded-2xl border border-white/[0.06] p-6 space-y-4"
            style={{ background: 'rgba(15,17,23,0.95)' }}
          >
            <div>
              <h3 className="text-[14px] font-semibold text-white/85">Resumen de suscripción</h3>
              <p className="text-[11px] text-white/30 mt-0.5">
                {selPlan === 'FREE' ? 'Plan gratuito' : 'Listo para activar Weeklink'}
              </p>
            </div>

            <div className="space-y-3 border-t border-white/[0.06] pt-4">
              {/* Plan */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[12px] text-white/50">Plan</p>
                  <p className="text-[13px] font-medium text-white/85">
                    {PLANS[selPlan].label}
                    {isFounder && selPlan === 'BUSINESS' && (
                      <span className="ml-1.5 text-[9px] text-purple-400">Founding</span>
                    )}
                  </p>
                </div>
                <p className="text-[13px] font-semibold text-white/85 shrink-0">
                  {planPrice === 0 ? 'Gratis' : `$${planPrice.toLocaleString('es-MX')}`}
                </p>
              </div>

              {/* IA */}
              {selPlan !== 'FREE' && (
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[12px] text-white/50">Modelo IA</p>
                    <p className="text-[13px] font-medium text-white/85">{AI_TIERS[selAi].label}</p>
                  </div>
                  <p className="text-[13px] font-semibold text-white/85 shrink-0">
                    {aiPrice === 0 ? 'Incluido' : `+$${aiPrice.toLocaleString('es-MX')}`}
                  </p>
                </div>
              )}

              {/* Clientes extra */}
              {selExtra > 0 && (
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[12px] text-white/50">Cuentas adicionales</p>
                    <p className="text-[13px] font-medium text-white/85">+{selExtra * 4} cuentas</p>
                  </div>
                  <p className="text-[13px] font-semibold text-white/85 shrink-0">
                    +${addonPrice.toLocaleString('es-MX')}
                  </p>
                </div>
              )}

              {/* Ciclo */}
              <div className="flex items-center justify-between">
                <p className="text-[12px] text-white/50">Facturación</p>
                <p className="text-[12px] text-white/70">{selCycle === 'annual' ? 'Anual' : 'Mensual'}</p>
              </div>

              {selCycle === 'annual' && annualSavings > 0 && (
                <div className="rounded-lg px-3 py-2 text-[11px] flex items-center justify-between" style={{ background: 'rgba(34,197,94,0.08)', color: '#4ade80' }}>
                  <span>Ahorro anual</span>
                  <span className="font-semibold">−${annualSavings.toLocaleString('es-MX')}</span>
                </div>
              )}
            </div>

            {/* Total */}
            <div className="border-t border-white/[0.06] pt-4">
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] text-white/50">Total</p>
                <div className="text-right">
                  <p className="text-[22px] font-semibold text-white/95">
                    {total === 0 ? 'Gratis' : `$${total.toLocaleString('es-MX')}`}
                  </p>
                  {total > 0 && (
                    <p className="text-[11px] text-white/30">
                      MXN/{selCycle === 'annual' ? 'año' : 'mes'} · IVA no incluido
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={handleContinue}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-semibold text-white transition-all disabled:opacity-60"
              style={{ background: selPlan === 'FREE' ? 'rgba(255,255,255,0.08)' : '#8B5CF6' }}
            >
              {saving ? (
                <RefreshCcw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {selPlan === 'FREE' ? 'Plan actual — Gratis' : 'Continuar al pago'}
                  {selPlan !== 'FREE' && <ArrowRight className="w-4 h-4" />}
                </>
              )}
            </button>

            {/* Seguridad */}
            <div className="flex items-center justify-center gap-1.5">
              <Lock className="w-3 h-3 text-white/20" strokeWidth={1.75} />
              <p className="text-[11px] text-white/25">Pagos procesados de forma segura por Stripe</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
