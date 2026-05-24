'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Eye, EyeOff, Building2, User, Mail, Lock, ArrowRight, Check } from 'lucide-react';

function slugify(text: string) {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 50);
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep]       = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [showPass, setShowPass] = useState(false);

  const [form, setForm] = useState({
    agencyName: '',
    slug:       '',
    name:       '',
    email:      '',
    password:   '',
  });

  function set(field: string, value: string) {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'agencyName') next.slug = slugify(value);
      return next;
    });
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === 1) { setStep(2); return; }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al crear la cuenta'); return; }

      // Auto login después del registro
      const login = await signIn('credentials', {
        email:    form.email,
        password: form.password,
        redirect: false,
      });
      if (login?.ok) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4 py-12">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand/20 mb-4">
            <Building2 className="w-6 h-6 text-brand-light" />
          </div>
          <h1 className="text-2xl font-semibold text-white">Crea tu agencia</h1>
          <p className="text-white/40 text-sm mt-1">Configura tu workspace en menos de 2 minutos</p>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 mb-8">
          {[
            { n: 1, label: 'Tu agencia' },
            { n: 2, label: 'Tu cuenta'  },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-colors ${
                step > s.n ? 'bg-emerald-500 text-white' :
                step === s.n ? 'bg-brand text-white' :
                'bg-white/[0.06] text-white/30'
              }`}>
                {step > s.n ? <Check className="w-3.5 h-3.5" /> : s.n}
              </div>
              <span className={`text-xs ${step >= s.n ? 'text-white/70' : 'text-white/25'}`}>{s.label}</span>
              {i === 0 && <div className="flex-1 h-px bg-white/[0.06] mx-1" />}
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 space-y-4">

            {step === 1 && (
              <>
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Nombre de tu agencia</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                    <input
                      required autoFocus
                      value={form.agencyName}
                      onChange={e => set('agencyName', e.target.value)}
                      placeholder="Boost Marketing"
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-brand/50 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Slug del workspace</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 text-xs">weeklink.app/</span>
                    <input
                      required
                      value={form.slug}
                      onChange={e => set('slug', e.target.value)}
                      placeholder="boost-marketing"
                      className="w-full pl-[108px] pr-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-brand/50 transition-colors"
                    />
                  </div>
                  <p className="text-[11px] text-white/25 mt-1">Solo minúsculas, números y guiones</p>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Tu nombre</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                    <input
                      required autoFocus
                      value={form.name}
                      onChange={e => set('name', e.target.value)}
                      placeholder="Juan García"
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-brand/50 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                    <input
                      required type="email"
                      value={form.email}
                      onChange={e => set('email', e.target.value)}
                      placeholder="juan@agencia.com"
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-brand/50 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                    <input
                      required type={showPass ? 'text' : 'password'}
                      minLength={8}
                      value={form.password}
                      onChange={e => set('password', e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full pl-9 pr-10 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-brand/50 transition-colors"
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {error && (
              <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand hover:bg-brand-dark text-white font-medium text-sm transition-colors disabled:opacity-60"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {step === 1 ? 'Continuar' : 'Crear workspace'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {step === 2 && (
            <button type="button" onClick={() => setStep(1)}
              className="w-full text-center text-sm text-white/30 hover:text-white/60 transition-colors py-1">
              ← Volver
            </button>
          )}
        </form>

        <p className="text-center text-sm text-white/30 mt-6">
          ¿Ya tienes cuenta?{' '}
          <a href="/login" className="text-brand-light hover:text-white transition-colors">
            Inicia sesión
          </a>
        </p>
      </div>
    </div>
  );
}
