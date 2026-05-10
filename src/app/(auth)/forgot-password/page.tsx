'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Zap, Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Error al enviar el email.');
        setLoading(false);
        return;
      }

      setSent(true);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <Link
        href="/login"
        className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al inicio de sesión
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand text-white">
          <Zap className="w-5 h-5" />
        </div>
        <span className="text-xl font-bold text-white">BoostMarketing</span>
      </div>

      <div className="glass-card rounded-xl p-6 md:p-8">
        {sent ? (
          <div className="text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Revisa tu email</h2>
            <p className="text-sm text-white/50 mb-6">
              Si existe una cuenta con <span className="text-white/70">{email}</span>,
              recibirás un enlace para restablecer tu contraseña. El enlace es válido por 1 hora.
            </p>
            <p className="text-xs text-white/30">
              ¿No lo ves? Revisa la carpeta de spam.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white mb-1">¿Olvidaste tu contraseña?</h1>
            <p className="text-sm text-white/40 mb-6">
              Ingresa tu email y te enviaremos un enlace para restablecerla.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-white/60">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                    disabled={loading}
                    autoComplete="email"
                    className="pl-10 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus:border-brand focus:ring-brand/20"
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
                  'Enviar enlace'
                )}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
