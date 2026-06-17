'use client';

import { useState } from 'react';
import { Video, ChevronDown, Pencil, Bell, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
  } catch { return iso; }
}

const meetingStatusConfig: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Programada', color: 'bg-blue-500/15 text-blue-300 border-blue-500/20' },
  confirmed: { label: 'Confirmada', color: 'bg-green-500/15 text-green-300 border-green-500/20' },
  completed: { label: 'Realizada',  color: 'bg-green-500/15 text-green-300 border-green-500/20' },
  cancelled: { label: 'Cancelada',  color: 'bg-red-500/15 text-red-300 border-red-500/20' },
};

interface PortalMeetingCardProps {
  appointment: any;
  isManager?:  boolean;
  onDelete?:   (id: string) => void;
  onEdit?:     (apt: any) => void;
  onRemind?:   (id: string) => void;
}

export function PortalMeetingCard({ appointment, isManager = false, onDelete, onEdit, onRemind }: PortalMeetingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const status = appointment.status || 'pending';
  const cfg    = meetingStatusConfig[status] ?? meetingStatusConfig.pending;
  const isPast = new Date(appointment.date) < new Date();

  return (
    <div
      className={`rounded-xl overflow-hidden transition-all duration-200 cursor-pointer border ${
        expanded
          ? 'ring-1 ring-green-500/30 bg-green-500/[0.08] border-green-500/25'
          : 'bg-green-500/[0.04] border-green-500/15 hover:border-green-500/30'
      }`}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Video className={`h-4 w-4 shrink-0 ${isPast ? 'text-white/30' : 'text-green-400'}`} />
            <p className="text-sm font-medium text-white truncate">{appointment.name || 'Videollamada'}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}>
              {cfg.label}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-white/30 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
        {!expanded && (
          <p className="text-[11px] text-white/35 pl-6">{fmtDate(appointment.date)}</p>
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-[var(--wl-border)] pt-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/[0.03] rounded-lg p-2.5">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Fecha</p>
              <p className="text-xs text-[var(--wl-text-secondary)] font-medium">{fmtDate(appointment.date)}</p>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-2.5">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Hora</p>
              <p className="text-xs text-[var(--wl-text-secondary)] font-medium">
                {format(new Date(appointment.date), 'HH:mm', { locale: es })}
              </p>
            </div>
          </div>
          {appointment.notes && (
            <p className="text-xs text-[var(--wl-text-secondary)] leading-relaxed">{appointment.notes}</p>
          )}
          {appointment.meetUrl && (
            <a href={appointment.meetUrl} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-lg px-3 py-2 text-green-400 text-xs font-medium transition-colors w-fit">
              <Video className="w-3.5 h-3.5" />Unirse a la reunión
            </a>
          )}
          {isManager && (
            <div className="flex gap-2 pt-2 border-t border-white/[0.04]" onClick={e => e.stopPropagation()}>
              <button type="button" onClick={() => onEdit?.(appointment)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/[0.04] hover:bg-white/[0.08] border border-[var(--wl-border)] text-[var(--wl-text-secondary)] hover:text-white transition-colors">
                <Pencil className="w-3 h-3" />Editar
              </button>
              <button type="button" onClick={() => onRemind?.(appointment.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 transition-colors">
                <Bell className="w-3 h-3" />Recordatorio
              </button>
              <button type="button"
                onClick={() => { if (confirm('¿Eliminar ' + appointment.name + '?')) onDelete?.(appointment.id); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-colors">
                <Trash2 className="w-3 h-3" />Eliminar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
