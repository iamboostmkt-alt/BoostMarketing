'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, Building2, User, Mail, Lock, ArrowRight, Check, Sparkles } from 'lucide-react';
import { LogoBrand } from '@/components/shared/LogoBrand';

function slugify(text: string) {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 50);
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
    <div className="space-y-2 mt-2">
      <div className="flex gap-1.5">
        {[0,1,2].map(i => (
          <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{ background: i < score ? colors[score-1] : 'rgba(255,255,255,0.08)' }} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          {checks.map(c => (
            <span key={c.label} className={`text-[10px] flex items-center gap-1 ${c.ok ? 'text-green-400' : 'text-white/25'}`}>
              <span>{c.ok ? '✓' : '○'}</span>{c.label}
            </span>
          ))}
        </div>
        {score > 0 && <span className="text-[10px] font-medium" style={{ color: colors[score-1] }}>{labels[score-1]}</span>}
      </div>
    </div>
  );
}

const INDUSTRIES = [
  { id: 'marketing', label: 'Marketing Digital', emoji: '📱' },
  { id: 'design',    label: 'Diseño Creativo',   emoji: '🎨' },
  { id: 'ads',       label: 'Publicidad & Ads',  emoji: '📢' },
  { id: 'content',   label: 'Contenido & Media', emoji: '🎬' },
  { id: 'branding',  label: 'Branding',          emoji: '✨' },
  { id: 'other',     label: 'Otro',              emoji: '🚀' },
];

function RegisterPageInner() {
  const searchParams = useSearchParams();
  const preselectedPlan = searchParams.get('plan') || '';
  const [step, setStep]             = useState<1 | 2>(1);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [slugStatus, setSlugStatus] = useState<'idle'|'checking'|'available'|'taken'>('idle');
  const [industry, setIndustry]     = useState('');
  const [form, setForm] = useState({
    agencyName: '', slug: '', name: '', email: '', password: '', confirmPassword: '',
  });

  function set(field: string, value: string) {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'agencyName') {
        next.slug = slugify(value);
        setSlugStatus('idle');
      }
      return next;
    });
    setError('');
  }

  // Validación slug en tiempo real
  const checkSlug = useCallback(async (slug: string) => {
    if (!slug || slug.length < 2) { setSlugStatus('idle'); return; }
    setSlugStatus('checking');
    try {
      const res = await fetch(`/api/auth/check-slug?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();
      setSlugStatus(data.available ? 'available' : 'taken');
    } catch {
      setSlugStatus('idle');
    }
  }, []);

  useEffect(() => {
    if (!form.slug) return;
    const timer = setTimeout(() => checkSlug(form.slug), 600);
    return () => clearTimeout(timer);
  }, [form.slug, checkSlug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === 1) {
      if (!form.agencyName.trim()) { setError('El nombre de tu agencia es requerido'); return; }
      if (slugStatus === 'taken') { setError('Ese nombre ya está en uso, prueba con otro'); return; }
      setStep(2); return;
    }
    if (!form.name.trim()) { setError('Tu nombre es requerido'); return; }
    if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return; }
    if (form.password !== form.confirmPassword) { setError('Las contraseñas no coinciden'); return; }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyName: form.agencyName,
          slug:       form.slug,
          name:       form.name,
          email:      form.email,
          password:   form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al crear la cuenta'); setLoading(false); return; }
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

  const slugColor = { idle: 'text-white/25', checking: 'text-white/40', available: 'text-green-400', taken: 'text-red-400' };
  const slugIcon  = { idle: '', checking: '⏳', available: '✓', taken: '✗' };

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div className="rounded-2xl border border-white/[0.06] overflow-hidden"
        style={{ background: '#0F1117', boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 20px 60px rgba(0,0,0,0.5)' }}>

        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-white/[0.05]">
          <div className="flex justify-center mb-5">
            <LogoBrand size="lg" showName={true} />
          </div>
          <h1 className="text-[22px] font-semibold text-white text-center mb-1.5">Crea tu agencia</h1>
          <p className="text-white/35 text-sm text-center">Configura tu workspace en 2 pasos</p>
        </div>

        {/* Steps indicator */}
        <div className="flex px-8 py-4 border-b border-white/[0.05]">
          {[{ n: 1 as const, label: 'Tu agencia' }, { n: 2 as const, label: 'Tu cuenta' }].map((s, i) => (
            <div key={s.n} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold transition-all ${
                step > s.n ? 'text-white' : step === s.n ? 'text-white' : 'text-white/25'
              }`} style={{
                background: step > s.n ? '#22c55e' : step === s.n ? '#8B5CF6' : 'rgba(255,255,255,0.06)',
                boxShadow: step === s.n ? '0 0 12px rgba(139,92,246,0.4)' : 'none',
              }}>
                {step > s.n ? <Check className="w-3 h-3" /> : s.n}
              </div>
              <span className={`text-xs font-medium ${step >= s.n ? 'text-white/70' : 'text-white/25'}`}>{s.label}</span>
              {i === 0 && <div className="flex-1 h-px mx-2" style={{ background: step > 1 ? '#22c55e' : 'rgba(255,255,255,0.06)' }} />}
            </div>
          ))}
        </div>

        <div className="px-8 py-6">
          {error && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4 border border-red-500/20"
              style={{ background: 'rgba(239,68,68,0.08)' }}>
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 && (
              <>
                <div className="space-y-1.5">
                  <label className="text-white/50 text-xs font-medium">Nombre de tu agencia</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                    <input required autoFocus value={form.agencyName} onChange={e => set('agencyName', e.target.value)}
                      placeholder="Boost Marketing"
                      className="w-full pl-9 pr-4 py-3 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                      onFocus={e => e.target.style.borderColor = 'rgba(139,92,246,0.4)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
                  </div>
                  {/* URL preview */}
                  {form.slug && (
                    <div className="flex items-center justify-between px-1">
                      <span className={`text-[11px] font-mono ${slugColor[slugStatus]}`}>
                        {slugIcon[slugStatus]} weeklink.app/{form.slug}
                      </span>
                      {slugStatus === 'taken' && <span className="text-[10px] text-red-400">Nombre en uso</span>}
                      {slugStatus === 'available' && <span className="text-[10px] text-green-400">Disponible</span>}
                    </div>
                  )}
                </div>

                {/* Industria */}
                <div className="space-y-2">
                  <label className="text-white/50 text-xs font-medium">Tipo de agencia <span className="text-white/25">(opcional)</span></label>
                  <div className="grid grid-cols-3 gap-2">
                    {INDUSTRIES.map(ind => (
                      <button key={ind.id} type="button" onClick={() => setIndustry(ind.id)}
                        className="flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl text-center transition-all"
                        style={{
                          background: industry === ind.id ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${industry === ind.id ? 'rgba(139,92,246,0.35)' : 'rgba(255,255,255,0.06)'}`,
                        }}>
                        <span className="text-lg">{ind.emoji}</span>
                        <span className={`text-[10px] font-medium leading-tight ${industry === ind.id ? 'text-violet-300' : 'text-white/40'}`}>
                          {ind.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-1.5">
                  <label className="text-white/50 text-xs font-medium">Tu nombre completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                    <input required autoFocus value={form.name} onChange={e => set('name', e.target.value)}
                      placeholder="Juan García"
                      className="w-full pl-9 pr-4 py-3 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                      onFocus={e => e.target.style.borderColor = 'rgba(139,92,246,0.4)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-white/50 text-xs font-medium">Email de trabajo</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                    <input required type="email" value={form.email} onChange={e => set('email', e.target.value)}
                      placeholder="juan@agencia.com"
                      className="w-full pl-9 pr-4 py-3 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                      onFocus={e => e.target.style.borderColor = 'rgba(139,92,246,0.4)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-white/50 text-xs font-medium">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                    <input required type={showPass ? 'text' : 'password'} minLength={8}
                      value={form.password} onChange={e => set('password', e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full pl-9 pr-10 py-3 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                      onFocus={e => e.target.style.borderColor = 'rgba(139,92,246,0.4)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <PasswordStrength password={form.password} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-white/50 text-xs font-medium">Confirmar contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                    <input required type={showPass ? 'text' : 'password'}
                      value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)}
                      placeholder="Repite tu contraseña"
                      className="w-full pl-9 pr-4 py-3 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                      onFocus={e => e.target.style.borderColor = 'rgba(139,92,246,0.4)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
                  </div>
                  {form.confirmPassword && form.password !== form.confirmPassword && (
                    <p className="text-[11px] text-red-400 px-1">Las contraseñas no coinciden</p>
                  )}
                  {form.confirmPassword && form.password === form.confirmPassword && form.password.length >= 8 && (
                    <p className="text-[11px] text-green-400 px-1 flex items-center gap-1"><Check className="w-3 h-3" />Contraseñas coinciden</p>
                  )}
                </div>
              </>
            )}

            <button type="submit" disabled={loading || slugStatus === 'taken'}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-medium text-sm transition-all disabled:opacity-50 mt-2"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #9333EA)', boxShadow: '0 0 20px rgba(124,58,237,0.3)' }}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {step === 1 ? <><Sparkles className="w-4 h-4" />Continuar</> : <><Check className="w-4 h-4" />Crear workspace</>}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </>
              )}
            </button>

            {step === 2 && (
              <button type="button" onClick={() => setStep(1)}
                className="w-full text-center text-sm text-white/25 hover:text-white/50 transition-colors py-1">
                ← Volver al paso 1
              </button>
            )}
          </form>

          <p className="text-center text-white/30 text-sm mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-violet-400 hover:text-violet-300 transition-colors font-medium">
              Inicia sesión
            </Link>
          </p>
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
