'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Video, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Task, Activity, Appointment } from '@/lib/types';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameDay, isToday,
  addMonths, subMonths, addWeeks, subWeeks, isSameMonth, isWithinInterval,
  startOfDay, endOfDay, differenceInCalendarDays, addDays,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

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
  low:    'bg-violet-400/20',
  medium: 'bg-violet-500/25',
  high:   'bg-violet-600/30',
  urgent: 'bg-violet-700/35',
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

type CalendarView = 'month' | 'week' | 'agenda';

export default function CalendarGrid({ tasks, activities = [], appointments = [], milestones = [], selectedDay, onSelectDay }: CalendarGridProps) {
  const [view, setView] = useState<CalendarView>('month');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd   = endOfMonth(currentMonth);
    const calStart   = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd     = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const end   = endOfWeek(currentWeek,   { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentWeek]);

  const weekLabel = (() => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const end   = endOfWeek(currentWeek,   { weekStartsOn: 1 });
    if (start.getMonth() === end.getMonth()) {
      return `${format(start, 'd')} - ${format(end, 'd')} de ${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`;
    }
    return `${format(start, 'd MMM')} - ${format(end, 'd MMM yyyy')}`;
  })();

  const rangeTasks = useMemo(() =>
    tasks.filter((t) => t.startDate && t.dueDate && differenceInCalendarDays(new Date(t.dueDate), new Date(t.startDate)) >= 1),
  [tasks]);

  const monthLabel = `${MONTH_NAMES[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-white/50 hover:text-white hover:bg-white/[0.06]"
            onClick={() => view === 'month' ? setCurrentMonth(m => subMonths(m, 1)) : setCurrentWeek(w => subWeeks(w, 1))}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <span className="text-sm font-medium text-white/70 min-w-[180px] text-center">
            {view === 'month' ? monthLabel : weekLabel}
          </span>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-white/50 hover:text-white hover:bg-white/[0.06]"
            onClick={() => view === 'month' ? setCurrentMonth(m => addMonths(m, 1)) : setCurrentWeek(w => addWeeks(w, 1))}>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-white/50 hover:text-white hover:bg-white/[0.06]"
            onClick={() => { setCurrentMonth(new Date()); setCurrentWeek(new Date()); }}>
            Hoy
          </Button>
        </div>
        <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-0.5">
          {(['month', 'week', 'agenda'] as CalendarView[]).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-2.5 py-1 text-xs rounded-md transition-all ${view === v ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/60'}`}>
              {v === 'month' ? 'Mes' : v === 'week' ? 'Semana' : 'Agenda'}
            </button>
          ))}
        </div>
      </div>

      {view === 'month' && (
        <div className="space-y-4">
      {/* Day names */}
      <div className="grid grid-cols-7 border-b border-white/[0.06]">
        {DAY_NAMES.map(name => (
          <div key={name} className="text-center text-[10px] font-medium text-white/20 py-2 uppercase tracking-widest">{name}</div>
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
                    className={`w-full truncate text-[10px] font-medium px-1 py-px rounded-sm leading-tight border-l-2 ${
                      today
                        ? 'bg-brand/20 border-brand text-white'
                        : task.priority === 'urgent' ? 'bg-red-500/10 border-red-500/70 text-white/80'
                        : task.priority === 'high' ? 'bg-orange-400/10 border-orange-400/60 text-white/80'
                        : task.priority === 'medium' ? 'bg-violet-400/10 border-violet-400/60 text-white/80'
                        : 'bg-violet-500/[0.08] border-violet-500/30 text-white/70'
                    }`}
                    title={task.title}
                  >
                    {task.title}
                  </div>
                ))}
                {dayAppointments.slice(0, 1).map((apt, i) => (
                  <div key={`aptchip-${i}`}
                    className="w-full truncate text-[10px] font-medium px-1 py-px rounded-sm leading-tight border-l-2 border-green-500/60 bg-white/[0.03] text-white/60"
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
        </div>
      )}

      {/* Week View */}
      {view === 'week' && (
        <div className="space-y-2">
          <div className="grid grid-cols-7">
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="text-center py-2 space-y-1">
                <p className="text-[10px] font-medium text-white/25 uppercase tracking-wide">
                  {format(day, 'EEE', { locale: es })}
                </p>
                <button
                  onClick={() => onSelectDay(day)}
                  className={`mx-auto flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium transition-colors ${
                    isToday(day)
                      ? 'bg-brand text-white'
                      : selectedDay && isSameDay(day, selectedDay)
                      ? 'bg-white/[0.12] text-white'
                      : 'text-white/60 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  {format(day, 'd')}
                </button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 border-t border-l border-white/[0.04]">
            {weekDays.map((day) => {
              const dayTasks        = getTasksForDay(tasks, day);
              const dayAppointments = getAppointmentsForDay(appointments, day);
              const dayMilestones   = getMilestonesForDay(milestones, day);
              const dayRangeTasks   = getRangeTasksForDay(rangeTasks, day);
              const isSelected      = selectedDay && isSameDay(day, selectedDay);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => onSelectDay(day)}
                  className={`
                    flex flex-col items-start min-h-[120px] border-b border-r border-white/[0.04]
                    p-1.5 transition-colors duration-150 text-left
                    ${isToday(day) ? 'bg-brand/[0.04]' : ''}
                    ${isSelected ? 'bg-brand/[0.08]' : 'hover:bg-white/[0.02]'}
                  `}
                >
                  {/* Range bars */}
                  {dayRangeTasks.slice(0, 2).map((task, i) => {
                    const barProps = getRangeBarProps(task, day, weekDays);
                    if (!barProps) return null;
                    const { roundLeft, roundRight } = barProps;
                    const color = rangeColors[task.priority] || 'bg-violet-400/20';
                    return (
                      <div key={`range-${task.id}-${i}`}
                        className={`h-1.5 w-full mb-1 ${color} ${roundLeft ? 'rounded-l-full' : ''} ${roundRight ? 'rounded-r-full' : ''}`}
                        title={task.title}
                      />
                    );
                  })}
                  {/* Task chips */}
                  <div className="w-full space-y-px">
                    {dayTasks.slice(0, 4).map((task, i) => (
                      <div key={`chip-${task.id}-${i}`}
                        className={`w-full truncate text-[10px] font-medium px-1 py-px rounded-sm leading-tight border-l-2 bg-white/[0.03] text-white/60 ${
                          task.priority === 'urgent' ? 'border-red-500/70'
                          : task.priority === 'high' ? 'border-orange-400/60'
                          : task.priority === 'medium' ? 'border-violet-400/50'
                          : 'border-white/20'
                        }`}
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    ))}
                    {dayAppointments.slice(0, 2).map((apt, i) => (
                      <div key={`apt-${i}`}
                        className="w-full truncate text-[10px] font-medium px-1 py-px rounded-sm leading-tight bg-green-500/15 text-green-300/80"
                        title={apt.name}
                      >
                        {apt.name}
                      </div>
                    ))}
                    {dayMilestones.slice(0, 1).map((m, i) => (
                      <div key={`mil-${i}`}
                        className="w-full truncate text-[10px] font-medium px-1 py-px rounded-sm leading-tight bg-amber-500/15 text-amber-300/80"
                        title={m.title}
                      >
                        🏁 {m.title}
                      </div>
                    ))}
                    {(dayTasks.length + dayAppointments.length) > 5 && (
                      <div className="text-[10px] text-white/25 px-1">
                        +{dayTasks.length + dayAppointments.length - 5}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Agenda View */}
      {view === 'agenda' && (
        <div className="space-y-1">
          {Array.from({ length: 14 }).map((_, i) => {
            const day = addDays(startOfDay(new Date()), i);
            const dayTasks        = getTasksForDay(tasks, day);
            const dayAppointments = getAppointmentsForDay(appointments, day);
            const dayMilestones   = getMilestonesForDay(milestones, day);
            const total = dayTasks.length + dayAppointments.length + dayMilestones.length;
            if (total === 0 && i > 0) return null;
            return (
              <motion.div
                key={day.toISOString()}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                className={`rounded-xl overflow-hidden ${isToday(day) ? 'ring-1 ring-brand/30' : ''}`}
              >
                {/* Day header */}
                <button
                  type="button"
                  onClick={() => onSelectDay(day)}
                  className={`w-full flex items-center gap-3 px-3 py-2 transition-colors ${
                    isToday(day) ? 'bg-brand/[0.08]' : 'bg-white/[0.02] hover:bg-white/[0.04]'
                  }`}
                >
                  <div className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 ${
                    isToday(day) ? 'bg-brand text-white' : 'bg-white/[0.06] text-white/50'
                  }`}>
                    <span className="text-xs font-semibold">{format(day, 'd')}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`text-xs font-medium capitalize ${isToday(day) ? 'text-white' : 'text-white/50'}`}>
                      {format(day, "EEEE d 'de' MMMM", { locale: es })}
                    </p>
                    {isToday(day) && <p className="text-[10px] text-brand-light/70">Hoy</p>}
                  </div>
                  {total > 0 && (
                    <span className="text-[10px] text-white/25 bg-white/[0.04] px-1.5 py-0.5 rounded-full">
                      {total}
                    </span>
                  )}
                </button>

                {/* Events */}
                {total > 0 && (
                  <div className="divide-y divide-white/[0.03]">
                    {dayTasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-3 px-3 py-2 hover:bg-white/[0.02] transition-colors">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          task.priority === 'urgent' ? 'bg-red-500' :
                          task.priority === 'high' ? 'bg-orange-400' :
                          task.priority === 'medium' ? 'bg-violet-400' : 'bg-white/30'
                        }`} />
                        <p className="text-xs text-white/70 flex-1 truncate">{task.title}</p>
                        {task.dueDate && (
                          <span className="text-[10px] text-white/25 shrink-0">
                            {format(new Date(task.dueDate), 'HH:mm') !== '00:00' ? format(new Date(task.dueDate), 'HH:mm') : ''}
                          </span>
                        )}
                        {(task as any).client?.name && (
                          <span className="text-[10px] text-white/20 shrink-0 hidden sm:inline">{(task as any).client.name}</span>
                        )}
                      </div>
                    ))}
                    {dayAppointments.map((apt) => (
                      <div key={apt.id} className="flex items-center gap-3 px-3 py-2 hover:bg-white/[0.02] transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                        <p className="text-xs text-white/70 flex-1 truncate">{apt.name}</p>
                        <span className="text-[10px] text-white/25 shrink-0">
                          {format(new Date(apt.date), 'HH:mm')}
                        </span>
                      </div>
                    ))}
                    {dayMilestones.map((m) => (
                      <div key={m.id} className="flex items-center gap-3 px-3 py-2 hover:bg-white/[0.02] transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        <p className="text-xs text-white/70 flex-1 truncate">🏁 {m.title}</p>
                      </div>
                    ))}
                  </div>
                )}
                {total === 0 && isToday(day) && (
                  <div className="px-3 py-3 text-[11px] text-white/20">Sin eventos hoy</div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
      {/* Month View */}
      {view === 'month' && (
        <>
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/[0.04]">
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-1 rounded-full bg-violet-400/60 inline-block" />
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
        </>
      )}
    </div>
  );
}