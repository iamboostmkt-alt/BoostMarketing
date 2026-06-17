'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Trash2, Video, CheckSquare, ChevronDown, CheckCircle2, CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import type { Appointment, Task, Activity } from '@/lib/types';

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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [hour,   setHour]   = useState('10');
  const [minute, setMinute] = useState('00');
  const [calOpen,setCalOpen]= useState(false);
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
      // Si tiene cliente asignado usar /api/appointments (filtra por email en portal)
      // Si es reunión interna usar /api/meetings
      const apiUrl = appointment
        ? '/api/appointments'
        : (clientEmail ? '/api/appointments' : '/api/meetings');
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
    if (!confirm('¿Eliminar esta videollamada?')) return;
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
      <DialogContent className="bg-[var(--wl-surface)] border-[var(--wl-border)] text-white max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Video className="h-4 w-4 text-green-400" />
            {appointment ? 'Editar Videollamada' : 'Agendar Reunion'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-[var(--wl-text-secondary)] text-xs">Nombre *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required
              placeholder="Titulo de la reunion"
              className="bg-white/[0.04] border-[var(--wl-border)] text-white placeholder:text-white/25 focus-visible:ring-brand" />
          </div>
          {clients.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-[var(--wl-text-secondary)] text-xs">Cliente (opcional)</Label>
              <select value={clientEmail} onChange={(e) => setClientEmail(e.target.value)}
                className="w-full rounded-md bg-white/[0.04] border border-[var(--wl-border)] text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand">
                <option value="">Sin cliente</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.email}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-[var(--wl-text-secondary)] text-xs">Telefono</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="+52 55 0000 0000"
              className="bg-white/[0.04] border-[var(--wl-border)] text-white placeholder:text-white/25 focus-visible:ring-brand" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[var(--wl-text-secondary)] text-xs">Fecha y hora *</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <button type="button" onClick={() => setCalOpen(v=>!v)}
                  className="h-9 w-full flex items-center gap-2 rounded-md border border-[var(--wl-border)] bg-white/[0.04] px-3 text-[13px] text-left outline-none hover:border-brand/40"
                  style={{color: selectedDate ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)'}}>
                  <CalendarIcon className="h-3.5 w-3.5 opacity-50 shrink-0"/>
                  {selectedDate ? format(selectedDate,"d MMM yyyy",{locale:es}) : 'Seleccionar fecha'}
                </button>
                {calOpen && (
                  <div className="absolute top-10 left-0 z-[9999] rounded-xl border border-[var(--wl-border)] shadow-2xl overflow-hidden" style={{background:'#0f0f14'}}>
                    <Calendar mode="single" locale={es} selected={selectedDate}
                      onSelect={d=>{
                        if(d){const pad=(n:number)=>String(n).padStart(2,'0');setDate(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${hour}:${minute}`);}
                        setSelectedDate(d); setCalOpen(false);
                      }} className="text-white"/>
                  </div>
                )}
              </div>
              <div className="flex gap-1 h-9">
                <select value={hour} onChange={e=>{setHour(e.target.value);if(selectedDate){const d=new Date(selectedDate);d.setHours(parseInt(e.target.value),parseInt(minute),0,0);const pad=(n:number)=>String(n).padStart(2,'0');setDate(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);} }}
                  style={{colorScheme:'dark'}} className="flex-1 rounded-md border border-[var(--wl-border)] bg-[#0f0f14] px-1 text-[13px] text-[var(--wl-text-secondary)] outline-none">
                  {Array.from({length:24},(_,i)=>String(i).padStart(2,'0')).map(h=><option key={h} value={h} style={{background:'#0f0f14'}}>{h}</option>)}
                </select>
                <span className="flex items-center text-white/30 text-xs">:</span>
                <select value={minute} onChange={e=>{setMinute(e.target.value);if(selectedDate){const d=new Date(selectedDate);d.setHours(parseInt(hour),parseInt(e.target.value),0,0);const pad=(n:number)=>String(n).padStart(2,'0');setDate(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);} }}
                  style={{colorScheme:'dark'}} className="flex-1 rounded-md border border-[var(--wl-border)] bg-[#0f0f14] px-1 text-[13px] text-[var(--wl-text-secondary)] outline-none">
                  {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m=><option key={m} value={m} style={{background:'#0f0f14'}}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[var(--wl-text-secondary)] text-xs">Link Google Meet</Label>
            <Input value={meetUrl} onChange={(e) => setMeetUrl(e.target.value)}
              placeholder="https://meet.google.com/xxx-xxxx-xxx"
              className="bg-white/[0.04] border-[var(--wl-border)] text-white placeholder:text-white/25 focus-visible:ring-brand" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[var(--wl-text-secondary)] text-xs">Estado</Label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-md bg-white/[0.04] border border-[var(--wl-border)] text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand">
              <option value="pending">Pendiente</option>
              <option value="confirmed">Confirmada</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </div>
          {/* Equipo asignado */}
          {teamUsers.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-[var(--wl-text-secondary)] text-xs">Equipo asignado</Label>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar p-1">
                {teamUsers.map((u) => {
                  const selected = assignedUserIds.includes(u.id);
                  return (
                    <button key={u.id} type="button" onClick={() => toggleUser(u.id)}
                      className={'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border transition-colors ' +
                        (selected
                          ? 'border-brand bg-brand/20 text-brand-light'
                          : 'border-[var(--wl-border)] bg-white/[0.03] text-white/50 hover:text-white hover:border-white/20')}>
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
                <p className="text-[10px] text-[var(--wl-text-muted)]">{assignedUserIds.length} miembro{assignedUserIds.length !== 1 ? 's' : ''} asignado{assignedUserIds.length !== 1 ? 's' : ''}</p>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-[var(--wl-text-secondary)] text-xs">Notas</Label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              className="w-full rounded-md bg-white/[0.04] border border-[var(--wl-border)] text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand resize-none placeholder:text-white/25"
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
              className="flex-1 border-[var(--wl-border)] text-[var(--wl-text-secondary)] hover:text-white hover:bg-[var(--wl-hover)]">
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
function CompletedTasksSection({ tasks }: { tasks: Task[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[var(--wl-border)] rounded-lg overflow-hidden">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-white/[0.02] hover:bg-[var(--wl-hover)] transition-colors">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/30 uppercase tracking-wider">
          <CheckSquare className="w-3 h-3 text-green-400/50" />
          Listas ({tasks.length})
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-white/20 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-1.5 p-2">
          {tasks.map(t => (
            <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-white/[0.02]">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400/60 shrink-0" />
              <span className="text-xs text-[var(--wl-text-muted)] line-through truncate">{t.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface DayModalProps {
  open:                boolean;
  onClose:             () => void;
  day:                 Date;
  tasks:               Task[];
  activities:          Activity[];
  appointments:        Appointment[];
  milestones?:         any[];
  isManager:           boolean;
  onEditTask:          (t: Task) => void;
  onNewTask:           () => void;
  onNewAppointment?:  () => void;
  onDeleteTask:        (id: string) => Promise<void>;
  onEditAppointment:   (apt: Appointment) => void;
  onDeleteAppointment: (id: string) => Promise<void>;
}
 
export default AppointmentEditModal;
