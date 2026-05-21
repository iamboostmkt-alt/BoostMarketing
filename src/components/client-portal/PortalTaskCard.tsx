'use client';

import { useState } from 'react';
import { CheckSquare, ChevronDown, Flag, Trash2 } from 'lucide-react';
import { DeliverableHistory } from '@/components/client-portal/DeliverableHistory';
import TaskFeedbackButtons from '@/components/client-portal/TaskFeedbackButtons';
import type { Task } from '@/lib/types';

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
  } catch { return iso; }
}

const taskStatusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft:             { label: 'Borrador',       color: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',         icon: null },
  pending:           { label: 'Pendiente',       color: 'bg-amber-500/15 text-amber-300 border-amber-500/20',     icon: null },
  in_progress:       { label: 'En producción',   color: 'bg-blue-500/15 text-blue-300 border-blue-500/20',        icon: null },
  editing:           { label: 'En producción',   color: 'bg-blue-500/15 text-blue-300 border-blue-500/20',        icon: null },
  internal_review:   { label: 'Rev. interna',    color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/20',  icon: null },
  review:            { label: 'En revisión',     color: 'bg-purple-500/15 text-purple-300 border-purple-500/20',  icon: null },
  client_review:     { label: 'Por revisar',     color: 'bg-purple-500/15 text-purple-300 border-purple-500/20',  icon: null },
  changes_requested: { label: 'Cambios pedidos', color: 'bg-orange-500/15 text-orange-300 border-orange-500/20', icon: null },
  approved:          { label: 'Aprobado',        color: 'bg-green-500/15 text-green-300 border-green-500/20',     icon: null },
  scheduled:         { label: 'Programado',      color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',        icon: null },
  published:         { label: 'Publicado',       color: 'bg-teal-500/15 text-teal-300 border-teal-500/20',        icon: null },
  completed:         { label: 'Completado',      color: 'bg-green-500/15 text-green-300 border-green-500/20',     icon: null },
};

const priorityColor: Record<string, string> = {
  urgent: 'text-red-400', high: 'text-orange-400', medium: 'text-blue-400', low: 'text-emerald-400',
};
const priorityLabel: Record<string, string> = {
  urgent: 'Urgente', high: 'Alta', medium: 'Media', low: 'Baja',
};

interface PortalTaskCardProps {
  task:        Task;
  onFeedback?: () => void;
  onDelete?:   (id: string) => void;
}

export function PortalTaskCard({ task, onFeedback, onDelete }: PortalTaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const cfg = taskStatusConfig[task.status] ?? taskStatusConfig.pending;

  return (
    <div
      className={`glass-card rounded-xl overflow-hidden transition-all duration-200 cursor-pointer ${
        expanded ? 'ring-1 ring-brand/30' : 'hover:ring-1 hover:ring-white/10'
      }`}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <CheckSquare className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-sm font-medium text-white truncate">{task.title}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}>
              {cfg.label}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-white/30 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
        {!expanded && task.description && (
          <p className="text-xs text-white/40 line-clamp-1 pl-6">{task.description}</p>
        )}
        {!expanded && task.dueDate && (
          <p className="text-[11px] text-white/30 pl-6">Vence: {fmtDate(task.dueDate)}</p>
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/[0.06] pt-3">
          {task.description && (
            <p className="text-xs text-white/60 leading-relaxed">{task.description}</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            {task.dueDate && (
              <div className="bg-white/[0.03] rounded-lg p-2.5">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Vence</p>
                <p className="text-xs text-white/70 font-medium">{fmtDate(task.dueDate)}</p>
              </div>
            )}
            {task.priority && (
              <div className="bg-white/[0.03] rounded-lg p-2.5">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Prioridad</p>
                <p className={`text-xs font-medium flex items-center gap-1 ${priorityColor[task.priority] || 'text-white/50'}`}>
                  <Flag className="w-3 h-3" />
                  {priorityLabel[task.priority] || task.priority}
                </p>
              </div>
            )}
          </div>
          <DeliverableHistory taskId={task.id} />
          {onDelete && (
            <div className="pt-2 border-t border-white/[0.04]" onClick={e => e.stopPropagation()}>
              <button type="button"
                onClick={() => { if (confirm('¿Eliminar "' + task.title + '"?')) onDelete(task.id); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-colors">
                <Trash2 className="w-3 h-3" />Eliminar entrega
              </button>
            </div>
          )}
          {onFeedback && (
            <TaskFeedbackButtons
              taskId={task.id}
              taskTitle={task.title}
              deliverableStatus={(task as any).deliverableStatus}
              onSuccess={onFeedback}
            />
          )}
        </div>
      )}
    </div>
  );
}
