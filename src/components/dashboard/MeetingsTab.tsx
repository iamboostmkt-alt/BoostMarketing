'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Video, Plus, Pencil, Trash2, RefreshCw, X, Check, Loader2, Link2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Appointment } from '@/lib/types';

export interface TeamUser { id: string; name: string | null; email: string; color: string; image: string | null; }

const STATUS: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Pendiente',  color: 'bg-amber-500/15 text-amber-300' },
  confirmed: { label: 'Confirmada', color: 'bg-green-500/15 text-green-300' },
  cancelled: { label: 'Cancelada',  color: 'bg-red-500/15 text-red-300'    },
};

function ini(name: string | null, email: string) {
  return (name || email).split(/[\s@]/).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

interface MeetDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  meeting?: Appointment | null;
  teamUsers: TeamUser[];
  onSaved: () => void;
  clients?: { id: string; name: string; email: string; company: string }[];
  initialClientEmail?: string;
  initialDate?: Date;
  userRole?: string;
}

export function MeetingDialog({ open, onOpenChange, meeting, teamUsers, onSaved, clients = [], initialClientEmail, initialDate, userRole = '' }: MeetDialogProps) {
  const isManager = ['ADMIN', 'PROJECT_MANAGER'].includes(userRole);
  const isEdit    = !!meeting;

  const [name,        setName]        = useState('');
  const [date,        setDate]        = useState('');
  const [notes,       setNotes]       = useState('');
  const [meetUrl,     setMeetUrl]     = useState('');
  const [assigned,    setAssigned]    = useState<string[]>([]);
  const [clientEmail, setClientEmail] = useState('');
  const [clientId,    setClientId]    = useState('');
  const [visibility,  setVisibility]  = useState<'internal' | 'team' | 'client_visible'>('team');
  const [saving,      setSaving]      = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(meeting?.name ?? '');
    if (meeting?.date) {
      setDate(new Date(meeting.date).toISOString().slice(0, 16));
    } else if (initialDate) {
      const pad = (n: number) => String(n).padStart(2, '0');
      setDate(`${initialDate.getFullYear()}-${pad(initialDate.getMonth()+1)}-${pad(initialDate.getDate())}T10:00`);
    } else {
      setDate('');
    }
    setNotes(meeting?.notes ?? '');
    setMeetUrl(meeting?.meetUrl ?? '');
    setAssigned((meeting?.assignedUsers ?? []).map((au: any) => au.user?.id ?? au.userId));
    setClientEmail(initialClientEmail ?? (meeting as any)?.email ?? '');
    setClientId(clients.find(c => c.email === (initialClientEmail ?? (meeting as any)?.email ?? ''))?.id ?? '');
    setVisibility('team');
  }, [open, meeting, initialClientEmail]);

  // Esc para cerrar
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onOpenChange(false); }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  function toggleUser(id: string) {
    setAssigned(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function handleClientChange(val: string) {
    setClientId(val);
    const found = clients.find(c => c.id === val);
    setClientEmail(found?.email ?? '');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !date) { toast.error('Nombre y fecha requeridos.'); return; }
    setSaving(true);
    try {
      const body = {
        name, date: new Date(date).toISOString(), notes, meetUrl,
        assignedUserIds: assigned, visibility,
        ...(clientEmail ? { email: clientEmail } : {}),
        ...(clientId    ? { clientId }           : {}),
      };
      const url    = clientEmail ? '/api/appointments' : '/api/meetings';
      const patchUrl = '/api/appointments';
      const res = isEdit
        ? await fetch(patchUrl, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: meeting!.id, ...body }) })
        : await fetch(url,      { method: 'POST',  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      toast.success(isEdit ? 'Reunion actualizada.' : 'Reunion creada.');
      onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally { setSaving(false); }
  }

  function generateMeetLink() {
    const id = Math.random().toString(36).slice(2, 6) + '-' + Math.random().toString(36).slice(2, 6) + '-' + Math.random().toString(36).slice(2, 6);
    setMeetUrl(`https://meet.google.com/${id}`);
  }

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9990, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      {/* Overlay */}
      <div onClick={() => onOpenChange(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(3px)' }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
        onClick={e => e.stopPropagation()}
        style={{ position: 'relative', zIndex: 9991, width: '100%', maxWidth: 520 }}
      >
        {/* Header flotante */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.04]">
              <Video className="h-3.5 w-3.5 text-purple-400" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[13px] font-medium text-white/85 leading-none">{isEdit ? 'Editar reunión' : 'Agendar reunión'}</p>
              <p className="mt-0.5 text-[11px] text-white/30">Se notificará a los participantes por correo</p>
            </div>
          </div>
          <button onClick={() => onOpenChange(false)} className="flex h-7 w-7 items-center justify-center rounded-lg text-white/25 transition-colors hover:bg-white/[0.05] hover:text-white/60">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Card principal */}
        <div style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, position: 'relative', overflow: 'hidden' }} className="p-5">
          {/* Glow decorativo */}
          <div style={{ position: 'absolute', bottom: -30, right: -30, width: 250, height: 180, background: 'radial-gradient(ellipse at center, rgba(88,28,220,0.12) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
          <div style={{ position: 'absolute', top: -20, left: -20, width: 150, height: 120, background: 'radial-gradient(ellipse at center, rgba(88,28,220,0.06) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

          <form onSubmit={handleSave} className="relative z-10 space-y-4">
            {/* Título */}
            <div>
              <label className="block text-[11px] font-medium text-white/40 uppercase tracking-widest mb-1.5">Título *</label>
              <input value={name} onChange={e => setName(e.target.value)} required
                placeholder="Ej: Revisión mensual GymnasTwin"
                className="h-[36px] w-full rounded-lg border border-white/[0.07] bg-white/[0.03] px-3.5 text-[13px] text-white/80 placeholder-white/20 outline-none transition-all focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/10" />
            </div>

            {/* Fecha y link en fila */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-white/40 uppercase tracking-widest mb-1.5">Fecha y hora *</label>
                <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} required
                  className="h-[36px] w-full rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 text-[13px] text-white/70 outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/10" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-white/40 uppercase tracking-widest mb-1.5">Meet / Zoom</label>
                <div className="flex gap-1.5">
                  <input value={meetUrl} onChange={e => setMeetUrl(e.target.value)}
                    placeholder="https://meet.google.com/..."
                    className="h-[36px] flex-1 min-w-0 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 text-[12px] text-white/70 placeholder-white/15 outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/10" />
                  <button type="button" onClick={generateMeetLink} title="Generar link de Google Meet"
                    className="h-[36px] w-[36px] shrink-0 flex items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03] text-white/30 hover:text-purple-400 hover:border-purple-500/30 transition-colors">
                    <Link2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Cliente */}
            {clients.length > 0 && (
              <div>
                <label className="block text-[11px] font-medium text-white/40 uppercase tracking-widest mb-1.5">Cuenta cliente (opcional)</label>
                <select value={clientId} onChange={e => handleClientChange(e.target.value)}
                  className="h-[36px] w-full rounded-lg border border-white/[0.07] bg-white/[0.03] px-3.5 text-[13px] text-white/70 outline-none focus:border-purple-500/40">
                  <option value="">Sin cliente</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Tipo de reunión */}
            <div>
              <label className="block text-[11px] font-medium text-white/40 uppercase tracking-widest mb-1.5">Visibilidad</label>
              <div className="flex gap-1.5">
                {[
                  { val: 'team' as const,     label: '👥 Equipo',      tip: 'Solo el equipo interno' },
                  { val: 'internal' as const,  label: '🔒 Interno',     tip: 'Solo tú y ADMIN/PM' },
                  ...(isManager ? [{ val: 'client_visible' as const, label: '👁 Visible cliente', tip: 'El cliente lo verá' }] : []),
                ].map(opt => (
                  <button key={opt.val} type="button" title={opt.tip}
                    onClick={() => setVisibility(opt.val)}
                    className="flex-1 py-1.5 rounded-lg text-[11px] font-medium border transition-colors"
                    style={{
                      background: visibility === opt.val ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.02)',
                      borderColor: visibility === opt.val ? 'rgba(124,58,237,0.40)' : 'rgba(255,255,255,0.07)',
                      color: visibility === opt.val ? '#c4b5fd' : 'rgba(255,255,255,0.40)',
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Participantes */}
            {teamUsers.length > 0 && (
              <div>
                <label className="block text-[11px] font-medium text-white/40 uppercase tracking-widest mb-1.5">
                  Participantes {assigned.length > 0 && <span className="text-purple-400">{assigned.length} seleccionados</span>}
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {teamUsers.map(u => {
                    const sel = assigned.includes(u.id);
                    return (
                      <button key={u.id} type="button" onClick={() => toggleUser(u.id)}
                        className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-all"
                        style={{
                          background:   sel ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.03)',
                          borderColor:  sel ? 'rgba(124,58,237,0.40)' : 'rgba(255,255,255,0.08)',
                          color:        sel ? '#c4b5fd' : 'rgba(255,255,255,0.50)',
                        }}>
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={u.image || undefined} />
                          <AvatarFallback className="text-[7px]" style={{ backgroundColor: u.color + '33', color: u.color }}>
                            {ini(u.name, u.email)}
                          </AvatarFallback>
                        </Avatar>
                        {u.name || u.email.split('@')[0]}
                        {sel && <Check className="h-3 w-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notas */}
            <div>
              <label className="block text-[11px] font-medium text-white/40 uppercase tracking-widest mb-1.5">Notas</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                placeholder="Agenda, temas a tratar..."
                className="w-full rounded-lg border border-white/[0.07] bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-white/70 placeholder-white/20 outline-none resize-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/10" />
            </div>

            {/* Opciones de videollamada */}
            {!meetUrl && (
              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                <p className="text-[11px] text-white/30 mb-2">Generar link de videollamada:</p>
                <div className="flex gap-2 flex-wrap">
                  <button type="button" onClick={generateMeetLink}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] border border-white/[0.08] bg-white/[0.03] text-white/50 hover:text-white hover:border-purple-500/30 transition-colors">
                    <Video className="h-3 w-3" /> Google Meet
                  </button>
                  <button type="button" onClick={() => setMeetUrl('https://zoom.us/j/' + Math.floor(Math.random()*9000000000+1000000000))}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] border border-white/[0.08] bg-white/[0.03] text-white/50 hover:text-white hover:border-purple-500/30 transition-colors">
                    <Video className="h-3 w-3" /> Zoom
                  </button>
                  <button type="button" onClick={() => setMeetUrl('https://meet.jit.si/boost-' + Math.random().toString(36).slice(2,8))}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] border border-white/[0.08] bg-white/[0.03] text-white/50 hover:text-white hover:border-purple-500/30 transition-colors">
                    <Video className="h-3 w-3" /> Jitsi Meet
                  </button>
                </div>
              </div>
            )}

            {/* Acciones */}
            <div className="flex gap-2.5 pt-1">
              <button type="button" onClick={() => onOpenChange(false)}
                className="flex-1 h-[36px] rounded-lg border border-white/[0.08] text-[13px] text-white/50 hover:text-white hover:bg-white/[0.04] transition-colors">
                Cancelar
              </button>
              <motion.button type="submit" disabled={saving}
                whileHover={{ backgroundColor: '#6d28d9' }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="flex-1 h-[36px] flex items-center justify-center gap-1.5 rounded-lg bg-[#7c3aed] text-[13px] font-medium text-white disabled:opacity-60">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="h-3.5 w-3.5" />{isEdit ? 'Guardar' : 'Agendar'}</>}
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

export default function MeetingsTab() {
  const { data: session } = useSession();
  const myRole = (session?.user as any)?.role || '';
  const [meetings,  setMeetings]  = useState<Appointment[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('all');
  const [dialog,    setDialog]    = useState(false);
  const [editing,   setEditing]   = useState<Appointment | null>(null);
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [clients,   setClients]   = useState<{ id: string; name: string; email: string; company: string }[]>([]);

  const fetchMeetings = useCallback(async (status = 'all') => {
    setLoading(true);
    try {
      const q = status !== 'all' ? ('?status=' + status) : '';
      const res = await fetch('/api/meetings' + q);
      const data = await res.json();
      setMeetings(data.meetings ?? []);
    } catch { toast.error('Error al cargar reuniones.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchMeetings();
    fetch('/api/team-members')
      .then(r => r.json())
      .then(d => setTeamUsers((d.users ?? []).filter((u: TeamUser & { role: string }) => u.role !== 'CLIENT' && u.role !== 'UNASSIGNED')))
      .catch(() => {});
    fetch('/api/clients')
      .then(r => r.json())
      .then(d => setClients(d.clients ?? []))
      .catch(() => {});
  }, [fetchMeetings]);

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await fetch('/api/meetings?id=' + id, { method: 'DELETE' });
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

  const filters = ['all', 'pending', 'confirmed', 'cancelled'] as const;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {filters.map(f => (
          <button key={f} type="button"
            onClick={() => { setFilter(f); fetchMeetings(f); }}
            className={"rounded-full px-3 py-1 text-xs font-medium transition-colors " + (f === filter ? 'bg-brand text-white' : 'bg-white/[0.04] text-white/50 hover:text-white hover:bg-white/[0.08]')}>
            {f === 'all' ? 'Todas' : (STATUS[f]?.label ?? f)}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchMeetings(filter)}
            className="border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.06] h-7 w-7">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" onClick={() => { setEditing(null); setDialog(true); }}
            className="bg-brand hover:bg-brand-dark text-white gap-1.5 h-7 text-xs px-3">
            <Plus className="h-3.5 w-3.5" />Nueva reunion
          </Button>
        </div>
      </div>
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Reunion</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider hidden sm:table-cell">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider hidden md:table-cell">Participantes</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
                  <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-3 w-28" /></td>
                  <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-3 w-20" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-7 w-28" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-7 w-16 ml-auto" /></td>
                </tr>
              )) : meetings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Video className="w-8 h-8 text-white/15" />
                      <p className="text-sm text-white/30">No hay reuniones programadas</p>
                    </div>
                  </td>
                </tr>
              ) : meetings.map(meet => {
                const st = STATUS[meet.status] ?? STATUS.pending;
                return (
                  <tr key={meet.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{meet.name}</p>
                      {meet.notes && <p className="text-xs text-white/40 truncate max-w-[180px]">{meet.notes}</p>}
                      {meet.meetUrl && (
                        <a href={meet.meetUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-green-400 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 transition-colors w-fit">
                          <Video className="h-3 w-3" />Unirse a la reunión
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-white/60">
                        {new Date(meet.date).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex -space-x-1">
                        {(meet.assignedUsers ?? []).slice(0, 4).map((au: any) => (
                          <Avatar key={au.user?.id} className="h-6 w-6 border border-[#15151c]" title={au.user?.name || au.user?.email}>
                            <AvatarImage src={au.user?.image || undefined} />
                            <AvatarFallback className="text-[8px] font-medium"
                              style={{ backgroundColor: (au.user?.color || '#7c3aed') + '33', color: au.user?.color || '#7c3aed' }}>
                              {ini(au.user?.name, au.user?.email || '')}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {(meet.assignedUsers ?? []).length === 0 && <span className="text-xs text-white/25">Sin asignar</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Select value={meet.status} onValueChange={v => handleStatus(meet.id, v)}>
                        <SelectTrigger className="w-36 h-7 bg-white/[0.04] border-white/[0.08] text-white text-xs focus:ring-brand">
                          <span className={"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium " + st.color}>
                            {st.label}
                          </span>
                        </SelectTrigger>
                        <SelectContent className="bg-[#15151c] border-white/[0.08] text-white">
                          {Object.entries(STATUS).map(([key, val]) => (
                            <SelectItem key={key} value={key} className="text-sm focus:bg-white/[0.06]">
                              {val.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon"
                          className="h-7 w-7 text-white/30 hover:text-white hover:bg-white/[0.06]"
                          onClick={() => { setEditing(meet); setDialog(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon"
                          className="h-7 w-7 text-white/30 hover:text-red-400 hover:bg-red-400/10"
                          disabled={deleting === meet.id}
                          onClick={() => handleDelete(meet.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
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
      <MeetingDialog open={dialog} onOpenChange={setDialog} meeting={editing} teamUsers={teamUsers} clients={clients} userRole={myRole} onSaved={() => fetchMeetings(filter)} />
    </div>
  );
}
