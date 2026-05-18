'use client';

import { useState, useMemo } from 'react';
import { format, isSameDay, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, CheckSquare, CheckCircle2, ChevronDown, Clock, Video, Pencil, Trash2, CalendarDays, Sparkles } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import type { Task, Activity, Appointment } from '@/lib/types';
import { statusColors, statusLabels, priorityColors, priorityLabels } from '@/lib/theme-maps';
import { dayLabel, sameLocalDay } from '@/components/calendar/calendar-utils';
function TaskAvatar({ u }: { u: { name: string | null; email: string; color: string; image?: string | null } | undefined }) {
  if (!u) return null;
  const initials = (u.name || u.email || 'U').split(/[\s@]/).map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <Avatar className="w-5 h-5">
      {u.image && <AvatarImage src={u.image} />}
      <AvatarFallback style={{ background: u.color }} className="text-[8px] text-white font-bold">{initials}</AvatarFallback>
    </Avatar>
  );
}
import AppointmentEditModal from '@/components/calendar/AppointmentEditModal';
import TaskForm from '@/components/dashboard/TaskForm';

interface DayModalProps {
  open:                boolean;
  onClose:             () => void;
  day:                 Date;
  tasks:               Task[];
  activities:          Activity[];
  appointments:        Appointment[];
  milestones?:         any[];
  isManager:           boolean;
  onEditTask:          (t: Task) => void;
  onNewTask:           () => void;
  onNewAppointment?:  () => void;
  onDeleteTask:        (id: string) => Promise<void>;
  onEditAppointment:   (apt: Appointment) => void;
  onDeleteAppointment: (id: string) => Promise<void>;
}

function CompletedTasksSection({ tasks }: { tasks: Task[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/[0.06] rounded-lg overflow-hidden">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/30 uppercase tracking-wider">
          <CheckSquare className="w-3 h-3 text-green-400/50" />
          Listas ({tasks.length})
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-white/20 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-1.5 p-2">
          {tasks.map(t => (
            <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-white/[0.02]">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400/60 shrink-0" />
              <span className="text-xs text-white/40 line-through truncate">{t.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface DayModalProps {
  open:                boolean;
  onClose:             () => void;
  day:                 Date;
  tasks:               Task[];
  activities:          Activity[];
  appointments:        Appointment[];
  milestones?:         any[];
  isManager:           boolean;
  onEditTask:          (t: Task) => void;
  onNewTask:           () => void;
  onNewAppointment?:  () => void;
  onDeleteTask:        (id: string) => Promise<void>;
  onEditAppointment:   (apt: Appointment) => void;
  onDeleteAppointment: (id: string) => Promise<void>;
}

function DayModal({
  open, onClose, day, tasks, activities, appointments, milestones = [], isManager,
  onEditTask, onNewTask, onDeleteTask, onEditAppointment, onDeleteAppointment, onNewAppointment,
}: DayModalProps) {
  const dayTasks = useMemo(
    () => tasks.filter((t) =>
      t.dueDate &&
      sameLocalDay(t.dueDate, day) &&
      t.status !== 'completed' &&
      t.status !== 'approved' &&
      (t as any).deliverableStatus !== 'approved'
    ),
    [tasks, day]
  );
  const dayCompletedTasks = useMemo(
    () => tasks.filter((t) =>
      t.dueDate &&
      sameLocalDay(t.dueDate, day) &&
      (t.status === 'completed' || t.status === 'approved' || (t as any).deliverableStatus === 'approved')
    ),
    [tasks, day]
  );
  const dayActivities = useMemo(
    () => activities.filter((a) => a.startDate && sameLocalDay(a.startDate, day)),
    [activities, day]
  );
  const dayAppointments = useMemo(
    () => appointments.filter((a) => sameLocalDay(a.date, day)),
    [appointments, day]
  );
  const dayMilestones = useMemo(
    () => milestones.filter((m) => { try { return isSameDay(new Date(m.date), day); } catch { return false; } }),
    [milestones, day]
  );
  const total = dayTasks.length + dayActivities.length + dayAppointments.length + dayMilestones.length;
  const label = dayLabel(day);
 
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#15151c] border-white/[0.06] text-white max-w-lg w-full max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand/15 flex items-center justify-center shrink-0">
              <CalendarDays className="w-4 h-4 text-brand-light" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-white leading-tight">
                {isToday(day) ? 'Hoy · ' : ''}{label}
              </DialogTitle>
              <p className="text-xs text-white/40 mt-0.5">
                    {total === 0 ? 'Sin elementos' : `${total} elemento${total !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
        </DialogHeader>
 
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4">
          {/* Tareas */}
          {dayTasks.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/40 uppercase tracking-wider">
                <CheckSquare className="w-3 h-3" />
                Tareas ({dayTasks.length})
              </div>
              {dayTasks.map((task) => (
                <div key={task.id}
                  className="w-full text-left bg-white/[0.03] border border-white/[0.05] rounded-lg p-3.5 hover:border-white/[0.10] hover:bg-white/[0.05] transition-colors group">
                  <div className="flex items-start gap-2.5">
                    <button type="button" className="flex-1 text-left"
                      onClick={() => { onEditTask(task); onClose(); }}>
                      <div className="flex items-start gap-2.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 mt-0.5 ${statusColors[task.status] || 'status-pending'}`}>
                          {statusLabels[task.status] || task.status}
                        </span>
                        <p className="text-sm font-medium text-white/90 leading-tight group-hover:text-white transition-colors">
                          {task.title}
                        </p>
                      </div>
                      {task.description && (
                        <p className="text-xs text-white/35 mt-2 line-clamp-2 pl-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2.5 pl-1 flex-wrap">
                        <span className={`text-[10px] font-medium ${priorityColors[task.priority] || 'text-white/40'}`}>
                          {priorityLabels[task.priority] || task.priority}
                        </span>
                        {task.dueDate && (
                          <div className="flex items-center gap-1 text-[10px] text-white/25">
                            <Clock className="w-2.5 h-2.5 shrink-0" />
                            {format(new Date(task.dueDate), 'd MMM yyyy', { locale: es })}
                          </div>
                        )}
                        {task.assignedUser && <TaskAvatar u={task.assignedUser} />}
                      </div>
                    </button>
                    {isManager && (
                      <button type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!confirm(`¿Eliminar "${task.title}"?`)) return;
                          await onDeleteTask(task.id);
                        }}
                        className="shrink-0 p-1.5 rounded-md text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="Eliminar tarea">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </section>
          )}
 
          {/* Tareas listas — colapsable */}
          {dayCompletedTasks.length > 0 && (
            <CompletedTasksSection tasks={dayCompletedTasks} />
          )}

          {/* Videollamadas */}
          {dayAppointments.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/40 uppercase tracking-wider">
                <Video className="w-3 h-3" />
                Videollamadas ({dayAppointments.length})
              </div>
              {dayAppointments.map((apt) => (
                <div key={apt.id} className="bg-green-500/[0.06] border border-green-500/20 rounded-lg p-3.5 group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 mt-0.5 bg-green-500/20 text-green-300">
                        {apt.status === 'confirmed' ? 'Confirmada' : apt.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                      </span>
                      <p className="text-sm font-medium text-white/90 truncate">{apt.name}</p>
                    </div>
                    {isManager && (
                      <button type="button"
                        onClick={async () => {
                          if (!confirm(`¿Eliminar videollamada con ${apt.name}?`)) return;
                          await onDeleteAppointment(apt.id);

                        }}
                        className="shrink-0 p-1 rounded text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-2 pl-1 flex-wrap">
                    <span className="text-[10px] text-white/25">{apt.email}</span>
                    <div className="flex items-center gap-1 text-[10px] text-white/25">
                      <Clock className="w-2.5 h-2.5" />
                      {format(new Date(apt.date), 'HH:mm', { locale: es })}
                    </div>
                  </div>
                  {(apt as any).notes && (
                    <p className="text-xs text-white/35 mt-2">{(apt as any).notes}</p>
                  )}
                  {isManager && (
                    <div className="mt-2.5">
                      <button type="button"
                        onClick={() => { onEditAppointment(apt); onClose(); }}
                        className="text-[10px] text-green-400/60 hover:text-green-400 flex items-center gap-1 transition-colors">
                        <Pencil className="w-3 h-3" /> Editar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}
 
          {/* Milestones */}
          {dayMilestones.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/40 uppercase tracking-wider">
                <span className="text-yellow-400">🏁</span>
                Milestones ({dayMilestones.length})
              </div>
              {dayMilestones.map((m) => (
                <div key={m.id} className="bg-yellow-500/[0.06] border border-yellow-500/20 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-white/90">{m.title}</p>
                    <span className="text-[10px] bg-yellow-500/20 text-yellow-300 rounded-full px-2 py-0.5 shrink-0">
                      {m.status === 'completed' ? 'Completado' : m.status === 'in_progress' ? 'En progreso' : m.status === 'delayed' ? 'Retrasado' : 'Próximo'}
                    </span>
                  </div>
                  {m.description && <p className="text-xs text-white/35 mt-1">{m.description}</p>}
                  {m.progress > 0 && (
                    <div className="mt-2">
                      <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                        <div className="h-full rounded-full bg-yellow-400/60" style={{ width: `${m.progress}%` }} />
                      </div>
                      <p className="text-[10px] text-white/30 mt-0.5">{m.progress}% completado</p>
                    </div>
                  )}
                  {m.client && <p className="text-[10px] text-white/25 mt-1">{m.client.name}</p>}
                </div>
              ))}
            </section>
          )}

          {total === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white/20" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/40">Sin elementos este dia</p>
                <p className="text-xs text-white/25 mt-0.5">No hay nada programado</p>
              </div>
            </div>
          )}
        </div>
 
        <div className="border-t border-white/[0.06] px-5 py-3 flex gap-2 shrink-0">
          <Button size="sm"
            className="bg-brand hover:bg-brand-dark text-white gap-1.5 text-xs h-8"
            onClick={() => { onNewTask(); onClose(); }}>
            <Plus className="w-3.5 h-3.5" />
            Tarea
          </Button>
          <Button size="sm"
            className="bg-white/[0.06] hover:bg-white/[0.10] text-white gap-1.5 text-xs h-8"
            onClick={() => { onNewAppointment && onNewAppointment(); onClose(); }}>
            <Video className="w-3.5 h-3.5" />
            Reunion
          </Button>
          <Button size="sm" variant="ghost"
            className="text-white/30 hover:text-white hover:bg-white/[0.06] text-xs h-8 ml-auto"
            onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
 
// Ã¢â€â‚¬Ã¢â€â‚¬ CalendarContent (main) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export default DayModal;
