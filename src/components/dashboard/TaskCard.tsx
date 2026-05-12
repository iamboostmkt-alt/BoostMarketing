'use client';

import { Calendar, CheckCircle2, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Task, TaskAssignee } from '@/lib/types';
import { statusColors, statusLabels, priorityColors, priorityLabels } from '@/lib/theme-maps';
import UserAvatarStack from '@/components/dashboard/UserAvatarStack';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onView?: (task: Task) => void;
  /** Si se define, muestra acción rápida para marcar completada (no aplica si ya está completada). */
  onMarkComplete?: (task: Task) => void | Promise<void>;
  /** Marcar como pendiente (solo si la tarea está completada). */
  onMarkPending?: (task: Task) => void | Promise<void>;
}

const priorityDotColors: Record<string, string> = {
  low: 'bg-emerald-400',
  medium: 'bg-amber-400',
  high: 'bg-red-400',
  urgent: 'bg-red-600',
};

function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `Vencida hace ${Math.abs(diffDays)}d`;
  if (diffDays === 0) return 'Vence hoy';
  if (diffDays === 1) return 'Vence mañana';
  if (diffDays <= 7) return `Vence en ${diffDays}d`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function resolveAssignees(task: Task): TaskAssignee[] {
  if (task.assignedUsers && task.assignedUsers.length > 0) return task.assignedUsers;
  if (task.assignedUser) {
    return [{
      id:    task.assignedUser.id,
      name:  task.assignedUser.name,
      email: task.assignedUser.email,
      color: task.assignedUser.color,
      image: null,
    }];
  }
  return [];
}

export default function TaskCard({ task, onEdit, onDelete, onView, onMarkComplete, onMarkPending }: TaskCardProps) {
  const overdue = isOverdue(task.dueDate) && task.status !== 'completed';
  const assignees = resolveAssignees(task);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger view if clicking on action buttons
    if ((e.target as HTMLElement).closest('button')) return;
    onView?.(task);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`bg-[#15151c] border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.1] transition-colors group ${
        onView ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Priority dot */}
        <div
          className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${priorityDotColors[task.priority] || 'bg-white/30'}`}
          title={priorityLabels[task.priority] || task.priority}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-white/90 truncate">
                {task.title}
              </h4>
              {task.description && (
                <p className="text-xs text-white/40 mt-1 line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-white/30 hover:text-white hover:bg-white/[0.06]"
                onClick={(e) => { e.stopPropagation(); onEdit(task); }}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-white/30 hover:text-red-400 hover:bg-red-400/10"
                onClick={(e) => { e.stopPropagation(); onDelete(task); }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Footer: status + date + assignees */}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            {task.status !== 'completed' && onMarkComplete && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2 text-[11px] border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                onClick={(e) => {
                  e.stopPropagation();
                  void onMarkComplete(task);
                }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Marcar como completada
              </Button>
            )}
            {task.status === 'completed' && onMarkPending && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2 text-[11px] border-slate-500/30 text-slate-300 hover:bg-slate-500/10 hover:text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  void onMarkPending(task);
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Marcar como pendiente
              </Button>
            )}
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusColors[task.status] || 'status-pending'}`}
            >
              {statusLabels[task.status] || task.status}
            </span>

            <span
              className={`text-[11px] font-medium ${priorityColors[task.priority] || 'text-white/40'}`}
            >
              {priorityLabels[task.priority] || task.priority}
            </span>

            {task.dueDate && (
              <div
                className={`flex items-center gap-1 text-[11px] ${overdue ? 'text-red-400' : 'text-white/30'}`}
              >
                <Calendar className="w-3 h-3" />
                {formatDueDate(task.dueDate)}
              </div>
            )}

            {assignees.length > 0 && (
              <div className="ml-auto">
                <UserAvatarStack users={assignees} max={3} size="xs" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
