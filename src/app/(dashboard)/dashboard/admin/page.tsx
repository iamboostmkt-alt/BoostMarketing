'use client';

import { useSession } from 'next-auth/react';
import { Shield } from 'lucide-react';
export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Panel administrador</h1>
          <p className="text-sm text-white/45">
            Solo usuarios con rol ADMIN pueden ver esta sección.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-[#15151c] p-6">
        <p className="text-sm text-white/70">
          Sesión:{' '}
          <span className="text-white font-medium">{session?.user?.email}</span>
        </p>
        <p className="text-sm text-white/70 mt-2">
          Rol en JWT:{' '}
          <span className="text-emerald-400 font-mono">{role ?? '—'}</span>
        </p>
      </div>
    </div>
  );
}
