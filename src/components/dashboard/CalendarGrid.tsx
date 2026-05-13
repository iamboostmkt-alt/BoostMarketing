'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Task, Activity, Appointment } from '@/lib/types';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  isSameMonth,
  isWithinInterval,
  startOfDay,
  endOfDay,
} from 'date-fns';

interface CalendarGridProps {
  tasks:        Task[];
  activities?:  Activity[];
  appointments?: Appointment[];
  selectedDay:  Date | null;
  onSelectDay:  (day: Date) => void;
}

const DAY_NAMES   = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

const priorityDotColors: Record<string, string> = {
  low:    'bg-emerald-400',
  medium: 'bg-amber-400',
  high:   'bg-red-400',
  urgent: 'bg-red-600',
};

function getTasksForDay(tasks: Task[], day: Date): Task[] {
  return tasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), day));
}

function getAppointmentsForDay(appointments: Appointment[], day: Date): Appointment[] {
  return appointments.filter((a) => {
    try { return isSameDay(new Date(a.date), day); } catch { return false; }
  });
}

function getActivitiesForDay(activities: Activity[], day: Date): Activity[] {
  return activities.filter((a) => {
    try {
      const start = startOfDay(new Date(a.startDate));
      const end   = a.endDate ? endOfDay(new Date(a.endDate)) : endOfDay(start);
      return isWithinInterval(startOfDay(day), { start, end });
    } catch {
      return isSameDay(new Date(a.startDate), day);
    }
  });
}

export default function CalendarGrid({
  tasks,
  activities   = [],
  appointments = [],
  selectedDay,
  onSelectDay,
}: CalendarGridProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd   = endOfMonth(currentMonth);
    const calStart   = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd     = endOfWeek(monthEnd,   { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const monthLabel = `${MONTH_NAMES[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

  return (
    <div className="space-y-4">
      {/* Navigation header */}
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

      {/* Day names header */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_NAMES.map((name) => (
          <div key={name} className="text-center text-[11px] font-medium text-white/30 py-2">
            {name}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayTasks      = getTasksForDay(tasks, day);
          const dayActivities   = getActivitiesForDay(activities, day);
          const dayAppointments = getAppointmentsForDay(appointments, day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected     = selectedDay && isSameDay(day, selectedDay);
          const today          = isToday(day);
          const hasItems       = dayTasks.length > 0 || dayActivities.length > 0 || dayAppointments.length > 0;

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              className={`
                relative flex flex-col items-center justify-center min-h-[56px] md:min-h-[68px] rounded-lg transition-all
                border border-transparent
                ${isCurrentMonth ? 'text-white/80' : 'text-white/20'}
                ${today && !isSelected ? 'border-brand/40 bg-brand/[0.06]' : ''}
                ${isSelected ? 'border-brand bg-brand/20 text-white shadow-lg shadow-brand/10' : ''}
                ${!isSelected && !today ? 'hover:bg-white/[0.03] hover:border-white/[0.06]' : ''}
              `}
            >
              <span className={`text-sm font-medium ${today ? 'text-brand-light' : ''} ${isSelected ? 'text-white' : ''}`}>
                {format(day, 'd')}
              </span>

              {/* Indicator dots */}
              {hasItems && (
                <div className="flex items-center gap-0.5 mt-0.5 flex-wrap justify-center max-w-[40px]">
                  {/* Task dots (priority colors) */}
                  {dayTasks.slice(0, 3).map((task, i) => (
                    <span key={`t${i}`}
                      className={`w-1.5 h-1.5 rounded-full ${priorityDotColors[task.priority] || 'bg-white/30'}`} />
                  ))}
                  {/* Activity dots (brand color) */}
                  {dayActivities.slice(0, 2).map((_, i) => (
                    <span key={`a${i}`} className="w-1.5 h-1.5 rounded-full bg-brand-light/70" />
                  ))}
                      {/* Appointment dots (green) */}
                      {dayAppointments.slice(0, 2).map((_, i) => (
                        <span key={`ap${i}`} className="w-1.5 h-1.5 rounded-full bg-green-400/80" />
                      ))}
                  {/* Overflow count */}
                  {(dayTasks.length + dayActivities.length) > 5 && (
                    <span className="text-[8px] text-white/30">
                      +{dayTasks.length + dayActivities.length + dayAppointments.length - 5}
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
          <span className="text-[11px] text-white/30">Tareas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-brand-light/70 inline-block" />
          <span className="text-[11px] text-white/30">Actividades</span>
        </div>
      </div>
    </div>
  );
}
