'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Task, Activity, Appointment } from '@/lib/types';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameDay, isToday,
  addMonths, subMonths, isSameMonth, isWithinInterval,
  startOfDay, endOfDay, differenceInCalendarDays,
} from 'date-fns';

interface CalendarGridProps {
  tasks:         Task[];
  activities?:   Activity[];
  appointments?: Appointment[];
  selectedDay:   Date | null;
  onSelectDay:   (day: Date) => void;
}

const DAY_NAMES   = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

const priorityBarColors: Record<string, string> = {
  low:    'bg-emerald-500/70',
  medium: 'bg-amber-500/70',
  high:   'bg-red-500/70',
  urgent: 'bg-red-600/90',
};
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
  return appointments.filter((a) => { try { return isSameDay(new Date(a.date), day); } catch { return false; } });
}
function getActivitiesForDay(activities: Activity[], day: Date): Activity[] {
  return activities.filter((a) => {
    try {
      const start = startOfDay(new Date(a.startDate));
      const end   = a.endDate ? endOfDay(new Date(a.endDate)) : endOfDay(start);
      return isWithinInterval(startOfDay(day), { start, end });
    } catch { return isSameDay(new Date(a.startDate), day); }
  });
}

// Tareas con rango (startDate → dueDate, al menos 2 dias)
function getRangeTasksForDay(tasks: Task[], day: Date): Task[] {
  return tasks.filter((t) => {
    if (!t.startDate || !t.dueDate) return false;
    const start = startOfDay(new Date(t.startDate));
    const end   = endOfDay(new Date(t.dueDate));
    const diff  = differenceInCalendarDays(end, start);
    if (diff < 1) return false;
    return isWithinInterval(startOfDay(day), { start, end });
  });
}

// Determinar posicion de la barra en la semana
function getRangeBarProps(task: Task, day: Date, days: Date[]) {
  const start  = startOfDay(new Date(task.startDate!));
  const end    = startOfDay(new Date(task.dueDate!));
  const dayIdx = days.findIndex((d) => isSameDay(d, day));
  if (dayIdx === -1) return null;

  const isStart  = isSameDay(day, start);
  const isEnd    = isSameDay(day, end);
  const isFirst  = dayIdx % 7 === 0; // primer dia de la fila
  const isLast   = dayIdx % 7 === 6; // ultimo dia de la fila

  const roundLeft  = isStart || isFirst;
  const roundRight = isEnd   || isLast;

  return { isStart, isEnd, roundLeft, roundRight };
}

export default function CalendarGrid({
  tasks, activities = [], appointments = [], selectedDay, onSelectDay,
}: CalendarGridProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd   = endOfMonth(currentMonth);
    const calStart   = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd     = endOfWeek(monthEnd,     { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  // Tareas con rango valido
  const rangeTasks = useMemo(() =>
    tasks.filter((t) => {
      if (!t.startDate || !t.dueDate) return false;
      return differenceInCalendarDays(new Date(t.dueDate), new Date(t.startDate)) >= 1;
    }),
  [tasks]);

  const monthLabel = `${MONTH_NAMES[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/50 hover:text-white hover:bg-white/[0.06]"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs text-white/50 hover:text-white hover:bg-white/[0.06]"
            onClick={() => setCurrentMonth(new Date())}>
            Hoy
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/50 hover:text-white hover:bg-white/[0.06]"
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

      {/* Calendar cells */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, dayIdx) => {
          const dayTasks        = getTasksForDay(tasks, day);
          const dayActivities   = getActivitiesForDay(activities, day);
          const dayAppointments = getAppointmentsForDay(appointments, day);
          const dayRangeTasks   = getRangeTasksForDay(rangeTasks, day);
          const isCurrentMonth  = isSameMonth(day, currentMonth);
          const isSelected      = selectedDay && isSameDay(day, selectedDay);
          const today           = isToday(day);
          const hasItems        = dayTasks.length > 0 || dayActivities.length > 0 || dayAppointments.length > 0 || dayRangeTasks.length > 0;

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              className={`
                relative flex flex-col items-start justify-start min-h-[64px] md:min-h-[76px] rounded-lg transition-all overflow-hidden
                border border-transparent pt-1.5 pb-1 px-1
                ${isCurrentMonth ? 'text-white/80' : 'text-white/20'}
                ${today && !isSelected ? 'border-brand/40 bg-brand/[0.06]' : ''}
                ${isSelected ? 'border-brand bg-brand/20 text-white shadow-lg shadow-brand/10' : ''}
                ${!isSelected && !today ? 'hover:bg-white/[0.03] hover:border-white/[0.06]' : ''}
              `}
            >
              {/* Day number */}
              <span className={`text-xs font-medium w-full text-center mb-0.5 ${today ? 'text-brand-light' : ''} ${isSelected ? 'text-white' : ''}`}>
                {format(day, 'd')}
              </span>

              {/* Range task bars */}
              {dayRangeTasks.slice(0, 2).map((task, i) => {
                const barProps = getRangeBarProps(task, day, days);
                if (!barProps) return null;
                const { roundLeft, roundRight } = barProps;
                return (
                  <div
                    key={`range-${task.id}-${i}`}
                    className={`
                      w-full h-1.5 mb-0.5
                      ${priorityBarColors[task.priority] || 'bg-white/30'}
                      ${roundLeft  ? 'rounded-l-full ml-0.5' : '-ml-1'}
                      ${roundRight ? 'rounded-r-full mr-0.5' : '-mr-1'}
                    `}
                    title={task.title}
                  />
                );
              })}

              {/* Indicator dots for non-range tasks */}
              {(dayTasks.length > 0 || dayActivities.length > 0 || dayAppointments.length > 0) && (
                <div className="flex items-center gap-0.5 mt-auto flex-wrap justify-center w-full">
                  {dayTasks.slice(0, 2).map((task, i) => (
                    <span key={`t${i}`} className={`w-1.5 h-1.5 rounded-full ${priorityDotColors[task.priority] || 'bg-white/30'}`} />
                  ))}
                  {dayActivities.slice(0, 1).map((_, i) => (
                    <span key={`a${i}`} className="w-1.5 h-1.5 rounded-full bg-brand-light/70" />
                  ))}
                  {dayAppointments.slice(0, 1).map((_, i) => (
                    <span key={`ap${i}`} className="w-1.5 h-1.5 rounded-full bg-green-400/80" />
                  ))}
                  {(dayTasks.length + dayActivities.length + dayAppointments.length) > 4 && (
                    <span className="text-[8px] text-white/30">
                      +{dayTasks.length + dayActivities.length + dayAppointments.length - 4}
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
          <span className="w-4 h-1.5 rounded-full bg-amber-400/70 inline-block" />
          <span className="text-[11px] text-white/30">Rango tarea</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          <span className="text-[11px] text-white/30">Vencimiento</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-brand-light/70 inline-block" />
          <span className="text-[11px] text-white/30">Actividades</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400/80 inline-block" />
          <span className="text-[11px] text-white/30">Reuniones</span>
        </div>
      </div>
    </div>
  );
}