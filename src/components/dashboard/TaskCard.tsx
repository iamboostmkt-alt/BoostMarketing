'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, CheckCircle2, ChevronDown, ChevronRight, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
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
  onAddSubtask?: (parentTask: Task) => void;
  onRequestDelivery?: (task: Task) => void | Promise<void>;
  onStatusChange?: (taskId: string, newStatus: string) => void | Promise<void>;
  isManager?: boolean;
  canEdit?: (task: Task) => boolean;
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

export default function TaskCard({ task, onEdit, onDelete, onView, onMarkComplete, onMarkPending, onAddSubtask, onRequestDelivery, onStatusChange, isManager = true, canEdit }: TaskCardProps) {
  const overdue = isOverdue(task.dueDate) && task.status !== 'completed';
  const assignees = resolveAssignees(task);
  const [subtasksOpen, setSubtasksOpen] = useState(false);
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);

  useEffect(() => {
    if (!subtasksOpen) return;
    setLoadingSubtasks(true);
    fetch(`/api/tasks?parentId=${task.id}`)
      .then(r => r.json())
      .then(d => setSubtasks(d.tasks || []))
      .finally(() => setLoadingSubtasks(false));
  }, [subtasksOpen, task.id]);

  const completedCount = subtasks.filter(s => s.status === 'completed').length;
  const totalCount = subtasks.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger view if clicking on action buttons
    if ((e.target as HTMLElement).closest('button')) return;
    onView?.(task);
  };

  return (
    <motion.div
      onClick={handleCardClick}
      className={`bg-[#15151c] border border-white/[0.06] rounded-xl p-3 group ${
        onView ? 'cursor-pointer' : ''
      }`}
      whileHover={{ y: -1, borderColor: 'rgba(255,255,255,0.12)' }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
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
              <h4 className="text-sm font-medium text-white/85 truncate leading-snug">
                {task.title}
              </h4>
              {task.description && (
                <p className="text-xs text-white/30 mt-0.5 truncate">
                  {task.description}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              {(!canEdit || canEdit(task)) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-white/30 hover:text-white hover:bg-white/[0.06]"
                  onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              )}
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
          <div className="flex items-center gap-3 mt-2.5 flex-wrap">
            {task.status === 'internal_review' && isManager && onStatusChange && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-1.5 text-[11px] text-emerald-400 hover:bg-emerald-500/10 transition-all duration-150"
                  onClick={(e) => { e.stopPropagation(); void onStatusChange(task.id, 'completed'); }}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Aprobar</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-1.5 text-[11px] text-amber-400 hover:bg-amber-500/10 transition-all duration-150"
                  onClick={(e) => { e.stopPropagation(); void onStatusChange(task.id, 'changes_requested'); }}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Cambios</span>
                </Button>
              </>
            )}
            {task.status !== 'completed' && task.status !== 'internal_review' && onMarkComplete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 gap-1 px-1.5 text-[11px] text-white/0 group-hover:text-emerald-400 hover:bg-emerald-500/10 transition-all duration-150"
                onClick={(e) => {
                  e.stopPropagation();
                  void onMarkComplete(task);
                }}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150">Completar</span>
              </Button>
            )}
            {task.status === 'completed' && onMarkPending && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 gap-1 px-1.5 text-[11px] text-white/0 group-hover:text-slate-400 hover:bg-slate-500/10 transition-all duration-150"
                onClick={(e) => {
                  e.stopPropagation();
                  void onMarkPending(task);
                }}
              >
                <RotateCcw className="w-3 h-3" />
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150">Reabrir</span>
              </Button>
            )}
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                task.status === 'internal_review' && !isManager
                  ? 'status-completed'
                  : statusColors[task.status] || 'status-pending'
              }`}
            >
              {task.status === 'internal_review' && !isManager
                ? 'Completada'
                : statusLabels[task.status] || task.status}
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
      {/* Subtareas */}
      {true && (
        <div className="mt-2.5 border-t border-white/[0.04] pt-2.5">
          <div className="flex items-center justify-between">
            <button
              onClick={(e) => { e.stopPropagation(); setSubtasksOpen(!subtasksOpen); }}
              className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/70 transition-colors"
            >
              {subtasksOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Subtareas
              {totalCount > 0 && <span className="text-white/30">{completedCount}/{totalCount}</span>}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onAddSubtask?.(task); }}
              className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Agregar
            </button>
          </div>
          {subtasksOpen && (
            <div className="mt-2 space-y-1">
              {totalCount > 0 && (
                <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden mb-2">
                  <motion.div
                    className="h-full bg-emerald-500/70 rounded-full origin-left"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: progress / 100 }}
                    transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                  />
                </div>
              )}
              {loadingSubtasks && <p className="text-[11px] text-white/30 py-1">Cargando...</p>}
              {!loadingSubtasks && subtasks.map((sub, i) => (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.05, ease: 'easeOut' }}
                  className="flex items-center gap-2 py-1 px-2 rounded-lg bg-white/[0.02]"
                >
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${sub.status === 'completed' ? 'bg-emerald-400' : 'bg-white/20'}`} />
                  <span className={`text-[11px] flex-1 truncate ${sub.status === 'completed' ? 'text-white/30 line-through' : 'text-white/60'}`}>
                    {sub.title}
                  </span>
                  <span className="text-[10px] text-white/20">{statusLabels[sub.status] || sub.status}</span>
                </motion.div>
              ))}
              {!loadingSubtasks && subtasks.length === 0 && (
                <p className="text-[11px] text-white/20 py-1 px-2">Sin subtareas</p>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
