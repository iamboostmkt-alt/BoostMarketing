'use client';
import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[PageError]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-5 text-center p-8">
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-red-400" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-[var(--wl-text-primary)] mb-2">Algo salió mal</h2>
        <p className="text-[var(--wl-text-muted)] text-sm max-w-md">
          Ocurrió un error inesperado. Puedes intentar recargar.
        </p>
      </div>
      <Button
        onClick={reset}
        className="bg-brand hover:bg-brand-dark text-white gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Reintentar
      </Button>
    </div>
  );
}
