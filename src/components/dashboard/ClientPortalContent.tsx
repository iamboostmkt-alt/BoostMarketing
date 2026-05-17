'use client';

import { useState, useEffect, useMemo } from 'react';
import { MANAGER_ROLES } from '@/core/constants/roles';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, ChevronRight, Calendar, CheckSquare, Clock,
  CheckCircle2, Loader2, AlertCircle, User, Building2, Eye, MessageCircle, Video, Plus,
  ChevronDown, Flag, Pencil, Trash2, Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isToday, addMonths, subMonths, isSameMonth,
} from 'date-fns';
import { es } from 'date-fns/locale';
import ChatContent from '@/components/dashboard/ChatContent';
import { MeetingDialog, TeamUser } from '@/components/dashboard/MeetingsTab';
import TaskForm from '@/components/dashboard/TaskForm';
import { ReportButton } from '@/components/dashboard/ReportButton';
import { DeliverableHistory } from '@/components/client-portal/DeliverableHistory';
import type { Task, Activity } from '@/lib/types';

// ── Nuevo data layer del portal ──────────────────────────────────────────────
import { useClientPortal } from '@/hooks/client-portal/useClientPortal';
import { useClientCalendar, sameLocalDay } from '@/hooks/client-portal/useClientCalendar';
import { toast } from 'sonner';
import TaskFeedbackButtons from '@/components/client-portal/TaskFeedbackButtons';
import PortalAppointmentEditModal from '@/components/client-portal/PortalAppointmentEditModal';

// ── Constants ─────────────────────────────────────────────────────────────────

const DAY_NAMES   = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

const taskStatusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:          { label: 'Pendiente',    color: 'bg-amber-500/15 text-amber-300 border-amber-500/20',   icon: <Clock        className="h-3 w-3" /> },
  in_progress:      { label: 'En progreso',  color: 'bg-blue-500/15 text-blue-300 border-blue-500/20',     icon: <Clock        className="h-3 w-3" /> },
  editing:          { label: 'En progreso',  color: 'bg-blue-500/15 text-blue-300 border-blue-500/20',     icon: <Clock        className="h-3 w-3" /> },
  review:           { label: 'En revisión',  color: 'bg-blue-500/15 text-blue-300 border-blue-500/20',     icon: <Clock        className="h-3 w-3" /> },
  client_review:    { label: 'Por revisar',  color: 'bg-purple-500/15 text-purple-300 border-purple-500/20', icon: <Eye        className="h-3 w-3" /> },
  changes_requested:{ label: 'Con cambios',  color: 'bg-orange-500/15 text-orange-300 border-orange-500/20', icon: <Clock      className="h-3 w-3" /> },
  approved:         { label: 'Aprobado',     color: 'bg-green-500/15 text-green-300 border-green-500/20',  icon: <CheckCircle2 className="h-3 w-3" /> },
  completed:        { label: 'Completado',   color: 'bg-green-500/15 text-green-300 border-green-500/20',  icon: <CheckCircle2 className="h-3 w-3" /> },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string | null | undefined, email?: string) {
  return ((name || email || 'U')).split(/[\s@]/).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  try { return format(new Date(iso), "d 'de' MMM yyyy", { locale: es }); } catch { return iso; }
}

function getTasksForDay(tasks: Task[], day: Date): Task[] {
  return tasks.filter((t) => {
    if (t.dueDate   && sameLocalDay(t.dueDate,   day)) return true;
    if (t.startDate && sameLocalDay(t.startDate, day)) return true;
    // Fallback: si no tiene fecha, usar createdAt para que aparezca en el día de creación
    if (!t.dueDate && !t.startDate && t.createdAt && sameLocalDay(t.createdAt, day)) return true;
    return false;
  });
}

// ── DayModal ──────────────────────────────────────────────────────────────────

interface DayModalProps {
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

function DayModal({ day, tasks, appointments = [], isManager = false, onClose, onDeleteTask, onDeleteAppt, onEditAppt, onEditTask, onFeedback }: DayModalProps) {
  if (!day) return null;

  const dayTasks = getTasksForDay(tasks, day);
  const dayAppts = appointments.filter((a: any) =>
    a.date && sameLocalDay(a.date, day)
  );
  const hasItems = dayTasks.length > 0 || dayAppts.length > 0;
  const label    = format(day, "EEEE d 'de' MMMM", { locale: es });

  return (
    <Dialog open={!!day} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#15151c] border-white/[0.08] text-white max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white capitalize">{label}</DialogTitle>
        </DialogHeader>

        {!hasItems ? (
          <div className="py-12 flex flex-col items-center gap-3 text-center">
            <Calendar className="w-10 h-10 text-white/15" />
            <p className="text-white/40 text-sm">No hay elementos este día.</p>
          </div>
        ) : (
          <div className="space-y-4 mt-1">
            {dayTasks.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Entregas ({dayTasks.length})</p>
                {dayTasks.map((task) => {
                  const cfg = taskStatusConfig[(task as any).deliverableStatus ?? task.status] ?? taskStatusConfig.pending;
                  return (
                    <div key={task.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-white">{task.title}</p>
                        <span className={`flex-shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}>
                          {cfg.icon}{cfg.label}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-xs text-white/40 line-clamp-2">{task.description}</p>
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
                        {task.assignedUser && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {task.assignedUser.name || task.assignedUser.email}
                          </span>
                        )}
                      </div>
                      {isManager && (
                        <div className="flex gap-2 pt-1 border-t border-white/[0.04]">
                          <button type="button" onClick={() => { onEditTask?.(task); onClose(); }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/60 hover:text-white transition-colors">
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
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Videollamadas ({dayAppts.length})</p>
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
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/60 hover:text-white transition-colors">
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
        <div className="flex gap-2 pt-2 border-t border-white/[0.06] mt-2 flex-wrap">
          {isManager ? (
            <>
              <button type="button"
                onClick={() => { onEditTask?.(null); onClose(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand/15 hover:bg-brand/25 border border-brand/25 text-brand-light transition-colors">
                <Plus className="w-3.5 h-3.5" />
                Nueva entrega
              </button>
              <button type="button"
                onClick={() => { onEditAppt?.(null); onClose(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/15 hover:bg-green-500/25 border border-green-500/25 text-green-300 transition-colors">
                <Video className="w-3.5 h-3.5" />
                Agendar reunión
              </button>
            </>
          ) : (
            <>
              <button type="button"
                onClick={() => { onEditTask?.(null); onClose(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand/15 hover:bg-brand/25 border border-brand/25 text-brand-light transition-colors">
                <Plus className="w-3.5 h-3.5" />
                Solicitar tarea
              </button>
              <button type="button"
                onClick={() => { onEditAppt?.(null); onClose(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/15 hover:bg-green-500/25 border border-green-500/25 text-green-300 transition-colors">
                <Video className="w-3.5 h-3.5" />
                Solicitar reunión
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── PortalCalendar ────────────────────────────────────────────────────────────

interface CalendarProps {
  tasks:         Task[];
  appointments?: any[];
  onSelectDay:   (day: Date) => void;
  getDayEvents?: (day: Date) => import('@/lib/client-portal/types').PortalCalendarEvent[];
}

function PortalCalendar({ tasks, appointments = [], onSelectDay, getDayEvents }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd   = endOfMonth(currentMonth);
    const calStart   = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd     = endOfWeek(monthEnd,     { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const monthLabel = `${MONTH_NAMES[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm"
            className="h-8 w-8 p-0 text-white/50 hover:text-white hover:bg-white/[0.06]"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm"
            className="h-8 px-2.5 text-xs text-white/50 hover:text-white hover:bg-white/[0.06]"
            onClick={() => setCurrentMonth(new Date())}>
            Hoy
          </Button>
          <Button variant="ghost" size="sm"
            className="h-8 w-8 p-0 text-white/50 hover:text-white hover:bg-white/[0.06]"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {DAY_NAMES.map((name) => (
          <div key={name} className="text-center text-[11px] font-medium text-white/30 py-2">{name}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayTasks       = getTasksForDay(tasks, day);
          const dayAppts       = appointments.filter((a: any) => a.date && sameLocalDay(a.date, day));
          const calEvents      = getDayEvents ? getDayEvents(day) : [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const today          = isToday(day);
          const hasItems       = (getDayEvents ? calEvents.length > 0 : dayTasks.length > 0 || dayAppts.length > 0);

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => { if (isCurrentMonth) onSelectDay(day); }}
              className={`
                relative flex flex-col items-center justify-center min-h-[52px] md:min-h-[64px] rounded-lg transition-all border
                ${isCurrentMonth ? 'text-white/80' : 'text-white/15 cursor-default'}
                ${today ? 'border-brand/40 bg-brand/[0.06]' : ''}
                ${isCurrentMonth && !today && dayAppts.length > 0 && dayTasks.length === 0 ? 'border-green-500/30 bg-green-500/[0.03]' : ''}
                ${isCurrentMonth && !today && dayAppts.length > 0 && dayTasks.length > 0 ? 'border-green-500/20' : ''}
                ${isCurrentMonth && !today && dayAppts.length === 0 ? 'border-transparent hover:bg-white/[0.03] hover:border-white/[0.06]' : ''}
              `}
            >
              <span className={`text-sm font-medium ${today ? 'text-brand-light' : ''}`}>
                {format(day, 'd')}
              </span>

              {hasItems && isCurrentMonth && (
                <div className="flex items-center gap-0.5 mt-0.5 flex-wrap justify-center max-w-[40px]">
                  {getDayEvents
                    ? calEvents.slice(0, 5).map((e, i) => (
                        <span key={i} className={`w-1.5 h-1.5 rounded-full ${
                          e.color === 'green'  ? 'bg-green-400'  :
                          e.color === 'blue'   ? 'bg-blue-400'   :
                          e.color === 'purple' ? 'bg-purple-400' :
                          'bg-amber-400'
                        }`} />
                      ))
                    : <>
                        {dayTasks.slice(0, 3).map((t, i) => (
                          <span key={`t${i}`} className={`w-1.5 h-1.5 rounded-full ${
                            t.status === 'completed' || (t as any).deliverableStatus === 'approved' ? 'bg-green-400' : 'bg-amber-400'
                          }`} />
                        ))}
                        {dayAppts.slice(0, 2).map((_a, i) => (
                          <span key={`a${i}`} className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        ))}
                      </>
                  }
                  {calEvents.length > 5 && (
                    <span className="text-[8px] text-white/30">+{calEvents.length - 5}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4 pt-1 border-t border-white/[0.04]">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          <span className="text-[11px] text-white/30">Tareas pendientes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
          <span className="text-[11px] text-white/30">Completadas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
          <span className="text-[11px] text-white/30">Reuniones</span>
        </div>
      </div>
    </div>
  );
}

// ── TaskCard ──────────────────────────────────────────────────────────────────

function TaskCard({ task, onFeedback, onDelete }: { task: Task; onFeedback?: () => void; onDelete?: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = taskStatusConfig[task.status] ?? taskStatusConfig.pending;
  const priorityColor: Record<string, string> = {
    urgent: 'text-red-400', high: 'text-orange-400', medium: 'text-blue-400', low: 'text-emerald-400',
  };
  const priorityLabel: Record<string, string> = {
    urgent: 'Urgente', high: 'Alta', medium: 'Media', low: 'Baja',
  };
  return (
    <div
      className={`glass-card rounded-xl overflow-hidden transition-all duration-200 cursor-pointer ${expanded ? 'ring-1 ring-brand/30' : 'hover:ring-1 hover:ring-white/10'}`}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <CheckSquare className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-sm font-semibold text-white truncate">{task.title}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}>
              {cfg.icon}{cfg.label}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-white/30 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
        {!expanded && task.description && (
          <p className="text-xs text-white/45 line-clamp-1 pl-6">{task.description}</p>
        )}
        {!expanded && (
          <div className="flex flex-wrap items-center gap-x-3 pl-6 text-[11px] text-white/35">
            {task.dueDate && <span>Vence: {fmtDate(task.dueDate)}</span>}
          </div>
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
                <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium mb-0.5">Vence</p>
                <p className="text-xs text-white/70 font-medium">{fmtDate(task.dueDate)}</p>
              </div>
            )}
            {task.priority && (
              <div className="bg-white/[0.03] rounded-lg p-2.5">
                <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium mb-0.5">Prioridad</p>
                <p className={`text-xs font-medium flex items-center gap-1 ${priorityColor[task.priority] || 'text-white/50'}`}>
                  <Flag className="w-3 h-3" />
                  {priorityLabel[task.priority] || task.priority}
                </p>
              </div>
            )}
          </div>
          {task.assignedUser && (
            <div className="flex items-center gap-2 pt-1">
              <User className="h-3.5 w-3.5 text-white/30" />
              <span className="text-xs text-white/50">
                Asignado a <span className="text-white/70 font-medium">{task.assignedUser.name || task.assignedUser.email}</span>
              </span>
            </div>
          )}
          {onDelete && (
            <div className="pt-2 border-t border-white/[0.04] mt-1" onClick={e => e.stopPropagation()}>
              <button type="button"
                onClick={() => { if (confirm('¿Eliminar "' + task.title + '"?')) onDelete(task.id); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-colors">
                <Trash2 className="w-3 h-3" />
                Eliminar entrega
              </button>
            </div>
          )}
          {expanded && (
            <DeliverableHistory taskId={task.id} />
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

// ── ActivityCard ──────────────────────────────────────────────────────────────

const activityStatusConfig: Record<string, { label: string; color: string }> = {
  pending:     { label: 'Pendiente',   color: 'bg-amber-500/15 text-amber-300 border-amber-500/20' },
  in_progress: { label: 'En progreso', color: 'bg-blue-500/15 text-blue-300 border-blue-500/20' },
  completed:   { label: 'Completado',  color: 'bg-green-500/15 text-green-300 border-green-500/20' },
};

function ActivityCard({ activity }: { activity: Activity }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = activityStatusConfig[activity.status] ?? activityStatusConfig.pending;
  return (
    <div
      className={`rounded-xl overflow-hidden transition-all duration-200 cursor-pointer border ${expanded ? 'ring-1 ring-green-500/30 bg-green-500/[0.08] border-green-500/25' : 'bg-green-500/[0.04] border-green-500/15 hover:border-green-500/30'}`}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Eye className="h-4 w-4 text-brand-light shrink-0" />
            <p className="text-sm font-semibold text-white truncate">{activity.title}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}>
              {cfg.label}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-white/30 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
        {!expanded && activity.description && (
          <p className="text-xs text-white/45 line-clamp-1 pl-6">{activity.description}</p>
        )}
        {!expanded && (
          <p className="text-[11px] text-white/35 pl-6">{fmtDate(activity.startDate)}</p>
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/[0.06] pt-3">
          {activity.description && (
            <p className="text-xs text-white/60 leading-relaxed">{activity.description}</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/[0.03] rounded-lg p-2.5">
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium mb-0.5">Inicio</p>
              <p className="text-xs text-white/70 font-medium">{fmtDate(activity.startDate)}</p>
            </div>
            {activity.endDate && (
              <div className="bg-white/[0.03] rounded-lg p-2.5">
                <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium mb-0.5">Fin</p>
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

// ── MeetingCard ───────────────────────────────────────────────────────────────

const meetingStatusConfig: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Programada', color: 'bg-blue-500/15 text-blue-300 border-blue-500/20' },
  confirmed: { label: 'Confirmada', color: 'bg-green-500/15 text-green-300 border-green-500/20' },
  completed: { label: 'Realizada',  color: 'bg-green-500/15 text-green-300 border-green-500/20' },
  cancelled: { label: 'Cancelada',  color: 'bg-red-500/15 text-red-300 border-red-500/20' },
};

function MeetingCard({ appointment, isManager = false, onDelete, onEdit, onRemind }: { appointment: any; isManager?: boolean; onDelete?: (id: string) => void; onEdit?: (apt: any) => void; onRemind?: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const status = appointment.status || 'pending';
  const cfg    = meetingStatusConfig[status] ?? meetingStatusConfig.pending;
  const isPast = new Date(appointment.date) < new Date();

  return (
    <div
      className={`rounded-xl overflow-hidden transition-all duration-200 cursor-pointer border ${expanded ? 'ring-1 ring-green-500/30 bg-green-500/[0.08] border-green-500/25' : 'bg-green-500/[0.04] border-green-500/15 hover:border-green-500/30'}`}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Video className={`h-4 w-4 shrink-0 ${isPast ? 'text-white/30' : 'text-green-400'}`} />
            <p className="text-sm font-semibold text-white truncate">{appointment.name || 'Videollamada'}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}>
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
        <div className="px-4 pb-4 space-y-3 border-t border-white/[0.06] pt-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/[0.03] rounded-lg p-2.5">
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium mb-0.5">Fecha</p>
              <p className="text-xs text-white/70 font-medium">{fmtDate(appointment.date)}</p>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-2.5">
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium mb-0.5">Hora</p>
              <p className="text-xs text-white/70 font-medium">
                {format(new Date(appointment.date), 'HH:mm', { locale: es })}
              </p>
            </div>
          </div>
          {appointment.notes && (
            <p className="text-xs text-white/60 leading-relaxed">{appointment.notes}</p>
          )}
          {appointment.meetUrl && (
            <a
              href={appointment.meetUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-lg px-3 py-2 text-green-400 text-xs font-medium transition-colors w-fit"
            >
              <Video className="w-3.5 h-3.5" />
              Unirse a la reunión
            </a>
          )}
          {isManager && (
            <div className="flex gap-2 pt-2 border-t border-white/[0.04] mt-2" onClick={e => e.stopPropagation()}>
              <button type="button"
                onClick={() => onEdit?.(appointment)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/60 hover:text-white transition-colors">
                <Pencil className="w-3 h-3" />
                Editar
              </button>
              <button type="button"
                onClick={() => onRemind?.(appointment.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 hover:text-blue-300 transition-colors">
                <Bell className="w-3 h-3" />
                Recordatorio
              </button>
              <button type="button"
                onClick={() => { if (confirm("¿Eliminar " + appointment.name + "?")) onDelete?.(appointment.id); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-colors">
                <Trash2 className="w-3 h-3" />
                Eliminar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── ProgressBar ───────────────────────────────────────────────────────────────

function ProgressBar({ total, completed }: { total: number; completed: number }) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-white/50">
        <span>Progreso general</span>
        <span className="font-semibold text-white/80">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand to-brand-light transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-white/30">{completed} de {total} ítems completados</p>
    </div>
  );
}

// ── ProjectTimeline ───────────────────────────────────────────────────────────

function ProjectTimeline({ tasks, appointments, milestones = [], isManager = false, onAddMilestone, onEditMilestone, onDeleteMilestone }: { tasks: Task[]; appointments: any[]; milestones?: any[]; isManager?: boolean; onAddMilestone?: () => void; onEditMilestone?: (id: string) => void; onDeleteMilestone?: (id: string) => void }) {
  const now = new Date();
  const events = [
    ...tasks.filter(t => t.dueDate).map(t => ({
      id: t.id, date: new Date(t.dueDate!), title: t.title,
      type: 'task', status: t.status,
      isPast: new Date(t.dueDate!) < now,
    })),
    ...appointments.map(a => ({
      id: a.id, date: new Date(a.date), title: 'Videollamada: ' + a.name,
      type: 'appointment', status: a.status,
      isPast: new Date(a.date) < now,
    })),
    ...milestones.map(m => ({
      id: m.id, date: new Date(m.date), title: '🏁 ' + m.title,
      type: 'milestone', status: m.status,
      isPast: new Date(m.date) < now,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 12);

  if (events.length === 0 && milestones.length === 0) return null;

  const pendingEvents = events.filter(e => !e.isPast && e.status !== 'completed' && e.status !== 'approved');

  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-5 rounded-full bg-brand" />
          <h3 className="text-sm font-semibold text-white">Timeline del proyecto</h3>
        </div>
        {isManager && onAddMilestone && (
          <button type="button" onClick={onAddMilestone}
            className="flex items-center gap-1 text-[11px] text-yellow-400 hover:text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 rounded-md px-2 py-1 transition-colors">
            <Plus className="w-3 h-3" />Milestone
          </button>
        )}
      </div>
      <div className="relative">
        <div className="absolute left-3.5 top-2 bottom-2 w-px bg-white/[0.06]" />
        <div className="space-y-1">
          {events.map((event, i) => {
            const isCompleted = event.status === 'completed' || event.status === 'approved' || (event.type === 'appointment' && event.isPast);
            const isNext      = !isCompleted && pendingEvents[0]?.id === event.id;
            return (
              <div key={event.id} className="flex items-start gap-4 pl-1">
                <div className="relative z-10 mt-1.5 shrink-0">
                  {isCompleted ? (
                    <div className="w-5 h-5 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-green-400" />
                    </div>
                  ) : isNext ? (
                    <div className="w-5 h-5 rounded-full bg-brand/20 border border-brand/60 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                    </div>
                  ) : event.type === 'milestone' ? (
                    <div className="w-5 h-5 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center">
                      <span className="text-[8px]">🏁</span>
                    </div>
                  ) : event.type === 'appointment' ? (
                    <div className="w-5 h-5 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                      <Video className="w-2.5 h-2.5 text-green-400" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-white/[0.04] border border-white/[0.10] flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                    </div>
                  )}
                </div>
                <div className={`flex-1 ${i === events.length - 1 ? 'pb-0' : 'pb-4'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-tight ${isCompleted ? 'text-white/40 line-through' : isNext ? 'text-white font-medium' : 'text-white/70'}`}>
                      {event.title}
                    </p>
                    {isNext && <span className="text-[10px] bg-brand/20 text-brand-light px-2 py-0.5 rounded-full shrink-0">Siguiente</span>}
                  </div>
                  <p className={`text-[11px] mt-0.5 ${isCompleted ? 'text-white/25' : 'text-white/40'}`}>
                    {format(event.date, "d 'de' MMM yyyy", { locale: es })}
                  </p>
                  {isManager && event.type === 'milestone' && (
                    <div className="flex gap-1.5 mt-1.5">
                      <button type="button" onClick={() => onEditMilestone?.(event.id)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white/40 hover:text-white transition-colors">
                        <Pencil className="w-2.5 h-2.5" /> Editar
                      </button>
                      <button type="button" onClick={() => onDeleteMilestone?.(event.id)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-colors">
                        <Trash2 className="w-2.5 h-2.5" /> Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface ClientSummary { id: string; name: string; company: string; email: string; }

export default function ClientPortalContent() {
  const { data: session } = useSession();
  const router            = useRouter();
  const currentUserRole   = (session?.user as { role?: string })?.role ?? 'CLIENT';
  const isManager         = MANAGER_ROLES.includes(currentUserRole as any);

  // ── Estado UI ────────────────────────────────────────────────────────────
  const [previewClientId, setPreviewClientId] = useState<string>('');
  const [clients,         setClients]         = useState<ClientSummary[]>([]);
  const [selectedDay,     setSelectedDay]     = useState<Date | null>(null);
  const [formDate,        setFormDate]        = useState<Date | null>(null);
  const [meetingOpen,     setMeetingOpen]     = useState(false);
  const [meetingTeam,     setMeetingTeam]     = useState<TeamUser[]>([]);
  const [requestOpen,     setRequestOpen]     = useState(false);
  const [portalTaskOpen,  setPortalTaskOpen]  = useState(false);
  const [requestDate,     setRequestDate]     = useState('');
  const [requestNotes,    setRequestNotes]    = useState('');
  const [requestSaving,   setRequestSaving]   = useState(false);
  const [activeTab,       setActiveTab]       = useState<'all' | 'tasks'>('all');
  const [selectMode,      setSelectMode]      = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [selectedApptIds, setSelectedApptIds] = useState<Set<string>>(new Set());
  const [deletingMultiple, setDeletingMultiple] = useState(false);
  const [editingAppt,     setEditingAppt]     = useState<any>(null);
  const [editingTask,     setEditingTask]     = useState<any>(null);
  const [apptEditOpen,    setApptEditOpen]    = useState(false);
  const [milestoneOpen,  setMilestoneOpen]  = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<any>(null);
  const [agencyWhatsapp, setAgencyWhatsapp] = useState("521063469");
  useEffect(() => {
    fetch("/api/cms/settings").then(r => r.json()).then(d => {
      if (d.settings?.whatsapp) setAgencyWhatsapp(d.settings.whatsapp);
    }).catch(() => {});
  }, []);
  const [milestoneForm,  setMilestoneForm]  = useState({
    title: "", description: "", date: "", type: "other",
    status: "upcoming", progress: 0, responsibleId: "",
    visibleToClient: true, comments: "",
  });

  // ── Data layer (hook limpio) ─────────────────────────────────────────────
  const {
    client, deliverables, appointments: rawAppointments, activities,
    loading, error, noClient, refetch, refetchSilent, milestones,
  } = useClientPortal({ isManager, previewClientId });

  // Estado local de appointments para updates sin refetch
  const [localAppointments, setLocalAppointments] = useState<any[]>([]);
  useEffect(() => { setLocalAppointments(rawAppointments); }, [rawAppointments]);
  const appointments = localAppointments;

  // Estado local de deliverables para updates sin refetch
  const [localDeliverables, setLocalDeliverables] = useState<any[]>([]);
  useEffect(() => { setLocalDeliverables(deliverables); }, [deliverables]);

  // Las tareas siguen siendo Task[] para compatibilidad con componentes existentes
  const tasks = localDeliverables as unknown as Task[];

  // Calendario cliente — usa hook con timezone fix y colores por tipo
  async function handleDeleteMultiple() {
    if (selectedTaskIds.size === 0 && selectedApptIds.size === 0) return;
    if (!confirm(`¿Eliminar ${selectedTaskIds.size + selectedApptIds.size} elemento(s) seleccionado(s)?`)) return;
    setDeletingMultiple(true);
    try {
      await Promise.all([
        ...[...selectedTaskIds].map(id =>
          fetch(`/api/tasks?id=${id}`, { method: 'DELETE' })
        ),
        ...[...selectedApptIds].map(id =>
          fetch(`/api/appointments?id=${id}`, { method: 'DELETE' })
        ),
      ]);
      setLocalDeliverables(prev => prev.filter((t: any) => !selectedTaskIds.has(t.id)));
      setLocalAppointments(prev => prev.filter((a: any) => !selectedApptIds.has(a.id)));
      setSelectedTaskIds(new Set());
      setSelectedApptIds(new Set());
      setSelectMode(false);
      toast.success('Elementos eliminados');
    } catch { toast.error('Error al eliminar'); }
    finally { setDeletingMultiple(false); }
  }

  async function handleDeleteMilestone(id: string) {
    if (!confirm('¿Eliminar este milestone?')) return;
    await fetch('/api/milestones?id=' + id, { method: 'DELETE' });
    refetch();
  }

  function handleEditMilestone(id: string) {
    const m = milestones.find((m: any) => m.id === id);
    if (!m) return;
    setEditingMilestone(m);
    setMilestoneForm({
      title: m.title, description: m.description, date: m.date.slice(0, 10),
      type: m.type || 'other', status: m.status || 'upcoming',
      progress: m.progress || 0, responsibleId: m.responsibleId || '',
      visibleToClient: m.visibleToClient ?? true, comments: m.comments || '',
    });
    setMilestoneOpen(true);
  }

  async function handleDeleteTask(id: string) {
    try {
      const res = await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setLocalDeliverables(prev => prev.filter((t: any) => t.id !== id));
        toast.success('Entrega eliminada');
      } else { alert('Error al eliminar'); }
    } catch { alert('Error de red'); }
  }

  async function handleRemindAppt(id: string) {
    try {
      const res = await fetch('/api/appointments/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: id }),
      });
      if (res.ok) { toast.success('Recordatorio enviado al cliente'); }
      else { toast.error('Error al enviar recordatorio'); }
    } catch { toast.error('Error de red'); }
  }

  async function handleDeleteAppt(id: string) {
    try {
      const res = await fetch(`/api/appointments?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        // Actualizar local sin refetch para evitar flash de loading
        setLocalAppointments(prev => prev.filter(a => a.id !== id));
        toast.success('Videollamada eliminada');
      } else { alert('Error al eliminar'); }
    } catch { alert('Error de red'); }
  }

  const { getDayEvents } = useClientCalendar({
    deliverables: localDeliverables as any[],
    appointments: appointments as any[],
    selectedDay:  selectedDay ?? new Date(),
  });

  // ── Efectos auxiliares ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isManager) return;
    fetch('/api/clients')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.clients) setClients(d.clients); })
      .catch(() => {});
  }, [isManager]);

  useEffect(() => {
    if (!isManager) return;
    fetch('/api/team-members')
      .then(r => r.json())
      .then(d => setMeetingTeam((d.users ?? []).filter((u: any) => u.role !== 'CLIENT' && u.role !== 'UNASSIGNED')))
      .catch(() => {});
  }, [isManager]);

  // ── Admin selector bar ───────────────────────────────────────────────────
  const AdminSelectorBar = isManager ? (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4">
      <Eye className="w-4 h-4 text-amber-400 shrink-0" />
      <span className="text-sm text-amber-300 font-medium shrink-0">Vista previa:</span>
      <Select value={previewClientId || 'none'} onValueChange={(v) => setPreviewClientId(v === 'none' ? '' : v)}>
        <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white text-sm h-8 flex-1 max-w-xs focus:ring-amber-500">
          <SelectValue placeholder="Selecciona un cliente..." />
        </SelectTrigger>
        <SelectContent className="bg-[#15151c] border-white/[0.08] text-white">
          <SelectItem value="none" className="text-white/40 focus:bg-white/[0.06]">
            — Selecciona un cliente —
          </SelectItem>
          {clients.map((c) => (
            <SelectItem key={c.id} value={c.id} className="focus:bg-white/[0.06]">
              {c.name}{c.company ? ` — ${c.company}` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  ) : null;

  // ── Guards ───────────────────────────────────────────────────────────────
  if (isManager && !previewClientId) {
    return (
      <div className="space-y-4">
        {AdminSelectorBar}
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <Eye className="w-10 h-10 text-white/15" />
          <p className="text-white/40 text-sm">Selecciona un cliente para previsualizar su portal.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {AdminSelectorBar}
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-brand-light animate-spin" />
        </div>
      </div>
    );
  }

  if (noClient) {
    return (
      <div className="space-y-4">
        {AdminSelectorBar}
        <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-brand-light/60" />
          </div>
          <div>
            <p className="text-white font-semibold">Cuenta no configurada</p>
            <p className="text-white/40 text-sm mt-1 max-w-sm">
              {isManager
                ? 'Este cliente no tiene un registro en el sistema.'
                : 'Tu cuenta de cliente aún no ha sido vinculada al sistema. Contacta a tu Project Manager.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        {AdminSelectorBar}
        <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
          <AlertCircle className="w-10 h-10 text-red-400/60" />
          <p className="text-white/50">{error}</p>
        </div>
      </div>
    );
  }

  if (!client) return null;

  if (!isManager && !client.assignedManagerId) {
    router.replace('/dashboard/waiting-assignment');
    return null;
  }

  // ── Datos derivados ──────────────────────────────────────────────────────
  const assignedManager = client.assignedManager;

  const EXCLUDED_ROLES = ['ADMIN'];
  const teamMembersMap = new Map();
  tasks.forEach((t) => {
    if (t.assignedUser && t.assignedUser.id !== assignedManager?.id && !EXCLUDED_ROLES.includes((t.assignedUser as any).role)) {
      const u = t.assignedUser;
      teamMembersMap.set(u.id, { id: u.id, name: u.name, email: u.email, color: u.color, image: u.image ?? null });
    }
    for (const u of t.assignedUsers ?? []) {
      if (u.id !== assignedManager?.id && !EXCLUDED_ROLES.includes((u as any).role)) teamMembersMap.set(u.id, u);
    }
  });
  const teamMembers    = [...teamMembersMap.values()];
  const totalItems     = tasks.length;
  const completedItems = tasks.filter((t) => t.status === 'completed' || t.status === 'approved').length;
  const displayedTasks = activeTab === 'tasks' ? tasks.filter((t) => t.status !== 'completed' && t.status !== 'approved') : tasks;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {AdminSelectorBar}

      {/* Header */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-brand/15 flex items-center justify-center shrink-0">
              <Building2 className="w-7 h-7 text-brand-light" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-white truncate">{client.name}</h1>
              {client.company && <p className="text-sm text-white/50 truncate">{client.company}</p>}
              <p className="text-xs text-white/30">{client.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap shrink-0">
            {isManager && (
              <ReportButton clientId={client.id} clientName={client.name} clientEmail={client.email} />
            )}
            {assignedManager && (
              <div className="flex items-center gap-3 bg-white/[0.03] rounded-xl px-4 py-2.5">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={assignedManager.image || undefined} />
                  <AvatarFallback className="text-[10px] font-medium"
                    style={{ backgroundColor: (assignedManager.color || '#7c3aed') + '33', color: assignedManager.color || '#7c3aed' }}>
                    {initials(assignedManager.name, assignedManager.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="mr-2">
                  <p className="text-[10px] text-white/30 font-medium uppercase tracking-wider">Tu PM</p>
                  <p className="text-sm text-white/80 font-medium">{assignedManager.name || assignedManager.email}</p>
                </div>
                <a
                  href={`https://wa.me/${agencyWhatsapp}?text=Hola ${encodeURIComponent(assignedManager.name || 'PM')}, soy ${encodeURIComponent(client.name)}.`}
                  target="_blank" rel="noopener noreferrer" title="WhatsApp PM"
                  className="flex items-center gap-1.5 rounded-lg bg-green-500/15 hover:bg-green-500/25 border border-green-500/20 px-2.5 py-1.5 text-green-400 text-xs font-medium transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp
                </a>
              </div>
            )}
          </div>
        </div>

        {totalItems > 0 && <ProgressBar total={totalItems} completed={completedItems} />}

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{tasks.length}</p>
            <p className="text-[11px] text-white/35">Entregas</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">{completedItems}</p>
            <p className="text-[11px] text-white/35">Completadas</p>
          </div>
        </div>

        {(assignedManager || teamMembers.length > 0) && (
          <div className="pt-1 border-t border-white/[0.04] space-y-3">
            <p className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">Personal Asignado</p>
            <div className="flex flex-wrap gap-3">
              {assignedManager && (
                <div className="flex items-center gap-2.5 bg-white/[0.03] rounded-xl px-3 py-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={assignedManager.image || undefined} />
                    <AvatarFallback className="text-[10px] font-medium"
                      style={{ backgroundColor: (assignedManager.color || '#7c3aed') + '33', color: assignedManager.color || '#7c3aed' }}>
                      {initials(assignedManager.name, assignedManager.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-[9px] text-white/30 uppercase tracking-wider font-semibold">PM</p>
                    <p className="text-xs text-white/80 font-medium leading-tight">{assignedManager.name || assignedManager.email}</p>
                  </div>
                </div>
              )}
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-2.5 bg-white/[0.03] rounded-xl px-3 py-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={member.image || undefined} />
                    <AvatarFallback className="text-[10px] font-medium"
                      style={{ backgroundColor: (member.color || '#06b6d4') + '33', color: member.color || '#06b6d4' }}>
                      {initials(member.name, member.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-[9px] text-white/30 uppercase tracking-wider font-semibold">Equipo</p>
                    <p className="text-xs text-white/80 font-medium leading-tight">{member.name || member.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Calendario */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-white">Calendario</p>
          {isManager && (
            <button type="button" onClick={() => setMeetingOpen(true)}
              className="flex items-center gap-1 text-[11px] text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-md px-2 py-1 transition-colors">
              <Plus className="w-3 h-3" />
              Agendar reunión
            </button>
          )}
        </div>
        <PortalCalendar tasks={tasks} appointments={appointments} onSelectDay={(day) => { setSelectedDay(day); setFormDate(day); }} getDayEvents={getDayEvents} />
      </div>

      {/* Timeline */}
      <ProjectTimeline tasks={tasks} appointments={appointments} milestones={milestones} isManager={isManager} onAddMilestone={() => { setEditingMilestone(null); setMilestoneOpen(true); }} onEditMilestone={handleEditMilestone} onDeleteMilestone={handleDeleteMilestone} />

      {/* Chat + Tareas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-5">
          <ChatContent room={client.id} title="Chat con tu equipo" subtitle="Habla en tiempo real con tu Project Manager" />
        </div>
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 rounded-full bg-brand" />
              <h3 className="text-sm font-semibold text-white">Entregas</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setPortalTaskOpen(true)}
                className="flex items-center gap-1 text-[11px] text-brand-light hover:text-white bg-brand/10 hover:bg-brand/20 border border-brand/20 rounded-md px-2 py-1 transition-colors">
                <Plus className="w-3 h-3" />
                {isManager ? 'Nueva entrega' : 'Solicitar tarea'}
              </button>
              {isManager && displayedTasks.length >= 5 && (
                <button type="button" onClick={() => { setSelectMode(v => !v); setSelectedTaskIds(new Set()); setSelectedApptIds(new Set()); }}
                  className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${selectMode ? 'bg-brand/20 border-brand/40 text-brand-light' : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white'}`}>
                  {selectMode ? 'Cancelar' : 'Seleccionar'}
                </button>
              )}
              {(['all', 'tasks'] as const).map((tab) => (
                <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${activeTab === tab ? 'bg-brand text-white' : 'bg-white/[0.04] text-white/50 hover:text-white'}`}>
                  {tab === 'all' ? 'Todas' : 'Abiertas'}
                </button>
              ))}
            </div>
          </div>
          {displayedTasks.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-2 text-center">
              <CheckSquare className="w-8 h-8 text-white/15" />
              <p className="text-white/35 text-sm">No hay entregas.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
              {displayedTasks.map((task) => (
                <div key={task.id} className="relative group/taskwrap">
                  <TaskCard task={task} onFeedback={!isManager ? refetchSilent : undefined} onDelete={isManager ? handleDeleteTask : undefined} />
                  {isManager && (
                    <button type="button"
                      onClick={() => { setEditingTask(task as any); setPortalTaskOpen(true); }}
                      className="absolute top-3 right-3 p-1.5 rounded-md text-white/20 hover:text-white hover:bg-white/[0.08] transition-colors opacity-0 group-hover/taskwrap:opacity-100 z-10">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Barra acción selección múltiple entregas */}
          {selectMode && isManager && selectedTaskIds.size > 0 && (
            <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl mt-2">
              <span className="text-xs text-white/60 flex-1">{selectedTaskIds.size} entrega{selectedTaskIds.size !== 1 ? 's' : ''} seleccionada{selectedTaskIds.size !== 1 ? 's' : ''}</span>
              <button type="button" disabled={deletingMultiple} onClick={handleDeleteMultiple}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 hover:bg-red-500/30 border border-red-500/25 text-red-300 transition-colors disabled:opacity-50">
                <Trash2 className="w-3.5 h-3.5" />
                {deletingMultiple ? 'Eliminando...' : 'Eliminar seleccionadas'}
              </button>
            </div>
          )}

          {/* Reuniones */}
          <div className="pt-3 border-t border-white/[0.04] space-y-3 bg-green-500/[0.02] rounded-xl p-3 -mx-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-5 rounded-full bg-green-500" />
                <h3 className="text-sm font-semibold text-white">Reuniones</h3>
                {appointments.length > 0 && (
                  <span className="text-[10px] bg-green-500/15 text-green-300 border border-green-500/20 rounded-full px-2 py-0.5">{appointments.length}</span>
                )}
              </div>
              {isManager ? (
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => setMeetingOpen(true)}
                    className="flex items-center gap-1 text-[11px] text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-md px-2 py-1 transition-colors">
                    <Plus className="w-3 h-3" />
                    Agendar
                  </button>
                  {appointments.length >= 5 && (
                    <button type="button" onClick={() => { setSelectMode(v => !v); setSelectedTaskIds(new Set()); setSelectedApptIds(new Set()); }}
                      className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${selectMode ? 'bg-green-500/20 border-green-500/40 text-green-300' : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white'}`}>
                      {selectMode ? 'Cancelar' : 'Seleccionar'}
                    </button>
                  )}
                </div>
              ) : (
                <button type="button" onClick={() => setRequestOpen(true)}
                  className="flex items-center gap-1 text-[11px] text-brand-light hover:text-white bg-brand/10 hover:bg-brand/20 border border-brand/20 rounded-md px-2 py-1 transition-colors">
                  <Plus className="w-3 h-3" />
                  Solicitar reunión
                </button>
              )}
            </div>
            {appointments.length === 0 ? (
              <div className="py-8 flex flex-col items-center gap-2 text-center">
                <Video className="w-7 h-7 text-white/15" />
                <p className="text-white/35 text-sm">No hay reuniones programadas.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                {appointments.map((appt) => <MeetingCard key={appt.id} appointment={appt} isManager={isManager} onDelete={handleDeleteAppt} onEdit={(apt) => { if (apt) { setEditingAppt(apt); setApptEditOpen(true); } }} />)}
              </div>
            )}

            {/* Barra acción selección múltiple reuniones */}
            {selectMode && isManager && selectedApptIds.size > 0 && (
              <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl mt-2">
                <span className="text-xs text-white/60 flex-1">{selectedApptIds.size} reunión{selectedApptIds.size !== 1 ? 'es' : ''} seleccionada{selectedApptIds.size !== 1 ? 's' : ''}</span>
                <button type="button" disabled={deletingMultiple} onClick={handleDeleteMultiple}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 hover:bg-red-500/30 border border-red-500/25 text-red-300 transition-colors disabled:opacity-50">
                  <Trash2 className="w-3.5 h-3.5" />
                  {deletingMultiple ? 'Eliminando...' : 'Eliminar seleccionadas'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actividades */}
      <div className="space-y-4">
        {!isManager && activities.length > 0 && (
          <div className="glass-card rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 rounded-full bg-brand" />
              <h3 className="text-sm font-semibold text-white">Actualizaciones recientes</h3>
            </div>
            <div className="space-y-3">
              {activities.slice(0, 3).map((a) => <ActivityCard key={a.id} activity={a as unknown as Activity} />)}
            </div>
          </div>
        )}
      </div>

      {/* Modales */}
      <DayModal
        day={selectedDay}
        tasks={tasks}
        appointments={appointments}
        isManager={isManager}
        onClose={() => setSelectedDay(null)}
        onDeleteTask={(id) => { handleDeleteTask(id); setSelectedDay(null); }}
        onDeleteAppt={(id) => { handleDeleteAppt(id); setSelectedDay(null); }}
        onEditAppt={(apt) => { if (apt) { setEditingAppt(apt); setApptEditOpen(true); } else { if (isManager) { setMeetingOpen(true); } else { if (selectedDay) { const d = new Date(selectedDay); d.setHours(10,0,0,0); setRequestDate(d.toISOString().slice(0,16)); } setRequestOpen(true); } } }}
        onEditTask={(task) => { setEditingTask(task); if (!task && selectedDay) setFormDate(selectedDay); setPortalTaskOpen(true); }}
        onFeedback={refetchSilent}
      />

      <TaskForm
        open={portalTaskOpen}
        onOpenChange={(v) => { setPortalTaskOpen(v); if (!v) setEditingTask(null); }}
        isManager={isManager}
        initialDate={editingTask ? null : (formDate ?? new Date())}
        initialClientId={client?.id ?? null}
        task={editingTask}
        onSuccess={() => {
          setPortalTaskOpen(false);
          setEditingTask(null);
          refetchSilent();
        }}
      />

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="bg-[#15151c] border-white/[0.08] text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white text-base">
              <Video className="h-4 w-4 text-green-400" />
              Solicitar reunión
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!requestDate) return;
            setRequestSaving(true);
            try {
              const session_email = (session?.user as any)?.email ?? '';
              const session_name  = (session?.user as any)?.name  ?? 'Cliente';
              const res = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name:   `Solicitud: ${session_name}`,
                  email:  session_email,
                  date:   new Date(requestDate).toISOString(),
                  notes:  requestNotes,
                  status: 'pending',
                }),
              });
              if (!res.ok) throw new Error('Error al enviar solicitud');
              setRequestOpen(false);
              setRequestDate('');
              setRequestNotes('');
              refetchSilent();
            } catch (err) {
              console.error('[solicitar reunion]', err);
              alert('Error al enviar la solicitud. Intenta de nuevo.');
            } finally {
              setRequestSaving(false);
            }
          }} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Fecha y hora propuesta *</Label>
              <Input type="datetime-local" value={requestDate} onChange={e => setRequestDate(e.target.value)} required
                className="bg-white/[0.04] border-white/[0.08] text-white focus-visible:ring-brand [color-scheme:dark]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Motivo / notas</Label>
              <textarea value={requestNotes} onChange={e => setRequestNotes(e.target.value)} rows={3}
                placeholder="¿De qué quieres hablar?"
                className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand resize-none placeholder:text-white/25" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setRequestOpen(false)}
                className="flex-1 border-white/[0.08] text-white/60 hover:text-white">Cancelar</Button>
              <Button type="submit" disabled={requestSaving || !requestDate}
                className="flex-1 bg-brand hover:bg-brand-dark text-white">
                {requestSaving ? 'Enviando...' : 'Enviar solicitud'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Barra selección múltiple */}
      {selectMode && isManager && (selectedTaskIds.size > 0 || selectedApptIds.size > 0) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center">
          <div className="flex items-center gap-3 bg-[#15151c] border border-white/[0.12] rounded-2xl px-5 py-3 shadow-2xl">
          <span className="text-sm text-white/70">
            {selectedTaskIds.size + selectedApptIds.size} seleccionado{selectedTaskIds.size + selectedApptIds.size !== 1 ? 's' : ''}
          </span>
          <button type="button" disabled={deletingMultiple} onClick={handleDeleteMultiple}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 transition-colors disabled:opacity-50">
            <Trash2 className="w-4 h-4" />
            {deletingMultiple ? 'Eliminando...' : 'Eliminar'}
          </button>
          <button type="button" onClick={() => { setSelectMode(false); setSelectedTaskIds(new Set()); setSelectedApptIds(new Set()); }}
            className="text-sm text-white/40 hover:text-white transition-colors">
            Cancelar
          </button>
          </div>
        </div>
      )}

      <PortalAppointmentEditModal
        open={apptEditOpen}
        onOpenChange={setApptEditOpen}
        appointment={editingAppt}
        onSaved={() => { setApptEditOpen(false); refetchSilent(); }}
        onDeleted={() => { setApptEditOpen(false); refetchSilent(); }}
      />

      {isManager && (
        <MeetingDialog
          open={meetingOpen}
          onOpenChange={setMeetingOpen}
          teamUsers={meetingTeam}
          initialClientEmail={client?.email}
          initialDate={formDate ?? new Date()}
          onSaved={() => {
            setMeetingOpen(false);
            refetchSilent();
          }}
        />
      )}
      {/* Modal crear milestone */}
      {milestoneOpen && isManager && client && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setMilestoneOpen(false)}>
          <div className="bg-[#15151c] border border-white/[0.08] rounded-2xl p-6 w-full max-w-lg mx-4 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-white">{editingMilestone ? "Editar milestone" : "Nuevo milestone"}</h3>
            <div className="space-y-1">
              <p className="text-xs text-white/40">Nombre *</p>
              <input type="text" placeholder="Ej: Entrega de diseños finales" value={milestoneForm.title}
                onChange={e => setMilestoneForm(f => ({...f, title: e.target.value}))}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-brand/50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-white/40">Tipo</p>
                <select value={milestoneForm.type} onChange={e => setMilestoneForm(f => ({...f, type: e.target.value}))}
                  className="w-full bg-[#1a1a24] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand/50">
                  <option value="other">General</option>
                  <option value="inicio_proyecto">Inicio proyecto</option>
                  <option value="grabacion">Grabación</option>
                  <option value="entrega_diseno">Entrega diseño</option>
                  <option value="revision_cliente">Revisión cliente</option>
                  <option value="lanzamiento_campana">Lanzamiento campaña</option>
                  <option value="publicacion_contenido">Publicación contenido</option>
                  <option value="entrega_final">Entrega final</option>
                  <option value="reporte_mensual">Reporte mensual</option>
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-white/40">Estado</p>
                <select value={milestoneForm.status} onChange={e => setMilestoneForm(f => ({...f, status: e.target.value}))}
                  className="w-full bg-[#1a1a24] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand/50">
                  <option value="upcoming">Próximo</option>
                  <option value="in_progress">En progreso</option>
                  <option value="review">En revisión</option>
                  <option value="completed">Completado</option>
                  <option value="delayed">Retrasado</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-white/40">Fecha objetivo *</p>
                <input type="date" value={milestoneForm.date} onChange={e => setMilestoneForm(f => ({...f, date: e.target.value}))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand/50 [color-scheme:dark]" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-white/40">Responsable (PM)</p>
                <select value={milestoneForm.responsibleId} onChange={e => setMilestoneForm(f => ({...f, responsibleId: e.target.value}))}
                  className="w-full bg-[#1a1a24] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand/50">
                  <option value="">Sin asignar</option>
                  {meetingTeam.filter((u: any) => u.role === 'PROJECT_MANAGER').map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name || u.email}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-white/40">Progreso: {milestoneForm.progress}%</p>
              <input type="range" min="0" max="100" step="5" value={milestoneForm.progress}
                onChange={e => setMilestoneForm(f => ({...f, progress: parseInt(e.target.value)}))}
                className="w-full accent-brand" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-white/40">Descripción</p>
              <textarea rows={2} placeholder="Descripción corta del milestone" value={milestoneForm.description}
                onChange={e => setMilestoneForm(f => ({...f, description: e.target.value}))}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-brand/50 resize-none" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-white/40">Comentarios / feedback</p>
              <textarea rows={2} placeholder="Notas importantes para el cliente" value={milestoneForm.comments}
                onChange={e => setMilestoneForm(f => ({...f, comments: e.target.value}))}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-brand/50 resize-none" />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="visibleToClient" checked={milestoneForm.visibleToClient}
                onChange={e => setMilestoneForm(f => ({...f, visibleToClient: e.target.checked}))}
                className="w-4 h-4 accent-brand" />
              <label htmlFor="visibleToClient" className="text-sm text-white/60">Visible para el cliente</label>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setMilestoneOpen(false)}
                className="px-4 py-2 text-sm text-white/40 hover:text-white transition-colors">Cancelar</button>
              <button type="button"
                onClick={async () => {
                  if (!milestoneForm.title || !milestoneForm.date) return;
                  if (editingMilestone) {
                    await fetch("/api/milestones", {
                      method: "PUT", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: editingMilestone.id, ...milestoneForm }),
                    });
                  } else {
                    await fetch("/api/milestones", {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ clientId: client.id, ...milestoneForm }),
                    });
                  }
                  setMilestoneOpen(false);
                  setEditingMilestone(null);
                  setMilestoneForm({ title: "", description: "", date: "", type: "other", status: "upcoming", progress: 0, responsibleId: "", visibleToClient: true, comments: "" });
                  refetch();
                }}
                className="px-4 py-2 text-sm bg-brand hover:bg-brand-dark text-white rounded-lg transition-colors">
                Guardar milestone
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
