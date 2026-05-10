'use client';

import { CalendarRange, Clock, User, Pencil, X } from 'lucide-react';
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
import type { Activity } from '@/lib/types';
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
  /** If provided, an "Editar" button will appear for managers */
  onEdit?:         (a: Activity) => void;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  try { return format(new Date(iso), "d 'de' MMM yyyy", { locale: es }); } catch { return iso; }
}

function initials(name: string | null | undefined, email: string) {
  return (name || email).split(/[\s@]/).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
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

  const statusCls = activityStatusColors[activity.status] ?? 'status-pending';
  const statusLbl = activityStatusLabels[activity.status] ?? activity.status;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#15151c] border-white/[0.08] text-white max-w-lg w-full max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-start gap-3 pr-6">
            <div className="w-9 h-9 rounded-xl bg-brand/15 flex items-center justify-center shrink-0 mt-0.5">
              <CalendarRange className="w-4 h-4 text-brand-light" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-semibold text-white leading-snug">
                {activity.title}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusCls}`}>
                  {statusLbl}
                </span>
                <span className={`text-[10px] font-medium ${priorityColors[activity.priority] || 'text-white/40'}`}>
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
            <div className="flex items-start gap-2 text-white/50">
              <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Fechas</p>
                <p className="text-white/70 text-xs">
                  {fmtDate(activity.startDate)}
                  {activity.endDate && activity.endDate !== activity.startDate
                    ? ` → ${fmtDate(activity.endDate)}`
                    : ''}
                </p>
              </div>
            </div>

            {activity.assignedUser && (
              <div className="flex items-start gap-2">
                <User className="w-3.5 h-3.5 shrink-0 mt-0.5 text-white/50" />
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Responsable</p>
                  <div className="flex items-center gap-1.5">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={(activity.assignedUser as { image?: string | null }).image ?? undefined} />
                      <AvatarFallback
                        className="text-[8px] font-medium"
                        style={{
                          backgroundColor: (activity.assignedUser.color || '#7c3aed') + '33',
                          color:            activity.assignedUser.color || '#7c3aed',
                        }}
                      >
                        {initials(activity.assignedUser.name, activity.assignedUser.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-white/70">
                      {activity.assignedUser.name || activity.assignedUser.email}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {activity.description && (
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-2.5">
              <p className="text-xs text-white/55 leading-relaxed whitespace-pre-wrap">
                {activity.description}
              </p>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-white/[0.05]" />

          {/* Comment thread — takes remaining space */}
          <ActivityCommentThread
            activityId={activity.id}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
          />
        </div>

        {/* Footer */}
        {onEdit && (
          <div className="border-t border-white/[0.06] px-5 py-3 flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => { onEdit(activity); onClose(); }}
              className="border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.06] gap-1.5 text-xs h-8"
            >
              <Pencil className="w-3.5 h-3.5" />
              Editar actividad
            </Button>
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
        )}
      </DialogContent>
    </Dialog>
  );
}
