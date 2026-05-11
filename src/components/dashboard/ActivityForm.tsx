'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Loader2, X, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Activity } from '@/lib/types';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  color: string;
}

interface ActivityFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity?: Activity | null;
  isManager?: boolean;
  onSuccess: () => void;
}

export default function ActivityForm({
  open,
  onOpenChange,
  activity,
  isManager = false,
  onSuccess,
}: ActivityFormProps) {
  const [title, setTitle]               = useState('');
  const [description, setDesc]          = useState('');
  const [status, setStatus]             = useState('pending');
  const [priority, setPriority]         = useState('medium');
  const [startDate, setStartDate]       = useState<Date | undefined>();
  const [endDate, setEndDate]           = useState<Date | undefined>();
  const [assignedUserIds, setAssignees] = useState<string[]>([]);
  const [clientId, setClientId]         = useState('');
  const [users, setUsers]               = useState<User[]>([]);
  const [clients, setClients]           = useState<{ id: string; name: string; company: string }[]>([]);
  const [startOpen, setStartOpen]       = useState(false);
  const [endOpen, setEndOpen]           = useState(false);
  const [loading, setLoading]           = useState(false);

  useEffect(() => {
    if (activity) {
      setTitle(activity.title);
      setDesc(activity.description);
      setStatus(activity.status);
      setPriority(activity.priority);
      setStartDate(new Date(activity.startDate));
      setEndDate(activity.endDate ? new Date(activity.endDate) : undefined);
      const ids = activity.assignedUsers?.map((u) => u.id) ??
        (activity.assignedUserId ? [activity.assignedUserId] : []);
      setAssignees(ids);
      setClientId(activity.clientId ?? '');
    } else {
      setTitle('');
      setDesc('');
      setStatus('pending');
      setPriority('medium');
      setStartDate(undefined);
      setEndDate(undefined);
      setAssignees([]);
      setClientId('');
    }
    setStartOpen(false);
    setEndOpen(false);
  }, [activity, open]);

  useEffect(() => {
    if (!isManager || !open) return;
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((d) => {
        const internal = (d.users ?? []).filter((u: User) => u.role !== 'CLIENT');
        setUsers(internal);
      })
      .catch(() => {});
    fetch('/api/clients')
      .then((r) => r.json())
      .then((d) => setClients(d.clients ?? []))
      .catch(() => {});
  }, [isManager, open]);

  function toggleAssignee(id: string) {
    setAssignees((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate) { toast.error('Selecciona una fecha de inicio.'); return; }

    setLoading(true);
    try {
      const payload = {
        id:              activity?.id,
        title:           title.trim(),
        description:     description.trim(),
        status,
        priority,
        startDate:       startDate.toISOString(),
        endDate:         endDate?.toISOString() ?? null,
        assignedUserIds: assignedUserIds.length > 0 ? assignedUserIds : null,
        clientId:        clientId || null,
      };

      const res = await fetch('/api/activities', {
        method:  activity ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar.');

      toast.success(activity ? 'Actividad actualizada.' : 'Actividad creada.');
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#15151c] border-white/[0.08] text-white max-w-lg w-full max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">
            {activity ? 'Editar Actividad' : 'Nueva Actividad'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-sm text-white/70">Título *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nombre de la actividad"
              required
              disabled={loading}
              className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus-visible:ring-brand"
            />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm text-white/70">Estado</Label>
              <Select value={status} onValueChange={setStatus} disabled={loading}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white focus:ring-brand">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#15151c] border-white/[0.08] text-white">
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="in_progress">En Progreso</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-white/70">Prioridad</Label>
              <Select value={priority} onValueChange={setPriority} disabled={loading}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white focus:ring-brand">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#15151c] border-white/[0.08] text-white">
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Start date */}
          <div className="space-y-1.5">
            <Label className="text-sm text-white/70">Inicio *</Label>
            <Button
              variant="outline"
              type="button"
              disabled={loading}
              onClick={() => { setStartOpen((p) => !p); setEndOpen(false); }}
              className={cn(
                'w-full justify-start text-left font-normal bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] hover:text-white text-sm',
                !startDate && 'text-white/30'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-white/40" />
              {startDate ? format(startDate, "dd 'de' MMMM yyyy", { locale: es }) : 'Seleccionar fecha de inicio'}
            </Button>
            {startOpen && (
              <div className="rounded-lg border border-white/[0.08] bg-[#0e0e14] shadow-2xl p-1">
                <div className="flex justify-end p-1">
                  <button type="button" onClick={() => setStartOpen(false)} className="text-white/30 hover:text-white/70 p-1 rounded">
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

          {/* End date */}
          <div className="space-y-1.5">
            <Label className="text-sm text-white/70">Fin (opcional)</Label>
            <Button
              variant="outline"
              type="button"
              disabled={loading}
              onClick={() => { setEndOpen((p) => !p); setStartOpen(false); }}
              className={cn(
                'w-full justify-start text-left font-normal bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] hover:text-white text-sm',
                !endDate && 'text-white/30'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-white/40" />
              {endDate ? format(endDate, "dd 'de' MMMM yyyy", { locale: es }) : 'Seleccionar fecha de fin'}
            </Button>
            {endOpen && (
              <div className="rounded-lg border border-white/[0.08] bg-[#0e0e14] shadow-2xl p-1">
                <div className="flex justify-end p-1">
                  <button type="button" onClick={() => setEndOpen(false)} className="text-white/30 hover:text-white/70 p-1 rounded">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(d) => { setEndDate(d); setEndOpen(false); }}
                  disabled={(d) => (startDate ? d < startDate : false)}
                  className="text-white"
                />
              </div>
            )}
          </div>

          {/* Multi-assignee — manager only */}
          {isManager && users.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-sm text-white/70">
                Asignar a
                {assignedUserIds.length > 0 && (
                  <span className="ml-1.5 text-brand-light">({assignedUserIds.length})</span>
                )}
              </Label>
              <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] max-h-40 overflow-y-auto">
                {users.map((u) => {
                  const selected = assignedUserIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      disabled={loading}
                      onClick={() => toggleAssignee(u.id)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-white/[0.04] transition-colors',
                        selected && 'bg-brand/[0.08]'
                      )}
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: u.color || '#7c3aed' }}
                      />
                      <span className="flex-1 text-left text-white/80">{u.name || u.email}</span>
                      {selected && <Check className="w-3.5 h-3.5 text-brand-light shrink-0" />}
                    </button>
                  );
                })}
              </div>
              {assignedUserIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setAssignees([])}
                  className="text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                  Limpiar selección
                </button>
              )}
            </div>
          )}

          {/* Client — manager only */}
          {isManager && clients.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-sm text-white/70">Cuenta de cliente</Label>
              <Select
                value={clientId || 'none'}
                onValueChange={(v) => setClientId(v === 'none' ? '' : v)}
                disabled={loading}
              >
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white focus:ring-brand">
                  <SelectValue placeholder="Sin cuenta asignada" />
                </SelectTrigger>
                <SelectContent className="bg-[#15151c] border-white/[0.08] text-white max-h-48">
                  <SelectItem value="none" className="text-white/50 focus:bg-white/[0.06]">
                    Sin cuenta asignada
                  </SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="focus:bg-white/[0.06]">
                      {c.name}{c.company ? ` — ${c.company}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-sm text-white/70">Descripción</Label>
            <Textarea
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Descripción de la actividad..."
              rows={3}
              disabled={loading}
              className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus-visible:ring-brand resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1 border-white/[0.08] text-white/70 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-brand hover:bg-brand-dark text-white"
            >
              {loading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : activity ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
