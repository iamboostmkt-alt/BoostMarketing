'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Zap, Mail, Lock, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Email o contraseña incorrectos');
        setLoading(false);
      } else {
        // Use window.location.href for a FULL page reload
        // This ensures the middleware can read the newly set JWT cookie
        // router.push() alone can cause a race condition where middleware
        // runs before the cookie is available
        window.location.href = callbackUrl;
      }
    } catch {
      setError('Error al iniciar sesión');
      setLoading(false);
    }
    // Do NOT call setLoading(false) in finally — if login succeeded,
    // we want the button to stay in loading state during redirect
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0b0f] px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand text-white">
            <Zap className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold text-white">BoostMarketing</span>
        </div>

        {/* Login card */}
        <div className="glass-card rounded-xl p-6 md:p-8">
          <h1 className="text-2xl font-bold text-white mb-1">Iniciar Sesión</h1>
          <p className="text-sm text-white/40 mb-6">
            Ingresa tus credenciales para acceder al dashboard
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/60">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="demo@boostmarketing.com"
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
                'Iniciar Sesión'
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-white/[0.06]">
            <p className="text-xs text-white/30 text-center">
              Demo: <span className="text-white/50">demo@boostmarketing.com</span> / <span className="text-white/50">demo1234</span>
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
      </motion.div>
    </div>
  );
}
