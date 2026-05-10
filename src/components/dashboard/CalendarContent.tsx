'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  CalendarDays, Plus, CheckSquare, Clock,
  CalendarRange, Sparkles, X,
} from 'lucide-react';
import {
  format, isSameDay, isToday, isWithinInterval,
  startOfDay, endOfDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import TaskForm from '@/components/dashboard/TaskForm';
import ActivityForm from '@/components/dashboard/ActivityForm';
import ActivityDetailModal from '@/components/dashboard/ActivityDetailModal';
import CalendarGrid from '@/components/dashboard/CalendarGrid';
import type { Task, Activity } from '@/lib/types';
import {
  statusColors, statusLabels, priorityColors, priorityLabels,
  activityStatusColors, activityStatusLabels,
} from '@/lib/theme-maps';

const MANAGER_ROLES  = ['ADMIN', 'PROJECT_MANAGER'];
const POLL_INTERVAL  = 30_000;

// ── Helpers ────────────────────────────────────────────────────────────────────

function dayLabel(day: Date): string {
  try {
    const label = format(day, "EEEE, d 'de' MMMM", { locale: es });
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return day.toLocaleDateString('es-MX', { weekday: 'long', month: 'long', day: 'numeric' });
  }
}

function getAvatar(u: { name: string | null; email: string; color: string; image?: string | null } | undefined) {
  if (!u) return null;
  return (
    <div className="flex items-center gap-1.5 ml-auto">
      <Avatar className="h-5 w-5">
        <AvatarImage src={(u as { image?: string }).image ?? undefined} />
        <AvatarFallback
          className="text-[9px] font-medium"
          style={{ backgroundColor: (u.color || '#7c3aed') + '33', color: u.color || '#7c3aed' }}
        >
          {(u.name || u.email).slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="text-[10px] text-white/40 truncate max-w-[80px]">
        {u.name || u.email}
      </span>
    </div>
  );
}

// ── Day Modal ──────────────────────────────────────────────────────────────────

interface DayModalProps {
  open:         boolean;
  onClose:      () => void;
  day:          Date;
  tasks:        Task[];
  activities:   Activity[];
  isManager:    boolean;
  onEditTask:   (t: Task) => void;
  onViewAct:    (a: Activity) => void;
  onNewTask:    () => void;
  onNewAct:     () => void;
}

function DayModal({
  open, onClose, day, tasks, activities, isManager,
  onEditTask, onViewAct, onNewTask, onNewAct,
}: DayModalProps) {
  const dayTasks = useMemo(
    () => tasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), day)),
    [tasks, day]
  );

  const dayActivities = useMemo(
    () => activities.filter((a) => {
      try {
        return isWithinInterval(startOfDay(day), {
          start: startOfDay(new Date(a.startDate)),
          end:   endOfDay(a.endDate ? new Date(a.endDate) : new Date(a.startDate)),
        });
      } catch {
        return isSameDay(new Date(a.startDate), day);
      }
    }),
    [activities, day]
  );

  const total = dayTasks.length + dayActivities.length;
  const label = dayLabel(day);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#15151c] border-white/[0.06] text-white max-w-lg w-full max-h-[85vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center justify-between">
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
          </div>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4">
          {/* Activities */}
          {dayActivities.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/40 uppercase tracking-wider">
                <CalendarRange className="w-3 h-3" />
                Actividades ({dayActivities.length})
              </div>
              {dayActivities.map((act) => (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => { onViewAct(act); onClose(); }}
                  className="w-full text-left bg-brand/[0.07] border border-brand/20 rounded-lg p-3.5 hover:border-brand/40 hover:bg-brand/[0.10] transition-colors group"
                >
                  <div className="flex items-start gap-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 mt-0.5 ${activityStatusColors[act.status] || 'status-pending'}`}>
                      {activityStatusLabels[act.status] || act.status}
                    </span>
                    <p className="text-sm font-medium text-white/90 leading-tight group-hover:text-white transition-colors">
                      {act.title}
                    </p>
                  </div>
                  {act.description && (
                    <p className="text-xs text-white/35 mt-1.5 line-clamp-2 pl-1">{act.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 pl-1 flex-wrap">
                    <span className={`text-[10px] font-medium ${priorityColors[act.priority] || 'text-white/40'}`}>
                      {priorityLabels[act.priority] || act.priority}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] text-white/25">
                      <Clock className="w-2.5 h-2.5 shrink-0" />
                      {format(new Date(act.startDate), 'd MMM', { locale: es })}
                      {act.endDate && ` → ${format(new Date(act.endDate), 'd MMM', { locale: es })}`}
                    </div>
                    {act.assignedUser && getAvatar(act.assignedUser)}
                  </div>
                </button>
              ))}
            </section>
          )}

          {/* Tasks */}
          {dayTasks.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/40 uppercase tracking-wider">
                <CheckSquare className="w-3 h-3" />
                Tareas ({dayTasks.length})
              </div>
              {dayTasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => { onEditTask(task); onClose(); }}
                  className="w-full text-left bg-white/[0.03] border border-white/[0.05] rounded-lg p-3.5 hover:border-white/[0.10] hover:bg-white/[0.05] transition-colors group"
                >
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
                    {task.assignedUser && getAvatar(task.assignedUser)}
                  </div>
                </button>
              ))}
            </section>
          )}

          {/* Empty state */}
          {total === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white/20" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/40">Sin elementos este día</p>
                <p className="text-xs text-white/25 mt-0.5">No hay nada programado</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-white/[0.06] px-5 py-3 flex gap-2 shrink-0">
          <Button
            size="sm"
            className="bg-brand hover:bg-brand-dark text-white gap-1.5 text-xs h-8"
            onClick={() => { onNewTask(); onClose(); }}
          >
            <Plus className="w-3.5 h-3.5" />
            Tarea
          </Button>
          {isManager && (
            <Button
              size="sm"
              variant="outline"
              className="border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.06] gap-1.5 text-xs h-8"
              onClick={() => { onNewAct(); onClose(); }}
            >
              <Plus className="w-3.5 h-3.5" />
              Actividad
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-white/30 hover:text-white hover:bg-white/[0.06] text-xs h-8 ml-auto"
            onClick={onClose}
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function CalendarContent() {
  const { data: session } = useSession();
  const [tasks,           setTasks]          = useState<Task[]>([]);
  const [activities,      setActivities]     = useState<Activity[]>([]);
  const [loading,         setLoading]        = useState(true);
  const [selectedDay,     setSelectedDay]    = useState<Date>(new Date());
  const [dayModalOpen,    setDayModalOpen]   = useState(false);
  const [taskFormOpen,    setTaskFormOpen]   = useState(false);
  const [editingTask,     setEditingTask]    = useState<Task | null>(null);
  const [actFormOpen,     setActFormOpen]    = useState(false);
  const [editingAct,      setEditingAct]     = useState<Activity | null>(null);
  const [actDetailOpen,   setActDetailOpen]  = useState(false);
  const [detailActivity,  setDetailActivity] = useState<Activity | null>(null);

  const userId   = (session?.user as { id?: string })?.id ?? '';
  const userRole = session?.user?.role ?? '';

  const isManager = MANAGER_ROLES.includes(session?.user?.role ?? '');

  const fetchData = useCallback(async () => {
    const tasksUrl = isManager ? '/api/tasks?scope=all' : '/api/tasks';
    try {
      const [tasksRes, actsRes] = await Promise.all([
        fetch(tasksUrl),
        fetch('/api/activities'),
      ]);
      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(data.tasks || data || []);
      }
      if (actsRes.ok) {
        const data = await actsRes.json();
        setActivities(data.activities || []);
      }
    } finally {
      setLoading(false);
    }
  }, [isManager]);

  // Initial fetch + 30 s polling
  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchData]);

  // Safety timeout
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 12_000);
    return () => clearTimeout(t);
  }, []);

  // When a day is clicked: update selectedDay AND open the day modal
  function handleSelectDay(day: Date) {
    setSelectedDay(day);
    setDayModalOpen(true);
  }

  // Sidebar panel items (persistent desktop view, updates on day change)
  const dayTasks = useMemo(
    () => tasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), selectedDay)),
    [tasks, selectedDay]
  );

  const dayActivities = useMemo(
    () => activities.filter((a) => {
      try {
        return isWithinInterval(startOfDay(selectedDay), {
          start: startOfDay(new Date(a.startDate)),
          end:   endOfDay(a.endDate ? new Date(a.endDate) : new Date(a.startDate)),
        });
      } catch {
        return isSameDay(new Date(a.startDate), selectedDay);
      }
    }),
    [activities, selectedDay]
  );

  const total          = dayTasks.length + dayActivities.length;
  const capitalizedLabel = dayLabel(selectedDay);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-44 rounded-lg bg-white/[0.06]" />
          <Skeleton className="h-9 w-32 rounded-lg bg-white/[0.06]" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-[360px] w-full rounded-xl bg-white/[0.06]" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl bg-white/[0.06]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Calendario</h1>
          <p className="text-white/40 text-sm mt-1">
            Haz clic en un día para ver su detalle · actualiza cada 30 s
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isManager && (
            <Button variant="outline"
              onClick={() => { setEditingAct(null); setActFormOpen(true); }}
              className="border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.06] gap-2 text-sm">
              <CalendarRange className="w-4 h-4" />
              Actividad
            </Button>
          )}
          <Button
            onClick={() => { setEditingTask(null); setTaskFormOpen(true); }}
            className="bg-brand hover:bg-brand-dark text-white gap-2">
            <Plus className="w-4 h-4" />
            Nueva Tarea
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Calendar grid ── */}
        <div className="lg:col-span-2 bg-[#15151c] border border-white/[0.06] rounded-xl p-4 md:p-6">
          <CalendarGrid
            tasks={tasks}
            activities={activities}
            selectedDay={selectedDay}
            onSelectDay={handleSelectDay}
          />
        </div>

        {/* ── Day detail panel (desktop persistent view) ── */}
        <div className="bg-[#15151c] border border-white/[0.06] rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 md:p-5 border-b border-white/[0.06] shrink-0">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-brand-light" />
              <div>
                <p className="text-sm font-semibold text-white leading-tight">
                  {isToday(selectedDay) ? 'Hoy' : capitalizedLabel}
                </p>
                {isToday(selectedDay) && (
                  <p className="text-[11px] text-white/35">{capitalizedLabel}</p>
                )}
              </div>
            </div>
            {total > 0 && (
              <span className="text-[11px] font-medium bg-brand/20 text-brand-light px-2 py-0.5 rounded-full">
                {total} item{total !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-5 space-y-4">
            {/* Activities */}
            {dayActivities.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/40 uppercase tracking-wider">
                  <CalendarRange className="w-3 h-3" />
                  Actividades ({dayActivities.length})
                </div>
                {dayActivities.map((act) => (
                  <button key={act.id} type="button"
                    onClick={() => { setDetailActivity(act); setActDetailOpen(true); }}
                    className="w-full text-left bg-brand/[0.07] border border-brand/20 rounded-lg p-3 hover:border-brand/40 hover:bg-brand/[0.10] transition-colors group">
                    <div className="flex items-start gap-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 mt-0.5 ${activityStatusColors[act.status] || 'status-pending'}`}>
                        {activityStatusLabels[act.status] || act.status}
                      </span>
                      <p className="text-sm font-medium text-white/90 leading-tight group-hover:text-white transition-colors">
                        {act.title}
                      </p>
                    </div>
                    {act.description && (
                      <p className="text-xs text-white/35 mt-1.5 line-clamp-2 pl-1">{act.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 pl-1">
                      <span className={`text-[10px] font-medium ${priorityColors[act.priority] || 'text-white/40'}`}>
                        {priorityLabels[act.priority] || act.priority}
                      </span>
                      {act.endDate && (
                        <span className="text-[10px] text-white/25">
                          hasta {format(new Date(act.endDate), 'd MMM', { locale: es })}
                        </span>
                      )}
                      {act.assignedUser && getAvatar(act.assignedUser)}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Tasks */}
            {dayTasks.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/40 uppercase tracking-wider">
                  <CheckSquare className="w-3 h-3" />
                  Tareas ({dayTasks.length})
                </div>
                {dayTasks.map((task) => (
                  <button key={task.id} type="button"
                    onClick={() => { setEditingTask(task); setTaskFormOpen(true); }}
                    className="w-full text-left bg-white/[0.03] border border-white/[0.05] rounded-lg p-3.5 hover:border-white/[0.10] hover:bg-white/[0.05] transition-colors group">
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
                    <div className="flex items-center gap-3 mt-2.5 pl-1">
                      <span className={`text-[10px] font-medium ${priorityColors[task.priority] || 'text-white/40'}`}>
                        {priorityLabels[task.priority] || task.priority}
                      </span>
                      {task.dueDate && (
                        <div className="flex items-center gap-1 text-[10px] text-white/25">
                          <Clock className="w-2.5 h-2.5" />
                          {format(new Date(task.dueDate), 'HH:mm')}
                        </div>
                      )}
                      {task.assignedUser && getAvatar(task.assignedUser)}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Empty state */}
            {total === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white/20" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/40">Sin elementos este día</p>
                  <p className="text-xs text-white/25 mt-0.5">
                    {isToday(selectedDay) ? 'Todo en orden por hoy' : 'No hay nada programado'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm"
                    className="text-white/40 hover:text-white hover:bg-white/[0.06] text-xs gap-1"
                    onClick={() => { setEditingTask(null); setTaskFormOpen(true); }}>
                    <Plus className="w-3.5 h-3.5" />
                    Tarea
                  </Button>
                  {isManager && (
                    <Button variant="ghost" size="sm"
                      className="text-white/40 hover:text-white hover:bg-white/[0.06] text-xs gap-1"
                      onClick={() => { setEditingAct(null); setActFormOpen(true); }}>
                      <Plus className="w-3.5 h-3.5" />
                      Actividad
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Day Modal — opens on every day click */}
      <DayModal
        open={dayModalOpen}
        onClose={() => setDayModalOpen(false)}
        day={selectedDay}
        tasks={tasks}
        activities={activities}
        isManager={isManager}
        onEditTask={(t) => { setEditingTask(t);    setTaskFormOpen(true); }}
        onViewAct={(a)  => { setDetailActivity(a); setActDetailOpen(true); }}
        onNewTask={() => { setEditingTask(null);    setTaskFormOpen(true); }}
        onNewAct={()  => { setEditingAct(null);     setActFormOpen(true); }}
      />

      {/* Activity detail + comment thread */}
      <ActivityDetailModal
        activity={detailActivity}
        open={actDetailOpen}
        onClose={() => setActDetailOpen(false)}
        currentUserId={userId}
        currentUserRole={userRole}
        onEdit={isManager ? (a) => { setEditingAct(a); setActFormOpen(true); } : undefined}
      />

      {/* Task form dialog */}
      <TaskForm
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        task={editingTask}
        isManager={isManager}
        onSuccess={fetchData}
      />

      {/* Activity form dialog */}
      <ActivityForm
        open={actFormOpen}
        onOpenChange={setActFormOpen}
        activity={editingAct}
        isManager={isManager}
        onSuccess={fetchData}
      />
    </div>
  );
}
