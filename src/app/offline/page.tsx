'use client';

import { useEffect, useState } from 'react';

function WeeklinkMark({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="9" fill="#7C3AED" />
      <path d="M8 11L13 21L16 15L19 21L24 11" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function OfflinePage() {
  const [retrying, setRetrying] = useState(false);

  const retry = async () => {
    setRetrying(true);
    try {
      await fetch('/api/health', { method: 'HEAD', cache: 'no-store' });
      window.location.href = '/dashboard';
    } catch {
      setTimeout(() => setRetrying(false), 2000);
    }
  };

  useEffect(() => {
    // Auto-retry cada 10s
    const interval = setInterval(async () => {
      try {
        await fetch('/api/health', { method: 'HEAD', cache: 'no-store' });
        window.location.href = '/dashboard';
      } catch { /* still offline */ }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'var(--wl-bg)' }}
    >
      <div className="flex flex-col items-center gap-6 text-center max-w-[300px]">
        {/* Logo con animación de pulso */}
        <div style={{ animation: 'pulse 2s ease-in-out infinite' }}>
          <WeeklinkMark size={64} />
        </div>

        <div>
          <h1 className="text-[20px] font-bold text-white mb-2">Sin conexión</h1>
          <p className="text-[14px] text-[var(--wl-text-muted)] leading-relaxed">
            Weeklink necesita internet para funcionar. Verifica tu conexión y vuelve a intentarlo.
          </p>
        </div>

        <button
          onClick={retry}
          disabled={retrying}
          className="flex items-center gap-2 rounded-[14px] px-6 py-3 text-[14px] font-semibold text-white transition-all disabled:opacity-60"
          style={{ background: '#7C3AED', boxShadow: '0 8px 24px rgba(124,58,237,0.25)' }}
        >
          {retrying ? (
            <>
              <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Reconectando...
            </>
          ) : (
            'Reintentar'
          )}
        </button>

        <p className="text-[11px] text-white/20">
          Intentando reconectar automáticamente...
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.95); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
