'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogoBrand } from '@/components/shared/LogoBrand';
import { Zap, Lock, Loader2, ArrowLeft, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) setError('El enlace no es válido o ha expirado.');
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Error al restablecer la contraseña.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-4">
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Contraseña actualizada</h2>
        <p className="text-sm text-white/50 mb-6">
          Tu contraseña ha sido restablecida. Redirigiendo al inicio de sesión…
        </p>
        <Link href="/login" className="text-brand-light hover:text-brand text-sm font-medium transition-colors">
          Ir ahora
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="text-center py-4">
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Enlace inválido</h2>
        <p className="text-sm text-white/50 mb-6">
          Este enlace no es válido o ha expirado.
        </p>
        <Link href="/forgot-password" className="text-brand-light hover:text-brand text-sm font-medium transition-colors">
          Solicitar nuevo enlace
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-white mb-1">Nueva contraseña</h1>
      <p className="text-sm text-[var(--wl-text-muted)] mb-6">
        Elige una contraseña segura para tu cuenta.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
          {error.includes('expirado') && (
            <Link href="/forgot-password" className="block mt-1 text-brand-light hover:text-brand underline">
              Solicitar nuevo enlace
            </Link>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-[var(--wl-text-secondary)]">
            Nueva contraseña
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              disabled={loading}
              autoComplete="new-password"
              className="pl-10 pr-10 bg-white/[0.04] border-[var(--wl-border)] text-white placeholder:text-white/25 focus:border-brand focus:ring-brand/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-[var(--wl-text-secondary)] transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm" className="text-sm font-medium text-[var(--wl-text-secondary)]">
            Confirmar contraseña
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input
              id="confirm"
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repite la contraseña"
              required
              disabled={loading}
              autoComplete="new-password"
              className="pl-10 bg-white/[0.04] border-[var(--wl-border)] text-white placeholder:text-white/25 focus:border-brand focus:ring-brand/20"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-brand hover:bg-brand-dark text-white font-medium h-10"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Restablecer contraseña'}
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="w-full max-w-md mx-auto px-4">
      <Link
        href="/login"
        className="inline-flex items-center gap-2 text-sm text-[var(--wl-text-muted)] hover:text-[var(--wl-text-secondary)] transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al inicio de sesión
      </Link>

      <div className="mb-8">
          <LogoBrand size="lg" showName={true} />
        </div>

      <div className="glass-card rounded-xl p-6 md:p-8">
        <Suspense fallback={<div className="text-[var(--wl-text-muted)] text-sm">Cargando…</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
