'use client';

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Check,
  CheckCircle2,
  RotateCcw,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Task, TaskAssignee } from "@/lib/types";
import { statusColors, statusLabels } from "@/lib/theme-maps";

// ─── Priority config ──────────────────────────────────────────────────────────
const priorityDot: Record<string, string> = {
  low:    "bg-emerald-500/60",
  medium: "bg-amber-500/60",
  high:   "bg-red-500/60",
  urgent: "bg-red-600/80",
};

const priorityBorder: Record<string, string> = {
  low:    "border-l-emerald-500/50",
  medium: "border-l-amber-500/50",
  high:   "border-l-red-500/50",
  urgent: "border-l-red-600/70",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `Vencida hace ${Math.abs(diffDays)}d`;
  if (diffDays === 0) return "Vence hoy";
  if (diffDays === 1) return "Mañana";
  if (diffDays <= 7) return `${diffDays}d`;
  return date.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function resolveAssignees(task: Task): TaskAssignee[] {
  if (task.assignedUsers && task.assignedUsers.length > 0) return task.assignedUsers;
  if (task.assignedUser) {
    return [{
      id: task.assignedUser.id,
      name: task.assignedUser.name,
      email: task.assignedUser.email,
      color: task.assignedUser.color,
      image: null,
    }];
  }
  return [];
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onView?: (task: Task) => void;
  onMarkComplete?: (task: Task) => void | Promise<void>;
  onMarkPending?: (task: Task) => void | Promise<void>;
  onAddSubtask?: (parentTask: Task) => void;
  onStatusChange?: (taskId: string, newStatus: string) => void | Promise<void>;
  isManager?: boolean;
  canEdit?: (task: Task) => boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TaskCard({
  task,
  onEdit,
  onDelete,
  onView,
  onMarkComplete,
  onMarkPending,
  onAddSubtask,
  onStatusChange,
  isManager = true,
  canEdit,
}: TaskCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [subtasksOpen, setSubtasksOpen] = React.useState(false);
  const [subtasks, setSubtasks] = React.useState<Task[]>([]);
  const [loadingSubtasks, setLoadingSubtasks] = React.useState(false);

  const overdue = isOverdue(task.dueDate) && task.status !== "completed";
  const assignees = resolveAssignees(task);

  // Fetch subtasks when opened
  React.useEffect(() => {
    if (!subtasksOpen) return;
    setLoadingSubtasks(true);
    fetch(`/api/tasks?parentId=${task.id}`)
      .then((r) => r.json())
      .then((d) => setSubtasks(d.tasks || []))
      .finally(() => setLoadingSubtasks(false));
  }, [subtasksOpen, task.id]);

  const completedCount = subtasks.filter((s) => s.status === "completed").length;
  const totalCount = subtasks.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    onView?.(task);
  };

  // Determine display status for team members
  const displayStatus = task.status === "internal_review" && !isManager
    ? "completed"
    : task.status;

  const displayLabel = task.status === "internal_review" && !isManager
    ? "Completada"
    : statusLabels[task.status] || task.status;

  return (
    <motion.div
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={cn(
        "relative rounded-xl border-l-2 transition-all duration-150",
        "bg-[#0d0d0d] border border-[#1c1c1c]",
        "hover:bg-[#111111] hover:border-[#262626]",
        onView && "cursor-pointer",
        priorityBorder[task.priority] || "border-l-white/10"
      )}
    >
      <div className="p-3.5">
        {/* ── Header: dot + title + actions ── */}
        <div className="flex items-start gap-2.5">
          {/* Priority dot */}
          <div
            className={cn(
              "mt-1.5 h-2 w-2 shrink-0 rounded-full",
              priorityDot[task.priority] || "bg-white/20"
            )}
          />

          {/* Title + description */}
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-medium tracking-tight text-white/90 truncate leading-snug">
              {task.title}
            </h4>
            {task.description && (
              <p className="mt-0.5 text-xs text-white/35 truncate">
                {task.description}
              </p>
            )}
          </div>

          {/* Edit/Delete on hover */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="flex items-center gap-0.5 shrink-0"
              >
                {(!canEdit || canEdit(task)) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(task); }}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Meta row: status + date + avatars ── */}
        <div className="mt-2.5 flex items-center gap-3 flex-wrap">
          {/* F1 buttons - manager reviewing internal_review */}
          {task.status === "internal_review" && isManager && onStatusChange && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); void onStatusChange(task.id, "completed"); }}
                className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors"
              >
                <CheckCircle2 className="h-3 w-3" />
                Aprobar
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); void onStatusChange(task.id, "changes_requested"); }}
                className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-amber-400 hover:bg-amber-500/10 transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Cambios
              </button>
            </>
          )}

          {/* Complete button */}
          {task.status !== "completed" && task.status !== "internal_review" && onMarkComplete && (
            <AnimatePresence>
              {isHovered && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={(e) => { e.stopPropagation(); void onMarkComplete(task); }}
                  className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-purple-400 hover:bg-purple-500/10 transition-colors"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Completar
                </motion.button>
              )}
            </AnimatePresence>
          )}

          {/* Reopen button */}
          {task.status === "completed" && onMarkPending && (
            <AnimatePresence>
              {isHovered && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={(e) => { e.stopPropagation(); void onMarkPending(task); }}
                  className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-white/40 hover:bg-white/[0.05] transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reabrir
                </motion.button>
              )}
            </AnimatePresence>
          )}

          {/* Status badge */}
          <span className={cn(
            "inline-flex items-center gap-1.5 text-[11px]",
            statusColors[displayStatus] || "status-pending"
          )}>
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
            {displayLabel}
          </span>

          {/* Due date */}
          {task.dueDate && (
            <div className={cn(
              "flex items-center gap-1 text-[11px]",
              overdue ? "text-red-400" : "text-white/35"
            )}>
              <Calendar className="h-3 w-3" />
              {formatDueDate(task.dueDate)}
            </div>
          )}

          {/* Avatar stack */}
          {assignees.length > 0 && (
            <div className="ml-auto flex -space-x-1.5">
              {assignees.slice(0, 3).map((user) => (
                <Avatar key={user.id} className="h-5 w-5 border border-[#0d0d0d] ring-1 ring-white/10">
                  <AvatarImage src={user.image ?? undefined} alt={user.name || ""} />
                  <AvatarFallback
                    style={{ backgroundColor: (user.color || "#7c3aed") + "33", color: user.color || "#a78bfa" }}
                    className="text-[9px] font-medium"
                  >
                    {(user.name || "U").split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {assignees.length > 3 && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full border border-[#0d0d0d] bg-[#1a1a1a] text-[9px] text-white/50 ring-1 ring-white/10">
                  +{assignees.length - 3}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Subtasks ── */}
        <div className="mt-2.5 border-t border-white/[0.04] pt-2.5">
          <div className="flex items-center justify-between">
            <button
              onClick={(e) => { e.stopPropagation(); setSubtasksOpen(!subtasksOpen); }}
              className="flex items-center gap-1.5 text-[11px] text-white/35 hover:text-white/60 transition-colors"
            >
              {subtasksOpen
                ? <ChevronDown className="h-3 w-3" />
                : <ChevronRight className="h-3 w-3" />
              }
              <span>Subtareas</span>
              {totalCount > 0 && (
                <span className="text-white/25">{completedCount}/{totalCount}</span>
              )}
            </button>

            {/* Progress bar */}
            {totalCount > 0 && (
              <div className="flex-1 mx-3 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  className="h-full bg-[#7c3aed] rounded-full origin-left"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: progress / 100 }}
                  transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                />
              </div>
            )}

            <button
              onClick={(e) => { e.stopPropagation(); onAddSubtask?.(task); }}
              className="flex items-center gap-0.5 text-[11px] text-white/25 hover:text-purple-400/70 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Agregar
            </button>
          </div>

          {/* Subtask list */}
          <AnimatePresence>
            {subtasksOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="mt-2 space-y-1 pl-4">
                  {loadingSubtasks && (
                    <p className="text-[11px] text-white/25 py-1">Cargando...</p>
                  )}
                  {!loadingSubtasks && subtasks.map((sub, i) => (
                    <motion.div
                      key={sub.id}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.15, delay: i * 0.04 }}
                      className="flex items-center gap-2 py-1 px-2 rounded-md hover:bg-white/[0.02] transition-colors"
                    >
                      <div className={cn(
                        "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors",
                        sub.status === "completed"
                          ? "border-[#7c3aed] bg-[#7c3aed]"
                          : "border-white/15"
                      )}>
                        {sub.status === "completed" && (
                          <Check className="h-2 w-2 text-white" />
                        )}
                      </div>
                      <span className={cn(
                        "text-[11px] flex-1 truncate",
                        sub.status === "completed"
                          ? "text-white/25 line-through"
                          : "text-white/55"
                      )}>
                        {sub.title}
                      </span>
                    </motion.div>
                  ))}
                  {!loadingSubtasks && subtasks.length === 0 && (
                    <p className="text-[11px] text-white/20 py-1 px-2">Sin subtareas</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
