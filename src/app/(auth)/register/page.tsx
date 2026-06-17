'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, Building2, Mail, Lock, Check, ArrowLeft } from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────
function slugify(text: string) {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 50);
}

function WeeklinkMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="9" fill="#7C3AED" />
      <path d="M8 11L13 21L16 15L19 21L24 11" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'Mínimo 8 caracteres', ok: password.length >= 8 },
    { label: 'Una mayúscula', ok: /[A-Z]/.test(password) },
    { label: 'Un número', ok: /[0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ['#ef4444', '#f97316', '#22c55e'];
  const labels = ['Débil', 'Regular', 'Fuerte'];
  if (!password) return null;
  return (
    <div className="space-y-1.5 mt-2">
      <div className="flex gap-1">
        {[0,1,2].map(i => (
          <div key={i} className="flex-1 h-1 rounded-full transition-all"
            style={{ background: i < score ? colors[score-1] : 'rgba(17,24,39,0.10)' }} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          {checks.map(c => (
            <span key={c.label} className="text-[10px] flex items-center gap-1"
              style={{ color: c.ok ? '#16A34A' : '#9CA3AF' }}>
              <span>{c.ok ? '✓' : '○'}</span>{c.label}
            </span>
          ))}
        </div>
        {score > 0 && <span className="text-[10px] font-semibold" style={{ color: colors[score-1] }}>{labels[score-1]}</span>}
      </div>
    </div>
  );
}

const AGENCY_TYPES = [
  { id: 'marketing', label: 'Marketing Digital', emoji: '📊' },
  { id: 'creative',  label: 'Diseño Creativo',  emoji: '🎨' },
  { id: 'ads',       label: 'Publicidad & Ads',  emoji: '📣' },
  { id: 'content',   label: 'Contenido & Media', emoji: '🎬' },
  { id: 'branding',  label: 'Branding',          emoji: '✨' },
  { id: 'other',     label: 'Otro',              emoji: '🚀' },
];

// ── Componente principal ───────────────────────────────────────────────────
function RegisterPageInner() {
  const searchParams    = useSearchParams();
  const preselectedPlan = searchParams.get('plan') || '';

  const [step, setStep]       = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [showPass, setShowPass]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    agencyName: '', slug: '', agencyType: '',
    name: '', email: '', password: '', confirm: '',
  });

  function set(key: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  // Auto-generar slug desde agencyName
  useEffect(() => {
    if (form.agencyName) set('slug', slugify(form.agencyName));
  }, [form.agencyName]);

  // Validar slug con auto-sugerencia
  const checkSlug = useCallback(async (slug: string) => {
    if (!slug || slug.length < 2) { setSlugStatus('idle'); return; }
    setSlugStatus('checking');
    try {
      const res = await fetch(`/api/auth/check-slug?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();
      if (data.available) {
        setSlugStatus('available');
      } else {
        const suffix = Math.floor(Math.random() * 90 + 10);
        const newSlug = `${slug}-${suffix}`;
        const res2 = await fetch(`/api/auth/check-slug?slug=${encodeURIComponent(newSlug)}`);
        const data2 = await res2.json();
        if (data2.available) { set('slug', newSlug); setSlugStatus('available'); }
        else setSlugStatus('taken');
      }
    } catch { setSlugStatus('idle'); }
  }, []);

  useEffect(() => {
    if (!form.slug) return;
    const t = setTimeout(() => checkSlug(form.slug), 600);
    return () => clearTimeout(t);
  }, [form.slug, checkSlug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (step === 1) {
      if (!form.agencyName.trim()) { setError('El nombre de tu agencia es requerido'); return; }
      if (slugStatus === 'taken') { setError('El identificador no está disponible'); return; }
      setStep(2); return;
    }
    if (!form.name.trim())  { setError('Tu nombre es requerido'); return; }
    if (!form.email.trim()) { setError('Tu email es requerido'); return; }
    if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return; }
    if (form.password !== form.confirm) { setError('Las contraseñas no coinciden'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyName: form.agencyName, slug: form.slug,
          name: form.name, email: form.email, password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.includes('identificador')) {
          const s = Math.floor(Math.random() * 90 + 10);
          set('slug', `${form.slug}-${s}`);
          setError('El identificador de URL ya existía, lo ajustamos. Intenta de nuevo.');
        } else {
          setError(data.error || 'No pudimos crear tu cuenta. Verifica los datos.');
        }
        setLoading(false); return;
      }
      const result = await signIn('credentials', {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        redirect: false,
      });
      if (result?.ok) window.location.href = '/dashboard';
      else window.location.href = '/login';
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
      setLoading(false);
    }
  }

  const slugColor = { idle: '#9CA3AF', checking: '#9CA3AF', available: '#16A34A', taken: '#DC2626' }[slugStatus];

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center px-4 py-12"
      style={{ background: '#F6F7FB', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }}
    >
      <div className="w-full max-w-[480px]">

        {/* Back link */}
        <Link href="/weeklink"
          className="inline-flex items-center gap-1.5 text-[13px] mb-6 transition-colors"
          style={{ color: '#6B7280' }}>
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver a Weeklink
        </Link>

        {/* Card */}
        <div className="rounded-[24px] bg-white overflow-hidden"
          style={{ boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 20px 60px rgba(0,0,0,0.08)' }}>

          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-[rgba(17,24,39,0.06)]">
            <div className="flex justify-center mb-4">
              <div className="flex items-center gap-2.5">
                <WeeklinkMark size={36} />
                <span className="text-[20px] font-bold text-[#111827]">Weeklink</span>
              </div>
            </div>
            <h1 className="text-[22px] font-bold text-[#111827] text-center mb-1">Crea tu agencia</h1>
            <p className="text-[13px] text-[#9CA3AF] text-center">Configura tu workspace en 2 pasos</p>
          </div>

          {/* Steps */}
          <div className="flex items-center px-8 py-4 border-b border-[rgba(17,24,39,0.06)]">
            {[{ n: 1 as const, label: 'Tu agencia' }, { n: 2 as const, label: 'Tu cuenta' }].map((s, i) => (
              <div key={s.n} className="flex items-center gap-2 flex-1">
                <div className="flex items-center justify-center w-7 h-7 rounded-full text-[12px] font-bold transition-all"
                  style={{
                    background: step > s.n ? '#22C55E' : step === s.n ? '#7C3AED' : 'rgba(17,24,39,0.08)',
                    color: step >= s.n ? 'white' : '#9CA3AF',
                    boxShadow: step === s.n ? '0 4px 12px rgba(124,58,237,0.30)' : 'none',
                  }}>
                  {step > s.n ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : s.n}
                </div>
                <span className="text-[13px] font-medium" style={{ color: step >= s.n ? '#374151' : '#9CA3AF' }}>
                  {s.label}
                </span>
                {i === 0 && (
                  <div className="flex-1 h-px mx-2 rounded-full"
                    style={{ background: step > 1 ? '#22C55E' : 'rgba(17,24,39,0.08)' }} />
                )}
              </div>
            ))}
          </div>

          {/* Form */}
          <div className="px-8 py-6">
            {error && (
              <div className="mb-5 flex items-start gap-2.5 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3">
                <span className="text-red-500 text-[13px] shrink-0">⚠</span>
                <p className="text-[13px] text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {step === 1 && (
                <>
                  {/* Nombre agencia */}
                  <div>
                    <label className="text-[12px] font-medium text-[#374151] mb-1.5 block">
                      Nombre de tu agencia
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" strokeWidth={1.75} />
                      <input
                        type="text"
                        value={form.agencyName}
                        onChange={e => set('agencyName', e.target.value)}
                        placeholder="Boost Marketing"
                        required
                        style={{ fontSize: '16px' }}
                        className="w-full h-12 rounded-[12px] border border-[rgba(17,24,39,0.12)] bg-white pl-10 pr-4 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-violet-500/10 transition-all"
                      />
                    </div>
                    {/* Slug preview */}
                    {form.slug && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-[11px]" style={{ color: slugColor }}>
                          weeklink.app/<strong>{form.slug}</strong>
                        </span>
                        <span className="text-[10px]" style={{ color: slugColor }}>
                          {{ idle: '', checking: '⏳ Verificando...', available: '✓ Disponible', taken: '✗ No disponible' }[slugStatus]}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Tipo de agencia */}
                  <div>
                    <label className="text-[12px] font-medium text-[#374151] mb-2 block">
                      Tipo de agencia <span className="text-[#9CA3AF] font-normal">(opcional)</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {AGENCY_TYPES.map(t => (
                        <button key={t.id} type="button"
                          onClick={() => set('agencyType', form.agencyType === t.id ? '' : t.id)}
                          className="flex flex-col items-center gap-1.5 rounded-[14px] border py-3 px-2 text-center transition-all"
                          style={{
                            borderColor: form.agencyType === t.id ? '#7C3AED' : 'rgba(17,24,39,0.10)',
                            background: form.agencyType === t.id ? '#F5F3FF' : 'white',
                            boxShadow: form.agencyType === t.id ? '0 0 0 2px rgba(124,58,237,0.15)' : 'none',
                          }}>
                          <span className="text-xl">{t.emoji}</span>
                          <span className="text-[11px] font-medium leading-tight"
                            style={{ color: form.agencyType === t.id ? '#7C3AED' : '#374151' }}>
                            {t.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  {/* Nombre */}
                  <div>
                    <label className="text-[12px] font-medium text-[#374151] mb-1.5 block">Tu nombre completo</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => set('name', e.target.value)}
                      placeholder="Juan García"
                      required
                      style={{ fontSize: '16px' }}
                      className="w-full h-12 rounded-[12px] border border-[rgba(17,24,39,0.12)] bg-white px-4 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-violet-500/10 transition-all"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-[12px] font-medium text-[#374151] mb-1.5 block">Email de trabajo</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" strokeWidth={1.75} />
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => set('email', e.target.value)}
                        placeholder="tu@agencia.com"
                        required
                        autoComplete="email"
                        style={{ fontSize: '16px' }}
                        className="w-full h-12 rounded-[12px] border border-[rgba(17,24,39,0.12)] bg-white pl-10 pr-4 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-violet-500/10 transition-all"
                      />
                    </div>
                  </div>

                  {/* Contraseña */}
                  <div>
                    <label className="text-[12px] font-medium text-[#374151] mb-1.5 block">Contraseña</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" strokeWidth={1.75} />
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={form.password}
                        onChange={e => set('password', e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        required
                        style={{ fontSize: '16px' }}
                        className="w-full h-12 rounded-[12px] border border-[rgba(17,24,39,0.12)] bg-white pl-10 pr-11 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-violet-500/10 transition-all"
                      />
                      <button type="button" onClick={() => setShowPass(p => !p)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <PasswordStrength password={form.password} />
                  </div>

                  {/* Confirmar */}
                  <div>
                    <label className="text-[12px] font-medium text-[#374151] mb-1.5 block">Confirmar contraseña</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" strokeWidth={1.75} />
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={form.confirm}
                        onChange={e => set('confirm', e.target.value)}
                        placeholder="Repite tu contraseña"
                        required
                        style={{ fontSize: '16px' }}
                        className="w-full h-12 rounded-[12px] border border-[rgba(17,24,39,0.12)] bg-white pl-10 pr-11 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-violet-500/10 transition-all"
                      />
                      <button type="button" onClick={() => setShowConfirm(p => !p)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {form.confirm && form.password !== form.confirm && (
                      <p className="text-[11px] text-red-600 mt-1">Las contraseñas no coinciden</p>
                    )}
                  </div>
                </>
              )}

              {/* CTA Button */}
              <button
                type="submit"
                disabled={loading || (step === 1 && slugStatus === 'taken')}
                className="w-full h-12 rounded-[14px] text-[14px] font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60 mt-2"
                style={{ background: '#7C3AED', boxShadow: '0 8px 24px rgba(124,58,237,0.25)' }}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : step === 1 ? (
                  <><span>✦</span> Continuar →</>
                ) : (
                  <>✓ Crear workspace</>
                )}
              </button>

              {step === 2 && (
                <button type="button" onClick={() => { setStep(1); setError(''); }}
                  className="w-full text-center text-[12px] py-1 transition-colors"
                  style={{ color: '#9CA3AF' }}>
                  ← Volver al paso 1
                </button>
              )}
            </form>
          </div>

          {/* Footer */}
          <div className="px-8 pb-6 text-center space-y-3">
            <p className="text-[11px] leading-relaxed" style={{ color: '#9CA3AF' }}>
              Al crear tu cuenta aceptas los{' '}
              <a href="/terminos" target="_blank" className="underline hover:text-[#7C3AED]" style={{ color: '#7C3AED' }}>Términos y Condiciones</a>
              {' '}y reconoces haber leído el{' '}
              <a href="/privacidad" target="_blank" className="underline hover:text-[#7C3AED]" style={{ color: '#7C3AED' }}>Aviso de Privacidad</a>.
            </p>
            <p className="text-[12px]" style={{ color: '#9CA3AF' }}>
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="font-semibold hover:underline" style={{ color: '#7C3AED' }}>
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-4 mt-6">
          {['15 días gratis', 'Sin tarjeta de crédito', 'Cancela cuando quieras'].map(t => (
            <span key={t} className="flex items-center gap-1 text-[11px]" style={{ color: '#9CA3AF' }}>
              <span style={{ color: '#7C3AED' }}>✓</span> {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageInner />
    </Suspense>
  );
}
