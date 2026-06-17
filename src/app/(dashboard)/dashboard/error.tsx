'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('[DashboardError]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7 text-red-400" />
      </div>
      <h2 className="text-lg font-medium text-white mb-1">Algo salió mal</h2>
      <p className="text-sm text-white/40 mb-6 max-w-sm">
        {error.message || 'Ocurrió un error inesperado en esta sección.'}
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white/70 hover:text-white text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </button>
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm transition-colors"
        >
          <Home className="w-4 h-4" />
          Ir al inicio
        </button>
      </div>
      {error.digest && (
        <p className="mt-4 text-[10px] text-white/20 font-mono">ID: {error.digest}</p>
      )}
    </div>
  );
}
