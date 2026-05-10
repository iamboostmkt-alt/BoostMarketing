'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  const [title, setTitle]           = useState('');
  const [description, setDesc]      = useState('');
  const [status, setStatus]         = useState('pending');
  const [priority, setPriority]     = useState('medium');
  const [startDate, setStartDate]   = useState<Date>();
  const [endDate, setEndDate]       = useState<Date | undefined>();
  const [assignedUserId, setAssignee] = useState('');
  const [users, setUsers]           = useState<User[]>([]);
  const [startOpen, setStartOpen]   = useState(false);
  const [endOpen, setEndOpen]       = useState(false);
  const [loading, setLoading]       = useState(false);

  // Pre-fill when editing
  useEffect(() => {
    if (activity) {
      setTitle(activity.title);
      setDesc(activity.description);
      setStatus(activity.status);
      setPriority(activity.priority);
      setStartDate(new Date(activity.startDate));
      setEndDate(activity.endDate ? new Date(activity.endDate) : undefined);
      setAssignee(activity.assignedUserId ?? '');
    } else {
      setTitle('');
      setDesc('');
      setStatus('pending');
      setPriority('medium');
      setStartDate(undefined);
      setEndDate(undefined);
      setAssignee('');
    }
  }, [activity, open]);

  useEffect(() => {
    if (isManager && open) {
      fetch('/api/admin/users')
        .then((r) => r.json())
        .then((d) => setUsers(d.users ?? []))
        .catch(() => {});
    }
  }, [isManager, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate) { toast.error('Selecciona una fecha de inicio.'); return; }

    setLoading(true);
    try {
      const payload = {
        id:             activity?.id,
        title:          title.trim(),
        description:    description.trim(),
        status,
        priority,
        startDate:      startDate.toISOString(),
        endDate:        endDate?.toISOString() ?? null,
        assignedUserId: assignedUserId || null,
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
      <DialogContent className="bg-[#15151c] border-white/[0.08] text-white max-w-lg w-full">
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

          {/* Start date + End date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm text-white/70">Inicio *</Label>
              <Popover open={startOpen} onOpenChange={setStartOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    type="button"
                    disabled={loading}
                    className={cn(
                      'w-full justify-start text-left font-normal bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] hover:text-white text-sm',
                      !startDate && 'text-white/30'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-white/40" />
                    {startDate ? format(startDate, 'dd/MM/yy', { locale: es }) : 'Fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[#15151c] border-white/[0.08]" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(d) => { setStartDate(d); setStartOpen(false); }}
                    initialFocus
                    className="text-white"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-white/70">Fin (opcional)</Label>
              <Popover open={endOpen} onOpenChange={setEndOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    type="button"
                    disabled={loading}
                    className={cn(
                      'w-full justify-start text-left font-normal bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] hover:text-white text-sm',
                      !endDate && 'text-white/30'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-white/40" />
                    {endDate ? format(endDate, 'dd/MM/yy', { locale: es }) : 'Fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[#15151c] border-white/[0.08]" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(d) => { setEndDate(d); setEndOpen(false); }}
                    disabled={(d) => startDate ? d < startDate : false}
                    initialFocus
                    className="text-white"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Assign to user (manager only) */}
          {isManager && (
            <div className="space-y-1.5">
              <Label className="text-sm text-white/70">Asignar a</Label>
              <Select value={assignedUserId} onValueChange={setAssignee} disabled={loading}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white focus:ring-brand">
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent className="bg-[#15151c] border-white/[0.08] text-white max-h-48">
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="focus:bg-white/[0.06]">
                      {u.name || u.email}
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
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : activity ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
