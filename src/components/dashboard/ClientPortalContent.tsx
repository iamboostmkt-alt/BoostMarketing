'use client';

import { useState, useEffect, useMemo } from 'react';
import { MANAGER_ROLES } from '@/core/constants/roles';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, ChevronRight, Calendar, CheckSquare, Clock,
  CheckCircle2, Loader2, AlertCircle, User, Building2, Eye, MessageCircle, Video, Plus,
  ChevronDown, Flag,
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
  eachDayOfInterval, format, isSameDay, isToday,
  addMonths, subMonths, isSameMonth,
} from 'date-fns';
import { es } from 'date-fns/locale';
import ChatContent from '@/components/dashboard/ChatContent';
import { MeetingDialog, TeamUser } from '@/components/dashboard/MeetingsTab';
import TaskForm from '@/components/dashboard/TaskForm';
import { ReportButton } from '@/components/dashboard/ReportButton';
import type { ClientPortalData, Task, TaskAssignee, Activity } from '@/lib/types';

// Timeline component
function ProjectTimeline({ tasks, appointments }) {
  const now = new Date();
  const events = [
    ...tasks.filter(t => t.dueDate).map(t => ({
      id: t.id, date: new Date(t.dueDate), title: t.title,
      type: 'task', status: t.status,
      isPast: new Date(t.dueDate) < now,
      isToday: isSameDay(new Date(t.dueDate), now),
    })),
    ...appointments.map(a => ({
      id: a.id, date: new Date(a.date), title: 'Videollamada: ' + a.name,
      type: 'appointment', status: a.status,
      isPast: new Date(a.date) < now,
      isToday: isSameDay(new Date(a.date), now),
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 8);

  if (events.length === 0) return null;

  const pendingEvents = events.filter(e => !e.isPast && e.status !== 'completed');

  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-5 rounded-full bg-brand" />
        <h3 className="text-sm font-semibold text-white">Timeline del proyecto</h3>
      </div>
      <div className="relative">
        <div className="absolute left-3.5 top-2 bottom-2 w-px bg-white/[0.06]" />
        <div className="space-y-1">
          {events.map((event, i) => {
            const isCompleted = event.status === 'completed' || (event.type === 'appointment' && event.isPast);
            const isNext = !isCompleted && pendingEvents[0]?.id === event.id;
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
                <div className={"flex-1 " + (i === events.length - 1 ? "pb-0" : "pb-4")}>
                  <div className="flex items-start justify-between gap-2">
                    <p className={"text-sm leading-tight " + (isCompleted ? "text-white/40 line-through" : isNext ? "text-white font-medium" : "text-white/70")}>
                      {event.title}
                    </p>
                    {isNext && <span className="text-[10px] bg-brand/20 text-brand-light px-2 py-0.5 rounded-full shrink-0">Siguiente</span>}
                    {event.isToday && <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full shrink-0">Hoy</span>}
                  </div>
                  <p className={"text-[11px] mt-0.5 " + (isCompleted ? "text-white/25" : "text-white/40")}>
                    {format(event.date, "d 'de' MMM yyyy", { locale: es })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


// ── Constants ─────────────────────────────────────────────────────────────────

const DAY_NAMES   = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

const taskStatusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:     { label: 'Pendiente',    color: 'bg-amber-500/15 text-amber-300 border-amber-500/20',   icon: <Clock        className="h-3 w-3" /> },
  in_progress: { label: 'En progreso',  color: 'bg-blue-500/15 text-blue-300 border-blue-500/20',     icon: <Clock        className="h-3 w-3" /> },
  editing:     { label: 'En progreso',  color: 'bg-blue-500/15 text-blue-300 border-blue-500/20',     icon: <Clock        className="h-3 w-3" /> },
  review:      { label: 'En progreso',  color: 'bg-blue-500/15 text-blue-300 border-blue-500/20',      icon: <Clock        className="h-3 w-3" /> },
  completed:   { label: 'Completado',   color: 'bg-green-500/15 text-green-300 border-green-500/20',  icon: <CheckCircle2 className="h-3 w-3" /> },
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
    if (t.dueDate && isSameDay(new Date(t.dueDate), day)) return true;
    if (t.startDate && isSameDay(new Date(t.startDate), day)) return true;
    return false;
  });
}

// ── Day detail modal ──────────────────────────────────────────────────────────

interface DayModalProps {
  day: Date | null;
  tasks: Task[];
  onClose: () => void;
}

function DayModal({ day, tasks, onClose }: DayModalProps) {
  if (!day) return null;

  const dayTasks      = getTasksForDay(tasks, day);
  const hasItems      = dayTasks.length > 0;

  const label = format(day, "EEEE d 'de' MMMM", { locale: es });

  return (
    <Dialog open={!!day} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#15151c] border-white/[0.08] text-white max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white capitalize">{label}</DialogTitle>
        </DialogHeader>

        {!hasItems ? (
          <div className="py-12 flex flex-col items-center gap-3 text-center">
            <Calendar className="w-10 h-10 text-white/15" />
            <p className="text-white/40 text-sm">No hay tareas con vencimiento este día.</p>
          </div>
        ) : (
          <div className="space-y-4 mt-1">
            {dayTasks.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Tareas</p>
                {dayTasks.map((task) => {
                  const cfg = taskStatusConfig[task.status] ?? taskStatusConfig.pending;
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
                      <div className="flex items-center gap-3 text-[11px] text-white/35">
                        {task.dueDate && <span>Vence: {fmtDate(task.dueDate)}</span>}
                        {task.assignedUser && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {task.assignedUser.name || task.assignedUser.email}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Calendar grid ─────────────────────────────────────────────────────────────

interface CalendarProps {
  tasks: Task[];
  appointments?: any[];
  onSelectDay: (day: Date) => void;
}

function PortalCalendar({ tasks, appointments = [], onSelectDay }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd   = endOfMonth(currentMonth);
    const calStart   = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd     = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const monthLabel = `${MONTH_NAMES[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

  return (
    <div className="space-y-4">
      {/* Header */}
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

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_NAMES.map((name) => (
          <div key={name} className="text-center text-[11px] font-medium text-white/30 py-2">{name}</div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayTasks       = getTasksForDay(tasks, day);
          const dayAppts       = appointments.filter((a: any) => {
            try {
              if (!a.date) return false;
              const d = new Date(a.date);
              // Comparar solo año/mes/día ignorando timezone
              return d.getFullYear() === day.getFullYear() &&
                     d.getMonth()    === day.getMonth() &&
                     d.getDate()     === day.getDate();
            } catch { return false; }
          });
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const today          = isToday(day);
          const hasItems       = dayTasks.length > 0 || dayAppts.length > 0;

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => { if (isCurrentMonth) onSelectDay(day); }}
              className={`
                relative flex flex-col items-center justify-center min-h-[52px] md:min-h-[64px] rounded-lg transition-all
                border border-transparent
                ${isCurrentMonth ? 'text-white/80' : 'text-white/15 cursor-default'}
                ${today ? 'border-brand/40 bg-brand/[0.06]' : ''}
                ${isCurrentMonth && !today ? 'hover:bg-white/[0.03] hover:border-white/[0.06]' : ''}
              `}
            >
              <span className={`text-sm font-medium ${today ? 'text-brand-light' : ''}`}>
                {format(day, 'd')}
              </span>

              {hasItems && isCurrentMonth && (
                <div className="flex items-center gap-0.5 mt-0.5 flex-wrap justify-center max-w-[40px]">
                  {dayTasks.slice(0, 3).map((t, i) => (
                    <span key={`t${i}`} className={`w-1.5 h-1.5 rounded-full ${
                      t.status === 'completed' ? 'bg-green-400' : 'bg-amber-400'
                    }`} />
                  ))}
                  {dayAppts.slice(0, 2).map((_a, i) => (
                    <span key={`a${i}`} className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  ))}
                  {(dayTasks.length + dayAppts.length) > 5 && (
                    <span className="text-[8px] text-white/30">
                      +{dayTasks.length + dayAppts.length - 5}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 pt-1 border-t border-white/[0.04]">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          <span className="text-[11px] text-white/30">Tareas pendientes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
          <span className="text-[11px] text-white/30">Completadas</span>
        </div>
      </div>
    </div>
  );
}

// ── Task cards ────────────────────────────────────────────────────────────────

function TaskCard({ task }: { task: Task }) {
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
      {/* Header siempre visible */}
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

      {/* Detalle expandido */}
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
        </div>
      )}
    </div>
  );
}


// ── Activity cards ────────────────────────────────────────────────────────────

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
      className={`glass-card rounded-xl overflow-hidden transition-all duration-200 cursor-pointer ${expanded ? 'ring-1 ring-brand/30' : 'hover:ring-1 hover:ring-white/10'}`}
      onClick={() => setExpanded(e => !e)}
    >
      {/* Header siempre visible */}
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

      {/* Detalle expandido */}
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



// ── Meeting cards ─────────────────────────────────────────────────────────────

const meetingStatusConfig = {
  pending:   { label: 'Programada',  color: 'bg-blue-500/15 text-blue-300 border-blue-500/20' },
  completed: { label: 'Realizada',   color: 'bg-green-500/15 text-green-300 border-green-500/20' },
  cancelled: { label: 'Cancelada',   color: 'bg-red-500/15 text-red-300 border-red-500/20' },
};

function MeetingCard({ appointment }) {
  const [expanded, setExpanded] = useState(false);
  const status = appointment.status || 'pending';
  const cfg = meetingStatusConfig[status] ?? meetingStatusConfig.pending;
  const isPast = new Date(appointment.date) < new Date();
  return (
    <div
      className={`glass-card rounded-xl overflow-hidden transition-all duration-200 cursor-pointer ${expanded ? 'ring-1 ring-brand/30' : 'hover:ring-1 hover:ring-white/10'}`}
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
          <p className="text-[11px] text-white/35 pl-6">
            {fmtDate(appointment.date)}{appointment.time ? ' · ' + appointment.time : ''}
          </p>
        )}
      </div>
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/[0.06] pt-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/[0.03] rounded-lg p-2.5">
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium mb-0.5">Fecha</p>
              <p className="text-xs text-white/70 font-medium">{fmtDate(appointment.date)}</p>
            </div>
            {appointment.time && (
              <div className="bg-white/[0.03] rounded-lg p-2.5">
                <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium mb-0.5">Hora</p>
                <p className="text-xs text-white/70 font-medium">{appointment.time}</p>
              </div>
            )}
          </div>
          {appointment.description && (
            <p className="text-xs text-white/60 leading-relaxed">{appointment.description}</p>
          )}
          {appointment.link && (
            <a
              href={appointment.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-lg px-3 py-2 text-green-400 text-xs font-medium transition-colors w-fit"
            >
              <Video className="w-3.5 h-3.5" />
              Unirse a la reunión
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────

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

// ── Main component ────────────────────────────────────────────────────────────


interface ClientSummary { id: string; name: string; company: string; email: string; }


export default function ClientPortalContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const currentUserRole = (session?.user as { role?: string })?.role ?? 'CLIENT';

  const isManager = MANAGER_ROLES.includes(currentUserRole as any);

  // Admin preview: list of clients + selected clientId
  const [clients,          setClients]          = useState<ClientSummary[]>([]);
  const [previewClientId,  setPreviewClientId]  = useState<string>('');

  const [data,     setData]     = useState<ClientPortalData | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [noClient, setNoClient] = useState(false);
  const [selectedDay,      setSelectedDay]      = useState<Date | null>(null);
  const [meetingOpen,      setMeetingOpen]      = useState(false);
  const [meetingTeam,      setMeetingTeam]      = useState<TeamUser[]>([]);
  const [requestOpen,      setRequestOpen]      = useState(false);
  const [portalTaskOpen,   setPortalTaskOpen]   = useState(false);
  const [requestDate,      setRequestDate]      = useState('');
  const [requestNotes,     setRequestNotes]     = useState('');
  const [requestSaving,    setRequestSaving]    = useState(false);
  const [activeTab,        setActiveTab]        = useState<'all' | 'tasks'>('all');
  const [portalTab,        setPortalTab]        = useState<'resumen' | 'tareas' | 'calendario' | 'actividades' | 'reuniones' | 'chat'>('resumen');

  // Load client list for admin/PM selector
  useEffect(() => {
    if (!isManager) return;
    fetch('/api/clients')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.clients) setClients(d.clients);
      })
      .catch(() => {});
  }, [isManager]);

  useEffect(() => {
    // Managers need a clientId selected before fetching
    if (isManager && !previewClientId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setNoClient(false);
    setData(null);

    const url = isManager
      ? `/api/client-portal?clientId=${previewClientId}`
      : '/api/client-portal';

    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d.client === null) { setNoClient(true); return; }
        if (d.error)           { setError(d.error); return; }
        setData(d);
      })
      .catch(() => setError('Error al cargar el portal. Intenta nuevamente.'))
      .finally(() => setLoading(false));
  }, [isManager, previewClientId]);

  // Cargar equipo para modal de reunión
  useEffect(() => {
    if (!isManager) return;
    fetch('/api/team-members')
      .then(r => r.json())
      .then(d => setMeetingTeam((d.users ?? []).filter((u: any) => u.role !== 'CLIENT' && u.role !== 'UNASSIGNED')))
      .catch(() => {});
  }, [isManager]);

  // Admin selector header (always visible for managers)
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

  if (!data) return null;

  const { client, tasks, activities = [], appointments: portalAppointments = [] } = data;

  // Redirect CLIENT users without assigned PM to waiting screen
  if (!isManager && !client.assignedManagerId) {
    router.replace('/dashboard/waiting-assignment');
    return null;
  }

  const assignedManager = client.assignedManager;

  const teamMembersMap = new Map();
  // Backend ya filtra por rol — tasks solo contiene lo permitido
  // Excluir ADMIN y PM del equipo visible al cliente
  const EXCLUDED_ROLES = ['ADMIN'];
  tasks.forEach((t) => {
    if (t.assignedUser && t.assignedUser.id !== assignedManager?.id && !EXCLUDED_ROLES.includes((t.assignedUser as any).role)) {
      const u = t.assignedUser;
      teamMembersMap.set(u.id, { id: u.id, name: u.name, email: u.email, color: u.color, image: u.image ?? null });
    }
    for (const u of t.assignedUsers ?? []) {
      if (u.id !== assignedManager?.id && !EXCLUDED_ROLES.includes((u as any).role)) teamMembersMap.set(u.id, u);
    }
  });
  const teamMembers = [...teamMembersMap.values()];

  const effectiveAppointments = portalAppointments;
  const totalItems     = tasks.length;
  const completedItems = tasks.filter((t) => t.status === 'completed').length;

  // Backend ya garantiza visibilidad correcta por rol
  const portalVisibleTasks = tasks;
  const displayedTasks =
    activeTab === 'tasks'
      ? tasks.filter((t) => t.status !== 'completed')
      : tasks;

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
              {client.company && (
                <p className="text-sm text-white/50 truncate">{client.company}</p>
              )}
              <p className="text-xs text-white/30">{client.email}</p>
            </div>
          </div>

          {/* Assigned manager + WhatsApp */}
           <div className="flex items-center gap-3 flex-wrap shrink-0">
            {isManager && client && (
              <ReportButton clientId={client.id} clientName={client.name} clientEmail={client.email} />
            )}
            {client.assignedManager && (
              <div className="flex items-center gap-3 bg-white/[0.03] rounded-xl px-4 py-2.5">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={client.assignedManager.image || undefined} />
                  <AvatarFallback className="text-[10px] font-medium"
                    style={{
                      backgroundColor: (client.assignedManager.color || '#7c3aed') + '33',
                      color: client.assignedManager.color || '#7c3aed',
                    }}>
                    {initials(client.assignedManager.name, client.assignedManager.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="mr-2">
                  <p className="text-[10px] text-white/30 font-medium uppercase tracking-wider">Tu PM</p>
                  <p className="text-sm text-white/80 font-medium">
                    {client.assignedManager.name || client.assignedManager.email}
                  </p>
                </div>
                <a
                  href={`https://wa.me/521063469?text=Hola ${encodeURIComponent(client.assignedManager.name || 'PM')}, soy ${encodeURIComponent(client.name)}.`}
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

        {/* Progress */}
        {totalItems > 0 && <ProgressBar total={totalItems} completed={completedItems} />}

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{tasks.length}</p>
            <p className="text-[11px] text-white/35">Tareas</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">{completedItems}</p>
            <p className="text-[11px] text-white/35">Completadas</p>
          </div>
        </div>

        {/* Personal Asignado + Reporte */}
        {(assignedManager || teamMembers.length > 0) && (
          <div className="pt-1 border-t border-white/[0.04] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">Personal Asignado</p>
            </div>
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
                    <p className="text-xs text-white/80 font-medium leading-tight">
                      {assignedManager.name || assignedManager.email}
                    </p>
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
                    <p className="text-xs text-white/80 font-medium leading-tight">
                      {member.name || member.email}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Calendario SIEMPRE visible */}
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
        <PortalCalendar tasks={portalVisibleTasks} appointments={effectiveAppointments} onSelectDay={setSelectedDay} />
      </div>

      {/* Chat + Tareas lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-5">
          <ChatContent room={client.id} title="Chat con tu equipo" subtitle="Habla en tiempo real con tu Project Manager" />
        </div>
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 rounded-full bg-brand" />
              <h3 className="text-sm font-semibold text-white">Tareas</h3>
            </div>
            <div className="flex items-center gap-1.5">
              {isManager && (
                <button type="button" onClick={() => setPortalTaskOpen(true)}
                  className="flex items-center gap-1 text-[11px] text-brand-light hover:text-white bg-brand/10 hover:bg-brand/20 border border-brand/20 rounded-md px-2 py-1 transition-colors">
                  <Plus className="w-3 h-3" />
                  Entrega
                </button>
              )}
              {!isManager && (
                <button type="button" onClick={() => setPortalTaskOpen(true)}
                  className="flex items-center gap-1 text-[11px] text-brand-light hover:text-white bg-brand/10 hover:bg-brand/20 border border-brand/20 rounded-md px-2 py-1 transition-colors">
                  <Plus className="w-3 h-3" />
                  Solicitar tarea
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
              <p className="text-white/35 text-sm">No hay tareas.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
              {displayedTasks.map((task) => <TaskCard key={task.id} task={task} />)}
            </div>
          )}

          {/* Reuniones */}
          <div className="pt-3 border-t border-white/[0.04] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-5 rounded-full bg-green-500" />
                <h3 className="text-sm font-semibold text-white">Reuniones</h3>
                {effectiveAppointments.length > 0 && (
                  <span className="text-[10px] bg-green-500/15 text-green-300 border border-green-500/20 rounded-full px-2 py-0.5">{effectiveAppointments.length}</span>
                )}
              </div>
              {isManager && (
                <button type="button" onClick={() => setMeetingOpen(true)}
                  className="flex items-center gap-1 text-[11px] text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-md px-2 py-1 transition-colors">
                  <Plus className="w-3 h-3" />
                  Agendar
                </button>
              )}
              {!isManager && (
                <button type="button" onClick={() => setRequestOpen(true)}
                  className="flex items-center gap-1 text-[11px] text-brand-light hover:text-white bg-brand/10 hover:bg-brand/20 border border-brand/20 rounded-md px-2 py-1 transition-colors">
                  <Plus className="w-3 h-3" />
                  Solicitar reunión
                </button>
              )}
            </div>
            {effectiveAppointments.length === 0 ? (
              <div className="py-8 flex flex-col items-center gap-2 text-center">
                <Video className="w-7 h-7 text-white/15" />
                <p className="text-white/35 text-sm">No hay reuniones programadas.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                {effectiveAppointments.map((appt) => <MeetingCard key={appt.id} appointment={appt} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resumen — Timeline + Actividades recientes */}
      <div className="space-y-4">
        <ProjectTimeline tasks={portalVisibleTasks} appointments={effectiveAppointments} />
        {!isManager && activities.length > 0 && (
          <div className="glass-card rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-5 rounded-full bg-brand" />
                <h3 className="text-sm font-semibold text-white">Actualizaciones recientes</h3>
              </div>
              {activities.length > 3 && (
                <button onClick={() => setPortalTab('actividades')} className="text-xs text-brand-light hover:text-white transition-colors">
                  Ver todas →
                </button>
              )}
            </div>
            <div className="space-y-3">
              {activities.slice(0, 3).map((a) => <ActivityCard key={a.id} activity={a} />)}
            </div>
          </div>
        )}
      </div>

      <DayModal day={selectedDay} tasks={tasks} onClose={() => setSelectedDay(null)} />
      {/* TaskForm — PM crea entrega, cliente solicita tarea */}
      <TaskForm
        open={portalTaskOpen}
        onOpenChange={setPortalTaskOpen}
        isManager={isManager}
        initialDate={null}
        initialClientId={client?.id ?? null}
        onSuccess={() => {
          setPortalTaskOpen(false);
          const url = isManager ? `/api/client-portal?clientId=${previewClientId ?? ''}` : '/api/client-portal';
          fetch(url).then(r => r.json()).then(d => { if (d.tasks || d.client) setData(d); }).catch(() => {});
        }}
      />
      {/* Modal solicitud reunión — solo para clientes */}
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
              const session_name  = (session?.user as any)?.name ?? 'Cliente';
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
            } catch (err) { console.error('[solicitar reunion]', err); alert('Error al enviar la solicitud. Intenta de nuevo.'); } finally { setRequestSaving(false); }
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

      {isManager && (
        <MeetingDialog
          open={meetingOpen}
          onOpenChange={setMeetingOpen}
          teamUsers={meetingTeam}
          initialClientEmail={client?.email}
          onSaved={() => {
            setMeetingOpen(false);
            const url = isManager ? `/api/client-portal?clientId=${previewClientId ?? ''}` : '/api/client-portal';
            fetch(url).then(r => r.json()).then(d => { 
              console.log('[portal refresh]', d?.appointments?.length, 'appointments');
              if (d.client) setData(d); 
            }).catch(() => {});
          }}
        />
      )}
    </div>
  );
}
