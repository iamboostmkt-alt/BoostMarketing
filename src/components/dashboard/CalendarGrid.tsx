'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Video, Zap } from 'lucide-react';
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
  milestones?:   any[];
  selectedDay:   Date | null;
  onSelectDay:   (day: Date) => void;
}

const DAY_NAMES   = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// Colores de rango por prioridad
const rangeColors: Record<string, string> = {
  low:    'bg-emerald-400/20',
  medium: 'bg-amber-400/20',
  high:   'bg-red-400/25',
  urgent: 'bg-red-500/35',
};

// Dots por tipo
const taskDotColors: Record<string, string> = {
  low:    'bg-emerald-400',
  medium: 'bg-amber-400',
  high:   'bg-red-400',
  urgent: 'bg-red-600',
};

// Colores de borde por prioridad para rangos
const rangeBorderColors: Record<string, string> = {
  low:    'border-emerald-400/40',
  medium: 'border-amber-400/40',
  high:   'border-red-400/40',
  urgent: 'border-red-500/50',
};

function getTasksForDay(tasks: Task[], day: Date): Task[] {
  return tasks.filter((t) =>
    t.dueDate &&
    isSameDay(new Date(t.dueDate), day) &&
    t.status !== 'completed' &&
    t.status !== 'approved' &&
    (t as any).deliverableStatus !== 'approved'
  );
}

function getAppointmentsForDay(appointments: Appointment[], day: Date): Appointment[] {
  return appointments.filter((a) => { try { return isSameDay(new Date(a.date), day); } catch { return false; } });
}

function getMilestonesForDay(milestones: any[], day: Date): any[] {
  return milestones.filter((m) => { try { return isSameDay(new Date(m.date), day); } catch { return false; } });
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

function getRangeTasksForDay(tasks: Task[], day: Date): Task[] {
  return tasks.filter((t) => {
    if (!t.startDate || !t.dueDate) return false;
    const start = startOfDay(new Date(t.startDate));
    const end   = endOfDay(new Date(t.dueDate));
    if (differenceInCalendarDays(end, start) < 1) return false;
    return isWithinInterval(startOfDay(day), { start, end });
  });
}

function getRangeBarProps(task: Task, day: Date, days: Date[]) {
  const start  = startOfDay(new Date(task.startDate!));
  const end    = startOfDay(new Date(task.dueDate!));
  const dayIdx = days.findIndex((d) => isSameDay(d, day));
  if (dayIdx === -1) return null;
  const isStart  = isSameDay(day, start);
  const isEnd    = isSameDay(day, end);
  const isFirst  = dayIdx % 7 === 0;
  const isLast   = dayIdx % 7 === 6;
  return { isStart, isEnd, roundLeft: isStart || isFirst, roundRight: isEnd || isLast };
}

export default function CalendarGrid({ tasks, activities = [], appointments = [], milestones = [], selectedDay, onSelectDay }: CalendarGridProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd   = endOfMonth(currentMonth);
    const calStart   = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd     = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const rangeTasks = useMemo(() =>
    tasks.filter((t) => t.startDate && t.dueDate && differenceInCalendarDays(new Date(t.dueDate), new Date(t.startDate)) >= 1),
  [tasks]);

  const monthLabel = `${MONTH_NAMES[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-white/70">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/50 hover:text-white hover:bg-white/[0.06]" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs text-white/50 hover:text-white hover:bg-white/[0.06]" onClick={() => setCurrentMonth(new Date())}>
            Hoy
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/50 hover:text-white hover:bg-white/[0.06]" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7">
        {DAY_NAMES.map(name => (
          <div key={name} className="text-center text-[11px] font-medium text-white/25 py-2 uppercase tracking-wide">{name}</div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 border-t border-l border-white/[0.04]">
        {days.map((day, dayIdx) => {
          const dayTasks        = getTasksForDay(tasks, day);
          const dayActivities   = getActivitiesForDay(activities, day);
          const dayAppointments = getAppointmentsForDay(appointments, day);
          const dayMilestones   = getMilestonesForDay(milestones, day);
          const dayRangeTasks   = getRangeTasksForDay(rangeTasks, day);
          const isCurrentMonth  = isSameMonth(day, currentMonth);
          const isSelected      = selectedDay && isSameDay(day, selectedDay);
          const today           = isToday(day);
          const hasAppointment  = dayAppointments.length > 0;
          const urgentTask      = dayTasks.find(t => t.priority === 'urgent' || t.priority === 'high');

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              className={`
                relative flex flex-col items-start justify-start min-h-[68px] md:min-h-[80px] rounded-lg transition-all overflow-hidden
                border pt-1.5 pb-1 px-1
                ${isCurrentMonth ? 'text-white/80' : 'text-white/20'}
                ${today && !isSelected ? 'border-brand/50 bg-brand/[0.07]' : 'border-transparent'}
                ${isSelected ? 'border-brand bg-brand/20 text-white shadow-lg shadow-brand/10' : ''}
                ${!isSelected && !today ? 'hover:bg-white/[0.04] hover:border-white/[0.08]' : ''}
                ${hasAppointment && !isSelected ? 'ring-1 ring-inset ring-green-400/20' : ''}
              `}
            >
              {/* Appointment glow top border */}
              {hasAppointment && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-400/60 via-emerald-300/80 to-green-400/60 rounded-t-lg" />
              )}

              {/* Urgent indicator */}
              {urgentTask && !isSelected && (
                <div className="absolute top-1 right-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                </div>
              )}

              {/* Day number */}
              <span className={`relative z-10 text-xs w-full text-left mb-1 leading-none ${
                today
                  ? 'text-brand-light font-semibold'
                  : isCurrentMonth
                  ? 'text-white/50 font-normal'
                  : 'text-white/15 font-normal'
              } ${isSelected ? 'text-white font-medium' : ''}`}>
                {today ? (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand text-white text-[10px] font-medium">
                    {format(day, 'd')}
                  </span>
                ) : format(day, 'd')}
              </span>

              {/* Task title chips */}
              <div className="w-full space-y-px mb-0.5">
                {dayTasks.slice(0, 1).map((task, i) => (
                  <div
                    key={`chip-${task.id}-${i}`}
                    className={`w-full truncate text-[10px] font-medium px-1 py-px rounded-sm leading-tight ${
                      task.priority === 'urgent' ? 'bg-red-500/20 text-red-300/90'
                      : task.priority === 'high' ? 'bg-orange-500/15 text-orange-300/80'
                      : 'bg-white/[0.06] text-white/55'
                    }`}
                    title={task.title}
                  >
                    {task.title}
                  </div>
                ))}
                {dayAppointments.slice(0, 1).map((apt, i) => (
                  <div key={`aptchip-${i}`}
                    className="w-full truncate text-[10px] font-medium px-1 py-px rounded-sm leading-tight bg-green-500/15 text-green-300/80"
                    title={apt.name}>
                    {apt.name}
                  </div>
                ))}
                {(dayTasks.length + dayAppointments.length) > 2 && (
                  <div className="text-[10px] text-white/25 px-1">
                    +{dayTasks.length + dayAppointments.length - 2}
                  </div>
                )}
              </div>

              {/* Range task bars */}
              <div className="w-full space-y-px">
                {dayRangeTasks.slice(0, 2).map((task, i) => {
                  const barProps = getRangeBarProps(task, day, days);
                  if (!barProps) return null;
                  const { roundLeft, roundRight } = barProps;
                  const color = rangeColors[task.priority] || 'bg-violet-400/20';
                  return (
                    <div
                      key={`range-${task.id}-${i}`}
                      className={`h-1.5 ${color} ${roundLeft ? 'rounded-l-full ml-0.5' : '-ml-1'} ${roundRight ? 'rounded-r-full mr-0.5' : '-mr-1'}`}
                      title={task.title}
                    />
                  );
                })}
              </div>

              {/* Bottom indicators */}
              <div className="relative z-10 flex items-center gap-0.5 mt-auto flex-wrap justify-center w-full pt-0.5">
                {dayActivities.slice(0, 1).map((_, i) => (
                  <span key={`a${i}`} className="w-1.5 h-1.5 rounded-full bg-violet-400/80" title="Actividad" />
                ))}
                {dayMilestones.slice(0, 1).map((m, i) => (
                  <span key={`m${i}`} className="w-1.5 h-1.5 rounded-full bg-yellow-400" title={m.title} />
                ))}
                {urgentTask && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" title="Urgente" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/[0.04]">
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-1 rounded-full bg-amber-400/60 inline-block" />
          <span className="text-[11px] text-white/30">Rango tarea</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          <span className="text-[11px] text-white/30">Vencimiento</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
          <span className="text-[11px] text-white/30">Alta prioridad</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-violet-400/80 inline-block" />
          <span className="text-[11px] text-white/30">Actividad</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
          <span className="text-[11px] text-white/30">Videollamada</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
          <span className="text-[11px] text-white/30">Urgente</span>
        </div>
      </div>
    </div>
  );
}
