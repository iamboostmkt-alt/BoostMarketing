'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function BillingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[BillingError]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-3">
        <AlertTriangle className="w-6 h-6 text-red-400" />
      </div>
      <h2 className="text-base font-medium text-white mb-1">Error al cargar facturación</h2>
      <p className="text-sm text-[var(--wl-text-muted)] mb-5 max-w-xs">
        No se pudo cargar la sección. Por favor intenta de nuevo.
      </p>
      <button
        onClick={reset}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-[var(--wl-text-secondary)] hover:text-white text-sm transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Reintentar
      </button>
    </div>
  );
}
