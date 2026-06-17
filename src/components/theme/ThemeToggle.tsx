'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  variant?: 'icon' | 'full' | 'switch';
}

export function ThemeToggle({ variant = 'icon' }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = theme === 'dark';

  if (variant === 'switch') {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {isDark ? <Moon className="w-4 h-4 text-violet-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
          <span className="text-[14px] font-medium" style={{ color: 'var(--wl-text-primary)' }}>
            {isDark ? 'Modo oscuro' : 'Modo claro'}
          </span>
        </div>
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none"
          style={{ background: isDark ? '#7C3AED' : 'rgba(17,24,39,0.15)' }}
          aria-label="Cambiar tema"
        >
          <span
            className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200"
            style={{ transform: isDark ? 'translateX(20px)' : 'translateX(0)' }}
          />
        </button>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <button
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl transition-colors hover:bg-[var(--wl-hover)]"
        style={{ color: 'var(--wl-text-secondary)' }}
      >
        {isDark
          ? <Sun className="w-4 h-4 text-amber-400" />
          : <Moon className="w-4 h-4 text-violet-400" />
        }
        <span className="text-[13px]">
          {isDark ? 'Cambiar a claro' : 'Cambiar a oscuro'}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors hover:bg-[var(--wl-hover)]"
      style={{ color: 'var(--wl-text-muted)' }}
      aria-label="Cambiar tema"
      title={isDark ? 'Cambiar a claro' : 'Cambiar a oscuro'}
    >
      {isDark
        ? <Sun className="w-[18px] h-[18px]" />
        : <Moon className="w-[18px] h-[18px]" />
      }
    </button>
  );
}
