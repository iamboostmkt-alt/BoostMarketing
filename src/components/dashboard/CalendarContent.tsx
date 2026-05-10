'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { CalendarDays, Plus, CheckSquare, Clock, CalendarRange } from 'lucide-react';
import { format, isSameDay, isToday, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import TaskForm from '@/components/dashboard/TaskForm';
import CalendarGrid from '@/components/dashboard/CalendarGrid';
import type { Task, Activity } from '@/lib/types';
import {
  statusColors, statusLabels, priorityColors, priorityLabels,
  activityStatusColors, activityStatusLabels,
} from '@/lib/theme-maps';

const MANAGER_ROLES = ['ADMIN', 'PROJECT_MANAGER'];

export default function CalendarContent() {
  const { data: session } = useSession();
  const [tasks, setTasks]           = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [formOpen, setFormOpen]     = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const fetchAttempted = useRef(false);

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

  useEffect(() => {
    if (fetchAttempted.current) return;
    fetchAttempted.current = true;
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const timer = setTimeout(() => { if (loading) setLoading(false); }, 10000);
    return () => clearTimeout(timer);
  }, [loading]);

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

  let capitalizedLabel = '';
  try {
    const label = format(selectedDay, "EEEE, d 'de' MMMM yyyy", { locale: es });
    capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    capitalizedLabel = selectedDay.toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-36 rounded-lg bg-white/[0.06] animate-pulse" />
          <div className="h-9 w-28 rounded-lg bg-white/[0.06] animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-6 w-48 rounded bg-white/[0.06] animate-pulse" />
            <div className="h-64 w-full rounded-xl bg-white/[0.06] animate-pulse" />
          </div>
          <div className="space-y-3">
            <div className="h-6 w-32 rounded bg-white/[0.06] animate-pulse" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 w-full rounded-xl bg-white/[0.06] animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Calendario</h1>
          <p className="text-white/40 text-sm mt-1">Visualiza tareas y actividades por fecha</p>
        </div>
        <Button
          onClick={() => { setEditingTask(null); setFormOpen(true); }}
          className="bg-brand hover:bg-brand-dark text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva Tarea
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#15151c] border border-white/[0.06] rounded-xl p-4 md:p-6">
          <CalendarGrid
            tasks={tasks}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
          />
        </div>

        <div className="bg-[#15151c] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 md:p-5 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-brand-light" />
              <h3 className="text-sm font-semibold text-white">
                {isToday(selectedDay) ? 'Hoy' : ''}
              </h3>
            </div>
            <span className="text-[11px] text-white/40">{capitalizedLabel}</span>
          </div>

          <div className="p-4 md:p-5 max-h-[520px] overflow-y-auto custom-scrollbar space-y-4">
            {/* Activities section */}
            {dayActivities.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/40 uppercase tracking-wider">
                  <CalendarRange className="w-3 h-3" />
                  Actividades
                </div>
                {dayActivities.map((act) => (
                  <div
                    key={act.id}
                    className="bg-brand/[0.07] border border-brand/20 rounded-lg p-3 hover:border-brand/30 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 mt-0.5 ${activityStatusColors[act.status] || 'status-pending'}`}>
                        {activityStatusLabels[act.status] || act.status}
                      </span>
                      <p className="text-sm font-medium text-white/90 leading-tight">{act.title}</p>
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
                  </div>
                ))}
              </div>
            )}

            {/* Tasks section */}
            {dayTasks.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/40 uppercase tracking-wider">
                  <CheckSquare className="w-3 h-3" />
                  Tareas
                </div>
                {dayTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-white/[0.03] border border-white/[0.05] rounded-lg p-3.5 hover:border-white/[0.08] transition-colors cursor-pointer"
                    onClick={() => { setEditingTask(task); setFormOpen(true); }}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 mt-0.5 ${statusColors[task.status] || 'status-pending'}`}>
                        {statusLabels[task.status] || task.status}
                      </span>
                      <p className="text-sm font-medium text-white/90 leading-tight">{task.title}</p>
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
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {dayTasks.length === 0 && dayActivities.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckSquare className="w-8 h-8 text-white/15 mb-3" />
                <p className="text-sm text-white/40">Sin elementos para este día</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 text-white/40 hover:text-white hover:bg-white/[0.06] text-xs gap-1"
                  onClick={() => { setEditingTask(null); setFormOpen(true); }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar tarea
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <TaskForm
        open={formOpen}
        onOpenChange={setFormOpen}
        task={editingTask}
        onSuccess={fetchData}
      />
    </div>
  );
}
