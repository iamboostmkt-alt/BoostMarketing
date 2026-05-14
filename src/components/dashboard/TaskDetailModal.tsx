'use client';

import { CheckSquare, Clock, Users, Pencil, X, Building2, AlertCircle, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import UserAvatarStack from '@/components/dashboard/UserAvatarStack';
import type { Task, TaskAssignee, ActivityAssignee } from '@/lib/types';
import { statusColors, statusLabels, priorityColors, priorityLabels } from '@/lib/theme-maps';

interface TaskDetailModalProps {
  task:    Task | null;
  open:    boolean;
  onClose: () => void;
  onEdit?: (t: Task) => void;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  try { return format(new Date(iso), "d 'de' MMM yyyy", { locale: es }); } catch { return iso; }
}

function initials(name: string | null | undefined, email: string) {
  return (name || email).split(/[\s@]/).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
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

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export default function TaskDetailModal({ task, open, onClose, onEdit }: TaskDetailModalProps) {
  if (!task) return null;

  const statusCls = statusColors[task.status] ?? 'status-pending';
  const statusLbl = statusLabels[task.status] ?? task.status;
  const assignees = resolveAssignees(task);
  const overdue   = isOverdue(task.dueDate) && task.status !== 'completed';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#15151c] border-white/[0.08] text-white max-w-lg w-full max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-start gap-3 pr-6">
            <div className="w-9 h-9 rounded-xl bg-brand/15 flex items-center justify-center shrink-0 mt-0.5">
              <CheckSquare className="w-4 h-4 text-brand-light" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-semibold text-white leading-snug">
                {task.title}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusCls}`}>
                  {statusLbl}
                </span>
                <span className={`text-[10px] font-medium ${priorityColors[task.priority] || 'text-white/40'}`}>
                  {priorityLabels[task.priority] || task.priority}
                </span>
                {overdue && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-400">
                    <AlertCircle className="w-3 h-3" />
                    Vencida
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-5">
          {/* Meta row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2 text-white/50">
              <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Inicio</p>
                <p className="text-white/70 text-xs">{fmtDate(task.startDate)}</p>
              </div>
            </div>

            <div className="flex items-start gap-2 text-white/50">
              <CalendarIcon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${overdue ? 'text-red-400' : ''}`} />
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Fecha límite</p>
                <p className={`text-xs ${overdue ? 'text-red-400' : 'text-white/70'}`}>
                  {fmtDate(task.dueDate)}
                </p>
              </div>
            </div>

            {assignees.length > 0 && (
              <div className="flex items-start gap-2 col-span-1 sm:col-span-2">
                <Users className="w-3.5 h-3.5 shrink-0 mt-0.5 text-white/50" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">
                    {assignees.length === 1 ? 'Responsable' : `Responsables (${assignees.length})`}
                  </p>
                  {assignees.length === 1 ? (
                    <div className="flex items-center gap-1.5">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={assignees[0].image || undefined} />
                        <AvatarFallback
                          className="text-[8px] font-medium"
                          style={{
                            backgroundColor: (assignees[0].color || '#7c3aed') + '33',
                            color:            assignees[0].color || '#7c3aed',
                          }}
                        >
                          {initials(assignees[0].name, assignees[0].email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-white/70">
                        {assignees[0].name || assignees[0].email}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <UserAvatarStack users={assignees as ActivityAssignee[]} max={6} size="sm" />
                      <p className="text-[10px] text-white/40 mt-1">
                        {assignees.map((u) => u.name || u.email).join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {task.client && (
              <div className="flex items-start gap-2 col-span-1 sm:col-span-2">
                <Building2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-white/50" />
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Cliente</p>
                  <p className="text-xs text-white/70">
                    {task.client.name}
                    {task.client.company && <span className="text-white/40"> — {task.client.company}</span>}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-2.5">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Descripción</p>
              <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          {/* Created by */}
          {task.user && (
            <div className="text-[10px] text-white/30">
              Creada por {task.user.name || task.user.email}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/[0.06] px-5 py-3 flex items-center gap-2 shrink-0">
          {onEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(task)}
              className="border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.06] gap-1.5 text-xs h-8"
            >
              <Pencil className="w-3.5 h-3.5" />
              Editar tarea
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="text-white/30 hover:text-white hover:bg-white/[0.06] text-xs h-8 ml-auto"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
