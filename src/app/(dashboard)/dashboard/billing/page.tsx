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
  plan: PlanKey; trialActive: boolean; trialDaysLeft: number;
  trialEndsAt: string | null; isFoundingMember: boolean;
  billingCycle: Cycle; extraClients: number; aiTier: AiKey;
  hasStripe: boolean; clientCount: number; userCount: number;
  pricing: { plan: number; ai: number; addons: number; total: number };
}

const PLANS = {
  FREE:       { label: 'Clásico',   monthly: 350,  annual: 3360,  clients: 5,   features: ['Hasta 5 clientes incluidos', 'Usuarios ilimitados', 'Chat y canales', 'Gestión de tareas', 'Portal cliente básico', '10 GB almacenamiento'] },
  PRO:        { label: 'Pro',       monthly: 450,  annual: 4320,  clients: 12,  features: ['Hasta 12 clientes incluidos', 'Todo lo del Clásico', 'Branding del portal', 'Integraciones Drive, Figma', 'IA y resúmenes avanzados', '50 GB almacenamiento'] },
  BUSINESS:   { label: 'Business',  monthly: 550,  annual: 5280,  clients: 999, features: ['Clientes ilimitados', 'Todo lo del plan Pro', 'White Label', 'IA avanzada', 'Automatizaciones', '200 GB almacenamiento'] },
  ENTERPRISE: { label: 'Enterprise',monthly: 1500, annual: 14400, clients: 999, features: ['Todo lo del plan Business', 'SSO y dominio personalizado', 'Infraestructura dedicada', 'SLA y soporte prioritario', 'Integraciones a medida', 'Almacenamiento negociable'] },
} as const;

const AI_TIERS = {
  basic:   { label: 'IA Básica',   monthly: 0,   desc: 'Gemini + Llama — ideal para tareas del día a día', color: '#22C55E', bg: '#F0FDF4', icon: Bot },
  medium:  { label: 'IA Mediana',  monthly: 100, desc: 'Agrega DeepSeek V3 — más potencia para agencias en crecimiento', color: '#3B82F6', bg: '#EFF6FF', icon: Brain },
  premium: { label: 'IA Premium',  monthly: 200, desc: 'Claude Sonnet + todos los modelos — máxima inteligencia', color: '#7C3AED', bg: '#F5F3FF', icon: Sparkles },
} as const;

// IA incluida según plan (sin costo adicional)
const PLAN_INCLUDED_AI: Record<PlanKey, AiKey> = {
  FREE:       'basic',
  PRO:        'basic',
  BUSINESS:   'medium',  // Business incluye IA Mediana
  ENTERPRISE: 'premium', // Enterprise incluye IA Premium
};

const FAQ = [
  { q: '¿Qué pasa después del trial?', a: 'Al terminar los 15 días, Stripe procesará automáticamente el pago según el plan que seleccionaste. Si no elegiste un plan, el workspace pasará a plan Clásico con limitaciones.' },
  { q: '¿Qué incluye el precio Founding?', a: 'Los primeros 20 clientes obtienen el precio de Business bloqueado de por vida mientras mantengan activa su suscripción.' },
  { q: '¿Puedo cambiar de plan en cualquier momento?', a: 'Sí. Los upgrades aplican inmediatamente. Los downgrades aplican al final del ciclo de facturación actual.' },
  { q: '¿Qué incluye cada nivel de IA?', a: 'Básica: Gemini 2.0 Flash y Llama 3.3 70B. Mediana: agrega DeepSeek V3. Premium: agrega Claude Sonnet 4 y procesamiento prioritario.' },
  { q: '¿Qué pasa si cancelo?', a: 'Puedes cancelar en cualquier momento. Conservas acceso hasta el final del período pagado. Tus datos se guardan 30 días después.' },
];

function fmt(n: number) { return `$${n.toLocaleString('es-MX')}`; }

export default function BillingPage() {
  const router = useRouter();
  const [data, setData]       = useState<BillingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [selPlan, setSelPlan] = useState<PlanKey>('FREE');
  const [selCycle, setSelCycle] = useState<Cycle>('monthly');
  const [selAi, setSelAi]     = useState<AiKey>('basic');
  const [selExtra, setSelExtra] = useState(0);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  // Detectar retorno exitoso o cancelado desde Stripe
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === '1') {
      toast.success('✅ Pago completado. Tu suscripción está activa.');
      window.history.replaceState({}, '', window.location.pathname);
      fetchBilling();
    }
    if (params.get('canceled') === '1') {
      toast.info('Pago cancelado. Puedes intentarlo cuando quieras.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-seleccionar IA cuando cambia el plan
  useEffect(() => {
    const includedAi = PLAN_INCLUDED_AI[selPlan];
    // Solo bajar la IA si el plan no la incluye — nunca forzar downgrade si ya eligió algo mejor
    if (AI_TIERS[selAi].monthly > 0 && AI_TIERS[includedAi].monthly > AI_TIERS[selAi].monthly) return;
    setSelAi(includedAi);
  }, [selPlan]);

  const fetchBilling = useCallback(async () => {
    try {
      const r = await fetch('/api/billing');
      if (r.ok) {
        const d = await r.json();
        setData(d); setSelPlan(d.plan); setSelCycle(d.billingCycle);
        setSelAi(d.aiTier); setSelExtra(d.extraClients);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBilling(); }, [fetchBilling]);

  const planPrice  = selCycle === 'annual' ? Math.round(PLANS[selPlan].monthly * 12 * 0.8) : PLANS[selPlan].monthly;
  const aiPrice    = selCycle === 'annual' ? Math.round(AI_TIERS[selAi].monthly * 12 * 0.8) : AI_TIERS[selAi].monthly;
  const addonPrice = selExtra * 100 * (selCycle === 'annual' ? 10 : 1);
  const total      = planPrice + aiPrice + addonPrice;
  const savings    = selCycle === 'annual' ? Math.round((PLANS[selPlan].monthly + AI_TIERS[selAi].monthly + selExtra * 100) * 12 * 0.2) : 0;

  const handleContinue = async () => {
    if (selPlan === 'ENTERPRISE') {
      window.open('mailto:weeklinkapp@gmail.com?subject=Enterprise%20Plan%20Weeklink', '_blank');
      return;
    }
    setSaving(true);
    try {
      // Guardar preferencias
      await fetch('/api/billing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selPlan, billingCycle: selCycle, extraClients: selExtra, aiTier: selAi }),
      });
      // Iniciar Stripe Checkout
      const r = await fetch('/api/stripe/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selPlan, billingCycle: selCycle, extraClients: selExtra, aiTier: selAi }),
      });
      const d = await r.json();
      if (d.url) {
        window.location.href = d.url;
      } else {
        toast.error(d.error || 'Error al iniciar el pago');
        setSaving(false);
      }
    } catch {
      toast.error('Error de conexión');
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="p-8 space-y-4">
      {[...Array(3)].map((_,i) => (
        <div key={i} className="h-28 rounded-2xl animate-pulse bg-[rgba(255,255,255,0.04)]" />
      ))}
    </div>
  );

  const daysLeft  = data?.trialDaysLeft ?? 0;
  const isFounder = data?.isFoundingMember ?? false;
  const isTrial   = data?.trialActive ?? false;

  // ── Render con diseño BLANCO estilo referencia ──────────────────────────
  return (
    <div style={{ background: '#F6F7FB', minHeight: '100%', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Header */}
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-[12px] mb-4 transition-colors"
          style={{ color: '#9CA3AF' }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver al dashboard
        </button>

        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#7C3AED] mb-1">Weeklink</p>
            <h1 className="text-[22px] font-bold text-[#111827]">Pagos y suscripción</h1>
            <p className="text-[13px] text-[#6B7280] mt-0.5">Gestiona tu plan, métodos de pago y facturación.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-2 rounded-[12px] px-3.5 py-2 text-[12px] font-medium text-[#374151] border border-[rgba(17,24,39,0.10)] bg-white hover:bg-[#F9FAFB] transition-colors"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
              onClick={() => toast.info('Historial de facturas — próximamente')}
            >
              <ReceiptText className="w-3.5 h-3.5 text-[#9CA3AF]" strokeWidth={1.75} />
              Historial de facturas
            </button>
            <button
              className="flex items-center gap-2 rounded-[12px] px-3.5 py-2 text-[12px] font-medium text-[#374151] border border-[rgba(17,24,39,0.10)] bg-white hover:bg-[#F9FAFB] transition-colors"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
              onClick={() => router.push('/dashboard/settings')}
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#9CA3AF]" strokeWidth={1.75} />
              Ayuda
            </button>
          </div>
        </div>

        {/* Banner de estado — trial o plan activo */}
        {data?.plan && data.plan !== 'FREE' && !isTrial ? (
          // Plan activo pagado
          <div className="rounded-[20px] p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            style={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)', border: '1px solid #86EFAC' }}>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]" style={{ background: '#16A34A' }}>
                <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[#14532D]">
                  🎉 Plan {PLANS[data.plan as PlanKey]?.label || data.plan} activo
                </p>
                <p className="text-[12px] text-[#16A34A] mt-0.5">
                  Tu suscripción está activa. Facturación {data.billingCycle === 'annual' ? 'anual' : 'mensual'}.
                </p>
              </div>
            </div>
            <span className="text-[12px] font-semibold px-3 py-1.5 rounded-full" style={{ background: '#16A34A', color: 'white' }}>
              Activo ✓
            </span>
          </div>
        ) : isTrial ? (
          // Trial activo
          <div className="rounded-[20px] p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            style={{ background: 'linear-gradient(135deg, #EDE9FE 0%, #F5F3FF 100%)', border: '1px solid #DDD6FE' }}>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]" style={{ background: '#7C3AED' }}>
                <Shield className="w-5 h-5 text-white" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[#4C1D95]">
                  {daysLeft <= 1
                    ? 'Último día — tu método de pago se procesará mañana'
                    : daysLeft <= 5
                    ? <>Tu suscripción se activará en <span className="font-bold">{daysLeft} días</span></>
                    : <>Estás en prueba gratuita por <span className="font-bold">{daysLeft} días</span></>}
                </p>
                <p className="text-[12px] text-[#6D28D9] mt-0.5">
                  Disfruta de todas las funciones ilimitadas. Tu prueba termina el {data?.trialEndsAt ? new Date(data.trialEndsAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button className="text-[13px] font-medium text-[#7C3AED] hover:text-[#6D28D9] transition-colors">
                Ver beneficios del plan →
              </button>
            </div>
          </div>
        ) : null}

        {/* Layout principal */}
        <div className="flex gap-6 items-start flex-col xl:flex-row">

          {/* ═══ IZQUIERDA ═══════════════════════════════ */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* 1. Elegir plan */}
            <div className="rounded-[24px] bg-white p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)' }}>
              <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                <h2 className="text-[16px] font-semibold text-[#111827]">1. Elige tu plan</h2>
                {/* Toggle mensual/anual */}
                <div className="flex items-center gap-2">
                  {(['monthly', 'annual'] as Cycle[]).map(c => (
                    <button key={c} onClick={() => setSelCycle(c)}
                      className="rounded-[10px] px-4 py-1.5 text-[13px] font-medium transition-all border"
                      style={selCycle === c
                        ? { background: '#111827', color: '#fff', borderColor: '#111827' }
                        : { background: 'white', color: '#6B7280', borderColor: 'rgba(17,24,39,0.10)' }}>
                      {c === 'monthly' ? 'Mensual' : 'Anual'}
                    </button>
                  ))}
                  {selCycle === 'annual' && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#DCFCE7', color: '#16A34A' }}>
                      Ahorra 20%
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {(Object.entries(PLANS) as [PlanKey, typeof PLANS[PlanKey]][]).map(([key, info]) => {
                  const isSelected = selPlan === key;
                  const isCurrent  = data?.plan === key;
                  const isBest     = key === 'BUSINESS';
                  const price      = selCycle === 'annual' ? Math.round(info.monthly * 12 * 0.8 / 12) : info.monthly;
                  const isEnterprise = key === 'ENTERPRISE';

                  return (
                    <div key={key}
                      onClick={() => !isEnterprise && setSelPlan(key)}
                      className="relative rounded-[20px] border p-5 transition-all cursor-pointer"
                      style={{
                        borderColor: isSelected ? '#7C3AED' : 'rgba(17,24,39,0.08)',
                        borderWidth: isSelected ? '2px' : '1px',
                        boxShadow: isSelected ? '0 0 0 4px rgba(124,58,237,0.08), 0 8px 24px rgba(124,58,237,0.10)' : '0 1px 3px rgba(0,0,0,0.04)',
                        background: isSelected ? '#FAFAFA' : 'white',
                        transform: isSelected ? 'translateY(-2px)' : 'none',
                      }}>
                      <div className="flex items-start justify-between mb-3 min-h-[24px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isBest && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#7C3AED', color: '#fff' }}>
                              ★ Más popular
                            </span>
                          )}
                          {isFounder && key !== 'ENTERPRISE' && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE' }}>
                              Founding
                            </span>
                          )}
                          {isCurrent && !isBest && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: '#F9FAFB', color: '#9CA3AF', border: '1px solid rgba(17,24,39,0.08)' }}>
                              Plan actual
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: '#7C3AED' }}>
                            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <h3 className="text-[15px] font-bold text-[#111827] mb-1">{info.label}</h3>
                      {isEnterprise ? (
                        <div className="mb-4">
                          <p className="text-[11px] text-[#9CA3AF] mb-1">Desde</p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-[24px] font-bold text-[#111827]">{fmt(price)}</span>
                            <span className="text-[11px] text-[#9CA3AF]">MXN / mes</span>
                          </div>
                        </div>
                      ) : (
                        <div className="mb-4">
                          <div className="flex items-baseline gap-1">
                            <span className="text-[24px] font-bold text-[#111827]">{fmt(price)}</span>
                            <span className="text-[11px] text-[#9CA3AF]">MXN / mes</span>
                          </div>
                          {selCycle === 'annual' && (
                            <p className="text-[11px] text-[#9CA3AF] mt-0.5">{fmt(info.monthly * 12 * 0.8)} MXN / año</p>
                          )}
                        </div>
                      )}
                      <ul className="space-y-1.5 mb-4">
                        {info.features.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-[12px] text-[#6B7280]">
                            <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7C3AED]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            {f}
                          </li>
                        ))}
                      </ul>
                      {isEnterprise ? (
                        <button
                          onClick={e => { e.stopPropagation(); toast.info('Contactar ventas — próximamente'); }}
                          className="w-full rounded-[12px] py-2 text-[12px] font-semibold border border-[rgba(17,24,39,0.12)] text-[#374151] hover:border-[#7C3AED] hover:text-[#7C3AED] transition-colors">
                          Contactar ventas
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelPlan(key)}
                          className="w-full rounded-[12px] py-2 text-[12px] font-semibold transition-all"
                          style={isSelected
                            ? { background: '#7C3AED', color: '#fff' }
                            : { background: '#F5F3FF', color: '#7C3AED' }}>
                          {isSelected ? '✓ Plan seleccionado' : 'Seleccionar plan'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Clientes adicionales */}
            {selPlan !== 'ENTERPRISE' && PLANS[selPlan].clients < 999 && (
              <div className="rounded-[24px] bg-white p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[12px]" style={{ background: '#F5F3FF' }}>
                      <Plus className="w-5 h-5 text-[#7C3AED]" strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-semibold text-[#111827]">Añade clientes adicionales</h3>
                      <p className="text-[12px] text-[#9CA3AF]">Paquete de +4 clientes · {fmt(100)} MXN / mes por paquete</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[14px] font-semibold text-[#6B7280]">{fmt(100 * selExtra)} MXN / mes</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSelExtra(Math.max(0, selExtra - 1))}
                        className="h-8 w-8 rounded-[8px] flex items-center justify-center border border-[rgba(17,24,39,0.10)] text-[#6B7280] hover:border-[#7C3AED] hover:text-[#7C3AED] transition-colors bg-white">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[14px] font-semibold text-[#111827] w-8 text-center">
                        {PLANS[selPlan].clients < 999 ? '+' : ''}{selExtra * 4}
                      </span>
                      <button onClick={() => setSelExtra(selExtra + 1)}
                        className="h-8 w-8 rounded-[8px] flex items-center justify-center border border-[rgba(17,24,39,0.10)] text-[#6B7280] hover:border-[#7C3AED] hover:text-[#7C3AED] transition-colors bg-white">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => setSelExtra(selExtra + 1)}
                      className="rounded-[12px] px-4 py-2 text-[13px] font-semibold transition-all"
                      style={{ background: '#F5F3FF', color: '#7C3AED' }}>
                      + Agregar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Modelo de IA */}
            {selPlan !== 'FREE' && (
              <div className="rounded-[24px] bg-white p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <h2 className="text-[16px] font-semibold text-[#111827] mb-4">2. Elige tu modelo de IA</h2>
                <p className="text-[13px] text-[#6B7280] mb-4">Selecciona el nivel de inteligencia que mejor se adapta a tu equipo.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {(Object.entries(AI_TIERS) as [AiKey, typeof AI_TIERS[AiKey]][]).map(([key, tier]) => {
                    const isSelAi = selAi === key;
                    const Icon = tier.icon;
                    const price = selCycle === 'annual' ? Math.round(tier.monthly * 12 * 0.8) : tier.monthly;
                    return (
                      <div key={key} onClick={() => setSelAi(key)}
                        className="rounded-[16px] border p-4 cursor-pointer transition-all"
                        style={{
                          borderColor: isSelAi ? tier.color : 'rgba(17,24,39,0.08)',
                          borderWidth: isSelAi ? '2px' : '1px',
                          background: isSelAi ? tier.bg : 'white',
                          boxShadow: isSelAi ? `0 0 0 4px ${tier.color}14` : 'none',
                        }}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-[10px]" style={{ background: tier.bg, border: `1px solid ${tier.color}30` }}>
                            <Icon className="w-5 h-5" strokeWidth={1.75} style={{ color: tier.color }} />
                          </div>
                          <div className="h-4 w-4 rounded-full border-2 flex items-center justify-center"
                            style={{ borderColor: isSelAi ? tier.color : 'rgba(17,24,39,0.20)', background: isSelAi ? tier.color : 'white' }}>
                            {isSelAi && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                        <p className="text-[14px] font-semibold text-[#111827] mb-1">{tier.label}</p>
                        <p className="text-[11px] font-semibold mb-2" style={{ color: PLAN_INCLUDED_AI[selPlan] === key ? '#16A34A' : price === 0 ? '#16A34A' : tier.color }}>
                          {PLAN_INCLUDED_AI[selPlan] === key
                            ? '✓ Incluido en tu plan'
                            : price === 0
                            ? 'Incluido'
                            : `+ ${fmt(price)} MXN / mes`}
                        </p>
                        <p className="text-[11px] text-[#6B7280] leading-relaxed">{tier.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* FAQ */}
            <div className="rounded-[24px] bg-white p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <h2 className="text-[15px] font-semibold text-[#111827] mb-4">Preguntas frecuentes</h2>
              <div className="space-y-2">
                {FAQ.map((item, i) => (
                  <div key={i} className="rounded-[14px] border border-[rgba(17,24,39,0.06)] overflow-hidden">
                    <button onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                      className="w-full flex items-center justify-between px-4 py-3.5 text-left bg-white hover:bg-[#FAFAFA] transition-colors">
                      <span className="text-[13px] font-medium text-[#374151]">{item.q}</span>
                      {faqOpen === i ? <ChevronUp className="w-4 h-4 text-[#9CA3AF] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[#9CA3AF] shrink-0" />}
                    </button>
                    {faqOpen === i && (
                      <div className="px-4 pb-4 pt-2 text-[13px] text-[#6B7280] leading-relaxed border-t border-[rgba(17,24,39,0.04)]">
                        {item.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Founding */}
            <div className="rounded-[24px] p-6" style={{ background: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)', border: '1px solid #DDD6FE' }}>
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]" style={{ background: '#7C3AED' }}>
                  <Star className="w-5 h-5 text-white" strokeWidth={1.75} />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-[#4C1D95] mb-1">Founding Lifetime</h3>
                  <p className="text-[13px] text-[#6D28D9] leading-relaxed">
                    {isFounder ? 'Eres uno de los primeros 20 clientes en pagar. ' : ''}
                    Los primeros 20 clientes obtienen el precio de Business protegido de por vida.{' '}
                    <span className="font-semibold">Tu precio estará garantizado de por vida ✨</span>
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#C4B5FD' }}>
                      <div className="h-full rounded-full" style={{ width: '40%', background: '#7C3AED' }} />
                    </div>
                    <span className="text-[11px] text-[#7C3AED] font-medium">8 de 20 lugares</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[#9CA3AF] leading-relaxed pb-4">
              Weeklink Founding Beta. Algunas funcionalidades pueden evolucionar durante esta etapa.
              No recomendamos almacenar información crítica sin respaldos externos.{' '}
              <a href="/terminos" target="_blank" className="underline hover:text-[#6B7280]">Términos y Condiciones</a>
              {' · '}
              <a href="/privacidad" target="_blank" className="underline hover:text-[#6B7280]">Política de Privacidad</a>
            </p>
          </div>

          {/* ═══ DERECHA — Resumen sticky ════════════════ */}
          <div className="xl:w-[300px] shrink-0 xl:sticky xl:top-4 space-y-4">
            <div className="rounded-[24px] bg-white p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06)' }}>
              <h3 className="text-[15px] font-bold text-[#111827] mb-1">Resumen de tu suscripción</h3>
              <p className="text-[12px] text-[#9CA3AF] mb-4">Plan seleccionado</p>

              {/* Plan seleccionado */}
              <div className="rounded-[16px] p-4 mb-4 flex items-start gap-3" style={{ background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]" style={{ background: '#7C3AED' }}>
                  <Zap className="w-5 h-5 text-white" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[14px] font-bold text-[#111827]">
                      {PLANS[selPlan].label}{isFounder && selPlan === 'BUSINESS' ? ' (Founding)' : ''}
                    </p>
                    <p className="text-[13px] font-semibold text-[#111827]">{fmt(planPrice)} MXN / mes</p>
                  </div>
                  <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                    {PLANS[selPlan].clients < 999 ? `${PLANS[selPlan].clients + selExtra * 4} clientes` : 'Clientes ilimitados'} · {selCycle === 'annual' ? 'Facturación anual' : 'Facturación mensual'}
                  </p>
                </div>
              </div>

              {/* Desglose */}
              <div className="space-y-2.5 border-t border-[rgba(17,24,39,0.06)] pt-4 mb-4">
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#6B7280]">Modelo de IA</span>
                  <div className="text-right">
                    <span className="font-medium text-[#111827]">{AI_TIERS[selAi].label}</span>
                    <span className="text-[#9CA3AF] ml-2">
                      {PLAN_INCLUDED_AI[selPlan] === selAi || aiPrice === 0 ? 'Incluido' : `+ ${fmt(aiPrice)}`}
                    </span>
                  </div>
                </div>
                {selExtra > 0 && (
                  <div className="flex justify-between text-[13px]">
                    <span className="text-[#6B7280]">Clientes adicionales</span>
                    <span className="font-medium text-[#111827]">+ {fmt(addonPrice)} MXN / mes</span>
                  </div>
                )}
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#6B7280]">Facturación</span>
                  <span className="font-medium text-[#111827]">{selCycle === 'annual' ? 'Anual' : 'Mensual'}</span>
                </div>
                {savings > 0 && (
                  <div className="flex justify-between text-[12px] rounded-[8px] px-2 py-1" style={{ background: '#DCFCE7' }}>
                    <span className="text-[#16A34A]">Ahorro anual</span>
                    <span className="font-semibold text-[#16A34A]">− {fmt(savings)}</span>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="flex items-baseline justify-between border-t border-[rgba(17,24,39,0.06)] pt-4 mb-5">
                <span className="text-[13px] text-[#6B7280]">Total</span>
                <div className="text-right">
                  <p className="text-[24px] font-bold text-[#111827]">{fmt(total)} <span className="text-[12px] font-normal text-[#9CA3AF]">MXN / mes</span></p>
                  {selCycle === 'annual' && <p className="text-[11px] text-[#9CA3AF]">{fmt(total * 12 * 0.8)} MXN / año · <span className="text-[#16A34A] font-medium">Ahorra {fmt(savings)}</span></p>}
                  <p className="text-[10px] text-[#9CA3AF] mt-0.5">IVA no incluido</p>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={handleContinue}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 rounded-[14px] py-3.5 text-[14px] font-bold text-white transition-all disabled:opacity-60"
                style={{ background: '#7C3AED', boxShadow: '0 8px 24px rgba(124,58,237,0.25)' }}>
                {saving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <>Continuar al pago <ArrowRight className="w-4 h-4" /></>}
              </button>

              {selCycle === 'annual' && (
                <button onClick={() => setSelCycle('monthly')} className="w-full mt-2 text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors py-1">
                  o Cambiar a facturación mensual
                </button>
              )}

              <div className="flex items-center justify-center gap-1.5 mt-4">
                <Lock className="w-3 h-3 text-[#9CA3AF]" strokeWidth={1.75} />
                <p className="text-[11px] text-[#9CA3AF]">Pago seguro con Stripe</p>
              </div>
              <p className="text-[11px] text-[#9CA3AF] text-center mt-0.5">Puedes cancelar en cualquier momento.</p>
            </div>

            {/* Founding card lateral */}
            {isFounder && (
              <div className="rounded-[20px] p-4" style={{ background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
                <div className="flex items-start gap-3">
                  <Shield className="w-4 h-4 text-[#7C3AED] shrink-0 mt-0.5" strokeWidth={1.75} />
                  <div>
                    <p className="text-[12px] font-semibold text-[#4C1D95]">Founding Lifetime</p>
                    <p className="text-[11px] text-[#7C3AED] mt-0.5">Eres uno de los primeros 20 clientes en pagar. Tu precio estará garantizado de por vida ✨</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
