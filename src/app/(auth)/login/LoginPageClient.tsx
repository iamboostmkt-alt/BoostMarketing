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

interface Props {
  isBoost: boolean;
  brandName: string;
  brandLogo: string | null;
}

export default function LoginPageClient({ isBoost, brandName, brandLogo }: Props) {
  const router = useRouter();
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [magicEmail, setMagicEmail] = useState('');
  const [error, setError]           = useState('');
  const [info, setInfo]             = useState('');
  const [loading, setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [magicLoading, setMagicLoading]   = useState(false);
  const [hasGoogle, setHasGoogle]   = useState(false);
  const [tab, setTab]               = useState<'password' | 'magic'>('password');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/providers')
      .then(r => r.json())
      .then((data: Record<string, unknown>) => {
        if (!cancelled && data && typeof data === 'object') setHasGoogle('google' in data);
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
      if (result?.ok) window.location.href = getCallbackUrl();
      else { setError('No se pudo iniciar sesión.'); setLoading(false); }
    } catch { setError('Error de conexión.'); setLoading(false); }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try { await signIn('google', { callbackUrl: getCallbackUrl() }); }
    catch { setError('Error al conectar con Google.'); setGoogleLoading(false); }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setInfo(''); setMagicLoading(true);
    try {
      const normalized = magicEmail.trim().toLowerCase();
      const result = await signIn('email', { email: normalized, callbackUrl: '/dashboard', redirect: false });
      if (result?.error) { setError('No se pudo enviar el enlace.'); }
      else setInfo('¡Revisa tu correo! Te enviamos un enlace mágico.');
    } catch { setError('Error de conexión.'); }
    finally { setMagicLoading(false); }
  };

  // ── Features por dominio ──────────────────────────────────
  const panelBg = isBoost
    ? 'linear-gradient(135deg, #07070A 0%, #0e0b1a 40%, #160528 60%, #07070A 100%)'
    : 'linear-gradient(160deg, #6D28D9 0%, #7C3AED 50%, #4C1D95 100%)';

  const panelTitle = isBoost
    ? 'Tu agencia, organizada y lista para crecer'
    : 'La plataforma para agencias que entrega resultados';

  const panelFeatures = isBoost
    ? ['Estrategia y contenido para tu marca', 'Gestión de campañas y entregables', 'Comunicación directa con tu equipo', 'Resultados medibles y transparentes']
    : ['Chat tipo Slack con tus clientes', 'Tareas, entregables y aprobaciones', 'Portal privado para cada cliente', 'IA integrada para tu equipo'];

  const backHref = isBoost ? '/' : '/weeklink';

  return (
    <div className="auth-bg min-h-[100dvh] max-h-[100dvh] overflow-hidden flex"
      style={{ background: '#F6F7FB', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }}>

      {/* Panel izquierdo — solo desktop */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 p-10"
        style={{ background: panelBg }}>
        <div className="flex items-center gap-3">
          {brandLogo
            ? <img src={brandLogo} alt={brandName} className="h-9 w-auto" />
            : <WeeklinkMark size={36} />}
          <span className="text-[20px] font-bold tracking-tight" style={{ color: 'rgba(255,255,255,0.9)' }}>{brandName}</span>
        </div>
        <div>
          <h2 className="text-[32px] font-bold text-white leading-tight mb-4">{panelTitle}</h2>
          <div className="space-y-3">
            {panelFeatures.map(f => (
              <div key={f} className="flex items-center gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-[14px] text-white/80">{f}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[12px] text-white/40">© 2026 {brandName} · Hecho en México 💜</p>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <div className="flex items-center gap-2.5 mb-8 lg:hidden">
          {brandLogo
            ? <img src={brandLogo} alt={brandName} className="h-8 w-auto" />
            : <WeeklinkMark size={32} />}
          <span className="text-[18px] font-bold text-[#111827]">{brandName}</span>
        </div>

        <div className="w-full max-w-[420px]">
          <Link href={backHref}
            className="inline-flex items-center gap-1.5 text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors mb-8">
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver a {brandName}
          </Link>

          <h1 className="text-[28px] font-bold text-[#111827] mb-1">Bienvenido de vuelta</h1>
          <p className="text-[14px] text-[#6B7280] mb-8">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-[#7C3AED] font-medium hover:underline">Regístrate</Link>
          </p>

          {/* Google */}
          {hasGoogle && (
            <button onClick={handleGoogle} disabled={googleLoading}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-[rgba(17,24,39,0.12)] bg-white py-3 text-[14px] font-medium text-[#111827] hover:bg-[#F9FAFB] transition-colors mb-4 disabled:opacity-60">
              {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continuar con Google
            </button>
          )}

          {/* Divider */}
          {hasGoogle && (
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[rgba(17,24,39,0.08)]" /></div>
              <div className="relative flex justify-center"><span className="bg-[#F6F7FB] px-3 text-[12px] text-[#9CA3AF]">o continúa con email</span></div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-[rgba(17,24,39,0.04)] mb-5">
            {(['password', 'magic'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 py-2 rounded-lg text-[13px] font-medium transition-all"
                style={{ background: tab === t ? '#fff' : 'transparent', color: tab === t ? '#111827' : '#6B7280', boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                {t === 'password' ? '🔒 Contraseña' : '✨ Magic Link'}
              </button>
            ))}
          </div>

          {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-[13px] text-red-600">{error}</p>}
          {info  && <p className="mb-4 rounded-lg bg-green-50 px-3 py-2.5 text-[13px] text-green-700 flex items-center gap-2"><Sparkles className="w-4 h-4" />{info}</p>}

          {tab === 'password' ? (
            <form onSubmit={handleCredentials} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#374151] mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    placeholder="tu@email.com" autoComplete="email"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[rgba(17,24,39,0.12)] bg-white text-[14px] text-[#111827] placeholder-[#9CA3AF] outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/10 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#374151] mb-1.5">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                    placeholder="••••••••" autoComplete="current-password"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-[rgba(17,24,39,0.12)] bg-white text-[14px] text-[#111827] placeholder-[#9CA3AF] outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/10 transition-all" />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#374151]">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="mt-1.5 text-right">
                  <Link href="/forgot-password" className="text-[12px] text-[#7C3AED] hover:underline">¿Olvidaste tu contraseña?</Link>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full rounded-xl py-3 text-[14px] font-semibold text-white transition-all disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', boxShadow: '0 4px 12px rgba(124,58,237,0.25)' }}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Iniciar sesión'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#374151] mb-1.5">Tu email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                  <input type="email" value={magicEmail} onChange={e => setMagicEmail(e.target.value)} required
                    placeholder="tu@email.com"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[rgba(17,24,39,0.12)] bg-white text-[14px] text-[#111827] placeholder-[#9CA3AF] outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/10 transition-all" />
                </div>
              </div>
              <button type="submit" disabled={magicLoading}
                className="w-full rounded-xl py-3 text-[14px] font-semibold text-white transition-all disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', boxShadow: '0 4px 12px rgba(124,58,237,0.25)' }}>
                {magicLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : <><Sparkles className="inline w-4 h-4 mr-1.5" />Enviar magic link</>}
              </button>
              <p className="text-center text-[12px] text-[#9CA3AF]">Te enviaremos un enlace seguro a tu correo.</p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
