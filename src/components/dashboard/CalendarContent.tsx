'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  CalendarDays, Plus, CheckSquare, Clock, CalendarRange, Sparkles,
} from 'lucide-react';
import { format, isSameDay, isToday, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import TaskForm from '@/components/dashboard/TaskForm';
import ActivityForm from '@/components/dashboard/ActivityForm';
import CalendarGrid from '@/components/dashboard/CalendarGrid';
import type { Task, Activity } from '@/lib/types';
import {
  statusColors, statusLabels, priorityColors, priorityLabels,
  activityStatusColors, activityStatusLabels,
} from '@/lib/theme-maps';

const MANAGER_ROLES = ['ADMIN', 'PROJECT_MANAGER'];
const POLL_INTERVAL = 30_000; // 30 s

export default function CalendarContent() {
  const { data: session } = useSession();
  const [tasks,        setTasks]      = useState<Task[]>([]);
  const [activities,   setActivities] = useState<Activity[]>([]);
  const [loading,      setLoading]    = useState(true);
  const [selectedDay,  setSelectedDay] = useState<Date>(new Date());
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask,  setEditingTask]  = useState<Task | null>(null);
  const [actFormOpen,  setActFormOpen]  = useState(false);
  const [editingAct,   setEditingAct]   = useState<Activity | null>(null);

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

  // Safety timeout in case DB is slow
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 12_000);
    return () => clearTimeout(t);
  }, []);

  const dayTasks = useMemo(
    () => tasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), selectedDay)),
    [tasks, selectedDay]
  );

  const dayActivities = useMemo(
    () =>
      activities.filter((a) => {
        const start = new Date(a.startDate);
        const end   = a.endDate ? new Date(a.endDate) : start;
        try {
          return isWithinInterval(startOfDay(selectedDay), {
            start: startOfDay(start),
            end:   endOfDay(end),
          });
        } catch {
          return isSameDay(start, selectedDay);
        }
      }),
    [activities, selectedDay]
  );

  const capitalizedLabel = useMemo(() => {
    try {
      const label = format(selectedDay, "EEEE, d 'de' MMMM", { locale: es });
      return label.charAt(0).toUpperCase() + label.slice(1);
    } catch {
      return selectedDay.toLocaleDateString('es-MX', { weekday: 'long', month: 'long', day: 'numeric' });
    }
  }, [selectedDay]);

  const total = dayTasks.length + dayActivities.length;

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
            <Skeleton className="h-12 w-full rounded-xl bg-white/[0.06]" />
            {Array.from({ length: 3 }).map((_, i) => (
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
            Visualiza tareas y actividades · actualiza cada 30 s
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isManager && (
            <Button
              variant="outline"
              onClick={() => { setEditingAct(null); setActFormOpen(true); }}
              className="border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.06] gap-2 text-sm"
            >
              <CalendarRange className="w-4 h-4" />
              Actividad
            </Button>
          )}
          <Button
            onClick={() => { setEditingTask(null); setTaskFormOpen(true); }}
            className="bg-brand hover:bg-brand-dark text-white gap-2"
          >
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
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
          />
        </div>

        {/* ── Day detail panel ── */}
        <div className="bg-[#15151c] border border-white/[0.06] rounded-xl overflow-hidden flex flex-col">
          {/* Panel header */}
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

          {/* Panel body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-5 space-y-4">
            {/* Activities */}
            {dayActivities.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/40 uppercase tracking-wider">
                  <CalendarRange className="w-3 h-3" />
                  Actividades ({dayActivities.length})
                </div>
                {dayActivities.map((act) => (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => { setEditingAct(act); setActFormOpen(true); }}
                    className="w-full text-left bg-brand/[0.07] border border-brand/20 rounded-lg p-3 hover:border-brand/40 hover:bg-brand/[0.10] transition-colors group"
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
                    <div className="flex items-center gap-3 mt-2 pl-1">
                      <span className={`text-[10px] font-medium ${priorityColors[act.priority] || 'text-white/40'}`}>
                        {priorityLabels[act.priority] || act.priority}
                      </span>
                      {act.endDate && (
                        <span className="text-[10px] text-white/25">
                          hasta {format(new Date(act.endDate), 'd MMM', { locale: es })}
                        </span>
                      )}
                      {act.assignedUser && (
                        <div className="flex items-center gap-1.5 ml-auto">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={(act.assignedUser as { image?: string }).image ?? undefined} />
                            <AvatarFallback
                              className="text-[9px] font-medium"
                              style={{
                                backgroundColor: (act.assignedUser.color || '#7c3aed') + '33',
                                color: act.assignedUser.color || '#7c3aed',
                              }}
                            >
                              {(act.assignedUser.name || act.assignedUser.email).slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[10px] text-white/40 truncate max-w-[80px]">
                            {act.assignedUser.name || act.assignedUser.email}
                          </span>
                        </div>
                      )}
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
                  <button
                    key={task.id}
                    type="button"
                    className="w-full text-left bg-white/[0.03] border border-white/[0.05] rounded-lg p-3.5 hover:border-white/[0.10] hover:bg-white/[0.05] transition-colors group"
                    onClick={() => { setEditingTask(task); setTaskFormOpen(true); }}
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
                      {task.assignedUser && (
                        <div className="flex items-center gap-1.5 ml-auto">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={(task.assignedUser as { image?: string }).image ?? undefined} />
                            <AvatarFallback
                              className="text-[9px] font-medium"
                              style={{
                                backgroundColor: (task.assignedUser.color || '#7c3aed') + '33',
                                color: task.assignedUser.color || '#7c3aed',
                              }}
                            >
                              {(task.assignedUser.name || task.assignedUser.email).slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[10px] text-white/40 truncate max-w-[80px]">
                            {task.assignedUser.name || task.assignedUser.email}
                          </span>
                        </div>
                      )}
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/40 hover:text-white hover:bg-white/[0.06] text-xs gap-1"
                    onClick={() => { setEditingTask(null); setTaskFormOpen(true); }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tarea
                  </Button>
                  {isManager && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white/40 hover:text-white hover:bg-white/[0.06] text-xs gap-1"
                      onClick={() => { setEditingAct(null); setActFormOpen(true); }}
                    >
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

      {/* Task form dialog */}
      <TaskForm
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        task={editingTask}
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
