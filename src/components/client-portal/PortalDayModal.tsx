'use client';

import { Calendar, Video, Plus, Pencil, Trash2, User } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import type { Task } from '@/lib/types';
import { sameLocalDay } from '@/hooks/client-portal/useClientCalendar';
import TaskFeedbackButtons from '@/components/client-portal/TaskFeedbackButtons';

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
  } catch { return iso; }
}

function getTasksForDay(tasks: Task[], day: Date): Task[] {
  return tasks.filter((t) => {
    if (t.dueDate   && sameLocalDay(t.dueDate,   day)) return true;
    if (t.startDate && sameLocalDay(t.startDate, day)) return true;
    if (!t.dueDate && !t.startDate && t.createdAt && sameLocalDay(t.createdAt, day)) return true;
    return false;
  });
}

const taskStatusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft:             { label: 'Borrador',       color: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',        icon: null },
  pending:           { label: 'Pendiente',       color: 'bg-amber-500/15 text-amber-300 border-amber-500/20',    icon: null },
  in_progress:       { label: 'En producción',   color: 'bg-blue-500/15 text-blue-300 border-blue-500/20',       icon: null },
  editing:           { label: 'En producción',   color: 'bg-blue-500/15 text-blue-300 border-blue-500/20',       icon: null },
  internal_review:   { label: 'Rev. interna',    color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/20', icon: null },
  review:            { label: 'En revisión',     color: 'bg-purple-500/15 text-purple-300 border-purple-500/20', icon: null },
  client_review:     { label: 'Por revisar',     color: 'bg-purple-500/15 text-purple-300 border-purple-500/20', icon: null },
  changes_requested: { label: 'Cambios pedidos', color: 'bg-orange-500/15 text-orange-300 border-orange-500/20', icon: null },
  approved:          { label: 'Aprobado',        color: 'bg-green-500/15 text-green-300 border-green-500/20',    icon: null },
  scheduled:         { label: 'Programado',      color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',       icon: null },
  published:         { label: 'Publicado',       color: 'bg-teal-500/15 text-teal-300 border-teal-500/20',       icon: null },
  completed:         { label: 'Completado',      color: 'bg-green-500/15 text-green-300 border-green-500/20',    icon: null },
};

export interface DayModalProps {
  day:           Date | null;
  tasks:         Task[];
  appointments?: any[];
  isManager?:    boolean;
  onClose:       () => void;
  onDeleteTask?: (id: string) => void;
  onDeleteAppt?: (id: string) => void;
  onEditAppt?:   (apt: any | null) => void;
  onEditTask?:   (task: any | null) => void;
  onFeedback?:   () => void;
}

export function PortalDayModal({ day, tasks, appointments = [], isManager = false, onClose, onDeleteTask, onDeleteAppt, onEditAppt, onEditTask, onFeedback }: DayModalProps) {
  if (!day) return null;

  const dayTasks = getTasksForDay(tasks, day);
  const dayAppts = appointments.filter((a: any) => a.date && sameLocalDay(a.date, day));
  const hasItems = dayTasks.length > 0 || dayAppts.length > 0;
  const label    = format(day, "EEEE d 'de' MMMM", { locale: es });

  return (
    <Dialog open={!!day} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[var(--wl-surface)] border-[var(--wl-border)] text-white max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white capitalize">{label}</DialogTitle>
        </DialogHeader>

        {!hasItems ? (
          <div className="py-12 flex flex-col items-center gap-3 text-center">
            <Calendar className="w-10 h-10 text-white/15" />
            <p className="text-[var(--wl-text-muted)] text-sm">No hay elementos este día.</p>
          </div>
        ) : (
          <div className="space-y-4 mt-1">
            {dayTasks.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-[var(--wl-text-muted)] uppercase tracking-wider">Entregas ({dayTasks.length})</p>
                {dayTasks.map((task) => {
                  const cfg = taskStatusConfig[(task as any).deliverableStatus ?? task.status] ?? taskStatusConfig.pending;
                  return (
                    <div key={task.id} className="rounded-lg border border-[var(--wl-border)] bg-white/[0.02] p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-white">{task.title}</p>
                        <span className={`flex-shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-xs text-[var(--wl-text-muted)] line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-[11px] text-white/35 flex-wrap">
                        {task.dueDate && <span>Vence: {fmtDate(task.dueDate)}</span>}
                        {task.priority && (
                          <span className={`font-medium ${
                            task.priority === 'urgent' ? 'text-red-400' :
                            task.priority === 'high'   ? 'text-orange-400' :
                            task.priority === 'medium' ? 'text-blue-400' : 'text-emerald-400'
                          }`}>
                            {task.priority === 'urgent' ? 'Urgente' : task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                          </span>
                        )}
                        {task.assignedUser && isManager && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {task.assignedUser.name || task.assignedUser.email}
                          </span>
                        )}
                      </div>
                      {isManager && (
                        <div className="flex gap-2 pt-1 border-t border-white/[0.04]">
                          <button type="button" onClick={() => { onEditTask?.(task); onClose(); }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-white/[0.04] hover:bg-white/[0.08] border border-[var(--wl-border)] text-[var(--wl-text-secondary)] hover:text-white transition-colors">
                            <Pencil className="w-3 h-3" /> Editar
                          </button>
                          <button type="button" onClick={() => { if (confirm('¿Eliminar "' + task.title + '"?')) { onDeleteTask?.(task.id); } }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-colors">
                            <Trash2 className="w-3 h-3" /> Eliminar
                          </button>
                        </div>
                      )}
                      {!isManager && onFeedback && (
                        <TaskFeedbackButtons
                          taskId={task.id}
                          taskTitle={task.title}
                          deliverableStatus={(task as any).deliverableStatus}
                          onSuccess={() => { onFeedback(); onClose(); }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {dayAppts.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-[var(--wl-text-muted)] uppercase tracking-wider">Videollamadas ({dayAppts.length})</p>
                {dayAppts.map((apt: any) => (
                  <div key={apt.id} className="rounded-lg border border-green-500/20 bg-green-500/[0.04] p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Video className="w-3.5 h-3.5 text-green-400 shrink-0" />
                      <p className="text-sm font-medium text-white">{apt.name}</p>
                      <span className="ml-auto text-[10px] bg-green-500/20 text-green-300 rounded-full px-2 py-0.5">
                        {apt.status === 'confirmed' ? 'Confirmada' : apt.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-white/35 pl-5">
                      <span>{format(new Date(apt.date), 'HH:mm', { locale: es })}</span>
                      {apt.notes && <span className="truncate">{apt.notes}</span>}
                    </div>
                    {apt.meetUrl && (
                      <a href={apt.meetUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 ml-5 text-[11px] text-green-400 hover:text-green-300 transition-colors w-fit">
                        <Video className="w-3 h-3" /> Unirse a la reunión
                      </a>
                    )}
                    {isManager && (
                      <div className="flex gap-2 pt-1 border-t border-white/[0.04]">
                        <button type="button" onClick={() => { onEditAppt?.(apt); onClose(); }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-white/[0.04] hover:bg-white/[0.08] border border-[var(--wl-border)] text-[var(--wl-text-secondary)] hover:text-white transition-colors">
                          <Pencil className="w-3 h-3" /> Editar
                        </button>
                        <button type="button" onClick={() => { if (confirm('¿Eliminar "' + apt.name + '"?')) { onDeleteAppt?.(apt.id); onClose(); } }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-colors">
                          <Trash2 className="w-3 h-3" /> Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t border-[var(--wl-border)] mt-2 flex-wrap">
          <button type="button" onClick={() => { onEditTask?.(null); onClose(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand/15 hover:bg-brand/25 border border-brand/25 text-brand-light transition-colors">
            <Plus className="w-3.5 h-3.5" />
            {isManager ? 'Nueva entrega' : 'Solicitar tarea'}
          </button>
          <button type="button" onClick={() => { onEditAppt?.(null); onClose(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/15 hover:bg-green-500/25 border border-green-500/25 text-green-300 transition-colors">
            <Video className="w-3.5 h-3.5" />
            {isManager ? 'Agendar reunión' : 'Solicitar reunión'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
