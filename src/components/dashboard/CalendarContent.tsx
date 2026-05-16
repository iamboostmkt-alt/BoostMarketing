'use client';
 
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  CalendarDays, Plus, CheckSquare, Clock, Video, Pencil, Trash2,
  Sparkles,
} from 'lucide-react';
import {
  format, isSameDay, isToday,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
 
import TaskForm from '@/components/dashboard/TaskForm';
import CalendarGrid from '@/components/dashboard/CalendarGrid';
import type { Task, Activity, Appointment } from '@/lib/types';
import { bus, RT_EVENTS } from '@/lib/event-bus';
import {
  statusColors, statusLabels, priorityColors, priorityLabels,
} from '@/lib/theme-maps';
 
const MANAGER_ROLES = ['ADMIN', 'PROJECT_MANAGER'];
 
function dayLabel(day: Date): string {
  try {
    const label = format(day, "EEEE, d 'de' MMMM", { locale: es });
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return day.toLocaleDateString('es-MX', { weekday: 'long', month: 'long', day: 'numeric' });
  }
}
 
function getTaskAvatar(u: { name: string | null; email: string; color: string; image?: string | null } | undefined) {
  if (!u) return null;
  return (
    <div className="flex items-center gap-1.5 ml-auto">
      <Avatar className="h-5 w-5">
        <AvatarImage src={u.image || undefined} />
        <AvatarFallback
          className="text-[9px] font-medium"
          style={{ backgroundColor: (u.color || '#7c3aed') + '33', color: u.color || '#7c3aed' }}
        >
          {(u.name || u.email).slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="text-[10px] text-white/40 truncate max-w-[80px]">
        {u.name || u.email}
      </span>
    </div>
  );
}
 
// ─────────────────────────────────────────â‚¬Ã¢â€â‚¬ AppointmentEditModal Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
interface AppointmentEditModalProps {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  appointment:  Appointment | null;
  onSaved:      () => void;
}
 
// Ã¢â€â‚¬Ã¢â€â‚¬ AppointmentEditModal Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
interface InternalUser {
  id: string;
  name: string | null;
  email: string;
  color: string;
  image?: string | null;
}

interface AppointmentEditModalProps {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  appointment:  Appointment | null;
  onSaved:      () => void;
  onDeleted?:   (id: string) => void;
  initialDate?: Date | null;
}

function AppointmentEditModal({ open, onOpenChange, appointment, onSaved, onDeleted, initialDate }: AppointmentEditModalProps) {
  const [name,            setName]           = useState('');
  const [email,           setEmail]          = useState('');
  const [phone,           setPhone]          = useState('');
  const [date,            setDate]           = useState('');
  const [notes,           setNotes]          = useState('');
  const [status,          setStatus]         = useState('pending');
  const [meetUrl,         setMeetUrl]        = useState('');
  const [assignedUserIds, setAssignedIds]    = useState<string[]>([]);
  const [teamUsers,       setTeamUsers]      = useState<InternalUser[]>([]);
  const [clients,         setClients]        = useState<{id:string;name:string;email:string;company:string}[]>([]);
  const [clientEmail,     setClientEmail]    = useState('');
  const [saving,          setSaving]         = useState(false);
  const [deleting,        setDeleting]       = useState(false);

  useEffect(() => {
    if (open) {
      fetch('/api/team-members')
        .then((r) => r.json())
        .then((d) => {
          const internal = (d.users ?? []).filter((u: InternalUser & { role: string }) =>
            u.role !== 'CLIENT' && u.role !== 'UNASSIGNED'
          );
          setTeamUsers(internal);
        })
        .catch(() => {});
      fetch('/api/clients')
        .then((r) => r.json())
        .then((d) => setClients(d.clients ?? []))
        .catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (open && appointment) {
      setName(appointment.name ?? '');
      setEmail(appointment.email ?? '');
      setPhone((appointment as any).phone ?? '');
      setNotes((appointment as any).notes ?? '');
      setStatus(appointment.status ?? 'pending');
      setMeetUrl((appointment as any).meetUrl ?? '');
      setClientEmail((appointment as any).email ?? '');
      const ids = ((appointment as any).assignedUsers ?? []).map((a: any) => a.user?.id ?? a.userId ?? a.id);
      setAssignedIds(ids.filter(Boolean));
      try {
        const d = new Date(appointment.date);
        const pad = (n: number) => String(n).padStart(2, '0');
        setDate(
          d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
          'T' + pad(d.getHours()) + ':' + pad(d.getMinutes())
        );
      } catch { setDate(''); }
    } else if (open && !appointment) {
      setName(''); setEmail(''); setPhone('');
      if (initialDate) { const pad = (n: number) => String(n).padStart(2,'0'); const d = initialDate; setDate(d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T10:00'); } else { setDate(''); }
      setNotes(''); setStatus('pending'); setMeetUrl(''); setAssignedIds([]); setClientEmail('');
    }
  }, [open, appointment]);

  function toggleUser(id: string) {
    setAssignedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const dateISO = date ? new Date(date).toISOString() : date;
      const method = appointment ? 'PATCH' : 'POST';
      const body: Record<string, unknown> = {
        name, email: clientEmail || email, phone, date: dateISO, notes, status, meetUrl, assignedUserIds,
      };
      if (appointment) body.id = appointment.id;
      const apiUrl = appointment ? '/api/appointments' : '/api/meetings';
      const res = await fetch(apiUrl, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      toast.success(appointment ? 'Videollamada actualizada' : 'Reunion agendada');
      onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!appointment) return;
    if (!confirm('Ã‚Â¿Eliminar esta videollamada?')) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/appointments?id=' + appointment.id, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      toast.success('Videollamada eliminada');
      onOpenChange(false);
      onDeleted?.(appointment.id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#15151c] border-white/[0.08] text-white max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Video className="h-4 w-4 text-green-400" />
            {appointment ? 'Editar Videollamada' : 'Agendar Reunion'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Nombre *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required
              placeholder="Titulo de la reunion"
              className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus-visible:ring-brand" />
          </div>
          {clients.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Cliente (opcional)</Label>
              <select value={clientEmail} onChange={(e) => setClientEmail(e.target.value)}
                className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand">
                <option value="">Sin cliente</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.email}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Telefono</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="+52 55 0000 0000"
              className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus-visible:ring-brand" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Fecha y hora *</Label>
            <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} required
              className="bg-white/[0.04] border-white/[0.08] text-white focus-visible:ring-brand [color-scheme:dark]" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Link Google Meet</Label>
            <Input value={meetUrl} onChange={(e) => setMeetUrl(e.target.value)}
              placeholder="https://meet.google.com/xxx-xxxx-xxx"
              className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus-visible:ring-brand" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Estado</Label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand">
              <option value="pending">Pendiente</option>
              <option value="confirmed">Confirmada</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </div>
          {/* Equipo asignado */}
          {teamUsers.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Equipo asignado</Label>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar p-1">
                {teamUsers.map((u) => {
                  const selected = assignedUserIds.includes(u.id);
                  return (
                    <button key={u.id} type="button" onClick={() => toggleUser(u.id)}
                      className={'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border transition-colors ' +
                        (selected
                          ? 'border-brand bg-brand/20 text-brand-light'
                          : 'border-white/[0.08] bg-white/[0.03] text-white/50 hover:text-white hover:border-white/20')}>
                      <Avatar className="h-4 w-4 shrink-0">
                        <AvatarImage src={u.image || undefined} />
                        <AvatarFallback className="text-[8px]"
                          style={{ backgroundColor: (u.color || '#7c3aed') + '33', color: u.color || '#7c3aed' }}>
                          {(u.name || u.email).slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {u.name || u.email}
                    </button>
                  );
                })}
              </div>
              {assignedUserIds.length > 0 && (
                <p className="text-[10px] text-white/40">{assignedUserIds.length} miembro{assignedUserIds.length !== 1 ? 's' : ''} asignado{assignedUserIds.length !== 1 ? 's' : ''}</p>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Notas</Label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand resize-none placeholder:text-white/25"
              placeholder="Notas opcionales..." />
          </div>
          <div className="flex gap-3 pt-1">
            {appointment && (
              <Button type="button" variant="outline" disabled={deleting} onClick={handleDelete}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 px-3">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}
              className="flex-1 border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.06]">
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}
              className="flex-1 bg-brand hover:bg-brand-dark text-white">
              {saving ? 'Guardando...' : appointment ? 'Guardar' : 'Agendar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
 
// Ã¢â€â‚¬Ã¢â€â‚¬ DayModal Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
interface DayModalProps {
  open:                boolean;
  onClose:             () => void;
  day:                 Date;
  tasks:               Task[];
  activities:          Activity[];
  appointments:        Appointment[];
  isManager:           boolean;
  onEditTask:          (t: Task) => void;
  onNewTask:           () => void;
  onNewAppointment?:  () => void;
  onDeleteTask:        (id: string) => Promise<void>;
  onEditAppointment:   (apt: Appointment) => void;
  onDeleteAppointment: (id: string) => Promise<void>;
}
 
function DayModal({
  open, onClose, day, tasks, activities, appointments, isManager,
  onEditTask, onNewTask, onDeleteTask, onEditAppointment, onDeleteAppointment, onNewAppointment,
}: DayModalProps) {
  const dayTasks = useMemo(
    () => tasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), day)),
    [tasks, day]
  );
  const dayActivities = useMemo(
    () => activities.filter((a) => a.startDate && isSameDay(new Date(a.startDate), day)),
    [activities, day]
  );
  const dayAppointments = useMemo(
    () => appointments.filter((a) => isSameDay(new Date(a.date), day)),
    [appointments, day]
  );
  const total = dayTasks.length + dayActivities.length + dayAppointments.length;
  const label = dayLabel(day);
 
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#15151c] border-white/[0.06] text-white max-w-lg w-full max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand/15 flex items-center justify-center shrink-0">
              <CalendarDays className="w-4 h-4 text-brand-light" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-white leading-tight">
                {isToday(day) ? 'Hoy · ' : ''}{label}
              </DialogTitle>
              <p className="text-xs text-white/40 mt-0.5">
                    {total === 0 ? 'Sin elementos' : `${total} elemento${total !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
        </DialogHeader>
 
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4">
          {/* Tareas */}
          {dayTasks.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/40 uppercase tracking-wider">
                <CheckSquare className="w-3 h-3" />
                Tareas ({dayTasks.length})
              </div>
              {dayTasks.map((task) => (
                <div key={task.id}
                  className="w-full text-left bg-white/[0.03] border border-white/[0.05] rounded-lg p-3.5 hover:border-white/[0.10] hover:bg-white/[0.05] transition-colors group">
                  <div className="flex items-start gap-2.5">
                    <button type="button" className="flex-1 text-left"
                      onClick={() => { onEditTask(task); onClose(); }}>
                      <div className="flex items-start gap-2.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 mt-0.5 ${statusColors[task.status] || 'status-pending'}`}>
                          {statusLabels[task.status] || task.status}
                        </span>
                        <p className="text-sm font-medium text-white/90 leading-tight group-hover:text-white transition-colors">
                          {task.title}
                        </p>
                      </div>
                      {task.description && (
                        <p className="text-xs text-white/35 mt-2 line-clamp-2 pl-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2.5 pl-1 flex-wrap">
                        <span className={`text-[10px] font-medium ${priorityColors[task.priority] || 'text-white/40'}`}>
                          {priorityLabels[task.priority] || task.priority}
                        </span>
                        {task.dueDate && (
                          <div className="flex items-center gap-1 text-[10px] text-white/25">
                            <Clock className="w-2.5 h-2.5 shrink-0" />
                            {format(new Date(task.dueDate), 'd MMM yyyy', { locale: es })}
                          </div>
                        )}
                        {task.assignedUser && getTaskAvatar(task.assignedUser)}
                      </div>
                    </button>
                    {isManager && (
                      <button type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!confirm(`Ã‚Â¿Eliminar "${task.title}"?`)) return;
                          await onDeleteTask(task.id);
                        }}
                        className="shrink-0 p-1.5 rounded-md text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="Eliminar tarea">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </section>
          )}
 
          {/* Videollamadas */}
          {dayAppointments.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/40 uppercase tracking-wider">
                <Video className="w-3 h-3" />
                Videollamadas ({dayAppointments.length})
              </div>
              {dayAppointments.map((apt) => (
                <div key={apt.id} className="bg-green-500/[0.06] border border-green-500/20 rounded-lg p-3.5 group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 mt-0.5 bg-green-500/20 text-green-300">
                        {apt.status === 'confirmed' ? 'Confirmada' : apt.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                      </span>
                      <p className="text-sm font-medium text-white/90 truncate">{apt.name}</p>
                    </div>
                    {isManager && (
                      <button type="button"
                        onClick={async () => {
                          if (!confirm(`Ã‚Â¿Eliminar videollamada con ${apt.name}?`)) return;
                          await onDeleteAppointment(apt.id);

                        }}
                        className="shrink-0 p-1 rounded text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-2 pl-1 flex-wrap">
                    <span className="text-[10px] text-white/25">{apt.email}</span>
                    <div className="flex items-center gap-1 text-[10px] text-white/25">
                      <Clock className="w-2.5 h-2.5" />
                      {format(new Date(apt.date), 'HH:mm', { locale: es })}
                    </div>
                  </div>
                  {(apt as any).notes && (
                    <p className="text-xs text-white/35 mt-2">{(apt as any).notes}</p>
                  )}
                  {isManager && (
                    <div className="mt-2.5">
                      <button type="button"
                        onClick={() => { onEditAppointment(apt); onClose(); }}
                        className="text-[10px] text-green-400/60 hover:text-green-400 flex items-center gap-1 transition-colors">
                        <Pencil className="w-3 h-3" /> Editar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}
 
          {total === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white/20" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/40">Sin elementos este dia</p>
                <p className="text-xs text-white/25 mt-0.5">No hay nada programado</p>
              </div>
            </div>
          )}
        </div>
 
        <div className="border-t border-white/[0.06] px-5 py-3 flex gap-2 shrink-0">
          <Button size="sm"
            className="bg-brand hover:bg-brand-dark text-white gap-1.5 text-xs h-8"
            onClick={() => { onNewTask(); onClose(); }}>
            <Plus className="w-3.5 h-3.5" />
            Tarea
          </Button>
          <Button size="sm"
            className="bg-white/[0.06] hover:bg-white/[0.10] text-white gap-1.5 text-xs h-8"
            onClick={() => { onNewAppointment && onNewAppointment(); onClose(); }}>
            <Video className="w-3.5 h-3.5" />
            Reunion
          </Button>
          <Button size="sm" variant="ghost"
            className="text-white/30 hover:text-white hover:bg-white/[0.06] text-xs h-8 ml-auto"
            onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
 
// Ã¢â€â‚¬Ã¢â€â‚¬ CalendarContent (main) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
export default function CalendarContent() {
  const { data: session } = useSession();
  const role      = session?.user?.role ?? '';
  const userId    = (session?.user as any)?.id ?? '';
  const isAdmin   = role === 'ADMIN';
  const isPM      = role === 'PROJECT_MANAGER';
  const isManager = isAdmin || isPM;
  const isClient  = role === 'CLIENT';

  type CalView = 'mine' | 'team' | 'clients' | 'all' | 'meetings' | 'deliveries';
  interface ClientOption { id: string; name: string; company?: string | null; }

  const [calView,      setCalView]      = useState<CalView>('mine');
  const [selectedClientId,  setSelectedClientId]  = useState<string>('all');
  const [clientOptions,     setClientOptions]     = useState<ClientOption[]>([]);
  const [tasks,        setTasks]        = useState<Task[]>([]);
  const [activities,   setActivities]   = useState<Activity[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [selectedDay,  setSelectedDay]  = useState<Date>(new Date());
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask,        setEditingTask]        = useState<Task | null>(null);
  const [apptEditOpen,       setApptEditOpen]       = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [apptInitialDate,    setApptInitialDate]    = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let tasksUrl = '/api/tasks?scope=mine';
      if (calView === 'all' && isAdmin)    tasksUrl = '/api/tasks?scope=all';
      else if (calView === 'team' && isManager) tasksUrl = '/api/tasks?scope=all';
      else if (calView === 'clients')      tasksUrl = '/api/tasks?scope=clients-with-tasks';
      else if (calView === 'deliveries')   tasksUrl = isAdmin ? '/api/tasks?scope=all&has_due=1' : '/api/tasks?scope=mine&has_due=1';

      const tasksRes = await fetch(tasksUrl);
      if (tasksRes.ok) {
        const data = await tasksRes.json();
        if (calView === 'clients') {
          const clients = data.clients ?? [];
          const allTasks = clients.flatMap((c: any) =>
            (c.tasks ?? []).map((t: any) => ({ ...t, clientId: t.clientId ?? c.id }))
          );
          setTasks(allTasks);
        } else {
          setTasks(data.tasks || []);
        }
      }

      const actRes = await fetch('/api/activities');
      if (actRes.ok) {
        const actData = await actRes.json();
        setActivities(actData.activities || []);
      }

      if (!isClient) {
        const appRes = await fetch('/api/appointments');
        if (appRes.ok) {
          const appData = await appRes.json();
          setAppointments(appData.appointments || []);
        }
        const meetRes = await fetch('/api/meetings');
        if (meetRes.ok) {
          const meetData = await meetRes.json();
          setAppointments(prev => {
            const prevAppts = prev.filter((a: any) => !a.email?.endsWith('@internal.boost'));
            return [...prevAppts, ...(meetData.meetings || [])];
          });
        }
      }
    } finally {
      setLoading(false);
    }
  }, [calView, isAdmin, isManager, isClient]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Cargar opciones de clientes para el selector
  useEffect(() => {
    if (!role) return; // esperar a que session esté lista
    fetch('/api/clients')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.clients) setClientOptions(d.clients);
      })
      .catch(() => {});
  }, [role]);



  useEffect(() => {
    const unsubs = [
      bus.on<{ task: Task }>(RT_EVENTS.TASK_CREATED, ({ task }) => {
        setTasks((prev) => prev.some((t) => t.id === task.id) ? prev : [task, ...prev]);
      }),
      bus.on<{ task: Task }>(RT_EVENTS.TASK_UPDATED, ({ task }) => {
        setTasks((prev) => prev.map((t) => t.id === task.id ? task : t));
      }),
      bus.on<{ id: string }>(RT_EVENTS.TASK_DELETED, ({ id }) => {
        setTasks((prev) => prev.filter((t) => t.id !== id));
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 12_000);
    return () => clearTimeout(t);
  }, []);

  const handleDeleteTask = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== id));
        bus.emit(RT_EVENTS.TASK_DELETED, { id });
        toast.success('Tarea eliminada');
      } else { toast.error('Error al eliminar la tarea'); }
    } catch { toast.error('Error de red'); }
  };

  const handleDeleteAppointment = async (id: string) => {
    try {
      const appt = appointments.find(a => a.id === id);
      const isMeeting = appt && (appt as any).email?.endsWith('@internal.boost');
      const apiUrl = isMeeting ? `/api/meetings?id=${id}` : `/api/appointments?id=${id}`;
      const res = await fetch(apiUrl, { method: 'DELETE' });
      if (res.ok) {
        setAppointments((prev) => prev.filter((a) => a.id !== id));
        toast.success(isMeeting ? 'Reunion eliminada' : 'Videollamada eliminada');
      } else { toast.error('Error al eliminar'); }
    } catch { toast.error('Error de red'); }
  };

  function handleSelectDay(day: Date) {
    setSelectedDay(day);
    setDayModalOpen(true);
  }

  const dayTasks = useMemo(
    () => tasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), selectedDay)),
    [tasks, selectedDay]
  );

  const dayAppointments = useMemo(
    () => appointments.filter((a) => isSameDay(new Date(a.date), selectedDay)),
    [appointments, selectedDay]
  );

  const filteredTasks = useMemo(
    () => selectedClientId === 'all' ? tasks : tasks.filter(t => t.clientId === selectedClientId),
    [tasks, selectedClientId]
  );

  const filteredDayTasks = useMemo(
    () => filteredTasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), selectedDay)),
    [filteredTasks, selectedDay]
  );

  const total = dayTasks.length + dayAppointments.length;
  const capitalizedLabel = dayLabel(selectedDay);

  const calTabs = [
    { id: 'mine'    as CalView, label: 'Mi Calendario', show: true },
    { id: 'team'    as CalView, label: 'Equipo',        show: isManager },
    { id: 'clients' as CalView, label: 'Clientes',      show: isManager || role === 'TEAM_MEMBER' },
    { id: 'all'       as CalView, label: 'Todos',        show: isAdmin },
    { id: 'meetings'  as CalView, label: 'Reuniones',     show: isManager },
    { id: 'deliveries' as CalView, label: 'Entregas',     show: isManager || role === 'TEAM_MEMBER' },
  ].filter(t => t.show);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-44 rounded-lg bg-white/[0.06]" />
          <Skeleton className="h-9 w-32 rounded-lg bg-white/[0.06]" />
        </div>
        {/* Selector placeholder en skeleton */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-[360px] w-full rounded-xl bg-white/[0.06]" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl bg-white/[0.06]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Calendario</h1>
          <p className="text-white/40 text-sm mt-1">
            Haz clic en un dia para ver su detalle
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Selector de cliente — solo en tabs clientes/entregas */}
          {!isClient && clientOptions.length > 0 && (calView === 'clients' || calView === 'deliveries') && (
            <div className="flex items-center gap-2">
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white text-sm h-9 w-auto min-w-[160px] max-w-[220px] focus:ring-brand">
                  <SelectValue placeholder="Todos los clientes" />
                </SelectTrigger>
                <SelectContent className="bg-[#15151c] border-white/[0.08] text-white">
                  {(isAdmin || isPM) && (
                    <SelectItem value="all" className="focus:bg-white/[0.06]">
                      {isAdmin ? 'Todos los clientes' : 'Todos mis clientes'}
                    </SelectItem>
                  )}
                  {clientOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="focus:bg-white/[0.06]">
                      {c.name}{c.company ? ` — ${c.company}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedClientId !== 'all' && (
                <button onClick={() => setSelectedClientId('all')}
                  className="text-xs text-white/40 hover:text-white/70 transition-colors underline underline-offset-2">
                  Todos
                </button>
              )}
            </div>
          )}
          {isManager && (
            <Button
              onClick={() => { setEditingAppointment(null); setApptEditOpen(true); }}
              variant="outline"
              className="border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-green-300 gap-2">
              <Video className="w-4 h-4" />
              Agendar Reunion
            </Button>
          )}
          <Button
            onClick={() => { setEditingTask(null); setTaskFormOpen(true); }}
            className="bg-brand hover:bg-brand-dark text-white gap-2">
            <Plus className="w-4 h-4" />
            Nueva Tarea
          </Button>
        </div>
      </div>

      {/* Tabs de vista */}
      {calTabs.length > 1 && (
        <div className="flex gap-1 border-b border-white/[0.06] pb-0">
          {calTabs.map((tab) => (
            <button key={tab.id} onClick={() => setCalView(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
                calView === tab.id
                  ? 'border-brand text-white'
                  : 'border-transparent text-white/40 hover:text-white/70 hover:border-white/20'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#15151c] border border-white/[0.06] rounded-xl p-4 md:p-6">
          <CalendarGrid
            tasks={calView === "meetings" ? [] : calView === "deliveries" ? filteredTasks.filter(t => !!t.dueDate) : filteredTasks}
            activities={calView === "meetings" ? [] : activities}
            appointments={calView === "deliveries" ? [] : appointments}
            selectedDay={selectedDay}
            onSelectDay={handleSelectDay}
          />
        </div>

        <div className="bg-[#15151c] border border-white/[0.06] rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 md:p-5 border-b border-white/[0.06] shrink-0">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-brand-light" />
              <div>
                <p className="text-sm font-semibold text-white leading-tight">
                  {isToday(selectedDay) ? 'Hoy' : capitalizedLabel}
                </p>
                {isToday(selectedDay) && (
                  <p className="text-[11px] text-white/35">{capitalizedLabel}</p>
                )}
              </div>
            </div>
            {total > 0 && (
              <span className="text-[11px] font-medium bg-brand/20 text-brand-light px-2 py-0.5 rounded-full">
                {total} item{total !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-5 space-y-4">
            {filteredDayTasks.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/40 uppercase tracking-wider">
                  <CheckSquare className="w-3 h-3" />
                  Tareas ({filteredDayTasks.length})
                </div>
                {filteredDayTasks.map((task) => (
                  <div key={task.id}
                    className={`w-full text-left rounded-lg p-3.5 transition-colors group relative overflow-hidden border
                      ${task.priority === "urgent" ? "bg-red-500/[0.06] border-red-500/20 hover:border-red-500/30" :
                        task.priority === "high" ? "bg-orange-500/[0.05] border-orange-500/15 hover:border-orange-500/25" :
                        task.priority === "medium" ? "bg-amber-500/[0.04] border-amber-500/10 hover:border-amber-500/20" :
                        "bg-emerald-500/[0.04] border-emerald-500/10 hover:border-emerald-500/20"}`}>
                    <div className={`absolute left-0 top-0 bottom-0 w-0.5 rounded-l-lg
                      ${task.priority === "urgent" ? "bg-red-500" :
                        task.priority === "high" ? "bg-orange-400" :
                        task.priority === "medium" ? "bg-amber-400" :
                        "bg-emerald-400"}`} />
                    <button type="button" className="w-full text-left"
                      onClick={() => { setEditingTask(task); setTaskFormOpen(true); }}>
                      <div className="flex items-start gap-2.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 mt-0.5 ${statusColors[task.status] || 'status-pending'}`}>
                          {statusLabels[task.status] || task.status}
                        </span>
                        <p className="text-sm font-medium text-white/90 leading-tight group-hover:text-white transition-colors">
                          {task.title}
                        </p>
                      </div>
                      {task.description && (
                        <p className="text-xs text-white/35 mt-2 line-clamp-2 pl-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2.5 pl-1">
                        <span className={`text-[10px] font-medium ${priorityColors[task.priority] || 'text-white/40'}`}>
                          {priorityLabels[task.priority] || task.priority}
                        </span>
                        {task.dueDate && (
                          <div className="flex items-center gap-1 text-[10px] text-white/25">
                            <Clock className="w-2.5 h-2.5" />
                            {format(new Date(task.dueDate), 'HH:mm')}
                          </div>
                        )}
                        {task.assignedUser && getTaskAvatar(task.assignedUser)}
                      </div>
                    </button>
                    {isManager && (
                      <button type="button"
                        onClick={async () => {
                          if (!confirm(`Eliminar "${task.title}"?`)) return;
                          await handleDeleteTask(task.id);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-md text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {dayAppointments.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/40 uppercase tracking-wider">
                  <Video className="w-3 h-3" />
                  Videollamadas ({dayAppointments.length})
                </div>
                {dayAppointments.map((apt) => (
                  <div key={apt.id} className="bg-green-500/[0.06] border border-green-500/20 rounded-lg p-3 group relative">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 bg-green-500/20 text-green-300">
                          {apt.status === "confirmed" ? "Confirmada" : apt.status === "cancelled" ? "Cancelada" : "Pendiente"}
                        </span>
                        <p className="text-xs font-medium text-white/80 truncate">{apt.name}</p>
                      </div>
                      {isManager && (
                        <div className="flex gap-1 shrink-0">
                          <button type="button"
                            onClick={() => { setEditingAppointment(apt); setApptEditOpen(true); }}
                            className="p-1 rounded text-white/20 hover:text-green-400 hover:bg-green-500/10 transition-colors">
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button type="button"
                            onClick={async () => {
                              if (!confirm("Eliminar esta videollamada?")) return;
                              await handleDeleteAppointment(apt.id);
                            }}
                            className="p-1 rounded text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-white/30">{apt.email}</span>
                      <div className="flex items-center gap-1 text-[10px] text-white/25">
                        <Clock className="w-2.5 h-2.5" />
                        {format(new Date(apt.date), "HH:mm")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {total === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white/20" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/40">Sin elementos este dia</p>
                  <p className="text-xs text-white/25 mt-0.5">
                    {isToday(selectedDay) ? 'Todo en orden por hoy' : 'No hay nada programado'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm"
                    className="text-white/40 hover:text-white hover:bg-white/[0.06] text-xs gap-1"
                    onClick={() => { setEditingTask(null); setTaskFormOpen(true); }}>
                    <Plus className="w-3.5 h-3.5" />
                    Tarea
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <DayModal
        open={dayModalOpen}
        onClose={() => setDayModalOpen(false)}
        day={selectedDay}
        tasks={tasks}
        activities={activities}
        appointments={appointments}
        isManager={isManager}
        onEditTask={(t) => { setEditingTask(t); setTaskFormOpen(true); }}
        onNewTask={() => { setEditingTask(null); setTaskFormOpen(true); }}
        onNewAppointment={() => { setEditingAppointment(null); setApptInitialDate(selectedDay); setApptEditOpen(true); }}
        onDeleteTask={handleDeleteTask}
        onEditAppointment={(apt) => { setEditingAppointment(apt); setApptEditOpen(true); }}
        onDeleteAppointment={handleDeleteAppointment}
      />

      <TaskForm
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        initialDate={editingTask ? null : selectedDay}
        task={editingTask}
        isManager={isManager}
        onSuccess={fetchData}
      />

      <AppointmentEditModal
        open={apptEditOpen}
        onOpenChange={setApptEditOpen}
        appointment={editingAppointment}
        onSaved={fetchData}
        onDeleted={(id) => setAppointments(prev => prev.filter(a => a.id !== id))}
        initialDate={apptInitialDate}
      />
    </div>
  );
}