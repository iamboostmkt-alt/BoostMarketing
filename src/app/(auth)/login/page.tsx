'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';

function WeeklinkMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="9" fill="#7C3AED" />
      <path d="M8 11L13 21L16 15L19 21L24 11" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPass, setShowPass]       = useState(false);
  const [magicEmail, setMagicEmail]   = useState('');
  const [error, setError]             = useState('');
  const [info, setInfo]               = useState('');
  const [loading, setLoading]         = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [magicLoading, setMagicLoading]   = useState(false);
  const [hasGoogle, setHasGoogle]     = useState(false);
  const [tab, setTab]                 = useState<'password' | 'magic'>('password');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/providers')
      .then(r => r.json())
      .then((data: Record<string, unknown>) => {
        if (!cancelled && data && typeof data === 'object') {
          setHasGoogle('google' in data);
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const getCallbackUrl = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get('callbackUrl') || '/dashboard';
      return raw.startsWith('/') ? raw : '/dashboard';
    } catch { return '/dashboard'; }
  };

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setInfo(''); setLoading(true);
    try {
      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(), password, redirect: false,
      });
      if (result?.error === 'PROSPECT_PENDING') { router.push('/prospect-pending'); return; }
      if (result?.error) {
        let msg = result.error;
        try { msg = decodeURIComponent(msg); } catch { /* keep */ }
        if (msg === 'CredentialsSignin') msg = 'Email o contraseña incorrectos.';
        setError(msg); setLoading(false); return;
      }
      if (result?.ok) { window.location.href = getCallbackUrl(); }
      else { setError('No se pudo iniciar sesión. Revisa tus datos.'); setLoading(false); }
    } catch { setError('Error de conexión. Intenta de nuevo.'); setLoading(false); }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try { await signIn('google', { callbackUrl: getCallbackUrl() }); }
    catch { setError('Error al conectar con Google.'); setGoogleLoading(false); }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setInfo('');
    const normalized = magicEmail.trim().toLowerCase();
    if (!normalized) { setError('Introduce un email válido.'); return; }
    setMagicLoading(true);
    try {
      const result = await signIn('email', { email: normalized, callbackUrl: '/dashboard', redirect: false });
      if (result?.error === 'PROSPECT_PENDING') { router.push('/prospect-pending'); return; }
      if (result?.error) { setError(result.error); setMagicLoading(false); return; }
      setInfo('Si el correo es válido, recibirás un enlace en tu bandeja de entrada.');
      setMagicLoading(false);
    } catch { setError('No se pudo enviar el enlace.'); setMagicLoading(false); }
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ background: '#F6F7FB', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }}
    >
      {/* Panel izquierdo — solo desktop */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 p-10"
        style={{ background: 'linear-gradient(160deg, #6D28D9 0%, #7C3AED 50%, #4C1D95 100%)' }}
      >
        <div className="flex items-center gap-3">
          <WeeklinkMark size={36} />
          <span className="text-[20px] font-bold text-white tracking-tight">Weeklink</span>
        </div>
        <div>
          <h2 className="text-[32px] font-bold text-white leading-tight mb-4">
            La plataforma para agencias que entrega resultados
          </h2>
          <div className="space-y-3">
            {[
              'Chat tipo Slack con tus clientes',
              'Tareas, entregables y aprobaciones',
              'Portal privado para cada cliente',
              'IA integrada para tu equipo',
            ].map(f => (
              <div key={f} className="flex items-center gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-[14px] text-violet-100">{f}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[12px] text-violet-300/60">© 2026 Weeklink · Hecho en México 💜</p>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <div className="flex items-center gap-2.5 mb-8 lg:hidden">
          <WeeklinkMark size={32} />
          <span className="text-[18px] font-bold text-[#111827]">Weeklink</span>
        </div>

        <div className="w-full max-w-[420px]">
          {/* Back link */}
          <Link
            href="/weeklink"
            className="inline-flex items-center gap-1.5 text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors mb-8"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver a Weeklink
          </Link>

          <h1 className="text-[28px] font-bold text-[#111827] mb-1">Bienvenido de vuelta</h1>
          <p className="text-[14px] text-[#6B7280] mb-8">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-[#7C3AED] font-medium hover:underline">
              Crear workspace gratis
            </Link>
          </p>

          {/* Error / info */}
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3">
              <span className="text-red-500 text-[13px]">⚠</span>
              <p className="text-[13px] text-red-700">{error}</p>
            </div>
          )}
          {info && (
            <div className="mb-5 flex items-start gap-3 rounded-[14px] border border-emerald-200 bg-emerald-50 px-4 py-3">
              <span className="text-emerald-500 text-[13px]">✓</span>
              <p className="text-[13px] text-emerald-700">{info}</p>
            </div>
          )}

          {/* Google */}
          {hasGoogle && (
            <>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleLoading || loading}
                className="w-full flex items-center justify-center gap-3 h-12 rounded-[14px] border border-[rgba(17,24,39,0.12)] bg-white text-[14px] font-medium text-[#374151] transition-all hover:bg-[#F9FAFB] hover:border-[rgba(17,24,39,0.2)] mb-4 disabled:opacity-60"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
              >
                {googleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#6B7280]" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continuar con Google
                  </>
                )}
              </button>
              <div className="relative mb-5">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-[rgba(17,24,39,0.08)]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[#F6F7FB] px-3 text-[12px] text-[#9CA3AF] uppercase tracking-wider">o continúa con email</span>
                </div>
              </div>
            </>
          )}

          {/* Tabs password / magic */}
          <div className="flex gap-1 rounded-[12px] border border-[rgba(17,24,39,0.08)] bg-white p-1 mb-5">
            {[
              { key: 'password', label: 'Contraseña' },
              { key: 'magic',    label: '✨ Enlace mágico' },
            ].map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => { setTab(t.key as 'password' | 'magic'); setError(''); setInfo(''); }}
                className="flex-1 rounded-[9px] py-2 text-[13px] font-medium transition-all"
                style={tab === t.key
                  ? { background: '#7C3AED', color: '#fff', boxShadow: '0 2px 8px rgba(124,58,237,0.25)' }
                  : { color: 'rgba(17,24,39,0.45)' }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Formulario contraseña */}
          {tab === 'password' && (
            <form onSubmit={handleCredentials} className="space-y-4">
              <div>
                <label className="text-[13px] font-medium text-[#374151] mb-1.5 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" strokeWidth={1.75} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="tu@agencia.com"
                    required
                    autoComplete="email"
                    disabled={loading}
                    style={{ fontSize: '16px' }}
                    className="w-full h-12 rounded-[12px] border border-[rgba(17,24,39,0.12)] bg-white pl-10 pr-4 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-violet-500/10 transition-all disabled:opacity-60"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[13px] font-medium text-[#374151]">Contraseña</label>
                  <Link href="/forgot-password" className="text-[12px] text-[#7C3AED] hover:underline">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" strokeWidth={1.75} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    disabled={loading}
                    style={{ fontSize: '16px' }}
                    className="w-full h-12 rounded-[12px] border border-[rgba(17,24,39,0.12)] bg-white pl-10 pr-11 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-violet-500/10 transition-all disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(p => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-[14px] text-[14px] font-semibold text-white transition-all disabled:opacity-60 mt-2"
                style={{ background: '#7C3AED', boxShadow: '0 8px 24px rgba(124,58,237,0.25)' }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Iniciar sesión →'}
              </button>
            </form>
          )}

          {/* Formulario magic link */}
          {tab === 'magic' && (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div>
                <label className="text-[13px] font-medium text-[#374151] mb-1.5 block">
                  Tu email de trabajo
                </label>
                <div className="relative">
                  <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" strokeWidth={1.75} />
                  <input
                    type="email"
                    value={magicEmail}
                    onChange={e => setMagicEmail(e.target.value)}
                    placeholder="tu@agencia.com"
                    autoComplete="email"
                    disabled={magicLoading}
                    style={{ fontSize: '16px' }}
                    className="w-full h-12 rounded-[12px] border border-[rgba(17,24,39,0.12)] bg-white pl-10 pr-4 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-violet-500/10 transition-all disabled:opacity-60"
                  />
                </div>
              </div>
              <p className="text-[12px] text-[#9CA3AF]">
                Te enviaremos un enlace para entrar sin contraseña.
              </p>
              <button
                type="submit"
                disabled={magicLoading}
                className="w-full h-12 rounded-[14px] text-[14px] font-semibold text-white transition-all disabled:opacity-60"
                style={{ background: '#7C3AED', boxShadow: '0 8px 24px rgba(124,58,237,0.25)' }}
              >
                {magicLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Enviar enlace mágico ✨'}
              </button>
            </form>
          )}

          {/* Footer */}
          <p className="mt-8 text-center text-[12px] text-[#9CA3AF]">
            Al iniciar sesión aceptas nuestros{' '}
            <Link href="/weeklink" className="text-[#7C3AED] hover:underline">Términos</Link>
            {' '}y{' '}
            <Link href="/weeklink" className="text-[#7C3AED] hover:underline">Privacidad</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
