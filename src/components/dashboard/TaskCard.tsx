'use client';

import { motion } from 'framer-motion';
import { Calendar, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Task } from '@/lib/types';
import { statusColors, statusLabels, priorityColors, priorityLabels } from '@/lib/theme-maps';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
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

export default function TaskCard({ task, onEdit, onDelete }: TaskCardProps) {
  const overdue = isOverdue(task.dueDate) && task.status !== 'completed';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="bg-[#15151c] border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.1] transition-colors group"
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
                onClick={() => onEdit(task)}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-white/30 hover:text-red-400 hover:bg-red-400/10"
                onClick={() => onDelete(task)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Footer: status + date */}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
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
          </div>
        </div>
      </div>
    </motion.div>
  );
}
