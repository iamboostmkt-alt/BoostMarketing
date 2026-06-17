'use client';

import { CalendarRange, Clock, Users, Pencil, X } from 'lucide-react';
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
import ActivityCommentThread from '@/components/dashboard/ActivityCommentThread';
import UserAvatarStack from '@/components/dashboard/UserAvatarStack';
import type { Activity, ActivityAssignee } from '@/lib/types';
import {
  activityStatusColors, activityStatusLabels,
  priorityColors, priorityLabels,
} from '@/lib/theme-maps';

interface ActivityDetailModalProps {
  activity:        Activity | null;
  open:            boolean;
  onClose:         () => void;
  currentUserId:   string;
  currentUserRole: string;
  onEdit?:         (a: Activity) => void;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  try { return format(new Date(iso), "d 'de' MMM yyyy", { locale: es }); } catch { return iso; }
}

function initials(name: string | null | undefined, email: string) {
  return (name || email).split(/[\s@]/).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function resolveAssignees(activity: Activity): ActivityAssignee[] {
  if (activity.assignedUsers && activity.assignedUsers.length > 0) return activity.assignedUsers;
  if (activity.assignedUser) return [activity.assignedUser];
  return [];
}

export default function ActivityDetailModal({
  activity,
  open,
  onClose,
  currentUserId,
  currentUserRole,
  onEdit,
}: ActivityDetailModalProps) {
  if (!activity) return null;

  const statusCls  = activityStatusColors[activity.status] ?? 'status-pending';
  const statusLbl  = activityStatusLabels[activity.status] ?? activity.status;
  const assignees  = resolveAssignees(activity);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[var(--wl-surface)] border-[var(--wl-border)] text-[var(--wl-text-primary)] max-w-lg w-full max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-[var(--wl-border)] shrink-0">
          <div className="flex items-start gap-3 pr-6">
            <div className="w-9 h-9 rounded-xl bg-brand/15 flex items-center justify-center shrink-0 mt-0.5">
              <CalendarRange className="w-4 h-4 text-brand-light" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-semibold text-[var(--wl-text-primary)] leading-snug">
                {activity.title}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusCls}`}>
                  {statusLbl}
                </span>
                <span className={`text-[10px] font-medium ${priorityColors[activity.priority] || 'text-[var(--wl-text-muted)]'}`}>
                  {priorityLabels[activity.priority] || activity.priority}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-5">
          {/* Meta row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2 text-[var(--wl-text-muted)]">
              <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-[var(--wl-text-placeholder)] uppercase tracking-wider mb-0.5">Fechas</p>
                <p className="text-[var(--wl-text-secondary)] text-xs">
                  {fmtDate(activity.startDate)}
                  {activity.endDate && activity.endDate !== activity.startDate
                    ? ` → ${fmtDate(activity.endDate)}`
                    : ''}
                </p>
              </div>
            </div>

            {assignees.length > 0 && (
              <div className="flex items-start gap-2">
                <Users className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[var(--wl-text-muted)]" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-[var(--wl-text-placeholder)] uppercase tracking-wider mb-1">
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
                      <span className="text-xs text-[var(--wl-text-secondary)]">
                        {assignees[0].name || assignees[0].email}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <UserAvatarStack users={assignees} max={6} size="sm" />
                      <p className="text-[10px] text-[var(--wl-text-muted)] mt-1">
                        {assignees.map((u) => u.name || u.email).join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {activity.description && (
            <div className="rounded-lg bg-[var(--wl-hover)] border border-[var(--wl-border-subtle)] px-3 py-2.5">
              <p className="text-xs text-[var(--wl-text-primary)]/55 leading-relaxed whitespace-pre-wrap">
                {activity.description}
              </p>
            </div>
          )}

          <div className="border-t border-[var(--wl-border-subtle)]" />

          <ActivityCommentThread
            activityId={activity.id}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
          />
        </div>

        {/* Footer */}
        {onEdit && (
          <div className="border-t border-[var(--wl-border)] px-5 py-3 flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => { onEdit(activity); onClose(); }}
              className="border-[var(--wl-border)] text-[var(--wl-text-secondary)] hover:text-[var(--wl-text-primary)] hover:bg-[var(--wl-hover)] gap-1.5 text-xs h-8"
            >
              <Pencil className="w-3.5 h-3.5" />
              Editar actividad
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="text-[var(--wl-text-placeholder)] hover:text-[var(--wl-text-primary)] hover:bg-[var(--wl-hover)] text-xs h-8 ml-auto"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Cerrar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
