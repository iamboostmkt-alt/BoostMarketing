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
import { statusLabels } from "@/lib/theme-maps";

// ─── Status inline styles (Tailwind v4 compatible) ───────────────────────────
const statusStyleMap: Record<string, { background: string; color: string }> = {
  draft:             { background: 'rgba(226,232,240,0.08)', color: '#64748b' },
  pending:           { background: 'rgba(226,232,240,0.12)', color: '#E2E8F0' },
  in_progress:       { background: 'rgba(56,189,248,0.15)',  color: '#38BDF8' },
  editing:           { background: 'rgba(56,189,248,0.15)',  color: '#38BDF8' },
  internal_review:   { background: 'rgba(167,139,250,0.15)', color: '#a78bfa' },
  client_review:     { background: 'rgba(56,189,248,0.15)',  color: '#38BDF8' },
  changes_requested: { background: 'rgba(234,179,8,0.15)',   color: '#EAB308' },
  approved:          { background: 'rgba(34,197,94,0.15)',   color: '#22C55E' },
  scheduled:         { background: 'rgba(34,197,94,0.13)',   color: '#22C55E' },
  published:         { background: 'rgba(34,197,94,0.13)',   color: '#22C55E' },
  completed:         { background: 'rgba(34,197,94,0.15)',   color: '#22C55E' },
};

// ─── Priority config ──────────────────────────────────────────────────────────
const priorityDot: Record<string, string> = {
  low:    "bg-[#22C55E]/70",
  medium: "bg-[#EAB308]/70",
  high:   "bg-[#F97316]/70",
  urgent: "bg-[#EF4444]/80",
};

const priorityBorder: Record<string, string> = {
  low:    "border-l-[#22C55E]/60",
  medium: "border-l-[#EAB308]/60",
  high:   "border-l-[#F97316]/60",
  urgent: "border-l-[#EF4444]/70",
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
  const [isHovered,      setIsHovered]      = React.useState(false);
  const [subtasksOpen,   setSubtasksOpen]   = React.useState(false);
  const [subtasks,       setSubtasks]       = React.useState<Task[]>([]);
  const [loadingSubtasks,setLoadingSubtasks]= React.useState(false);
  const [showStatusPicker, setShowStatusPicker] = React.useState(false);

  // Status options para el picker mobile
  const STATUS_OPTIONS = [
    { value: 'pending',          label: 'Pendiente',        color: '#94a3b8' },
    { value: 'in_progress',      label: 'En progreso',      color: '#38bdf8' },
    { value: 'internal_review',  label: 'Revisión PM',      color: '#f59e0b' },
    { value: 'changes_requested',label: 'Con correcciones', color: '#f97316' },
    { value: 'completed',        label: 'Completada',       color: '#22c55e' },
  ];

  // ── Swipe to complete ────────────────────────────────────────
  const [swipeX,      setSwipeX]      = React.useState(0);
  const [swiping,     setSwiping]     = React.useState(false);
  const swipeStart    = React.useRef<number | null>(null);
  const SWIPE_THRESHOLD = 80;

  function handleTouchStart(e: React.TouchEvent) {
    if (!onMarkComplete || isManager) return;
    if (task.status === 'completed' || task.status === 'internal_review') return;
    swipeStart.current = e.touches[0].clientX;
    setSwiping(true);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!swiping || swipeStart.current === null) return;
    const dx = e.touches[0].clientX - swipeStart.current;
    if (dx > 0) setSwipeX(Math.min(dx, SWIPE_THRESHOLD + 20));
  }

  function handleTouchEnd() {
    if (swipeX >= SWIPE_THRESHOLD && onMarkComplete) {
      void onMarkComplete(task);
    }
    setSwipeX(0);
    setSwiping(false);
    swipeStart.current = null;
  }

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

  const canSwipe = !isManager && !!onMarkComplete &&
    task.status !== 'completed' && task.status !== 'internal_review';

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Fondo verde de swipe */}
      {canSwipe && swipeX > 0 && (
        <div className="absolute inset-0 flex items-center pl-4 rounded-xl"
          style={{ background: `rgba(74,222,128,${Math.min(swipeX / SWIPE_THRESHOLD, 1) * 0.25})` }}>
          <div className="flex items-center gap-1.5" style={{ opacity: Math.min(swipeX / SWIPE_THRESHOLD, 1) }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="text-[12px] font-semibold text-green-400">
              {swipeX >= SWIPE_THRESHOLD ? '¡Suelta!' : 'Desliza →'}
            </span>
          </div>
        </div>
      )}
    <motion.div
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={canSwipe ? handleTouchStart : undefined}
      onTouchMove={canSwipe ? handleTouchMove : undefined}
      onTouchEnd={canSwipe ? handleTouchEnd : undefined}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0, x: swipeX }}
      whileHover={swiping ? {} : { y: -1 }}
      transition={swiping ? { duration: 0 } : { duration: 0.15, ease: "easeOut" }}
      className={cn(
        "relative rounded-xl border-l-2 transition-colors duration-150",
        "bg-[#0d0d0d] border border-[#1c1c1c]",
        !swiping && "hover:bg-[#111111] hover:border-[#262626]",
        onView && "cursor-pointer",
        priorityBorder[task.priority] || "border-l-white/10",
        swipeX >= SWIPE_THRESHOLD && "border-l-green-400"
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
            {(task as any).client && (
              <p className="text-[10px] text-violet-400/60 font-medium mt-0.5 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400/40 shrink-0" />
                {(task as any).client.name}
              </p>
            )}
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
                className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-[#22C55E] hover:bg-[#22C55E]/10 transition-colors"
              >
                <CheckCircle2 className="h-3 w-3" />
                Aprobar
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); void onStatusChange(task.id, "changes_requested"); }}
                className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-[#EAB308] hover:bg-[#EAB308]/10 transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Cambios
              </button>
            </>
          )}

          {/* Complete button — oculto para PM/Admin: deben usar el modal para aprobar */}
          {task.status !== "completed" && task.status !== "internal_review" && onMarkComplete && !isManager && (
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

          {/* Status badge — tap en móvil abre picker */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onStatusChange) setShowStatusPicker(true);
            }}
            className="inline-flex items-center gap-1.5 text-[11px] rounded-full px-2 py-0.5 font-medium transition-opacity active:opacity-70"
            style={statusStyleMap[displayStatus] || { background: 'rgba(226,232,240,0.12)', color: '#E2E8F0' }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
            {displayLabel}
          </button>

          {/* Mobile status picker — bottom sheet */}
          {showStatusPicker && onStatusChange && (
            <div
              className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60"
              onClick={(e) => { e.stopPropagation(); setShowStatusPicker(false); }}
            >
              <div
                className="w-full max-w-sm rounded-t-2xl bg-[#0F1117] border-t border-white/[0.08] pb-8"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-10 h-1 rounded-full bg-white/20" />
                </div>
                <p className="text-[12px] font-medium text-white/40 text-center pb-3 truncate px-4">
                  {task.title}
                </p>
                <div className="divide-y divide-white/[0.05]">
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors active:bg-white/[0.05] ${task.status === opt.value ? 'bg-white/[0.04]' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowStatusPicker(false);
                        if (task.status !== opt.value) void onStatusChange(task.id, opt.value);
                      }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: opt.color }} />
                      <span className={`text-[14px] ${task.status === opt.value ? 'text-white font-medium' : 'text-white/70'}`}>
                        {opt.label}
                      </span>
                      {task.status === opt.value && (
                        <span className="ml-auto text-violet-400 text-[12px]">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

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

        {/* ── Archivos adjuntos — preview circulitos ── */}
        {(() => {
          const atts = (task as any).attachments ?? (task as any).taskAttachments ?? [];
          const validAtts = atts.filter((a: any) => a.fileUrl && a.status !== 'deleted');
          if (validAtts.length === 0) return null;
          const imgs = validAtts.filter((a: any) => {
            const ft = (a.fileType || '').toLowerCase();
            const fn = (a.fileName || '').toLowerCase();
            return ft.startsWith('image') || /\.(png|jpg|jpeg|gif|webp)($|\?)/.test(fn);
          });
          const nonImgs = validAtts.filter((a: any) => {
            const ft = (a.fileType || '').toLowerCase();
            const fn = (a.fileName || '').toLowerCase();
            return !(ft.startsWith('image') || /\.(png|jpg|jpeg|gif|webp)($|\?)/.test(fn));
          });
          return (
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-white/30 flex items-center gap-1">
                📎 {validAtts.length} {validAtts.length === 1 ? 'archivo' : 'archivos'}
              </span>
              {imgs.slice(0, 4).map((a: any, i: number) => (
                <div key={i} className="h-6 w-6 rounded-full overflow-hidden border border-white/[0.12] shrink-0"
                  title={a.fileName}>
                  <img src={a.fileUrl} alt={a.fileName} className="h-full w-full object-cover" />
                </div>
              ))}
              {nonImgs.slice(0, 2).map((a: any, i: number) => (
                <div key={i} className="h-6 w-6 rounded-full bg-white/[0.06] border border-white/[0.10] flex items-center justify-center shrink-0"
                  title={a.fileName}>
                  <span className="text-[8px] text-white/50">
                    {(a.fileName || '').split('.').pop()?.slice(0,3).toUpperCase() || '📎'}
                  </span>
                </div>
              ))}
              {validAtts.length > 6 && (
                <span className="text-[9px] text-white/30">+{validAtts.length - 6}</span>
              )}
            </div>
          );
        })()}

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
    </div>
  );
}
