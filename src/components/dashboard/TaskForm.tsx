'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, CalendarIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Task } from '@/lib/types';
import { taskStatuses, priorityLabels } from '@/lib/theme-maps';

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
}

export default function TaskForm({
  open,
  onOpenChange,
  task,
  isManager = false,
  onSuccess,
}: TaskFormProps) {
  const isEditing = !!task;

  const [loading, setLoading]           = useState(false);
  const [title, setTitle]               = useState('');
  const [description, setDescription]   = useState('');
  const [status, setStatus]             = useState('pending');
  const [priority, setPriority]         = useState('medium');
  const [startDate, setStartDate]       = useState<Date | undefined>();
  const [dueDate, setDueDate]           = useState<Date | undefined>();
  const [startOpen, setStartOpen]       = useState(false);
  const [dueOpen, setDueOpen]           = useState(false);
  const [assignedUserId, setAssignee]   = useState('');
  const [clientId,       setClientId]   = useState('');
  const [users,          setUsers]      = useState<InternalUser[]>([]);
  const [clients,        setClients]    = useState<{ id: string; name: string; company: string }[]>([]);

  // Pre-fill when editing
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority);
      setStartDate(task.startDate ? new Date(task.startDate) : undefined);
      setDueDate(task.dueDate ? new Date(task.dueDate) : undefined);
      setAssignee(task.assignedUserId ?? '');
      setClientId(task.clientId ?? '');
    } else {
      setTitle('');
      setDescription('');
      setStatus('pending');
      setPriority('medium');
      setStartDate(undefined);
      setDueDate(undefined);
      setAssignee('');
      setClientId('');
    }
    setStartOpen(false);
    setDueOpen(false);
  }, [task, open]);

  // Fetch internal team members + clients when manager opens dialog
  useEffect(() => {
    if (!isManager || !open) return;
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((d) => {
        const internal = (d.users ?? []).filter((u: InternalUser) => u.role !== 'CLIENT');
        setUsers(internal);
      })
      .catch(() => {});
    fetch('/api/clients')
      .then((r) => r.json())
      .then((d) => setClients(d.clients ?? []))
      .catch(() => {});
  }, [isManager, open]);

  function toggleStart() { setStartOpen((p) => !p); setDueOpen(false); }
  function toggleDue()   { setDueOpen((p) => !p);   setStartOpen(false); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error('El título es requerido'); return; }

    setLoading(true);
    try {
      const body = {
        title:          title.trim(),
        description:    description.trim(),
        status,
        priority,
        startDate:      startDate?.toISOString() ?? null,
        dueDate:        dueDate?.toISOString()   ?? null,
        assignedUserId: isManager && assignedUserId ? assignedUserId : undefined,
        clientId:       isManager && clientId       ? clientId       : undefined,
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
    <Button
      variant="outline"
      type="button"
      disabled={loading}
      onClick={onClick}
      className={cn(
        'w-full justify-start text-left font-normal bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] hover:text-white text-sm',
        !date && 'text-white/30'
      )}
    >
      <CalendarIcon className="mr-2 h-4 w-4 text-white/40 shrink-0" />
      {date ? format(date, "dd 'de' MMM yyyy", { locale: es }) : label}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#15151c] border-white/[0.06] text-white sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isEditing ? 'Editar Tarea' : 'Nueva Tarea'}
          </DialogTitle>
          <DialogDescription className="text-white/40">
            {isEditing
              ? 'Modifica los detalles de la tarea'
              : 'Completa los campos para crear una nueva tarea'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="task-title" className="text-white/70 text-sm">
              Título <span className="text-red-400">*</span>
            </Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Diseñar landing page"
              className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus-visible:ring-brand"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="task-desc" className="text-white/70 text-sm">
              Descripción
            </Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe la tarea..."
              rows={3}
              className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus-visible:ring-brand resize-none"
            />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-white/70 text-sm">Estado</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1c1c27] border-white/[0.08]">
                  {taskStatuses.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-white/80 focus:text-white focus:bg-white/[0.06]">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-white/70 text-sm">Prioridad</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1c1c27] border-white/[0.08]">
                  {Object.entries(priorityLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="text-white/80 focus:text-white focus:bg-white/[0.06]">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Start date — inline calendar */}
          <div className="space-y-2">
            <Label className="text-white/70 text-sm">
              Fecha inicio <span className="text-red-400">*</span>
            </Label>
            {dateBtn('Seleccionar fecha de inicio', startDate, toggleStart)}
            {startOpen && (
              <div className="rounded-lg border border-white/[0.08] bg-[#0e0e14] shadow-2xl p-1">
                <div className="flex justify-end px-2 pt-1">
                  <button type="button" onClick={() => setStartOpen(false)}
                    className="text-white/30 hover:text-white/70 p-1 rounded transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(d) => { setStartDate(d); setStartOpen(false); }}
                  className="text-white"
                />
              </div>
            )}
          </div>

          {/* Due date — inline calendar */}
          <div className="space-y-2">
            <Label className="text-white/70 text-sm">
              Fecha límite <span className="text-red-400">*</span>
            </Label>
            {dateBtn('Seleccionar fecha límite', dueDate, toggleDue)}
            {dueOpen && (
              <div className="rounded-lg border border-white/[0.08] bg-[#0e0e14] shadow-2xl p-1">
                <div className="flex justify-end px-2 pt-1">
                  <button type="button" onClick={() => setDueOpen(false)}
                    className="text-white/30 hover:text-white/70 p-1 rounded transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={(d) => { setDueDate(d); setDueOpen(false); }}
                  disabled={(d) => (startDate ? d < startDate : false)}
                  className="text-white"
                />
              </div>
            )}
          </div>

          {/* Assign to internal user — manager only */}
          {isManager && (
            <div className="space-y-2">
              <Label className="text-white/70 text-sm">Asignar a</Label>
              <Select value={assignedUserId || 'none'} onValueChange={(v) => setAssignee(v === 'none' ? '' : v)}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white w-full">
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent className="bg-[#1c1c27] border-white/[0.08] max-h-48">
                  <SelectItem value="none" className="text-white/50 focus:text-white focus:bg-white/[0.06]">
                    Sin asignar
                  </SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-white/80 focus:text-white focus:bg-white/[0.06]">
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: u.color || '#7c3aed' }} />
                        {u.name || u.email}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Link to client account — manager only */}
          {isManager && clients.length > 0 && (
            <div className="space-y-2">
              <Label className="text-white/70 text-sm">Cuenta de cliente</Label>
              <Select value={clientId || 'none'} onValueChange={(v) => setClientId(v === 'none' ? '' : v)}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white w-full">
                  <SelectValue placeholder="Sin cuenta asignada" />
                </SelectTrigger>
                <SelectContent className="bg-[#1c1c27] border-white/[0.08] max-h-48">
                  <SelectItem value="none" className="text-white/50 focus:text-white focus:bg-white/[0.06]">
                    Sin cuenta asignada
                  </SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-white/80 focus:text-white focus:bg-white/[0.06]">
                      {c.name}{c.company ? ` — ${c.company}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-white/30">
                La tarea aparecerá en el portal del cliente seleccionado.
              </p>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}
              className="text-white/50 hover:text-white hover:bg-white/[0.06]" disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !title.trim()}
              className="bg-brand hover:bg-brand-dark text-white gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? 'Guardar Cambios' : 'Crear Tarea'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
