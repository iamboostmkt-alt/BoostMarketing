'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

// ── Minimal mock UI for the hero mockup ──────────────────────────────────────
function MockSidebar() {
  return (
    <div className="flex h-full w-[200px] shrink-0 flex-col border-r border-black/[0.05] bg-[#FCFCFD] py-3">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 pb-3">
        <WeeklinkMark size={22} />
        <span className="text-[13px] font-semibold text-[#111827]">Weeklink</span>
      </div>
      {/* Workspace */}
      <div className="mx-3 mb-2 flex items-center gap-2 rounded-xl bg-white px-2.5 py-2 shadow-sm border border-black/[0.04]">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-100 text-[10px] font-bold text-violet-600">B</div>
        <span className="text-[12px] font-medium text-[#111827]">BoostMarketing</span>
      </div>
      {/* Nav */}
      {[
        { icon: '⌂', label: 'Home', active: false },
        { icon: '✓', label: 'Tareas', active: false },
        { icon: '◷', label: 'Calendario', active: false },
        { icon: '◉', label: 'Chat', active: true },
        { icon: '◈', label: 'Mi Portal', active: false },
      ].map(item => (
        <div key={item.label} className={`mx-2 mb-0.5 flex items-center gap-2 rounded-[10px] px-2.5 py-[7px] text-[12px] ${item.active ? 'bg-violet-50 font-medium text-violet-700' : 'text-[#6B7280]'}`}>
          <span className="text-[13px]">{item.icon}</span>
          <span>{item.label}</span>
          {item.active && <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-[9px] font-bold text-white">3</span>}
        </div>
      ))}
      <div className="mx-3 mt-2 border-t border-black/[0.05] pt-2">
        <p className="px-2 pb-1 text-[9px] font-semibold uppercase tracking-widest text-[#9CA3AF]">Clientes</p>
        {['GymnasTwin', 'Café del Mar', 'FitLab', 'Peak Perf.'].map(c => (
          <div key={c} className="flex items-center gap-2 rounded-[8px] px-2 py-[5px] text-[11px] text-[#6B7280] hover:bg-violet-50">
            <div className="h-2 w-2 rounded-full bg-violet-400" />
            {c}
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
    { user: 'Diseño Team', color: '#D97706', time: '10:35', text: 'Genial equipo, estamos listos para revisión del cliente.', reactions: ['🎉 2'] },
  ];
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-black/[0.05] px-4 py-2.5">
        <span className="text-[13px] font-semibold text-[#111827]"># marketing</span>
        <span className="text-[11px] text-[#9CA3AF]">Estrategia, campañas y crecimiento</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-600 text-[11px]">🔍</div>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-600 text-[11px]">✨</div>
        </div>
      </div>
      {/* Messages */}
      <div className="flex-1 overflow-hidden px-4 py-3 space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className="flex gap-2.5">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: m.color }}>
              {m.user.split(' ').map(w => w[0]).join('').slice(0,2)}
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-[12px] font-semibold text-[#111827]">{m.user}</span>
                <span className="text-[10px] text-[#9CA3AF]">{m.time}</span>
              </div>
              <p className="text-[12px] leading-relaxed text-[#374151]">{m.text}</p>
              {m.reactions.length > 0 && (
                <div className="mt-1 flex gap-1">
                  {m.reactions.map(r => (
                    <span key={r} className="rounded-full border border-violet-100 bg-violet-50 px-2 py-0.5 text-[10px] text-violet-600">{r}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {/* Task card inside chat */}
        <div className="ml-9 flex items-center gap-2 rounded-xl border border-black/[0.06] bg-[#F9FAFC] px-3 py-2">
          <div className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="text-[11px] font-medium text-[#374151]">Revisar CTA principal</span>
          <span className="ml-auto rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-600 border border-amber-100">En revisión</span>
        </div>
      </div>
      {/* Composer */}
      <div className="border-t border-black/[0.05] px-3 py-2">
        <div className="flex items-center gap-2 rounded-xl border border-black/[0.06] bg-[#F9FAFC] px-3 py-2">
          <span className="text-[11px] text-[#9CA3AF]">Escribe un mensaje...</span>
          <div className="ml-auto flex h-6 w-6 items-center justify-center rounded-lg bg-violet-600 text-white text-[10px]">↑</div>
        </div>
      </div>
    </div>
  );
}

function MockThread() {
  return (
    <div className="flex w-[220px] shrink-0 flex-col border-l border-black/[0.05] bg-[#FCFCFD] overflow-hidden">
      <div className="flex items-center justify-between border-b border-black/[0.05] px-3 py-2.5">
        <span className="text-[12px] font-semibold text-[#111827]">Hilo</span>
        <span className="text-[11px] text-[#9CA3AF]">✕</span>
      </div>
      <div className="flex-1 overflow-hidden px-3 py-2 space-y-2">
        {['Sofia G.', 'Marcos R.', 'Alex T.', 'Sofia G.', 'Diseño Team'].map((u, i) => (
          <div key={i} className="flex gap-2">
            <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-violet-100 text-[8px] font-bold text-violet-600 flex items-center justify-center">
              {u.split(' ').map(w => w[0]).join('').slice(0,2)}
            </div>
            <div>
              <span className="text-[10px] font-semibold text-[#111827]">{u}</span>
              <p className="text-[10px] text-[#6B7280] leading-relaxed">
                {['Aquí el concepto...', 'Revisemos el CTA', '2 variaciones →', 'Versión final OK', 'Listos para review'][i]}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-black/[0.05] px-2 py-2">
        <p className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-[#9CA3AF]">Archivos</p>
        {['GT_Campaña_Ver2.mp4', 'GT_Assets.zip', 'GT_Final.pdf'].map(f => (
          <div key={f} className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 hover:bg-white">
            <span className="text-[10px]">📎</span>
            <span className="text-[10px] text-[#374151] truncate">{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Logo mark ────────────────────────────────────────────────────────────────
function WeeklinkMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#7C3AED" />
      <path d="M8 11L12 21L16 13L20 21L24 11" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Feature cards ────────────────────────────────────────────────────────────
const features = [
  { icon: '💬', title: 'Chat inteligente', desc: 'Comunícate con tu equipo y clientes en tiempo real con IA integrada.', cta: 'Explorar chat →' },
  { icon: '✓', title: 'Gestión de tareas', desc: 'Organiza proyectos, asigna tareas y cumple plazos sin esfuerzo.', cta: 'Ver tareas →' },
  { icon: '📁', title: 'Entregables & Aprobaciones', desc: 'Comparte archivos, recibe feedback y obtén aprobaciones rápidas.', cta: 'Ver entregables →' },
  { icon: '📅', title: 'Calendario integrado', desc: 'Planifica reuniones, deadlines y lanzamientos en un solo calendario.', cta: 'Ver calendario →' },
  { icon: '📊', title: 'Analíticas avanzadas', desc: 'Mide resultados, campañas y el rendimiento de tu agencia.', cta: 'Ver analíticas →' },
];

const logos = ['GymnasTwin', 'Café del Mar', 'Peak Performance', 'FitLab', 'IMEDI', 'boost.'];

// ── Page ─────────────────────────────────────────────────────────────────────
export default function WeeklinkHome() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div className="min-h-screen bg-[#F6F7FB] font-sans antialiased">
      {/* ── Navbar ── */}
      <nav className={`fixed left-0 right-0 top-0 z-50 transition-all duration-200 ${scrolled ? 'bg-white/90 shadow-sm' : 'bg-transparent'}`}
        style={{ backdropFilter: 'blur(18px)', height: '72px' }}>
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <Link href="/weeklink" className="flex items-center gap-2.5">
              <WeeklinkMark size={30} />
              <span className="text-[18px] font-bold tracking-tight text-[#111827]">Weeklink</span>
            </Link>
            <div className="hidden items-center gap-6 md:flex">
              {['Producto', 'Soluciones', 'Recursos', 'Precios', 'Empresa'].map(l => (
                <button key={l} className="text-[14px] text-[#6B7280] transition-colors hover:text-[#111827]">{l}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-[14px] font-medium text-[#374151] hover:text-[#111827] transition-colors">
              Iniciar sesión
            </Link>
            <Link href="/login"
              className="flex h-10 items-center rounded-[14px] bg-[#7C3AED] px-5 text-[14px] font-semibold text-white transition-all hover:bg-[#8B5CF6] hover:-translate-y-px"
              style={{ boxShadow: '0 8px 30px rgba(124,58,237,0.22)' }}>
              Comenzar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-7xl px-6 pt-28 pb-16">
        <div className="flex items-center gap-16">
          {/* Left */}
          <div className="flex-1 space-y-6">
            {/* Pill badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5">
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
              Gestiona proyectos, chats, entregables y clientes en un solo lugar. Colabora, automatiza y entrega resultados excepcionales más rápido.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <Link href="/login"
                className="flex h-12 items-center gap-2 rounded-[14px] bg-[#7C3AED] px-6 text-[15px] font-semibold text-white transition-all hover:bg-[#8B5CF6] hover:-translate-y-px"
                style={{ boxShadow: '0 8px 30px rgba(124,58,237,0.22)' }}>
                Comenzar gratis →
              </Link>
              <button className="flex h-12 items-center gap-2 rounded-[14px] border border-[rgba(17,24,39,0.08)] bg-white px-6 text-[15px] font-medium text-[#374151] transition-colors hover:bg-[#F3F4F8]">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F3F4F8] text-[12px]">▶</span>
                Ver demo
              </button>
            </div>
            {/* Social proof */}
            <div className="flex items-center gap-4 pt-1">
              {['💳 No se requiere tarjeta', '📅 14 días gratis', '⚡ Configuración en 2 min'].map(t => (
                <span key={t} className="text-[12px] text-[rgba(17,24,39,0.45)]">{t}</span>
              ))}
            </div>
          </div>

          {/* Right — App mockup */}
          <div className="hidden flex-1 lg:flex justify-center">
            <div className="relative w-full max-w-[580px]">
              {/* Glow */}
              <div className="absolute inset-0 rounded-[28px] blur-3xl" style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.12) 0%, transparent 70%)' }} />
              {/* App window */}
              <div className="relative overflow-hidden rounded-[28px] border border-black/[0.06] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.10)]"
                style={{ height: '420px' }}>
                {/* Window chrome */}
                <div className="flex items-center gap-1.5 border-b border-black/[0.05] bg-[#FCFCFD] px-4 py-2.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                  <div className="mx-auto flex h-6 items-center rounded-md bg-white border border-black/[0.06] px-3 gap-1">
                    <WeeklinkMark size={12} />
                    <span className="text-[10px] text-[#9CA3AF]">app.weeklink.co</span>
                  </div>
                </div>
                {/* App layout */}
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
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-widest text-[rgba(17,24,39,0.35)]">
              Agencias que confían en Weeklink
            </span>
            {logos.map(l => (
              <span key={l} className="shrink-0 text-[14px] font-semibold text-[rgba(17,24,39,0.30)] transition-colors hover:text-[rgba(17,24,39,0.60)]">{l}</span>
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
              className="group rounded-[20px] border border-[rgba(17,24,39,0.05)] bg-white p-7 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(124,58,237,0.10)]"
              style={{ boxShadow: '0 8px 30px rgba(15,23,42,0.04)' }}>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] text-2xl"
                style={{ background: 'rgba(124,58,237,0.10)' }}>
                {f.icon}
              </div>
              <h3 className="mb-2 text-[17px] font-semibold text-[#111827]">{f.title}</h3>
              <p className="mb-4 text-[14px] leading-relaxed text-[rgba(17,24,39,0.58)]">{f.desc}</p>
              <span className="text-[13px] font-medium text-violet-600 transition-colors group-hover:text-violet-700">{f.cta}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="overflow-hidden rounded-[28px] bg-[#7C3AED] px-12 py-16 text-center"
          style={{ boxShadow: '0 20px 60px rgba(124,58,237,0.25)' }}>
          <h2 className="mb-4 text-[40px] font-bold tracking-tight text-white">
            Empieza gratis hoy
          </h2>
          <p className="mb-8 text-[16px] text-violet-200">Sin tarjeta de crédito. 14 días de prueba. Cancela cuando quieras.</p>
          <Link href="/login"
            className="inline-flex h-12 items-center rounded-[14px] bg-white px-8 text-[15px] font-semibold text-violet-700 transition-all hover:bg-violet-50 hover:-translate-y-px"
            style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}>
            Crear mi workspace gratis →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[rgba(17,24,39,0.06)] bg-white py-10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <WeeklinkMark size={24} />
              <span className="text-[15px] font-semibold text-[#111827]">Weeklink</span>
            </div>
            <div className="flex gap-6">
              {['Términos', 'Privacidad', 'Cookies', 'Contacto'].map(l => (
                <span key={l} className="text-[13px] text-[rgba(17,24,39,0.45)] hover:text-[#111827] cursor-pointer transition-colors">{l}</span>
              ))}
            </div>
            <p className="text-[12px] text-[rgba(17,24,39,0.35)]">© 2026 Weeklink. Hecho con 💜 en México</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
