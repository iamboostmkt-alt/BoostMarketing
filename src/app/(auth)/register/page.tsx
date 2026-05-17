'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogoBrand } from '@/components/shared/LogoBrand';
import { Zap, Eye, EyeOff, Loader2 } from 'lucide-react';

/**
 * Register page — redirect ONLY on explicit user action (after successful registration + auto-login).
 * NEVER redirect based on useSession() state in effects/renders.
 * Middleware handles route protection server-side.
 */
export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al crear la cuenta');
        setLoading(false);
        return;
      }

      // Auto-login after successful registration
      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        window.location.href = '/login';
      } else if (result?.ok) {
        // Full page reload after successful registration + auto-login.
        // This is the ONLY place redirect happens — as a direct
        // result of user action, not from session state effects.
        window.location.href = '/dashboard';
      } else {
        window.location.href = '/login';
      }
    } catch {
      setError('Ocurrió un error al crear la cuenta');
      setLoading(false);
    }
    // Do NOT reset loading on success — keep spinner during redirect
  };

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div className="glass-card rounded-2xl p-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <LogoBrand size="lg" showName={true} />
        </div>

        {/* Title */}
        <h1 className="text-xl font-semibold text-white text-center mb-6">
          Crear Cuenta
        </h1>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white/70 text-sm">
              Nombre completo
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:border-brand focus:ring-brand/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-white/70 text-sm">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:border-brand focus:ring-brand/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-white/70 text-sm">
              Contraseña
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:border-brand focus:ring-brand/20 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-white/70 text-sm">
              Confirmar contraseña
            </Label>
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="Repite tu contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:border-brand focus:ring-brand/20"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-brand hover:bg-brand-dark text-white font-medium py-3 rounded-lg transition-colors"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Creando cuenta...
              </div>
            ) : (
              'Crear Cuenta'
            )}
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-white/40 text-sm mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link
            href="/login"
            className="text-brand-light hover:text-brand transition-colors font-medium"
          >
            Inicia Sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
