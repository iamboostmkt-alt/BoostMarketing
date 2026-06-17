'use client';

import { useState } from 'react';
import { Eye, ChevronDown, User } from 'lucide-react';
import type { Activity } from '@/lib/types';

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
  } catch { return iso; }
}

const activityStatusConfig: Record<string, { label: string; color: string }> = {
  pending:     { label: 'Pendiente',   color: 'bg-amber-500/15 text-amber-300 border-amber-500/20' },
  in_progress: { label: 'En progreso', color: 'bg-blue-500/15 text-blue-300 border-blue-500/20' },
  completed:   { label: 'Completado',  color: 'bg-green-500/15 text-green-300 border-green-500/20' },
};

export function PortalActivityCard({ activity }: { activity: Activity }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = activityStatusConfig[activity.status] ?? activityStatusConfig.pending;

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
            <Eye className="h-4 w-4 text-brand-light shrink-0" />
            <p className="text-sm font-medium text-white truncate">{activity.title}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}>
              {cfg.label}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-white/30 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
        {!expanded && activity.description && (
          <p className="text-xs text-white/40 line-clamp-1 pl-6">{activity.description}</p>
        )}
        {!expanded && (
          <p className="text-[11px] text-white/30 pl-6">{fmtDate(activity.startDate)}</p>
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/[0.06] pt-3">
          {activity.description && (
            <p className="text-xs text-white/60 leading-relaxed">{activity.description}</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/[0.03] rounded-lg p-2.5">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Inicio</p>
              <p className="text-xs text-white/70 font-medium">{fmtDate(activity.startDate)}</p>
            </div>
            {activity.endDate && (
              <div className="bg-white/[0.03] rounded-lg p-2.5">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Fin</p>
                <p className="text-xs text-white/70 font-medium">{fmtDate(activity.endDate)}</p>
              </div>
            )}
          </div>
          {activity.createdBy && (
            <div className="flex items-center gap-2 pt-1">
              <User className="h-3.5 w-3.5 text-white/30" />
              <span className="text-xs text-white/50">
                Publicado por <span className="text-white/70 font-medium">{activity.createdBy.name || activity.createdBy.email}</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
