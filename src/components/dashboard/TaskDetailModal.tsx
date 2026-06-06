'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { CheckSquare, Clock, Users, Pencil, X, Building2, AlertCircle, Calendar as CalendarIcon, Paperclip, Upload, Trash2, Download, FileText, ImageIcon, Loader2, ExternalLink, Bell, CheckCircle2, RotateCcw, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import UserAvatarStack from '@/components/dashboard/UserAvatarStack';
import { useUploadThing } from '@/lib/uploadthing';
import type { Task, TaskAssignee, ActivityAssignee } from '@/lib/types';
import { statusColors, statusLabels, priorityColors, priorityLabels, taskStatuses, statusStyleMap } from '@/lib/theme-maps';
import TaskForm from '@/components/dashboard/TaskForm';

interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  user: { id: string; name: string | null; image: string | null; color: string | null };
}

interface TaskDetailModalProps {
  task:      Task | null;
  open:      boolean;
  onClose:   () => void;
  onEdit?:   (t: Task) => void;
  onStatusChange?: (taskId: string, newStatus: string) => Promise<void>;
  isManager?: boolean;
  currentUserId?: string;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  try { return format(new Date(iso), "d 'de' MMM yyyy", { locale: es }); } catch { return iso; }
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function initials(name: string | null | undefined, email: string) {
  return (name || email || 'U').split(/[\s@]/).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function resolveAssignees(task: Task): TaskAssignee[] {
  if (task.assignedUsers && task.assignedUsers.length > 0) return task.assignedUsers;
  if (task.assignedUser) {
    return [{ id: task.assignedUser.id, name: task.assignedUser.name, email: task.assignedUser.email, color: task.assignedUser.color, image: null }];
  }
  return [];
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function FileIcon({ type }: { type: string }) {
  if (type.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-blue-400" />;
  if (type === 'application/pdf') return <FileText className="w-4 h-4 text-red-400" />;
  return <FileText className="w-4 h-4 text-white/40" />;
}

// Descripción colapsable — muestra máximo 5 líneas, botón "ver más" si es larga
function DescriptionBlock({ description }: { description: string }) {
  const [expanded, setExpanded] = React.useState(false);
  const lines = description.split('\n');
  const isTall = lines.length > 5 || description.length > 280;
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-2.5">
      <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Descripción</p>
      <div className={`relative ${!expanded && isTall ? 'max-h-24 overflow-hidden' : ''}`}>
        <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">{description}</p>
        {!expanded && isTall && (
          <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, transparent, rgba(15,17,23,0.95))' }} />
        )}
      </div>
      {isTall && (
        <button onClick={() => setExpanded(v => !v)}
          className="mt-1.5 text-[11px] text-violet-400/70 hover:text-violet-400 transition-colors">
          {expanded ? '▲ Ver menos' : '▼ Ver descripción completa'}
        </button>
      )}
    </div>
  );
}

async function downloadFile(url: string, filename: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  } catch { window.open(url, '_blank'); }
}

export default function TaskDetailModal({ task, open, onClose, onEdit, onStatusChange, isManager = false, currentUserId }: TaskDetailModalProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [subtasksOpen, setSubtasksOpen] = useState(false);
  const [newSubtaskOpen, setNewSubtaskOpen] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState<Task | null>(null);

  // Cargar subtareas al abrir el modal
  useEffect(() => {
    if (!open || !task) return;
    fetch(`/api/tasks?parentId=${task.id}`)
      .then(r => r.json())
      .then(d => setSubtasks(d.tasks || []));
  }, [open, task?.id]);

  // Recargar subtareas al expandir solo si aún no se cargaron
  useEffect(() => {
    if (!subtasksOpen || !task || subtasks.length > 0) return;
    fetch(`/api/tasks?parentId=${task.id}`)
      .then(r => r.json())
      .then(d => setSubtasks(d.tasks || []));
  }, [subtasksOpen, task?.id]);
  const [reminding, setReminding] = useState(false);
  const [showCompleteAfterUpload, setShowCompleteAfterUpload] = useState(false);
  const [deliveryLink, setDeliveryLink]   = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [reviewingFile, setReviewingFile]   = useState<string | null>(null); // fileId activo
  const [reviewComment, setReviewComment]   = useState('');
  const [reviewLoading, setReviewLoading]   = useState(false);

  async function handleRemind() {
    if (!task) return;
    setReminding(true);
    try {
      const res = await fetch('/api/tasks/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      toast.success(`Recordatorio enviado a ${data.enviados} usuario${data.enviados !== 1 ? 's' : ''} ✓`);
    } catch (err: any) {
      toast.error(err.message || 'Error al enviar recordatorio');
    } finally {
      setReminding(false);
    }
  }

  // TASK-R-02: actualizar reviewStatus por archivo individual
  async function handleAttachmentReview(attachmentId: string, status: 'approved' | 'changes_requested', comment?: string) {
    // Actualizar estado local INMEDIATAMENTE para prevenir doble click
    setAttachments(prev => prev.map(a =>
      a.id === attachmentId ? { ...a, reviewStatus: status, reviewComment: comment ?? '' } : a
    ));
    try {
      await fetch(`/api/task-attachments?id=${attachmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewStatus: status, reviewComment: comment ?? '' }),
      });
    } catch {
      // Revertir si falla
      setAttachments(prev => prev.map(a =>
        a.id === attachmentId ? { ...a, reviewStatus: undefined, reviewComment: undefined } : a
      ));
      toast.error('Error al guardar revisión');
    }
  }


  async function handleFileReview(action: 'approved' | 'comments' | 'new_version', fileId: string, fileName: string, subtaskId?: string) {
    if (!task) return;
    setReviewLoading(true);
    try {
      const clientId = (task as any).clientId;
      // Determinar si el archivo es de subtarea o tarea padre
      const targetTaskId = subtaskId ?? task.id;
      const isSubtask = !!subtaskId;

      const newStatus = action === 'approved' ? 'approved'
        : action === 'comments' ? 'changes_requested'
        : 'in_progress';

      // Cambiar status de la tarea/subtarea correcta
      if (onStatusChange) await onStatusChange(targetTaskId, newStatus);

      // Si aprobamos una subtarea, verificar si todas están aprobadas → completar padre
      let parentCompleted = false;
      if (action === 'approved' && isSubtask) {
        const siblingsRes = await fetch(`/api/tasks?parentId=${task.id}`);
        const siblingsData = siblingsRes.ok ? await siblingsRes.json() : { tasks: [] };
        const siblings: any[] = siblingsData.tasks || [];
        const allDone = siblings.every((s: any) => s.id === targetTaskId || ['approved','completed'].includes(s.status));
        if (allDone && siblings.length > 0) {
          if (onStatusChange) await onStatusChange(task.id, 'completed');
          parentCompleted = true;
        }
      }

      // Notificación + correo de felicitación
      if (action === 'approved') {
        // Priorizar al usuario que subio el archivo — si no, usar asignados de la tarea
        const uploaderAttachment = attachments.find(a => a.id === fileId);
        const uploaderId = (uploaderAttachment as any)?.user?.id;
        const taskAssignees: string[] = [];
        if (uploaderId) {
          taskAssignees.push(uploaderId);
        } else {
          if ((task as any).assignedUserId) taskAssignees.push((task as any).assignedUserId);
          (task as any).assignedUsers?.forEach((au: any) => {
            const id = au.id || au.userId;
            if (id) taskAssignees.push(id);
          });
        }
        const uniqueAssignees = [...new Set(taskAssignees)];
        // celebrate maneja correos — solo notif in-app aqui
        fetch('/api/tasks/celebrate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: task.id, parentCompleted, assigneeIds: uniqueAssignees, pmId: (task as any).userId }),
        }).catch(() => {});
      }

      // Correo al equipo con cambios pedidos (non-blocking)
      if (action === 'comments' && reviewComment) {
        fetch('/api/tasks/notify-changes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: task.id, fileName, comment: reviewComment }),
        }).catch(() => {});
      }

      // Correo al equipo con cambios pedidos (non-blocking)

      const isSubtaskApproval = isSubtask;
      // Mensaje al chat del room del cliente con imagen si es aprobacion
      const chatClientId = clientId || (task as any).client?.id;
      if (chatClientId && !isSubtaskApproval) {
        // PM que aprueba
        const pmName = (task as any).assignedUsers
          ?.find((au: any) => ['ADMIN','PROJECT_MANAGER'].includes(au.role ?? ''))
          ?.name || 'PM';
        // Team members que hicieron la tarea
        // Obtener team members correctamente (excluir PM y ADMIN por role)
        const _allAssigned = (task as any).assignedUsers ?? [];
        const _teamMembers = _allAssigned.filter((au: any) =>
          !['ADMIN','PROJECT_MANAGER'].includes(au.role ?? au.user?.role ?? '')
        );
        const assigneeNames = _teamMembers
          .map((au: any) => au.name || au.user?.name || au.email?.split('@')[0])
          .filter(Boolean)
          .map((n: string) => `@${n}`)
          .join(' ') || '';
        const msgMap = {
          approved:    assigneeNames
            ? `🎉 ¡Felicidades ${assigneeNames}! Tu entrega fue aprobada ✅\n📎 ${fileName}`
            : `✅ Entrega aprobada: "${fileName}"`,
          comments:    `💬 Comentarios sobre "${fileName}": ${reviewComment}`,
          new_version: `🔄 Se solicita nueva versión de: "${fileName}"`,
        };
        // Buscar fileUrl del archivo aprobado para mostrarlo en chat
        const approvedAttachment = attachments.find(a => a.id === fileId);
        const isImage = approvedAttachment?.fileType?.startsWith('image/');
        await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            room: chatClientId,
            message: msgMap[action],
            isSystem: true,
            systemName: 'Weeklink',
            ...(action === 'approved' && isImage && approvedAttachment ? {
              fileUrl: approvedAttachment.fileUrl,
              fileName: approvedAttachment.fileName,
              fileType: approvedAttachment.fileType,
            } : {}),
          }),
        });
      }

      // Notificar a asignados según si están vinculados al cliente
      const taskAssignees: string[] = [];
      if (task.assignedUserId) taskAssignees.push(task.assignedUserId);
      (task as any).assignedUsers?.forEach((au: any) => { if (au.userId) taskAssignees.push(au.userId); });
      const uniqueAssignees = [...new Set(taskAssignees)];

      if (uniqueAssignees.length > 0) {
        const msgNotif = action === 'approved' ? `✅ Tu entrega fue aprobada: "${task.title}"`
          : action === 'comments' ? `💬 El PM dejó comentarios en: "${task.title}"`
          : `🔄 Se solicita nueva versión en: "${task.title}"`;

        if (clientId) {
          // Verificar cuáles están asignados a la cuenta del cliente
          const clientUsers = { userIds: [] as string[] }; // simplificado: todos reciben notif
          const clientUserIds: string[] = clientUsers.userIds ?? [];
          for (const uid of uniqueAssignees) {
            if (clientUserIds.includes(uid)) {
              // Está en la cuenta → ya recibió el mensaje del chat del room
              await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: uid, message: msgNotif, type: 'task', link: '/dashboard/tasks' }) });
            } else {
              // No está en la cuenta → notificación a su inbox
              await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: uid, message: msgNotif, type: 'task', link: '/dashboard/tasks' }) });
            }
          }
        } else {
          for (const uid of uniqueAssignees) {
            await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: uid, message: msgNotif, type: 'task', link: '/dashboard/tasks' }) });
          }
        }
      }

      setReviewingFile(null);
      setReviewComment('');
      toast.success(action === 'approved' ? 'Entrega aprobada ✓' : action === 'comments' ? 'Comentarios enviados ✓' : 'Nueva versión solicitada ✓');
    } catch {
      toast.error('Error al procesar revisión');
    } finally {
      setReviewLoading(false);
    }
  }

  const { startUpload, isUploading } = useUploadThing('taskAttachment', {
    onClientUploadComplete: async (res) => {
      if (!res?.length || !task) return;
      await Promise.all(res.map(f =>
        fetch('/api/task-attachments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: task.id,
            fileName: f.name,
            fileUrl: f.ufsUrl || f.url,
            fileType: f.type || 'application/octet-stream',
            fileSize: f.size,
          }),
        })
      ));
      fetchAttachments();
      // Para team: preguntar si quiere marcar como completada
      if (!isManager && task.status !== 'completed' && task.status !== 'internal_review') {
        setShowCompleteAfterUpload(true);
      } else {
        toast.success('Archivo subido ✓');
      }
    },
    onUploadError: (err) => { console.error('Upload error:', err); },
  });

  const fetchAttachments = useCallback(async () => {
    if (!task) return;
    setLoadingFiles(true);
    try {
      const isParent = !task.parentTaskId;
      const url = isParent
        ? `/api/task-attachments?taskId=${task.id}&includeSubtasks=true`
        : `/api/task-attachments?taskId=${task.id}`;
      const res = await fetch(url);
      const data = await res.json();
      setAttachments(data.attachments || []);
    } finally {
      setLoadingFiles(false);
    }
  }, [task]);

  useEffect(() => {
    if (open && task) fetchAttachments();
    else setAttachments([]);
  }, [open, task, fetchAttachments]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/task-attachments?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAttachments(prev => prev.filter(a => a.id !== id));
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Error al eliminar archivo');
      }
    } catch {
      toast.error('Error de conexión al eliminar');
    } finally {
      setDeletingId(null);
    }
  }

  const [statusDropOpen, setStatusDropOpen] = React.useState(false);

  if (!task) return null;
  const statusStyle = statusStyleMap[task.status] ?? { background: 'rgba(226,232,240,0.12)', color: '#E2E8F0' };
  const statusLbl = !isManager
    ? ({ pending: 'Por hacer', in_progress: 'En curso', internal_review: 'Listo ✓', changes_requested: 'Con observaciones', client_review: 'En revisión', approved: 'Aprobado', completed: 'Completado' } as Record<string,string>)[task.status] ?? statusLabels[task.status] ?? task.status
    : statusLabels[task.status] ?? task.status;
  const assignees = resolveAssignees(task);
  const overdue   = isOverdue(task.dueDate) && task.status !== 'completed';
  const imageAttachments = attachments.filter(a => a.fileType.startsWith('image/'));

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent
          side="right"
          className="bg-[#15151c] border-l border-white/[0.08] text-white w-full sm:max-w-lg flex flex-col p-0 overflow-hidden gap-0"
        >
          {/* Header */}
          <div className="px-5 pt-5 pb-4 border-b border-white/[0.06] shrink-0">
            <div className="flex items-start gap-3 pr-6">
              <div className="w-9 h-9 rounded-xl bg-brand/15 flex items-center justify-center shrink-0 mt-0.5">
                <CheckSquare className="w-4 h-4 text-brand-light" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-white leading-snug">{task.title}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <div className="relative">
                    <button
                      onClick={() => setStatusDropOpen(!statusDropOpen)}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium cursor-pointer hover:opacity-80 transition-opacity" style={statusStyle}
                    >
                      {statusLbl}
                      <svg className="w-2.5 h-2.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {statusDropOpen && (
                      <div className="absolute top-full left-0 mt-1 z-50 bg-[#16161e] border border-white/[0.08] rounded-xl shadow-2xl p-1 min-w-[180px]">
                        {isManager ? (
                          <>
                            <p className="px-3 pt-1.5 pb-0.5 text-[9px] font-semibold text-white/20 uppercase tracking-wider">Progreso</p>
                            {(['pending','in_progress'] as const).map(s => (
                              <button key={s} onClick={async () => { setStatusDropOpen(false); if (onStatusChange) await onStatusChange(task.id, s); }}
                                className={`flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-white/[0.05] ${task.status === s ? 'opacity-100' : 'opacity-50'}`}>
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium" style={statusStyleMap[s]}>{({'pending':'Por hacer','in_progress':'En curso'} as Record<string,string>)[s]}</span>
                                {task.status === s && <svg className="w-3 h-3 text-white/60 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                              </button>
                            ))}
                            <div className="my-1 border-t border-white/[0.05]" />
                            <p className="px-3 pt-1 pb-0.5 text-[9px] font-semibold text-white/20 uppercase tracking-wider">Revisión</p>
                            {(['internal_review','client_review','changes_requested'] as const).map(s => (
                              <button key={s} onClick={async () => { setStatusDropOpen(false); if (onStatusChange) await onStatusChange(task.id, s); }}
                                className={`flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-white/[0.05] ${task.status === s ? 'opacity-100' : 'opacity-50'}`}>
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium" style={statusStyleMap[s]}>{({'internal_review':'Revisión interna','client_review':'En revisión cliente','changes_requested':'Cambios pedidos'} as Record<string,string>)[s]}</span>
                                {task.status === s && <svg className="w-3 h-3 text-white/60 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                              </button>
                            ))}
                            <div className="my-1 border-t border-white/[0.05]" />
                            <p className="px-3 pt-1 pb-0.5 text-[9px] font-semibold text-white/20 uppercase tracking-wider">Cierre</p>
                            {(['approved','scheduled','published','completed'] as const).map(s => (
                              <button key={s} onClick={async () => { setStatusDropOpen(false); if (onStatusChange) await onStatusChange(task.id, s); }}
                                className={`flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-white/[0.05] ${task.status === s ? 'opacity-100' : 'opacity-50'}`}>
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium" style={statusStyleMap[s]}>{({'approved':'Aprobado','scheduled':'Programado','published':'Publicado','completed':'Completado'} as Record<string,string>)[s]}</span>
                                {task.status === s && <svg className="w-3 h-3 text-white/60 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                              </button>
                            ))}
                          </>
                        ) : (
                          <>
                            {(['pending','in_progress','internal_review','changes_requested'] as const).map(s => (
                              <button key={s} onClick={async () => { setStatusDropOpen(false); if (onStatusChange) await onStatusChange(task.id, s); }}
                                className={`flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-white/[0.05] ${task.status === s ? 'opacity-100' : 'opacity-50'}`}>
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium" style={statusStyleMap[s]}>{({'pending':'Por hacer','in_progress':'En curso','internal_review':'En revisión','changes_requested':'Con observaciones'} as Record<string,string>)[s]}</span>
                                {task.status === s && <svg className="w-3 h-3 text-white/60 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] font-medium ${priorityColors[task.priority] || 'text-white/40'}`}>{priorityLabels[task.priority] || task.priority}</span>
                  {overdue && (<span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-400"><AlertCircle className="w-3 h-3" />Vencida</span>)}
                  {attachments.length > 0 && (<span className="inline-flex items-center gap-1 text-[10px] font-medium text-white/40"><Paperclip className="w-3 h-3" />{attachments.length}</span>)}
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <motion.div
            className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut', delay: 0.1 }}
          >
            {/* Meta */}
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
                  <p className={`text-xs ${overdue ? 'text-red-400' : 'text-white/70'}`}>{fmtDate(task.dueDate)}</p>
                </div>
              </div>
              {assignees.length > 0 && (
                <div className="flex items-start gap-2 col-span-1 sm:col-span-2">
                  <Users className="w-3.5 h-3.5 shrink-0 mt-0.5 text-white/50" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">{assignees.length === 1 ? 'Responsable' : `Responsables (${assignees.length})`}</p>
                    {assignees.length === 1 ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={assignees[0].image || undefined} />
                          <AvatarFallback className="text-[8px] font-medium" style={{ backgroundColor: (assignees[0].color || '#7c3aed') + '33', color: assignees[0].color || '#7c3aed' }}>
                            {initials(assignees[0].name, assignees[0].email)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-white/70">{assignees[0].name || assignees[0].email}</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <UserAvatarStack users={assignees as ActivityAssignee[]} max={6} size="sm" />
                        <p className="text-[10px] text-white/40 mt-1">{assignees.map((u) => u.name || u.email).join(', ')}</p>
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
                    <p className="text-xs text-white/70">{task.client.name}{task.client.company && <span className="text-white/40"> — {task.client.company}</span>}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Description — colapsable si es larga */}
            {task.description && (
              <DescriptionBlock description={task.description} />
            )}

            {/* Attachments */}
            <div className="space-y-3">
              {/* Input file reutilizable */}
              <input id="file-upload-input" type="file" multiple accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={e => {
                const ALLOWED_MIME = ['image/jpeg','image/png','image/gif','image/webp','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
                const MAX_SIZE: Record<string, number> = { 'application/pdf': 16*1024*1024 };
                const DEFAULT_MAX = 8*1024*1024;
                const files = Array.from(e.target.files || []).filter(f => {
                  if (!ALLOWED_MIME.includes(f.type)) { toast.error(`Tipo no permitido: ${f.name}`); return false; }
                  const maxSize = MAX_SIZE[f.type] ?? DEFAULT_MAX;
                  if (f.size > maxSize) { toast.error(`${f.name} supera el límite`); return false; }
                  return true;
                });
                if (files.length) startUpload(files);
                e.target.value = '';
              }} disabled={isUploading} />

              {/* TEAM: botones de entrega — archivo + link */}
              {!isManager && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <label htmlFor="file-upload-input" className="cursor-pointer">
                      <div className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-dashed border-violet-500/30 hover:border-violet-500/60 bg-violet-500/[0.04] hover:bg-violet-500/[0.08] transition-all group">
                        {isUploading
                          ? <><Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" /><span className="text-[12px] text-violet-300">Subiendo...</span></>
                          : <><Upload className="w-3.5 h-3.5 text-violet-400/70 group-hover:text-violet-400 transition-colors" /><span className="text-[12px] font-medium text-violet-300/70 group-hover:text-violet-300 transition-colors">Subir archivo</span></>
                        }
                      </div>
                    </label>
                    <button type="button" onClick={() => setShowLinkInput(v => !v)}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-violet-500/30 hover:border-violet-500/60 bg-violet-500/[0.04] hover:bg-violet-500/[0.08] transition-all">
                      <Link2 className="w-3.5 h-3.5 text-violet-400/70" />
                      <span className="text-[12px] font-medium text-violet-300/70">Agregar link</span>
                    </button>
                  </div>
                  {/* Input de link de entrega */}
                  {showLinkInput && (
                    <div className="flex gap-2">
                      <input
                        value={deliveryLink}
                        onChange={e => setDeliveryLink(e.target.value)}
                        placeholder="https://drive.google.com/... o link del trabajo"
                        className="flex-1 h-9 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-[12px] text-white/70 placeholder-white/20 outline-none focus:border-violet-500/40"
                      />
                      <button type="button"
                        disabled={!deliveryLink.trim()}
                        onClick={async () => {
                          if (!deliveryLink.trim()) return;
                          // Guardar el link como nota en la tarea
                          await fetch('/api/chat', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              room: (task as any).clientId || 'TEAM',
                              message: `🔗 Entrega de "${task.title}": ${deliveryLink}`,
                              isSystem: true, systemName: 'Weeklink',
                            }),
                          }).catch(() => {});
                          toast.success('Link de entrega guardado ✓');
                          setDeliveryLink('');
                          setShowLinkInput(false);
                          setShowCompleteAfterUpload(true);
                        }}
                        className="h-9 px-3 rounded-lg text-[12px] font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-40 transition-colors">
                        Guardar
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Modal confirmar completar tras subir archivo — solo team */}
              {showCompleteAfterUpload && (
                <div className="rounded-xl border border-violet-500/30 p-3.5 space-y-3" style={{ background: 'rgba(124,58,237,0.08)' }}>
                  <p className="text-xs font-medium text-white/80">✅ Archivo subido — ¿marcar tarea como completada?</p>
                  <div className="flex gap-2">
                    <button onClick={async () => {
                      setShowCompleteAfterUpload(false);
                      if (onStatusChange) await onStatusChange(task!.id, 'internal_review');
                      toast.success('Tarea enviada a revisión ✓');
                    }} className="flex-1 py-1.5 rounded-lg text-xs font-medium text-white transition-all" style={{ background: '#7c3aed' }}>
                      Sí, enviar a revisión
                    </button>
                    <button onClick={() => { setShowCompleteAfterUpload(false); toast.success('Archivo subido ✓'); }}
                      className="px-3 py-1.5 rounded-lg text-xs text-white/40 border border-white/[0.08] hover:text-white transition-colors">
                      No por ahora
                    </button>
                  </div>
                </div>
              )}

              {/* PM/ADMIN: header con botón adjuntar pequeño */}
              {isManager && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-3.5 h-3.5 text-white/40" />
                    <p className="text-[10px] text-white/30 uppercase tracking-wider">Archivos adjuntos {attachments.length > 0 && `(${attachments.length})`}</p>
                  </div>
                  <label htmlFor="file-upload-input" className="cursor-pointer">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-md text-white/60 hover:text-white text-xs transition-colors">
                      {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                      {isUploading ? 'Subiendo...' : 'Adjuntar'}
                    </div>
                  </label>
                </div>
              )}
              {/* TEAM: label archivos pequeño */}
              {!isManager && attachments.length > 0 && (
                <div className="flex items-center gap-2">
                  <Paperclip className="w-3 h-3 text-white/30" />
                  <p className="text-[10px] text-white/25 uppercase tracking-wider">Archivos ({attachments.length})</p>
                </div>
              )}

              {/* Referencias de imagen (subidas desde el form de crear/editar) */}
              {(() => {
                const rawRefs = (task as any).references;
                const parsedRefs = Array.isArray(rawRefs) ? rawRefs : (typeof rawRefs === 'string' ? (() => { try { return JSON.parse(rawRefs); } catch { return []; } })() : []);
                const refImages = Array.isArray(parsedRefs)
                  ? parsedRefs.filter((r: any) => {
                    if (r.type !== 'file') return false;
                    const ft = (r.fileType || '').toLowerCase();
                    const url = (r.url || '').toLowerCase();
                    const title = (r.title || r.name || r.fileName || '').toLowerCase();
                    const imgExt = /\.(png|jpg|jpeg|gif|webp|svg|avif|heic)($|\?)/;
                    return ft.startsWith('image') || imgExt.test(url) || imgExt.test(title);
                  })
                  : [];
                if (refImages.length === 0) return null;
                return (
                  <div className="space-y-2">
                    <p className="text-[10px] text-white/25 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🖼</span> Referencias visuales ({refImages.length})
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {refImages.map((r: any, i: number) => (
                        <div key={i} className="group cursor-pointer" onClick={() => setLightbox(r.url)}>
                          <div className="relative rounded-xl overflow-hidden bg-white/[0.04] border border-white/[0.06]"
                            style={{ aspectRatio: '1' }}>
                            <img
                              src={r.url}
                              alt={r.title || 'referencia'}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              onError={e => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                            <div className="hidden absolute inset-0 flex items-center justify-center">
                              <span className="text-2xl">📎</span>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-end pb-2 gap-1">
                              <div className="flex gap-1.5">
                                <button onClick={e => { e.stopPropagation(); setLightbox(r.url); }}
                                  className="flex items-center gap-1 px-2 py-1 bg-white/20 rounded-lg text-white text-[10px] hover:bg-white/30">
                                  <ExternalLink className="w-3 h-3" /> Ver
                                </button>
                                <button onClick={e => { e.stopPropagation(); downloadFile(r.url, r.title || r.name || 'referencia'); }}
                                  className="flex items-center gap-1 px-2 py-1 bg-white/20 rounded-lg text-white text-[10px] hover:bg-white/30">
                                  <Download className="w-3 h-3" /> Descargar
                                </button>
                              </div>
                            </div>
                          </div>
                          {r.title && (
                            <p className="text-[10px] text-white/30 truncate mt-1 px-0.5">{r.title}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Referencias de links (no imagen) del form */}
              {(() => {
                const rawRefs2 = (task as any).references;
                const parsedRefs2 = Array.isArray(rawRefs2) ? rawRefs2 : (typeof rawRefs2 === 'string' ? (() => { try { return JSON.parse(rawRefs2); } catch { return []; } })() : []);
                const refLinks = Array.isArray(parsedRefs2)
                  ? parsedRefs2.filter((r: any) => {
                    if (r.type !== 'file') return true; // links siempre se muestran
                    // archivos que NO son imagen también en la lista de links
                    const ft = (r.fileType || '').toLowerCase();
                    const url = (r.url || '').toLowerCase();
                    return !(ft.startsWith('image') || /\.(png|jpg|jpeg|gif|webp|svg|avif|heic)($|\?)/.test(url));
                  })
                  : [];
                if (refLinks.length === 0) return null;
                return (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-white/25 uppercase tracking-wider">Referencias ({refLinks.length})</p>
                    {refLinks.map((r: any, i: number) => (
                      <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] hover:border-violet-500/30 transition-colors group">
                        <span className="text-[10px] font-bold px-1 rounded bg-white/10 text-white/40 uppercase">{r.type || 'link'}</span>
                        <span className="text-[11px] text-blue-400 group-hover:text-blue-300 truncate">{r.title || r.url}</span>
                      </a>
                    ))}
                  </div>
                );
              })()}

              {/* Image previews */}
              {imageAttachments.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {imageAttachments.map(a => (
                    <div key={a.id} className="flex flex-col gap-1">
                      <div className="relative group aspect-square rounded-lg overflow-hidden bg-white/[0.04] border border-white/[0.06] cursor-pointer" onClick={() => setLightbox(a.fileUrl)}>
                        <img src={a.fileUrl} alt={a.fileName} className="w-full h-full object-cover" />
                        {(a as any).reviewStatus === 'approved' && (
                          <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(34,197,94,0.18)', border: '2px solid rgba(34,197,94,0.5)', borderRadius: '8px' }} />
                        )}
                        {(a as any).reviewStatus === 'changes_requested' && (
                          <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(234,179,8,0.18)', border: '2px solid rgba(234,179,8,0.5)', borderRadius: '8px' }} />
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button onClick={e => { e.stopPropagation(); window.open(a.fileUrl, '_blank'); }} className="p-1 bg-white/20 rounded hover:bg-white/30"><ExternalLink className="w-3 h-3 text-white" /></button>
                          <button onClick={e => { e.stopPropagation(); handleDelete(a.id); }} className="p-1 bg-red-500/40 rounded hover:bg-red-500/60" disabled={deletingId === a.id}><Trash2 className="w-3 h-3 text-white" /></button>
                        </div>
                      </div>
                      {/* Badge reviewStatus */}
                      {(a as any).reviewStatus === 'approved' && (
                        <div className="flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-medium text-green-300 border border-green-500/30" style={{ background: 'rgba(34,197,94,0.08)' }}>
                          ✅ Aprobada
                        </div>
                      )}
                      {(a as any).reviewStatus === 'changes_requested' && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-medium text-amber-300 border border-amber-500/30" style={{ background: 'rgba(234,179,8,0.08)' }}>
                            ✏️ Cambios pedidos
                          </div>
                          {(a as any).reviewComment && (
                            <p className="text-[10px] text-white/40 px-1 truncate" title={(a as any).reviewComment}>{(a as any).reviewComment}</p>
                          )}
                        </div>
                      )}
                      {isManager && !(a as any).reviewStatus && (
                        <div className="flex gap-1">
                          <button onClick={async () => {
                            await handleAttachmentReview(a.id, 'approved');
                            await handleFileReview('approved', a.id, a.fileName, (a as any).task?.parentTaskId ? (a as any).task?.id : undefined);
                          }} disabled={reviewLoading}
                            className="flex-1 py-1 rounded-md text-[10px] font-medium text-green-300 border border-green-500/30 hover:bg-green-500/10 transition-colors truncate">
                            ✅ Aprobar
                          </button>
                          <button onClick={() => { setReviewingFile(reviewingFile === a.id ? null : a.id); setReviewComment(''); }}
                            className="flex-1 py-1 rounded-md text-[10px] font-medium text-amber-300 border border-amber-500/30 hover:bg-amber-500/10 transition-colors truncate">
                            ✏️ Correcciones
                          </button>
                        </div>
                      )}
                      {isManager && reviewingFile === a.id && !(a as any).reviewStatus && (
                        <div className="p-2 rounded-lg border border-violet-500/20 space-y-1.5" style={{ background: 'rgba(124,58,237,0.06)' }}>
                          <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)}
                            placeholder={`(${a.fileName}) correcciones: ...`} rows={2}
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-[10px] text-white/70 placeholder:text-white/20 resize-none focus:outline-none focus:border-violet-500/40" />
                          <button onClick={async () => {
                            if (!reviewComment.trim()) { toast.error('Escribe las correcciones'); return; }
                            await handleAttachmentReview(a.id, 'changes_requested', reviewComment);
                            await handleFileReview('comments', a.id, a.fileName, (a as any).task?.parentTaskId ? (a as any).task?.id : undefined);
                          }} disabled={reviewLoading || !reviewComment.trim()}
                            className="w-full py-1 rounded-md text-[10px] font-medium text-blue-300 border border-blue-500/30 hover:bg-blue-500/10 transition-colors disabled:opacity-40">
                            💬 Enviar correcciones
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* File list */}
              {loadingFiles ? (
                <div className="flex items-center gap-2 text-white/30 text-xs py-2"><Loader2 className="w-3 h-3 animate-spin" />Cargando archivos...</div>
              ) : (
                <div className="space-y-1.5">
                  {attachments.filter(a => !a.fileType.startsWith('image/')).map(a => (
                    <div key={a.id} className="flex items-center gap-3 p-2.5 bg-white/[0.03] border border-white/[0.05] rounded-lg group hover:bg-white/[0.05] transition-colors">
                      <FileIcon type={a.fileType} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/80 truncate">{a.fileName}</p>
                        <p className="text-[10px] text-white/30">
                          {fmtSize(a.fileSize)} · {a.user.name || 'Usuario'} · {fmtDate(a.createdAt)}
                          {(a as any).task?.parentTaskId === null && (a as any).task?.id !== task?.id && (
                            <span className="ml-1 text-violet-400/60">↳ {(a as any).task?.title}</span>
                          )}
                          {(a as any).task?.parentTaskId && (
                            <span className="ml-1 text-violet-400/60">↳ {(a as any).task?.title}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => window.open(a.fileUrl, '_blank')} className="p-1 hover:bg-white/[0.08] rounded text-white/40 hover:text-white"><Download className="w-3 h-3" /></button>
                        {isManager && (
                          <button onClick={() => { setReviewingFile(reviewingFile === a.id ? null : a.id); setReviewComment(''); }}
                            className="p-1 hover:bg-violet-500/20 rounded text-white/40 hover:text-violet-400" title="Revisar entrega">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </button>
                        )}
                        <button onClick={() => handleDelete(a.id)} disabled={deletingId === a.id} className="p-1 hover:bg-red-500/20 rounded text-white/40 hover:text-red-400">
                          {deletingId === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        </button>
                      </div>
                      {/* Panel revisión PM */}
                      {isManager && reviewingFile === a.id && (
                        <div className="mt-2 p-3 rounded-xl border border-violet-500/20 space-y-2 col-span-full w-full" style={{ background: 'rgba(124,58,237,0.06)' }}>
                          <div className="flex gap-2">
                            <button onClick={() => handleFileReview('approved', a.id, a.fileName, (a as any).task?.parentTaskId ? (a as any).task?.id : undefined)} disabled={reviewLoading}
                              className="flex-1 py-1.5 rounded-lg text-[11px] font-medium text-green-300 border border-green-500/30 hover:bg-green-500/10 transition-colors">
                              ✅ Aprobado
                            </button>
                            <button onClick={() => handleFileReview('new_version', a.id, a.fileName, (a as any).task?.parentTaskId ? (a as any).task?.id : undefined)} disabled={reviewLoading}
                              className="flex-1 py-1.5 rounded-lg text-[11px] font-medium text-amber-300 border border-amber-500/30 hover:bg-amber-500/10 transition-colors">
                              🔄 Nueva versión
                            </button>
                          </div>
                          <div className="space-y-1.5">
                            <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)}
                              placeholder="Escribe un comentario..." rows={2}
                              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white/70 placeholder:text-white/20 resize-none focus:outline-none focus:border-violet-500/40" />
                            <button onClick={() => { if (reviewComment.trim()) handleFileReview('comments', a.id, a.fileName, (a as any).task?.parentTaskId ? (a as any).task?.id : undefined); else toast.error('Escribe un comentario'); }}
                              disabled={reviewLoading || !reviewComment.trim()}
                              className="w-full py-1.5 rounded-lg text-[11px] font-medium text-blue-300 border border-blue-500/30 hover:bg-blue-500/10 transition-colors disabled:opacity-40">
                              💬 Enviar comentarios
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {attachments.length === 0 && !loadingFiles && (
                    <p className="text-[10px] text-white/20 text-center py-3">No hay archivos adjuntos</p>
                  )}
                </div>
              )}
            </div>

            {/* Subtareas */}
            <div className="border border-white/[0.06] rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setSubtasksOpen(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center gap-2 text-[11px] font-medium text-white/40 uppercase tracking-wider">
                  <CheckSquare className="w-3 h-3 text-violet-400/60" />
                  Subtareas{subtasks.length > 0 && ` (${subtasks.length})`}{subtasks.length === 0 && ' —'}
                </div>
                <svg className={`w-3.5 h-3.5 text-white/20 transition-transform ${subtasksOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </button>
              {subtasksOpen && (
                <div className="px-3 pb-3 pt-2 space-y-1.5">
                  {subtasks.length === 0 ? (
                    <p className="text-[11px] text-white/20 text-center py-2">Sin subtareas</p>
                  ) : (
                    subtasks.map((sub) => (
                      <div key={sub.id} className="rounded-lg bg-white/[0.02] border border-white/[0.04] overflow-hidden group/sub">
                        {/* Fila principal */}
                        <div className="flex items-center gap-2.5 py-1.5 px-2">
                          <span className="text-white/20 text-xs shrink-0">↳</span>
                          <span className={`flex-1 text-xs font-medium ${sub.status === 'completed' ? 'text-white/30 line-through' : 'text-white/70'}`}>
                            {sub.title}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                            sub.status === 'completed' ? 'bg-green-500/15 text-green-300' :
                            sub.status === 'in_progress' ? 'bg-blue-500/15 text-blue-300' :
                            'bg-white/[0.06] text-white/30'
                          }`}>
                            {sub.status === 'completed' ? 'Lista' : sub.status === 'in_progress' ? 'En progreso' : 'Pendiente'}
                          </span>
                          {/* Botón editar */}
                          <button
                            type="button"
                            onClick={() => { setEditingSubtask(sub); setNewSubtaskOpen(true); }}
                            className="p-1 rounded text-white/20 hover:text-violet-400 hover:bg-violet-500/10 transition-all shrink-0"
                            title="Editar subtarea"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          {/* Botón eliminar */}
                          <button
                            type="button"
                            onClick={async () => {
                              if (!confirm(`¿Eliminar subtarea "${sub.title}"?`)) return;
                              await fetch(`/api/tasks?id=${sub.id}`, { method: 'DELETE' });
                              setSubtasks(prev => prev.filter(s => s.id !== sub.id));
                            }}
                            className="p-1 rounded text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                            title="Eliminar subtarea"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                  <button
                    type="button"
                    onClick={() => setNewSubtaskOpen(true)}
                    className="w-full flex items-center justify-center gap-1.5 mt-2 py-1.5 rounded-lg border border-dashed border-violet-500/30 text-violet-300/60 hover:text-violet-300 hover:border-violet-400/50 hover:bg-violet-500/5 transition-all text-xs"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    Agregar subtarea
                  </button>
                </div>
              )}
            </div>

            {/* Created by */}
            {task.user && (<div className="text-[10px] text-white/30">Creada por {task.user.name || task.user.email}</div>)}
          </motion.div>

          {/* Footer */}
          <div className="border-t border-white/[0.06] px-5 py-3 flex items-center gap-2 shrink-0 flex-wrap">
            {onEdit && (() => {
              // TEAM_MEMBER solo edita tareas que él creó
              // PM/Admin pueden editar cualquier tarea
              const isCreator = (task as any).userId === currentUserId;
              return isManager || isCreator;
            })() && (
              <Button size="sm" variant="outline" onClick={() => onEdit(task)} className="border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.06] gap-1.5 text-xs h-8">
                <Pencil className="w-3.5 h-3.5" />Editar tarea
              </Button>
            )}
            {isManager && task.status !== 'completed' && (
              <Button size="sm" variant="outline" onClick={handleRemind} disabled={reminding}
                className="border-[#EAB308]/30 text-[#EAB308] hover:text-[#EAB308]/80 hover:bg-[#EAB308]/10 gap-1.5 text-xs h-8">
                {reminding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                {reminding ? 'Enviando...' : 'Recordatorio'}
              </Button>
            )}
            {isManager && ['approved','completed'].includes(task.status) && (
              <Button size="sm" variant="outline" disabled={reviewLoading} onClick={async () => {
                if (!onStatusChange) return;
                await onStatusChange(task.id, 'internal_review');
                toast.success('Tarea devuelta a revisión');
                onClose();
              }}
                className="gap-1.5 text-xs h-8 border-white/[0.08] text-white/40 hover:text-amber-300 hover:border-amber-500/30 hover:bg-amber-500/10">
                <RotateCcw className="w-3.5 h-3.5" />Devolver
              </Button>
            )}
            {isManager && !['approved','completed'].includes(task.status) && (
              <Button size="sm" disabled={reviewLoading} onClick={async () => {
                if (!onStatusChange) return;
                await onStatusChange(task.id, 'approved');
                // Mensaje de felicitacion en chat
                const clientId = (task as any).clientId || (task as any).client?.id;
                if (clientId) {
                  // Obtener team members correctamente para el mensaje de felicitación
                  const _assigned2 = (task as any).assignedUsers ?? [];
                  const _team2 = _assigned2.filter((au: any) =>
                    !['ADMIN','PROJECT_MANAGER'].includes(au.role ?? au.user?.role ?? '')
                  );
                  const mentions2 = _team2
                    .map((au: any) => au.name || au.user?.name || au.email?.split('@')[0])
                    .filter(Boolean).map((n: string) => `@${n}`).join(' ') || '';
                  await fetch('/api/chat', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      room: clientId,
                      message: mentions2
                        ? `🎉 ¡Felicidades ${mentions2}! La tarea "${task.title}" fue aprobada ✅`
                        : `✅ Tarea aprobada: "${task.title}"`,
                      isSystem: true,
                      systemName: 'Weeklink',
                      isInternal: false,
                    }),
                  }).catch(() => {});
                }
                toast.success('Tarea aprobada ✓');
                onClose();
              }}
                className="gap-1.5 text-xs h-8 bg-green-500/15 border border-green-500/30 text-green-300 hover:bg-green-500/25 hover:text-green-200">
                <CheckCircle2 className="w-3.5 h-3.5" />Aprobar tarea
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onClose} className="text-white/30 hover:text-white hover:bg-white/[0.06] text-xs h-8 ml-auto">
              <X className="w-3.5 h-3.5 mr-1" />Cerrar
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* TaskForm para nueva subtarea */}
      {task && (
        <TaskForm
          open={newSubtaskOpen}
          onOpenChange={(v) => { setNewSubtaskOpen(v); if (!v) setEditingSubtask(null); }}
          parentTaskId={editingSubtask ? undefined : task.id}
          parentTaskTitle={editingSubtask ? undefined : task.title}
          task={editingSubtask}
          initialClientId={task.clientId ?? null}
          isManager={isManager}
          onSuccess={() => {
            fetch(`/api/tasks?parentId=${task.id}`)
              .then(r => r.json())
              .then(d => setSubtasks(d.tasks || []));
            setEditingSubtask(null);
          }}
        />
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/60 hover:text-white" onClick={() => setLightbox(null)}><X className="w-6 h-6" /></button>
          <img src={lightbox} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
