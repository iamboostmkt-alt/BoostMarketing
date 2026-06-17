'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  variant?: 'icon' | 'switch';
}

export function ThemeToggle({ variant = 'icon' }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = theme !== 'light';

  if (variant === 'switch') {
    return (
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(124,58,237,0.10)' }}>
            {isDark
              ? <Moon className="w-4 h-4 text-violet-400" />
              : <Sun className="w-4 h-4 text-amber-500" />
            }
          </div>
          <div>
            <p className="text-[13px] font-medium text-white/85">
              {isDark ? 'Modo oscuro' : 'Modo claro'}
            </p>
            <p className="text-[11px] text-white/30">
              {isDark ? 'Interfaz oscura actual' : 'Interfaz clara (beta)'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="relative w-11 h-6 rounded-full transition-all duration-300 focus:outline-none shrink-0"
          style={{ background: isDark ? '#7C3AED' : 'rgba(255,255,255,0.15)' }}
        >
          <span
            className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300"
            style={{ transform: isDark ? 'translateX(20px)' : 'translateX(0)' }}
          />
        </button>
      </div>
    );
  }

  // icon variant — para TopNav
  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex items-center justify-center w-9 h-9 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
      aria-label="Cambiar tema"
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {isDark
        ? <Sun className="w-[18px] h-[18px]" />
        : <Moon className="w-[18px] h-[18px]" />
      }
    </button>
  );
}
