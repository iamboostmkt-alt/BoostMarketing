'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { Zap, Mail, Lock, Loader2, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [magicEmail, setMagicEmail] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [hasGoogle, setHasGoogle] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/providers')
      .then((r) => r.json())
      .then((data: Record<string, unknown>) => {
        if (!cancelled && data && typeof data === 'object') {
          setHasGoogle('google' in data);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      if (result?.ok) {
        window.location.href = '/dashboard';
      } else {
        setError('No se pudo iniciar sesión. Revisa tus datos e intenta de nuevo.');
        setLoading(false);
      }
    } catch {
      setError('Error al iniciar sesión');
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setInfo('');
    setGoogleLoading(true);
    try {
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch {
      setError('No se pudo iniciar sesión con Google.');
      setGoogleLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    const normalized = magicEmail.trim().toLowerCase();
    if (!normalized) {
      setError('Introduce un email válido.');
      return;
    }
    setMagicLoading(true);
    try {
      const result = await signIn('email', {
        email: normalized,
        callbackUrl: '/dashboard',
        redirect: false,
      });
      if (result?.error) {
        setError(result.error);
        setMagicLoading(false);
        return;
      }
      setInfo(
        'Si el correo es válido, recibirás un enlace. En desarrollo, mira la terminal del servidor.'
      );
      setMagicLoading(false);
    } catch {
      setError('No se pudo enviar el enlace.');
      setMagicLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0b0f] px-4">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand text-white">
            <Zap className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold text-white">BoostMarketing</span>
        </div>

        <div className="glass-card rounded-xl p-6 md:p-8">
          <h1 className="text-2xl font-bold text-white mb-1">Iniciar sesión</h1>
          <p className="text-sm text-white/40 mb-6">
            Credenciales, Google o enlace por email
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
          {info && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm">
              {info}
            </div>
          )}

          {hasGoogle && (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={googleLoading || loading}
                onClick={handleGoogle}
                className="w-full h-10 border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08] mb-4"
              >
                {googleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>Continuar con Google</>
                )}
              </Button>
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#12121a] px-2 text-white/35">o</span>
                </div>
              </div>
            </>
          )}

          <form onSubmit={handleMagicLink} className="space-y-3 mb-6">
            <div className="flex items-center gap-2 text-sm font-medium text-white/60">
              <Sparkles className="w-4 h-4 text-brand-light" />
              Enlace mágico (sin contraseña)
            </div>
            <div className="flex gap-2">
              <Input
                type="email"
                value={magicEmail}
                onChange={(e) => setMagicEmail(e.target.value)}
                placeholder="tu@email.com"
                className="flex-1 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25"
                autoComplete="email"
                disabled={magicLoading}
              />
              <Button
                type="submit"
                variant="secondary"
                disabled={magicLoading}
                className="shrink-0"
              >
                {magicLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Enviar'
                )}
              </Button>
            </div>
          </form>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#12121a] px-2 text-white/35">email y contraseña</span>
            </div>
          </div>

          <form onSubmit={handleCredentials} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/60">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@test.com"
                  className="pl-10 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus:border-brand focus:ring-brand/20"
                  required
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/60">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus:border-brand focus:ring-brand/20"
                  required
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-brand hover:bg-brand-dark text-white font-medium h-10"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Iniciar sesión'
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-white/[0.06]">
            <p className="text-xs text-white/30 text-center">
              Tras <code className="text-white/45">npm run db:seed</code>:{' '}
              <span className="text-white/50">admin@test.com</span> /{' '}
              <span className="text-white/50">123456</span> (rol ADMIN)
            </p>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm text-white/40">
              ¿No tienes cuenta?{' '}
              <Link
                href="/register"
                className="text-brand-light hover:text-brand transition-colors font-medium"
              >
                Regístrate
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
