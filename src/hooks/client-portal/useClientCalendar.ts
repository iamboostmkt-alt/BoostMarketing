// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/client-portal/useClientCalendar.ts
//
// Transforma deliverables + appointments en eventos de calendario cliente.
// Usa comparación local de fecha (sin isSameDay) para evitar bugs de timezone.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import type {
  PortalDeliverable,
  PortalAppointment,
  PortalCalendarEvent,
} from '@/lib/client-portal/types';

// Compara solo año/mes/día ignorando timezone (fix bug UTC-6 México)
export function sameLocalDay(iso: string | Date, day: Date): boolean {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return (
    d.getFullYear() === day.getFullYear() &&
    d.getMonth()    === day.getMonth()    &&
    d.getDate()     === day.getDate()
  );
}

// Devuelve ISO string de solo fecha 'YYYY-MM-DD' sin conversión de timezone
export function toLocalDateString(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface UseClientCalendarOptions {
  deliverables: PortalDeliverable[];
  appointments: PortalAppointment[];
  selectedDay:  Date;
}

interface UseClientCalendarResult {
  /** Todos los eventos del mes (para pintar puntitos) */
  allEvents:       PortalCalendarEvent[];
  /** Solo eventos del día seleccionado */
  selectedDayEvents: PortalCalendarEvent[];
  /** Función auxiliar para saber si un día tiene eventos */
  getDayEvents:    (day: Date) => PortalCalendarEvent[];
}

export function useClientCalendar({
  deliverables,
  appointments,
  selectedDay,
}: UseClientCalendarOptions): UseClientCalendarResult {

  const allEvents = useMemo<PortalCalendarEvent[]>(() => {
    const events: PortalCalendarEvent[] = [];

    for (const d of deliverables) {
      if (!d.dueDate) continue;
      events.push({
        id:     d.id,
        type:   'deliverable',
        title:  d.title,
        date:   toLocalDateString(d.dueDate),
        status: d.status,
        color:  d.status === 'completed' || d.status === 'approved'
          ? 'green'
          : d.status === 'client_review'
            ? 'purple'
            : 'amber',
      });
    }

    for (const a of appointments) {
      if (!a.date) continue;
      events.push({
        id:     a.id,
        type:   'appointment',
        title:  a.name,
        date:   toLocalDateString(a.date),
        status: a.status,
        color:  'blue',
      });
    }

    return events;
  }, [deliverables, appointments]);

  const getDayEvents = useMemo(
    () => (day: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      const dayStr = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
      return allEvents.filter((e) => e.date === dayStr);
    },
    [allEvents]
  );

  const selectedDayEvents = useMemo(
    () => getDayEvents(selectedDay),
    [getDayEvents, selectedDay]
  );

  return { allEvents, selectedDayEvents, getDayEvents };
}
