'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { CheckSquare, Clock, Users, Pencil, X, Building2, AlertCircle, Calendar as CalendarIcon, Paperclip, Upload, Trash2, Download, FileText, ImageIcon, Loader2, ExternalLink, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import UserAvatarStack from '@/components/dashboard/UserAvatarStack';
import { useUploadThing } from '@/lib/uploadthing';
import type { Task, TaskAssignee, ActivityAssignee } from '@/lib/types';
import { statusColors, statusLabels, priorityColors, priorityLabels } from '@/lib/theme-maps';
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

export default function TaskDetailModal({ task, open, onClose, onEdit, isManager = false, currentUserId }: TaskDetailModalProps) {
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

  // También recargar al expandir (por si hay cambios)
  useEffect(() => {
    if (!subtasksOpen || !task) return;
    fetch(`/api/tasks?parentId=${task.id}`)
      .then(r => r.json())
      .then(d => setSubtasks(d.tasks || []));
  }, [subtasksOpen, task?.id]);
  const [reminding, setReminding] = useState(false);

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
      alert(`Recordatorio enviado a ${data.enviados} usuario${data.enviados !== 1 ? 's' : ''}`);
    } catch (err: any) {
      alert(err.message || 'Error al enviar recordatorio');
    } finally {
      setReminding(false);
    }
  }

  const { startUpload, isUploading } = useUploadThing('taskAttachment', {
    onClientUploadComplete: async (res) => {
      if (!res?.length || !task) return;
      for (const f of res) {
        await fetch('/api/task-attachments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: task.id,
            fileName: f.name,
            fileUrl: f.ufsUrl || f.url,
            fileType: f.type || 'application/octet-stream',
            fileSize: f.size,
          }),
        });
      }
      fetchAttachments();
    },
    onUploadError: (err) => { console.error('Upload error:', err); },
  });

  const fetchAttachments = useCallback(async () => {
    if (!task) return;
    setLoadingFiles(true);
    try {
      const res = await fetch(`/api/task-attachments?taskId=${task.id}`);
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
      await fetch(`/api/task-attachments?id=${id}`, { method: 'DELETE' });
      setAttachments(prev => prev.filter(a => a.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  if (!task) return null;

  const statusCls = statusColors[task.status] ?? 'status-pending';
  const statusLbl = statusLabels[task.status] ?? task.status;
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
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusCls}`}>{statusLbl}</span>
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

            {/* Description */}
            {task.description && (
              <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-2.5">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Descripción</p>
                <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            {/* Attachments */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-3.5 h-3.5 text-white/40" />
                  <p className="text-[10px] text-white/30 uppercase tracking-wider">Archivos adjuntos {attachments.length > 0 && `(${attachments.length})`}</p>
                </div>
                <label className="cursor-pointer">
                  <input type="file" multiple accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={e => {
                      const ALLOWED_MIME = [
                        'image/jpeg','image/png','image/gif','image/webp',
                        'application/pdf',
                        'application/msword',
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                      ];
                      const files = Array.from(e.target.files || []).filter(f => {
                        if (!ALLOWED_MIME.includes(f.type)) {
                          toast.error(`Tipo de archivo no permitido: ${f.name}`);
                          return false;
                        }
                        return true;
                      });
                      if (files.length) startUpload(files);
                      e.target.value = '';
                    }} disabled={isUploading} />
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-md text-white/60 hover:text-white text-xs transition-colors">
                    {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    {isUploading ? 'Subiendo...' : 'Adjuntar'}
                  </div>
                </label>
              </div>

              {/* Image previews */}
              {imageAttachments.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {imageAttachments.map(a => (
                    <div key={a.id} className="relative group aspect-square rounded-lg overflow-hidden bg-white/[0.04] border border-white/[0.06] cursor-pointer" onClick={() => setLightbox(a.fileUrl)}>
                      <img src={a.fileUrl} alt={a.fileName} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button onClick={e => { e.stopPropagation(); window.open(a.fileUrl, '_blank'); }} className="p-1 bg-white/20 rounded hover:bg-white/30"><ExternalLink className="w-3 h-3 text-white" /></button>
                        <button onClick={e => { e.stopPropagation(); handleDelete(a.id); }} className="p-1 bg-red-500/40 rounded hover:bg-red-500/60" disabled={deletingId === a.id}><Trash2 className="w-3 h-3 text-white" /></button>
                      </div>
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
                        <p className="text-[10px] text-white/30">{fmtSize(a.fileSize)} · {a.user.name || 'Usuario'} · {fmtDate(a.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => window.open(a.fileUrl, '_blank')} className="p-1 hover:bg-white/[0.08] rounded text-white/40 hover:text-white"><Download className="w-3 h-3" /></button>
                        <button onClick={() => handleDelete(a.id)} disabled={deletingId === a.id} className="p-1 hover:bg-red-500/20 rounded text-white/40 hover:text-red-400">
                          {deletingId === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        </button>
                      </div>
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
            {onEdit && (isManager || (task as any).userId === currentUserId) && (
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
