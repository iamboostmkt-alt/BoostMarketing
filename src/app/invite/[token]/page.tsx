'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Loader2, Eye, EyeOff, Check, X } from 'lucide-react';
import { LogoBrand } from '@/components/shared/LogoBrand';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador', PROJECT_MANAGER: 'Project Manager',
  TEAM_MEMBER: 'Miembro del equipo', DESIGNER: 'Diseñador',
  MARKETING: 'Marketing', SALES_REP: 'Ventas', CLIENT: 'Cliente',
};

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [invite, setInvite] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then(r => r.json())
      .then(d => { if (d.invite) setInvite(d.invite); else setError(d.error); })
      .catch(() => setError('Error al cargar la invitación.'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || password.length < 8) return;
    setSubmitting(true);
    const res = await fetch('/api/invite/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, name, password }),
    });
    const d = await res.json();
    if (!res.ok) { setError(d.error); setSubmitting(false); return; }
    setDone(true);
    // Auto login
    await signIn('credentials', { email: invite.email, password, redirect: false });
    setTimeout(() => router.push(invite.isClient ? '/client-portal' : '/dashboard'), 1500);
  }

  if (loading) return (
    <div className="min-h-screen bg-[#07070A] flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#07070A] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
          <X className="h-6 w-6 text-red-400" />
        </div>
        <h1 className="text-xl font-semibold text-white">Invitación no válida</h1>
        <p className="text-white/50 text-sm">{error}</p>
        <a href="/login" className="inline-block text-primary text-sm hover:underline">Ir al login</a>
      </div>
    </div>
  );

  if (done) return (
    <div className="min-h-screen bg-[#07070A] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
          <Check className="h-6 w-6 text-green-400" />
        </div>
        <h1 className="text-xl font-semibold text-white">¡Cuenta creada!</h1>
        <p className="text-white/50 text-sm">Redirigiendo...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#07070A] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center"><LogoBrand /></div>
          <h1 className="text-2xl font-bold text-white mt-4">Crea tu cuenta</h1>
          <p className="text-white/50 text-sm">
            Fuiste invitado a <strong className="text-white">{invite.workspace.name}</strong>
            {invite.role !== 'CLIENT' && <> como <strong className="text-primary">{ROLE_LABELS[invite.role] ?? invite.role}</strong></>}
          </p>
          <p className="text-white/30 text-xs">{invite.email}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-white/50">Tu nombre completo</label>
            <input value={name} onChange={e => setName(e.target.value)} required
              placeholder="Juan García"
              className="w-full rounded-xl border border-white/[0.08] bg-[#0F1117] px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-primary/50" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/50">Contraseña</label>
            <div className="relative">
              <input value={password} onChange={e => setPassword(e.target.value)} required
                type={showPass ? 'text' : 'password'} minLength={8}
                placeholder="Mínimo 8 caracteres"
                className="w-full rounded-xl border border-white/[0.08] bg-[#0F1117] px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-primary/50 pr-10" />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button type="submit" disabled={submitting || !name.trim() || password.length < 8}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white disabled:opacity-40 transition-opacity">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Crear cuenta y entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
