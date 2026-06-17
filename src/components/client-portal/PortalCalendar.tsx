'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isToday, addMonths, subMonths, isSameMonth,
} from 'date-fns';
import type { Task } from '@/lib/types';
import { sameLocalDay } from '@/hooks/client-portal/useClientCalendar';

const DAY_NAMES   = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function getTasksForDay(tasks: Task[], day: Date): Task[] {
  return tasks.filter((t) => {
    if (t.dueDate   && sameLocalDay(t.dueDate,   day)) return true;
    if (t.startDate && sameLocalDay(t.startDate, day)) return true;
    if (!t.dueDate && !t.startDate && t.createdAt && sameLocalDay(t.createdAt, day)) return true;
    return false;
  });
}

interface CalendarProps {
  tasks:         Task[];
  appointments?: any[];
  onSelectDay:   (day: Date) => void;
  getDayEvents?: (day: Date) => { color: string }[];
}

export function PortalCalendar({ tasks, appointments = [], onSelectDay, getDayEvents }: CalendarProps) {
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
        <h2 className="text-sm font-medium text-white/70">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm"
            className="h-7 w-7 p-0 text-white/50 hover:text-white hover:bg-white/[0.06]"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm"
            className="h-7 px-2 text-xs text-white/50 hover:text-white hover:bg-white/[0.06]"
            onClick={() => setCurrentMonth(new Date())}>
            Hoy
          </Button>
          <Button variant="ghost" size="sm"
            className="h-7 w-7 p-0 text-white/50 hover:text-white hover:bg-white/[0.06]"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7">
        {DAY_NAMES.map((name) => (
          <div key={name} className="text-center text-[10px] font-medium text-white/25 py-1.5 uppercase tracking-wide">{name}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 border-t border-l border-white/[0.04]">
        {days.map((day) => {
          const dayTasks       = getTasksForDay(tasks, day);
          const dayAppts       = appointments.filter((a: any) => a.date && sameLocalDay(a.date, day));
          const calEvents      = getDayEvents ? getDayEvents(day) : [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const today          = isToday(day);
          const hasItems       = getDayEvents ? calEvents.length > 0 : dayTasks.length > 0 || dayAppts.length > 0;

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => { if (isCurrentMonth) onSelectDay(day); }}
              className={`
                relative flex flex-col items-center justify-start min-h-[56px] md:min-h-[64px]
                border-b border-r border-white/[0.04] pt-1.5 pb-1 px-1
                transition-colors duration-150
                ${isCurrentMonth ? 'text-white/80' : 'text-white/15 cursor-default'}
                ${today ? 'bg-brand/[0.06]' : ''}
                ${isCurrentMonth && !today ? 'hover:bg-white/[0.03]' : ''}
              `}
            >
              <span className={`text-xs leading-none ${
                today
                  ? 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand text-white text-[10px] font-medium'
                  : isCurrentMonth ? 'text-white/50' : 'text-white/15'
              }`}>
                {format(day, 'd')}
              </span>

              {hasItems && isCurrentMonth && (
                <div className="flex items-center gap-0.5 mt-1 flex-wrap justify-center">
                  {getDayEvents
                    ? calEvents.slice(0, 4).map((e, i) => (
                        <span key={i} className={`w-1 h-1 rounded-full ${
                          e.color === 'green'  ? 'bg-green-400'  :
                          e.color === 'blue'   ? 'bg-blue-400'   :
                          e.color === 'purple' ? 'bg-purple-400' :
                          'bg-amber-400'
                        }`} />
                      ))
                    : <>
                        {dayTasks.slice(0, 3).map((t, i) => (
                          <span key={`t${i}`} className={`w-1 h-1 rounded-full ${
                            t.status === 'completed' || (t as any).deliverableStatus === 'approved'
                              ? 'bg-green-400' : 'bg-amber-400'
                          }`} />
                        ))}
                        {dayAppts.slice(0, 2).map((_a, i) => (
                          <span key={`a${i}`} className="w-1 h-1 rounded-full bg-blue-400" />
                        ))}
                      </>
                  }
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4 pt-1 border-t border-white/[0.04]">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
          <span className="text-[10px] text-white/25">Pendientes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
          <span className="text-[10px] text-white/25">Completadas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
          <span className="text-[10px] text-white/25">Reuniones</span>
        </div>
      </div>
    </div>
  );
}
