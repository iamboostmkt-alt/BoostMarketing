'use client';

import React, { useState, useEffect } from 'react';
import { SeoSchema } from '@/components/landing/SeoSchema';
import Link from 'next/link';

// ── Mock UI components ──────────────────────────────────────────────────────
function MockSidebar() {
  return (
    <div className="flex h-full w-[200px] shrink-0 flex-col border-r border-black/[0.05] bg-[#FCFCFD] py-3">
      <div className="flex items-center gap-2 px-4 pb-3">
        <WeeklinkMark size={22} />
        <span className="text-[13px] font-semibold text-[#111827]">Weeklink</span>
      </div>
      <div className="mx-3 mb-2 flex items-center gap-2 rounded-xl bg-white px-2.5 py-2 shadow-sm border border-black/[0.04]">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-100 text-[10px] font-bold text-violet-600">B</div>
        <span className="text-[12px] font-medium text-[#111827]">BoostMarketing</span>
      </div>
      {[{ icon: '⌂', label: 'Home' }, { icon: '✓', label: 'Tareas' }, { icon: '◷', label: 'Calendario' }, { icon: '◉', label: 'Chat', active: true }, { icon: '◈', label: 'Mi Portal' }].map(item => (
        <div key={item.label} className={`mx-2 mb-0.5 flex items-center gap-2 rounded-[10px] px-2.5 py-[7px] text-[12px] ${item.active ? 'bg-violet-50 font-medium text-violet-700' : 'text-[#6B7280]'}`}>
          <span className="text-[13px]">{item.icon}</span>
          <span>{item.label}</span>
          {item.active && <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-[9px] font-bold text-white">3</span>}
        </div>
      ))}
      <div className="mx-3 mt-2 border-t border-black/[0.05] pt-2">
        <p className="px-2 pb-1 text-[9px] font-semibold uppercase tracking-widest text-[#9CA3AF]">Clientes</p>
        {['GymnasTwin', 'Café del Mar', 'FitLab', 'Peak Perf.'].map(c => (
          <div key={c} className="flex items-center gap-2 rounded-[8px] px-2 py-[5px] text-[11px] text-[#6B7280]">
            <div className="h-2 w-2 rounded-full bg-violet-400" />{c}
          </div>
        ))}
      </div>
    </div>
  );
}

function MockChat() {
  const msgs = [
    { user: 'Sofia G.', color: '#7C3AED', time: '10:24', text: '@Marcos Aquí está el concepto de campaña para GymnasTwin 🔥', reactions: ['🔥 6', '👍 4'] },
    { user: 'Marcos R.', color: '#2563EB', time: '10:25', text: 'Se ve increíble. Revisemos el CTA final y el copy.', reactions: [] },
    { user: 'Alex T.', color: '#059669', time: '10:28', text: 'Propongo estas 2 variaciones para el headline:', reactions: [] },
    { user: 'Sofia G.', color: '#7C3AED', time: '10:31', text: 'Perfecto, subo la versión final cuando tengamos OK ✅', reactions: ['❤️ 3'] },
  ];
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white">
      <div className="flex items-center gap-2 border-b border-black/[0.05] px-4 py-2.5">
        <span className="text-[13px] font-semibold text-[#111827]"># marketing</span>
        <span className="text-[11px] text-[#9CA3AF]">Estrategia y campañas</span>
      </div>
      <div className="flex-1 overflow-hidden px-4 py-3 space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className="flex gap-2.5">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-[var(--wl-text-primary)]" style={{ background: m.color }}>
              {m.user.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-[12px] font-semibold text-[#111827]">{m.user}</span>
                <span className="text-[10px] text-[#9CA3AF]">{m.time}</span>
              </div>
              <p className="text-[12px] leading-relaxed text-[#374151]">{m.text}</p>
              {m.reactions.length > 0 && (
                <div className="mt-1 flex gap-1.5">
                  {m.reactions.map(r => (
                    <span key={r} className="rounded-full border border-black/[0.06] bg-[#F9FAFB] px-2 py-0.5 text-[10px] text-[#6B7280]">{r}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockThread() {
  return (
    <div className="flex h-full w-[220px] shrink-0 flex-col border-l border-black/[0.05] bg-white">
      <div className="flex items-center justify-between border-b border-black/[0.05] px-4 py-2.5">
        <span className="text-[12px] font-semibold text-[#111827]">Hilo</span>
        <span className="text-[12px] text-[#9CA3AF]">×</span>
      </div>
      <div className="flex-1 px-3 py-3 space-y-2.5">
        {[{ init: 'SG', color: '#7C3AED', name: 'Sofia G.', msg: 'Aquí el concepto...' }, { init: 'MR', color: '#2563EB', name: 'Marcos R.', msg: 'Revisemos el CTA' }, { init: 'AT', color: '#059669', name: 'Alex T.', msg: '2 variaciones —' }, { init: 'SG', color: '#7C3AED', name: 'Sofia G.', msg: 'Versión final OK' }].map((t, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-[var(--wl-text-primary)]" style={{ background: t.color }}>{t.init}</div>
            <div>
              <p className="text-[10px] font-semibold text-[#374151]">{t.name}</p>
              <p className="text-[11px] text-[#6B7280]">{t.msg}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeeklinkMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="9" fill="#7C3AED" />
      <path d="M8 11L13 21L16 15L19 21L24 11" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const logos = ['Nómada Studio', 'Peak Performance', 'Café del Mar', 'GymnasTwin', 'FitLab', 'Urbana Mx'];

const features = [
  { icon: '💬', title: 'Chat tipo Slack', desc: 'Canales por cliente, DMs, hilos, reacciones y Boosti AI integrado para tu equipo.' },
  { icon: '✅', title: 'Tareas y entregables', desc: 'Tablero kanban, subtareas, revisión de archivos y aprobaciones con un clic.' },
  { icon: '👥', title: 'Portal del cliente', desc: 'Cada cliente tiene su propio portal para ver avances, aprobar y comunicarse.' },
  { icon: '📅', title: 'Calendario integrado', desc: 'Planifica reuniones, deadlines y lanzamientos con vista mensual y semanal.' },
  { icon: '🤖', title: 'IA para agencias', desc: 'Boosti AI genera reportes, resume conversaciones y automatiza tareas repetitivas.' },
  { icon: '📊', title: 'Analytics en tiempo real', desc: 'Ve el rendimiento de tu agencia: tareas completadas, tiempo invertido y más.' },
];

const PLANS_LANDING = [
  {
    key: 'FREE',
    name: 'Clásico',
    price: 350,
    annual: 3360,
    desc: 'Ideal para agencias pequeñas.',
    clients: '5 clientes',
    features: ['Hasta 5 clientes incluidos', 'Usuarios ilimitados', 'Chat y canales', 'Gestión de tareas', 'Portal cliente básico', '10 GB almacenamiento'],
    cta: 'Empezar gratis',
    popular: false,
    founding: true,
  },
  {
    key: 'PRO',
    name: 'Pro',
    price: 450,
    annual: 4320,
    desc: 'Para agencias en crecimiento.',
    clients: '12 clientes',
    features: ['Hasta 12 clientes incluidos', 'Todo lo del Clásico', 'Branding del portal', 'Integraciones Drive, Figma', 'IA y resúmenes avanzados', '50 GB almacenamiento'],
    cta: 'Empezar con Pro',
    popular: false,
    founding: true,
  },
  {
    key: 'BUSINESS',
    name: 'Business',
    price: 550,
    annual: 5280,
    desc: 'Agencias establecidas.',
    clients: 'Ilimitados',
    features: ['Clientes ilimitados', 'Todo lo del plan Pro', 'White Label', 'IA avanzada', 'Automatizaciones', '200 GB almacenamiento'],
    cta: 'Empezar con Business',
    popular: true,
    founding: true,
  },
  {
    key: 'ENTERPRISE',
    name: 'Enterprise',
    price: 1500,
    annual: 14400,
    desc: 'Para equipos grandes y corporativos.',
    clients: 'Ilimitados',
    features: ['Todo lo del plan Business', 'SSO y dominio personalizado', 'Infraestructura dedicada', 'SLA y soporte prioritario', 'Integraciones a medida', 'Almacenamiento negociable'],
    cta: 'Contactar ventas',
    popular: false,
    founding: false,
  },
];

// ── Page ───────────────────────────────────────────────────────────────────
export default function WeeklinkHome() {
  const [scrolled, setScrolled] = useState(false);
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <SeoSchema />
      <div className="min-h-[100dvh] bg-[#F6F7FB] font-sans antialiased" style={{ background: '#F6F7FB' }}>

      {/* ── Navbar ── */}
      <nav className={`fixed left-0 right-0 top-0 z-50 transition-all duration-200 ${scrolled ? 'bg-white/95 shadow-sm' : 'bg-white/95'}`}
        style={{ backdropFilter: 'blur(18px)', height: '72px' }}>
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <Link href="/weeklink" className="flex items-center gap-2.5">
              <WeeklinkMark size={30} />
              <span className="text-[18px] font-bold tracking-tight text-[#111827]">Weeklink</span>
            </Link>
            <div className="hidden items-center gap-6 md:flex">
              {[['Producto', ''], ['Soluciones', ''], ['Recursos', ''], ['Precios', 'precios'], ['Empresa', '']].map(([l, id]) => (
                <button key={l} onClick={() => id && scrollTo(id)}
                  className="text-[14px] text-[#6B7280] transition-colors hover:text-[#111827]">
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="hidden sm:flex text-[14px] font-medium text-[#374151] hover:text-[#111827] transition-colors px-3 py-2">
              Iniciar sesión
            </Link>
            <Link href="/login" className="flex sm:hidden text-[13px] font-medium text-[#374151] hover:text-[#111827] transition-colors px-2 py-2">
              Entrar
            </Link>
            <Link href="/register"
              className="flex h-9 sm:h-10 items-center rounded-[14px] bg-[#7C3AED] px-4 sm:px-5 text-[13px] sm:text-[14px] font-semibold text-white transition-all hover:bg-[#6D28D9] whitespace-nowrap"
              style={{ boxShadow: '0 8px 30px rgba(124,58,237,0.22)' }}>
              <span className="hidden sm:inline">Comenzar gratis</span>
              <span className="sm:hidden">Comenzar</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-7xl px-6 pt-28 pb-16">
        <div className="flex items-center gap-16">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
              <span className="text-[12px] font-medium text-violet-700">NUEVO</span>
              <span className="text-[12px] text-violet-600">Chat con IA para agencias ya disponible</span>
              <span className="text-[12px] text-violet-500">→</span>
            </div>
            <h1 className="text-[56px] font-bold leading-[1.05] tracking-tight text-[#111827]">
              La plataforma todo<br />
              en uno para{' '}
              <span className="text-[#7C3AED]">agencias</span><br />
              <span className="text-[#7C3AED]">modernas</span>
            </h1>
            <p className="max-w-[440px] text-[16px] leading-relaxed text-[rgba(17,24,39,0.68)]">
              Gestiona proyectos, chats, entregables y clientes en un solo lugar. Colabora, automatiza y entrega resultados.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <Link href="/register"
                className="flex h-12 items-center gap-2 rounded-[14px] bg-[#7C3AED] px-6 text-[15px] font-semibold text-white transition-all hover:bg-[#6D28D9]"
                style={{ boxShadow: '0 8px 30px rgba(124,58,237,0.22)' }}>
                Comenzar gratis →
              </Link>
              <button onClick={() => scrollTo('precios')}
                className="flex h-12 items-center gap-2 rounded-[14px] border border-[rgba(17,24,39,0.08)] bg-white px-5 text-[14px] font-medium text-[#374151] transition-all hover:border-violet-200 hover:text-violet-700">
                Ver precios
              </button>
            </div>
            <div className="flex items-center gap-4 pt-1 flex-wrap">
              {['✓ 15 días de prueba gratis', '✓ Sin contratos', '✓ Cancela cuando quieras'].map(t => (
                <span key={t} className="text-[12px] text-[rgba(17,24,39,0.45)]">{t}</span>
              ))}
            </div>
          </div>

          <div className="hidden flex-1 lg:flex justify-center">
            <div className="relative w-full max-w-[580px]">
              <div className="absolute inset-0 rounded-[28px] blur-3xl" style={{ background: 'radial-gradient(ellipse at 60% 40%, rgba(124,58,237,0.12) 0%, transparent 70%)' }} />
              <div className="relative overflow-hidden rounded-[28px] border border-black/[0.06] bg-white shadow-2xl" style={{ height: '420px' }}>
                <div className="flex items-center gap-1.5 border-b border-black/[0.05] bg-[#FCFCFD] px-4 py-2.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                  <div className="mx-auto flex h-6 items-center gap-1.5 rounded-md bg-white border border-black/[0.06] px-2.5">
                    <WeeklinkMark size={12} />
                    <span className="text-[10px] text-[#9CA3AF]">app.weeklink.co</span>
                  </div>
                </div>
                <div className="flex h-[calc(100%-37px)]">
                  <MockSidebar />
                  <MockChat />
                  <MockThread />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Logo strip ── */}
      <section className="border-y border-[rgba(17,24,39,0.05)] bg-white py-6">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center justify-between gap-8 overflow-hidden">
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-widest text-[rgba(17,24,39,0.35)]">Agencias que confían en Weeklink</span>
            {logos.map(l => (
              <span key={l} className="shrink-0 text-[14px] font-semibold text-[rgba(17,24,39,0.30)]">{l}</span>
            ))}
            <span className="shrink-0 text-[12px] text-[rgba(17,24,39,0.30)]">+200 agencias más</span>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 text-center">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-widest text-violet-600">Plataforma completa</p>
          <h2 className="text-[36px] font-bold tracking-tight text-[#111827]">Todo lo que tu agencia necesita</h2>
          <p className="mt-3 text-[16px] text-[rgba(17,24,39,0.55)]">Un ecosistema conectado para trabajar más rápido y entregar mejores resultados.</p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(f => (
            <div key={f.title}
              className="group rounded-[20px] border border-[rgba(17,24,39,0.05)] bg-white p-7 transition-all hover:border-violet-100 hover:shadow-lg"
              style={{ boxShadow: '0 8px 30px rgba(15,23,42,0.04)' }}>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] text-2xl" style={{ background: 'rgba(124,58,237,0.10)' }}>
                {f.icon}
              </div>
              <h3 className="mb-2 text-[17px] font-semibold text-[#111827]">{f.title}</h3>
              <p className="text-[14px] leading-relaxed text-[rgba(17,24,39,0.58)]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Precios ── */}
      <section id="precios" className="bg-white py-20 border-t border-[rgba(17,24,39,0.05)]">
        <div className="mx-auto max-w-7xl px-6">
          {/* Header */}
          <div className="mb-4 text-center">
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-widest text-violet-600">Precios</p>
            <h2 className="text-[36px] font-bold tracking-tight text-[#111827]">Simple, transparente y justo</h2>
            <p className="mt-3 text-[16px] text-[rgba(17,24,39,0.55)]">15 días de prueba gratis. Sin tarjeta de crédito para comenzar.</p>
          </div>

          {/* Toggle mensual/anual */}
          <div className="mb-10 flex justify-center">
            <div className="flex items-center gap-1 rounded-[14px] border border-[rgba(17,24,39,0.08)] bg-[#F6F7FB] p-1">
              {(['monthly', 'annual'] as const).map(c => (
                <button key={c} onClick={() => setCycle(c)}
                  className="rounded-[10px] px-5 py-2 text-[13px] font-medium transition-all"
                  style={cycle === c
                    ? { background: 'white', color: '#111827', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
                    : { color: 'rgba(17,24,39,0.45)' }}>
                  {c === 'monthly' ? 'Mensual' : (
                    <span className="flex items-center gap-2">
                      Anual
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Ahorra 20%</span>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {PLANS_LANDING.map(plan => {
              const price = cycle === 'annual' ? Math.round(plan.annual / 12) : plan.price;
              const isEnterprise = plan.key === 'ENTERPRISE';
              return (
                <div key={plan.key}
                  className="relative flex flex-col rounded-[24px] border p-7 transition-all"
                  style={{
                    borderColor: plan.popular ? '#7C3AED' : 'rgba(17,24,39,0.08)',
                    borderWidth: plan.popular ? '2px' : '1px',
                    background: plan.popular ? 'linear-gradient(135deg, #faf5ff 0%, #ffffff 100%)' : 'white',
                    boxShadow: plan.popular ? '0 20px 60px rgba(124,58,237,0.12)' : '0 8px 30px rgba(15,23,42,0.04)',
                  }}>

                  {/* Badges */}
                  <div className="mb-4 flex items-center gap-2 flex-wrap min-h-[24px]">
                    {plan.popular && (
                      <span className="flex items-center gap-1 rounded-full bg-violet-600 px-3 py-1 text-[11px] font-semibold text-white">
                        ★ Más popular
                      </span>
                    )}
                    {plan.founding && (
                      <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[10px] font-medium text-violet-700">
                        Founding
                      </span>
                    )}
                  </div>

                  <h3 className="text-[18px] font-bold text-[#111827]">{plan.name}</h3>
                  <p className="mt-1 text-[13px] text-[rgba(17,24,39,0.50)]">{plan.desc}</p>

                  {/* Precio */}
                  {isEnterprise ? (
                    <div className="my-5">
                      <p className="text-[12px] text-[rgba(17,24,39,0.40)] mb-1">Precio personalizado</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-[26px] font-bold text-[#111827]">Contáctanos</span>
                      </div>
                      <p className="text-[11px] text-[rgba(17,24,39,0.35)] mt-1">Sin costo hasta acordar</p>
                    </div>
                  ) : (
                    <div className="my-5">
                      <div className="flex items-baseline gap-1">
                        <span className="text-[32px] font-bold text-[#111827]">${price.toLocaleString('es-MX')}</span>
                        <span className="text-[13px] text-[rgba(17,24,39,0.40)]">MXN / mes</span>
                      </div>
                      {cycle === 'annual' && (
                        <p className="mt-0.5 text-[12px] text-[rgba(17,24,39,0.35)]">${plan.annual.toLocaleString('es-MX')} MXN / año</p>
                      )}
                    </div>
                  )}

                  {/* Features */}
                  <ul className="mb-6 flex-1 space-y-2.5">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[13px] text-[rgba(17,24,39,0.65)]">
                        <svg className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {isEnterprise ? (
                    <a
                      href="mailto:weeklinkapp@gmail.com?subject=Enterprise%20Plan%20Weeklink"
                      className="block w-full rounded-[14px] border border-[rgba(17,24,39,0.12)] py-3 text-[14px] font-semibold text-[#374151] text-center transition-all hover:border-violet-300 hover:text-violet-700">
                      Contactar ventas →
                    </a>
                  ) : (
                    <Link href={`/register?plan=${plan.key}`}
                      className="block w-full rounded-[14px] py-3 text-center text-[14px] font-semibold transition-all"
                      style={plan.popular
                        ? { background: '#7C3AED', color: 'white', boxShadow: '0 8px 20px rgba(124,58,237,0.25)' }
                        : { background: 'rgba(124,58,237,0.08)', color: '#7C3AED' }}>
                      {plan.cta}
                    </Link>
                  )}

                  {plan.key !== 'ENTERPRISE' && (
                    <p className="mt-3 text-center text-[11px] text-[rgba(17,24,39,0.35)]">15 días gratis · Sin tarjeta</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Founding note */}
          <div className="mt-10 flex items-start gap-4 rounded-[20px] border border-violet-100 bg-violet-50 p-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-violet-100 text-xl">🚀</div>
            <div>
              <p className="text-[14px] font-semibold text-[#111827]">Programa Founding Lifetime</p>
              <p className="mt-1 text-[13px] leading-relaxed text-[rgba(17,24,39,0.60)]">
                Los primeros 20 clientes obtienen el precio de Business protegido de por vida. Los siguientes 100 conservan el precio Founding durante 18 meses.
                <span className="ml-2 font-medium text-violet-700">Quedan 12 de 20 lugares.</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="overflow-hidden rounded-[28px] bg-[#7C3AED] px-12 py-16 text-center"
          style={{ boxShadow: '0 20px 60px rgba(124,58,237,0.25)' }}>
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-widest text-violet-300">Únete hoy</p>
          <h2 className="mb-4 text-[40px] font-bold tracking-tight text-white">
            Empieza gratis. Crece sin límites.
          </h2>
          <p className="mb-8 text-[16px] text-violet-200">15 días de acceso completo. Sin tarjeta de crédito. Cancela cuando quieras.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register"
              className="inline-flex h-12 items-center rounded-[14px] bg-white px-8 text-[15px] font-semibold text-violet-700 transition-all hover:bg-violet-50"
              style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}>
              Crear mi workspace gratis →
            </Link>
            <button onClick={() => scrollTo('precios')}
              className="inline-flex h-12 items-center rounded-[14px] border border-white/30 px-8 text-[15px] font-medium text-white transition-all hover:bg-white/10">
              Ver planes
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[rgba(17,24,39,0.06)] bg-white pt-12 pb-8">
        <div className="mx-auto max-w-7xl px-6">
          {/* Columnas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
            {/* Producto */}
            <div>
              <p className="text-[11px] font-semibold text-[rgba(17,24,39,0.35)] uppercase tracking-wider mb-3">Producto</p>
              <div className="space-y-2">
                {[
                  { label: 'Funciones', href: '#features' },
                  { label: 'Precios', href: '#pricing' },
                  { label: 'Integraciones', href: '#' },
                ].map(l => (
                  <a key={l.label} href={l.href} className="block text-[13px] text-[rgba(17,24,39,0.55)] hover:text-[#111827] transition-colors">{l.label}</a>
                ))}
              </div>
            </div>
            {/* Recursos */}
            <div>
              <p className="text-[11px] font-semibold text-[rgba(17,24,39,0.35)] uppercase tracking-wider mb-3">Recursos</p>
              <div className="space-y-2">
                {[
                  { label: 'Blog', href: '#' },
                  { label: 'Ayuda', href: '#' },
                  { label: 'Roadmap', href: '#' },
                ].map(l => (
                  <a key={l.label} href={l.href} className="block text-[13px] text-[rgba(17,24,39,0.55)] hover:text-[#111827] transition-colors">{l.label}</a>
                ))}
              </div>
            </div>
            {/* Legal */}
            <div>
              <p className="text-[11px] font-semibold text-[rgba(17,24,39,0.35)] uppercase tracking-wider mb-3">Legal</p>
              <div className="space-y-2">
                {[
                  { label: 'Términos', href: '/terminos' },
                  { label: 'Privacidad', href: '/privacidad' },
                  { label: 'Cookies', href: '/legal/cookies' },
                  { label: 'Uso aceptable', href: '/legal/uso-aceptable' },
                ].map(l => (
                  <a key={l.label} href={l.href} className="block text-[13px] text-[rgba(17,24,39,0.55)] hover:text-[#111827] transition-colors">{l.label}</a>
                ))}
              </div>
            </div>
            {/* Trust */}
            <div>
              <p className="text-[11px] font-semibold text-[rgba(17,24,39,0.35)] uppercase tracking-wider mb-3">Trust</p>
              <div className="space-y-2">
                {[
                  { label: 'Seguridad', href: '/legal/seguridad' },
                  { label: 'Política IA', href: '/legal/ia' },
                  { label: 'Founding', href: '/legal/founding' },
                  { label: 'Trust Center', href: '/trust' },
                ].map(l => (
                  <a key={l.label} href={l.href} className="block text-[13px] text-[rgba(17,24,39,0.55)] hover:text-[#111827] transition-colors">{l.label}</a>
                ))}
              </div>
            </div>
          </div>
          {/* Bottom bar */}
          <div className="flex items-center justify-between flex-wrap gap-3 pt-6 border-t border-[rgba(17,24,39,0.06)]">
            <div className="flex items-center gap-2.5">
              <WeeklinkMark size={20} />
              <span className="text-[14px] font-semibold text-[#111827]">Weeklink</span>
              <span className="text-[12px] text-[rgba(17,24,39,0.35)]">© 2026</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-[11px] text-[rgba(17,24,39,0.35)]">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Todos los sistemas operativos
              </span>
              <p className="text-[12px] text-[rgba(17,24,39,0.35)]">Hecho con 💜 en México</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
