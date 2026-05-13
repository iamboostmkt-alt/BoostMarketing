'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Video, Plus, Pencil, Trash2, RefreshCw, Clock, CheckCircle2, XCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Appointment } from '@/lib/types';

interface TeamUser { id: string; name: string | null; email: string; color: string; image: string | null; }

const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pendiente',  color: 'bg-amber-500/15 text-amber-300',  icon: <Clock        className='h-3 w-3' /> },
  confirmed: { label: 'Confirmada', color: 'bg-green-500/15 text-green-300',  icon: <CheckCircle2 className='h-3 w-3' /> },
  cancelled: { label: 'Cancelada',  color: 'bg-red-500/15 text-red-300',      icon: <XCircle      className='h-3 w-3' /> },
};

function initials(name: string | null, email: string) {
  return (name || email).split(/[\s@]/).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

// -- Meeting Dialog --
interface MeetDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  meeting?: Appointment | null;
  teamUsers: TeamUser[];
  onSaved: () => void;
}

function MeetingDialog({ open, onOpenChange, meeting, teamUsers, onSaved }: MeetDialogProps) {
  const isEdit = !!meeting;
  const [name,    setName]    = useState('');
  const [date,    setDate]    = useState('');
  const [notes,   setNotes]   = useState('');
  const [meetUrl, setMeetUrl] = useState('');
  const [assigned, setAssigned] = useState<string[]>([]);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    if (open) {
      setName(meeting?.name ?? '');
      setDate(meeting?.date ? new Date(meeting.date).toISOString().slice(0,16) : '');
      setNotes(meeting?.notes ?? '');
      setMeetUrl(meeting?.meetUrl ?? '');
      setAssigned((meeting?.assignedUsers ?? []).map((au: any) => au.user?.id ?? au.userId));
    }
  }, [open, meeting]);

  function toggleUser(id: string) {
    setAssigned(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !date) { toast.error('Nombre y fecha son requeridos.'); return; }
    setSaving(true);
    try {
      const body = { name, date, notes, meetUrl, assignedUserIds: assigned };
      const res = isEdit
        ? await fetch('/api/meetings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: meeting!.id, ...body }) })
        : await fetch('/api/meetings', { method: 'POST',  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      toast.success(isEdit ? 'Reunion actualizada.' : 'Reunion creada.');
      onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='bg-[#15151c] border-white/[0.08] text-white max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-white'>
            <Video className='h-4 w-4 text-brand-light' />
            {isEdit ? 'Editar Reunion' : 'Nueva Reunion'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className='space-y-4 mt-2'>
          <div className='space-y-1.5'>
            <Label className='text-white/70 text-xs'>Titulo *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder='Ej: Reunion semanal de equipo' required
              className='bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus-visible:ring-brand' />
          </div>
          <div className='space-y-1.5'>
            <Label className='text-white/70 text-xs'>Fecha y hora *</Label>
            <Input type='datetime-local' value={date} onChange={e => setDate(e.target.value)} required
              className='bg-white/[0.04] border-white/[0.08] text-white focus-visible:ring-brand' />
          </div>
          <div className='space-y-1.5'>
            <Label className='text-white/70 text-xs'>Enlace Meet / Zoom</Label>
            <Input value={meetUrl} onChange={e => setMeetUrl(e.target.value)} placeholder='https://meet.google.com/...'
              className='bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus-visible:ring-brand' />
          </div>
          <div className='space-y-1.5'>
            <Label className='text-white/70 text-xs'>Notas</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder='Agenda, temas a tratar...'
              className='bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus-visible:ring-brand' />
          </div>
          {teamUsers.length > 0 && (
            <div className='space-y-2'>
              <Label className='text-white/70 text-xs'>Participantes</Label>
              <div className='flex flex-wrap gap-2 max-h-32 overflow-y-auto'>
                {teamUsers.map(u => {
                  const sel = assigned.includes(u.id);
                  return (
                    <button key={u.id} type='button' onClick={() => toggleUser(u.id)}
                      className={lex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors }>
                      <Avatar className='h-4 w-4'>
                        <AvatarImage src={u.image || undefined} />
                        <AvatarFallback className='text-[8px]' style={{ backgroundColor: u.color + '33', color: u.color }}>{initials(u.name, u.email)}</AvatarFallback>
                      </Avatar>
                      {u.name || u.email.split('@')[0]}
                      {sel && <X className='h-3 w-3' />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className='flex gap-3 pt-1'>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)}
              className='flex-1 border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.06]'>Cancelar</Button>
            <Button type='submit' disabled={saving} className='flex-1 bg-brand hover:bg-brand-dark text-white'>
              {saving ? 'Guardando...' : isEdit ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// -- Main MeetingsTab --
export default function MeetingsTab() {
  const [meetings,     setMeetings]     = useState<Appointment[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState('all');
  const [dialog,       setDialog]       = useState(false);
  const [editing,      setEditing]      = useState<Appointment | null>(null);
  const [deleting,     setDeleting]     = useState<string | null>(null);
  const [teamUsers,    setTeamUsers]    = useState<TeamUser[]>([]);

  const fetchMeetings = useCallback(async (status = 'all') => {
    setLoading(true);
    try {
      const q = status !== 'all' ? ?status= : '';
      const res = await fetch(/api/meetings);
      const data = await res.json();
      setMeetings(data.meetings ?? []);
    } catch { toast.error('Error al cargar reuniones.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchMeetings();
    fetch('/api/admin/users').then(r => r.json()).then(d => setTeamUsers(d.users ?? [])).catch(() => {});
  }, [fetchMeetings]);

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await fetch(/api/meetings?id=, { method: 'DELETE' });
      setMeetings(prev => prev.filter(m => m.id !== id));
      toast.success('Reunion eliminada.');
    } catch { toast.error('Error al eliminar.'); }
    finally { setDeleting(null); }
  }

  async function handleStatus(id: string, status: string) {
    try {
      await fetch('/api/meetings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
      setMeetings(prev => prev.map(m => m.id === id ? { ...m, status } : m));
      toast.success('Estado actualizado.');
    } catch { toast.error('Error al actualizar.'); }
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-2 flex-wrap'>
        {(['all', 'pending', 'confirmed', 'cancelled'] as const).map(f => (
          <button key={f} type='button'
            onClick={() => { setFilter(f); fetchMeetings(f); }}
            className={ounded-full px-3 py-1 text-xs font-medium transition-colors }>
            {f === 'all' ? 'Todas' : statusMap[f]?.label ?? f}
          </button>
        ))}
        <div className='ml-auto flex items-center gap-2'>
          <Button variant='outline' size='icon' onClick={() => fetchMeetings(filter)}
            className='border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.06] h-7 w-7'>
            <RefreshCw className='h-3.5 w-3.5' />
          </Button>
          <Button size='sm' onClick={() => { setEditing(null); setDialog(true); }}
            className='bg-brand hover:bg-brand-dark text-white gap-1.5 h-7 text-xs px-3'>
            <Plus className='h-3.5 w-3.5' />Nueva reunion
          </Button>
        </div>
      </div>

      <div className='glass-card rounded-xl overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-white/[0.06]'>
                <th className='px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider'>Reunion</th>
                <th className='px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider hidden sm:table-cell'>Fecha</th>
                <th className='px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider hidden md:table-cell'>Participantes</th>
                <th className='px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider'>Estado</th>
                <th className='px-4 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wider'>Acciones</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-white/[0.04]'>
              {loading ? Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  <td className='px-4 py-3'><Skeleton className='h-4 w-36' /></td>
                  <td className='px-4 py-3 hidden sm:table-cell'><Skeleton className='h-3 w-28' /></td>
                  <td className='px-4 py-3 hidden md:table-cell'><Skeleton className='h-3 w-20' /></td>
                  <td className='px-4 py-3'><Skeleton className='h-7 w-28' /></td>
                  <td className='px-4 py-3'><Skeleton className='h-7 w-16 ml-auto' /></td>
                </tr>
              )) : meetings.length === 0 ? (
                <tr>
                  <td colSpan={5} className='px-4 py-16 text-center'>
                    <div className='flex flex-col items-center gap-3'>
                      <Video className='w-8 h-8 text-white/15' />
                      <p className='text-sm text-white/30'>No hay reuniones programadas</p>
                    </div>
                  </td>
                </tr>
              ) : meetings.map(meet => {
                const st = statusMap[meet.status] ?? statusMap.pending;
                return (
                  <tr key={meet.id} className='hover:bg-white/[0.02] transition-colors'>
                    <td className='px-4 py-3'>
                      <p className='font-medium text-white'>{meet.name}</p>
                      {meet.notes && <p className='text-xs text-white/40 truncate max-w-[180px]'>{meet.notes}</p>}
                      {meet.meetUrl && (
                        <a href={meet.meetUrl} target='_blank' rel='noopener noreferrer'
                          className='text-[10px] text-brand-light hover:underline flex items-center gap-1 mt-0.5'>
                          <Video className='h-2.5 w-2.5' />Abrir enlace
                        </a>
                      )}
                    </td>
                    <td className='px-4 py-3 hidden sm:table-cell'>
                      <span className='text-xs text-white/60'>
                        {new Date(meet.date).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className='px-4 py-3 hidden md:table-cell'>
                      <div className='flex -space-x-1'>
                        {(meet.assignedUsers ?? []).slice(0, 4).map((au: any) => (
                          <Avatar key={au.user?.id} className='h-6 w-6 border border-[#15151c]' title={au.user?.name || au.user?.email}>
                            <AvatarImage src={au.user?.image || undefined} />
                            <AvatarFallback className='text-[8px] font-medium'
                              style={{ backgroundColor: (au.user?.color || '#7c3aed') + '33', color: au.user?.color || '#7c3aed' }}>
                              {initials(au.user?.name, au.user?.email || '')}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {(meet.assignedUsers ?? []).length === 0 && <span className='text-xs text-white/25'>Sin asignar</span>}
                      </div>
                    </td>
                    <td className='px-4 py-3'>
                      <Select value={meet.status} onValueChange={v => handleStatus(meet.id, v)}>
                        <SelectTrigger className='w-36 h-7 bg-white/[0.04] border-white/[0.08] text-white text-xs focus:ring-brand'>
                          <span className={inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium }>
                            {st.icon}{st.label}
                          </span>
                        </SelectTrigger>
                        <SelectContent className='bg-[#15151c] border-white/[0.08] text-white'>
                          {Object.entries(statusMap).map(([key, val]) => (
                            <SelectItem key={key} value={key} className='text-sm focus:bg-white/[0.06]'>
                              <div className='flex items-center gap-1.5'>{val.icon}{val.label}</div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className='px-4 py-3'>
                      <div className='flex items-center justify-end gap-1'>
                        <Button variant='ghost' size='icon'
                          className='h-7 w-7 text-white/30 hover:text-white hover:bg-white/[0.06]'
                          onClick={() => { setEditing(meet); setDialog(true); }}>
                          <Pencil className='h-3.5 w-3.5' />
                        </Button>
                        <Button variant='ghost' size='icon'
                          className='h-7 w-7 text-white/30 hover:text-red-400 hover:bg-red-400/10'
                          disabled={deleting === meet.id}
                          onClick={() => handleDelete(meet.id)}>
                          <Trash2 className='h-3.5 w-3.5' />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <MeetingDialog open={dialog} onOpenChange={setDialog} meeting={editing} teamUsers={teamUsers} onSaved={() => fetchMeetings(filter)} />
    </div>
  );
}