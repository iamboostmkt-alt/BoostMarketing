'use client';

import { useEffect, useState } from 'react';

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Solo mostrar en PWA standalone o app nativa
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true
      || (window as any).Capacitor?.isNativePlatform?.();

    if (!isStandalone) {
      setVisible(false);
      return;
    }

    // Fade out después de 1.2s
    const t1 = setTimeout(() => setFadeOut(true), 1200);
    const t2 = setTimeout(() => setVisible(false), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center"
      style={{
        background: 'var(--wl-bg)',
        transition: 'opacity 0.4s ease',
        opacity: fadeOut ? 0 : 1,
        pointerEvents: fadeOut ? 'none' : 'all',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center justify-center w-20 h-20 rounded-[22px] mb-6"
        style={{
          background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
          boxShadow: '0 0 40px rgba(124,58,237,0.4), 0 0 80px rgba(124,58,237,0.15)',
        }}
      >
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
          <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle"
            fontSize="28" fontWeight="bold" fill="white" fontFamily="system-ui">
            W
          </text>
        </svg>
      </div>

      {/* Nombre */}
      <p className="text-[22px] font-semibold text-white tracking-tight">
        Weeklink
      </p>
      <p className="text-[13px] text-white/35 mt-1">
        Organiza tareas, clientes y proyectos
      </p>

      {/* Loader dots */}
      <div className="flex items-center gap-1.5 mt-10">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-violet-500/60"
            style={{
              animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
