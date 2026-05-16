'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, CalendarIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Task } from '@/lib/types';
import { taskStatuses, priorityLabels } from '@/lib/theme-maps';
import { normalizeTaskStatus } from '@/lib/task-status';

interface InternalUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  color: string;
}

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  isManager?: boolean;
  onSuccess?: () => void;
  initialDate?: Date | null;
  initialClientId?: string | null;
}

export default function TaskForm({ open, onOpenChange, task, isManager = false, onSuccess, initialDate, initialClientId }: TaskFormProps) {
  const isEditing = !!task;

  const [loading, setLoading]             = useState(false);
  const [title, setTitle]                 = useState('');
  const [description, setDescription]     = useState('');
  const [status, setStatus]               = useState('pending');
  const [priority, setPriority]           = useState('medium');
  const [startDate, setStartDate]         = useState<Date | undefined>();
  const [dueDate, setDueDate]             = useState<Date | undefined>();
  const [startOpen, setStartOpen]         = useState(false);
  const [dueOpen, setDueOpen]             = useState(false);
  const [assignedUserIds, setAssigneeIds] = useState<string[]>([]);
  const [clientId, setClientId]           = useState('');
  const [visibility, setVisibility]       = useState('internal');
  const [references, setReferences]       = useState<{title:string;url:string;type:string}[]>([]);
  const [refTitle, setRefTitle]           = useState('');
  const [refUrl, setRefUrl]               = useState('');
  const [refType, setRefType]             = useState('generic');
  const [users, setUsers]                 = useState<InternalUser[]>([]);
  const [clients, setClients]             = useState<{ id: string; name: string; company: string }[]>([]);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(normalizeTaskStatus(task.status));
      setPriority(task.priority);
      setStartDate(task.startDate ? new Date(task.startDate) : undefined);
      setDueDate(task.dueDate ? new Date(task.dueDate) : undefined);
      const ids = (task.assignedUsers && task.assignedUsers.length > 0)
        ? task.assignedUsers.map((u) => u.id).filter(Boolean)
        : (task.assignedUserId ? [task.assignedUserId] : []);
      setAssigneeIds(ids);
      setVisibility(task.visibility || 'internal');
      setReferences(Array.isArray(task.references) ? task.references : []);
      setClientId(task.clientId ?? '');
    } else {
      setTitle(''); setDescription(''); setStatus('pending'); setPriority('medium');
      setStartDate(initialDate ?? undefined);
      setDueDate(initialDate ?? undefined);
      setAssigneeIds([]); setClientId(initialClientId ?? '');
    }
    setStartOpen(false); setDueOpen(false);
    prevClientId.current = null;
  }, [task, open]);

  function toggleAssignee(id: string) {
    setAssigneeIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  // Cargar todos los usuarios del equipo (una sola vez al abrir)
  const [allUsers, setAllUsers] = React.useState<InternalUser[]>([]);

  useEffect(() => {
    if (!open) return;
    fetch('/api/team-members')
      .then((r) => r.json())
      .then((d) => {
        const all = (d.users ?? []).filter((u: InternalUser) => u.role !== 'CLIENT' && u.role !== 'UNASSIGNED');
        setAllUsers(all);
        setUsers(all);
      })
      .catch(() => {});
    if (isManager) {
      fetch('/api/clients')
        .then((r) => r.json())
        .then((d) => setClients(d.clients ?? []))
        .catch(() => {});
    }
  }, [isManager, open]);

  // Ref para saber si el clientId cambió por acción del usuario (no por carga inicial)
  const prevClientId = React.useRef<string | null>(null);
  useEffect(() => {
    if (allUsers.length === 0) return;
    setUsers(allUsers);
    // Solo ajustar visibilidad si el clientId cambió después de la carga inicial
    if (prevClientId.current !== null && prevClientId.current !== clientId) {
      if (clientId) {
        setVisibility('client_visible');
      } else {
        setVisibility('internal');
      }
    }
    prevClientId.current = clientId;
  }, [clientId, allUsers]);

  function toggleStart() { setStartOpen((p) => !p); setDueOpen(false); }
  function toggleDue()   { setDueOpen((p) => !p);   setStartOpen(false); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error('El titulo es requerido'); return; }
    setLoading(true);
    try {
      const body = {
        title: title.trim(), description: description.trim(),
        status, priority,
        startDate: startDate?.toISOString() ?? null,
        dueDate:   dueDate?.toISOString()   ?? null,
        assignedUserIds: isManager ? assignedUserIds : undefined,
        clientId:        isManager ? (clientId || null) : (initialClientId || null),
        visibility:      isManager ? visibility : undefined,
        ...(isEditing ? { id: task!.id } : {}),
      };
      const res = await fetch('/api/tasks', {
        method:  isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar la tarea');
      }
      toast.success(isEditing ? 'Tarea actualizada' : 'Tarea creada');
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar la tarea');
    } finally {
      setLoading(false);
    }
  }

  const dateBtn = (label: string, date: Date | undefined, onClick: () => void) => (
    <Button variant="outline" type="button" disabled={loading} onClick={onClick}
      className={cn('w-full justify-start text-left font-normal bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] hover:text-white text-sm', !date && 'text-white/30')}>
      <CalendarIcon className="mr-2 h-4 w-4 text-white/40 shrink-0" />
      {date ? format(date, "dd 'de' MMM yyyy", { locale: es }) : label}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#15151c] border-white/[0.06] text-white sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">{isEditing ? 'Editar Tarea' : 'Nueva Tarea'}</DialogTitle>
          <DialogDescription className="text-white/40">
            {isEditing ? 'Modifica los detalles de la tarea' : 'Completa los campos para crear una nueva tarea'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title" className="text-white/70 text-sm">Titulo <span className="text-red-400">*</span></Label>
            <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Disenar landing page"
              className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus-visible:ring-brand" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-desc" className="text-white/70 text-sm">Descripcion</Label>
            <Textarea id="task-desc" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe la tarea..." rows={3}
              className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus-visible:ring-brand resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-white/70 text-sm">Estado</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white w-full"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#1c1c27] border-white/[0.08]">
                  {taskStatuses.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-white/80 focus:text-white focus:bg-white/[0.06]">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-white/70 text-sm">Prioridad</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white w-full"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#1c1c27] border-white/[0.08]">
                  {Object.entries(priorityLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="text-white/80 focus:text-white focus:bg-white/[0.06]">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isManager && (
            <div className="space-y-2">
              <Label className="text-white/70 text-sm">Visibilidad</Label>
              <Select value={visibility} onValueChange={(v) => {
                setVisibility(v);
                if (v === 'internal') setClientId('');
              }}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white w-full"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#1c1c27] border-white/[0.08]">
                  <SelectItem value="internal" className="text-white/80 focus:text-white focus:bg-white/[0.06]">Interno</SelectItem>
                  <SelectItem value="client_visible" className="text-white/80 focus:text-white focus:bg-white/[0.06]">Visible al cliente</SelectItem>
                  <SelectItem value="management" className="text-white/80 focus:text-white focus:bg-white/[0.06]">Solo gerencia</SelectItem>
                  <SelectItem value="team_only" className="text-white/80 focus:text-white focus:bg-white/[0.06]">Solo equipo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-white/70 text-sm">Fecha inicio <span className="text-white/30 text-[10px]">(opcional)</span></Label>
            {dateBtn('Seleccionar fecha de inicio', startDate, toggleStart)}
            {startOpen && (
              <div className="rounded-lg border border-white/[0.08] bg-[#0e0e14] shadow-2xl p-1">
                <div className="flex justify-end px-2 pt-1">
                  <button type="button" onClick={() => setStartOpen(false)} className="text-white/30 hover:text-white/70 p-1 rounded transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Calendar mode="single" selected={startDate} onSelect={(d) => { setStartDate(d); setStartOpen(false); }} className="text-white" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-white/70 text-sm">Fecha limite <span className="text-red-400">*</span></Label>
            {dateBtn('Seleccionar fecha limite', dueDate, toggleDue)}
            {dueOpen && (
              <div className="rounded-lg border border-white/[0.08] bg-[#0e0e14] shadow-2xl p-1">
                <div className="flex justify-end px-2 pt-1">
                  <button type="button" onClick={() => setDueOpen(false)} className="text-white/30 hover:text-white/70 p-1 rounded transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Calendar mode="single" selected={dueDate} onSelect={(d) => { setDueDate(d); setDueOpen(false); }}
                  disabled={(d) => (startDate ? d < startDate : false)} className="text-white" />
              </div>
            )}
          </div>

          {/* Asignar usuarios - visible para todos los roles internos */}
          {users.length > 0 && (
            <div className="space-y-2">
              <Label className="text-white/70 text-sm flex items-center justify-between">
                <span>Asignar a {assignedUserIds.length > 0 && <span className="text-brand-light text-xs">({assignedUserIds.length})</span>}</span>
                {assignedUserIds.length > 0 && (
                  <button type="button" onClick={() => setAssigneeIds([])} className="text-[11px] text-white/30 hover:text-white/60 transition-colors">Limpiar</button>
                )}
              </Label>
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-lg p-1 max-h-44 overflow-y-auto">
                {users.map((u) => {
                  const checked = assignedUserIds.includes(u.id);
                  return (
                    <button key={u.id} type="button" onClick={() => toggleAssignee(u.id)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-colors text-left text-sm ${checked ? 'bg-brand/25 text-white' : 'text-white/70 hover:bg-white/[0.04] hover:text-white'}`}>
                      <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${checked ? 'border-brand bg-brand' : 'border-white/20 bg-white/[0.04]'}`}>
                        {checked && (
                          <svg viewBox="0 0 12 12" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2 6l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: u.color || '#7c3aed' }} />
                      <span className="truncate flex-1">{u.name || u.email}</span>
                      <span className="text-[10px] text-white/30">{u.role.toLowerCase()}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isManager && clients.length > 0 && !initialClientId && (
            <div className="space-y-2">
              <Label className="text-white/70 text-sm">Cuenta de cliente</Label>
              <Select value={clientId || 'none'} onValueChange={(v) => setClientId(v === 'none' ? '' : v)}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white w-full"><SelectValue placeholder="Sin cuenta asignada" /></SelectTrigger>
                <SelectContent className="bg-[#1c1c27] border-white/[0.08] max-h-48">
                  <SelectItem value="none" className="text-white/50 focus:text-white focus:bg-white/[0.06]">Sin cuenta asignada</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-white/80 focus:text-white focus:bg-white/[0.06]">
                      {c.name}{c.company ? ` - ${c.company}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-white/70 text-sm">Referencias</label>
            {references.length > 0 && (
              <div className="space-y-1 mb-2">
                {references.map((r, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-white/40 uppercase">{r.type}</span>
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline truncate">{r.title || r.url}</a>
                    </div>
                    <button type="button" onClick={() => setReferences(references.filter((_,j)=>j!==i))} className="text-white/30 hover:text-red-400 ml-2 text-xs">x</button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input value={refTitle} onChange={e=>setRefTitle(e.target.value)} placeholder="Titulo" className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white placeholder:text-white/30" />
              <select value={refType} onChange={e=>setRefType(e.target.value)} className="bg-white/[0.04] border border-white/[0.08] rounded-md px-2 py-2 text-sm text-white">
                <option value="generic">Link</option>
                <option value="drive">Drive</option>
                <option value="figma">Figma</option>
                <option value="loom">Loom</option>
                <option value="pinterest">Pinterest</option>
                <option value="youtube">YouTube</option>
              </select>
            </div>
            <div className="flex gap-2">
              <input value={refUrl} onChange={e=>setRefUrl(e.target.value)} placeholder="URL" className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white placeholder:text-white/30" />
              <button type="button" onClick={()=>{ if(!refUrl.trim()) return; setReferences([...references,{title:refTitle.trim()||refUrl.trim(),url:refUrl.trim(),type:refType}]); setRefTitle(''); setRefUrl(''); setRefType('generic'); }} className="px-3 py-2 bg-white/[0.08] hover:bg-white/[0.12] text-white text-sm rounded-md">+ Agregar</button>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)} className="border-white/[0.06]" disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading || !title.trim()} className="bg-brand hover:bg-brand-dark text-white gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? 'Guardar Cambios' : 'Crear Tarea'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}