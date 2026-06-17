'use client';

import { CheckCircle2, Plus, Pencil, Trash2, Video } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Task } from '@/lib/types';

interface ProjectTimelineProps {
  tasks:               Task[];
  appointments:        any[];
  milestones?:         any[];
  isManager?:          boolean;
  onAddMilestone?:     () => void;
  onEditMilestone?:    (id: string) => void;
  onDeleteMilestone?:  (id: string) => void;
}

export function ProjectTimeline({ tasks, appointments, milestones = [], isManager = false, onAddMilestone, onEditMilestone, onDeleteMilestone }: ProjectTimelineProps) {
  const now = new Date();
  const events = [
    ...tasks.filter(t => t.dueDate).map(t => ({
      id: t.id, date: new Date(t.dueDate!), title: t.title,
      type: 'task', status: t.status,
      isPast: new Date(t.dueDate!) < now,
    })),
    ...appointments.map(a => ({
      id: a.id, date: new Date(a.date), title: 'Videollamada: ' + a.name,
      type: 'appointment', status: a.status,
      isPast: new Date(a.date) < now,
    })),
    ...milestones.map(m => ({
      id: m.id, date: new Date(m.date), title: '🏁 ' + m.title,
      type: 'milestone', status: m.status,
      isPast: new Date(m.date) < now,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 12);

  if (events.length === 0 && milestones.length === 0) return null;

  const pendingEvents = events.filter(e => !e.isPast && e.status !== 'completed' && e.status !== 'approved');

  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-5 rounded-full bg-brand" />
          <p className="text-xs font-medium text-white/30 uppercase tracking-widest">Timeline</p>
        </div>
        {isManager && onAddMilestone && (
          <button type="button" onClick={onAddMilestone}
            className="flex items-center gap-1 text-[11px] text-yellow-400 hover:text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 rounded-md px-2 py-1 transition-colors">
            <Plus className="w-3 h-3" />Milestone
          </button>
        )}
      </div>
      <div className="relative">
        <div className="absolute left-3.5 top-2 bottom-2 w-px bg-white/[0.06]" />
        <div className="space-y-1">
          {events.map((event, i) => {
            const isCompleted = event.status === 'completed' || event.status === 'approved' || (event.type === 'appointment' && event.isPast);
            const isNext      = !isCompleted && pendingEvents[0]?.id === event.id;
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
                  ) : event.type === 'milestone' ? (
                    <div className="w-5 h-5 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center">
                      <span className="text-[8px]">🏁</span>
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
                <div className={`flex-1 ${i === events.length - 1 ? 'pb-0' : 'pb-4'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-tight ${isCompleted ? 'text-white/40 line-through' : isNext ? 'text-white font-medium' : 'text-white/70'}`}>
                      {event.title}
                    </p>
                    {isNext && <span className="text-[10px] bg-brand/20 text-brand-light px-2 py-0.5 rounded-full shrink-0">Siguiente</span>}
                  </div>
                  <p className={`text-[11px] mt-0.5 ${isCompleted ? 'text-white/25' : 'text-white/40'}`}>
                    {format(event.date, "d 'de' MMM yyyy", { locale: es })}
                  </p>
                  {isManager && event.type === 'milestone' && (
                    <div className="flex gap-1.5 mt-1.5">
                      <button type="button" onClick={() => onEditMilestone?.(event.id)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white/40 hover:text-white transition-colors">
                        <Pencil className="w-2.5 h-2.5" /> Editar
                      </button>
                      <button type="button" onClick={() => onDeleteMilestone?.(event.id)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-colors">
                        <Trash2 className="w-2.5 h-2.5" /> Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
