'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { CalendarDays, Plus, CheckSquare, Clock } from 'lucide-react';
import { format, isSameDay, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import TaskForm from '@/components/dashboard/TaskForm';
import CalendarGrid from '@/components/dashboard/CalendarGrid';
import type { Task } from '@/lib/types';
import { statusColors, statusLabels, priorityColors, priorityLabels } from '@/lib/theme-maps';

export default function CalendarContent() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const fetchAttempted = useRef(false);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || data || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fetchAttempted.current) {
      return;
    }
    fetchAttempted.current = true;
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        setLoading(false);
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [loading]);

  const dayTasks = useMemo(
    () =>
      tasks.filter((t) => {
        if (!t.dueDate) return false;
        return isSameDay(new Date(t.dueDate), selectedDay);
      }),
    [tasks, selectedDay]
  );

  let capitalizedLabel = '';
  try {
    const selectedDayLabel = format(selectedDay, "EEEE, d 'de' MMMM yyyy", { locale: es });
    capitalizedLabel = selectedDayLabel.charAt(0).toUpperCase() + selectedDayLabel.slice(1);
  } catch {
    capitalizedLabel = selectedDay.toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
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
          <p className="text-white/40 text-sm mt-1">Visualiza tus tareas por fecha</p>
        </div>
        <Button
          onClick={() => {
            setEditingTask(null);
            setFormOpen(true);
          }}
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

          <div className="p-4 md:p-5 max-h-[480px] overflow-y-auto custom-scrollbar">
            {dayTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckSquare className="w-8 h-8 text-white/15 mb-3" />
                <p className="text-sm text-white/40">Sin tareas para este día</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 text-white/40 hover:text-white hover:bg-white/[0.06] text-xs gap-1"
                  onClick={() => {
                    setEditingTask(null);
                    setFormOpen(true);
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar tarea
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {dayTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-white/[0.03] border border-white/[0.05] rounded-lg p-3.5 hover:border-white/[0.08] transition-colors cursor-pointer"
                    onClick={() => {
                      setEditingTask(task);
                      setFormOpen(true);
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 mt-0.5 ${statusColors[task.status] || 'status-pending'}`}
                      >
                        {statusLabels[task.status] || task.status}
                      </span>
                      <p className="text-sm font-medium text-white/90 leading-tight">
                        {task.title}
                      </p>
                    </div>
                    {task.description && (
                      <p className="text-xs text-white/35 mt-2 line-clamp-2 pl-1">
                        {task.description}
                      </p>
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <TaskForm
        open={formOpen}
        onOpenChange={setFormOpen}
        task={editingTask}
        onSuccess={fetchTasks}
      />
    </div>
  );
}
