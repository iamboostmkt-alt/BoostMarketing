'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function dayLabel(day: Date): string {
  try {
    const label = format(day, "EEEE, d 'de' MMMM", { locale: es });
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return day.toLocaleDateString('es-MX', { weekday: 'long', month: 'long', day: 'numeric' });
  }
}

export function sameLocalDay(dateStr: string | Date, day: Date): boolean {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return (
    d.getFullYear() === day.getFullYear() &&
    d.getMonth()    === day.getMonth()    &&
    d.getDate()     === day.getDate()
  );
}

export function getTaskAvatar(
  u: { name: string | null; email: string; color: string; image?: string | null } | undefined
) {
  if (!u) return null;
  const initials = (u.name || u.email || 'U')
    .split(/[\s@]/).map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  return { initials, color: u.color, image: u.image };
}
