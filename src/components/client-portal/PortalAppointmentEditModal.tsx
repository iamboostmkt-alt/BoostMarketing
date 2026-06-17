'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Video, Trash2, X, Check, Loader2, Link2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

interface Props {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  appointment:  any | null;
  onSaved:      () => void;
  onDeleted?:   (id: string) => void;
}

function ini(name: string | null | undefined, email: string | undefined) {
  return ((name || email || 'U')).split(/[\s@]/).map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function PortalAppointmentEditModal({ open, onOpenChange, appointment, onSaved, onDeleted }: Props) {
  const [name,         setName]         = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [hour,         setHour]         = useState('10');
  const [minute,       setMinute]       = useState('00');
  const [calOpen,      setCalOpen]      = useState(false);
  const [meetUrl,      setMeetUrl]      = useState('');
  const [notes,        setNotes]        = useState('');
  const [status,       setStatus]       = useState('pending');
  const [saving,       setSaving]       = useState(false);
  const [deleting,     setDeleting]     = useState(false);

  useEffect(() => {
    if (!open || !appointment) return;
    setName(appointment.name ?? '');
    setMeetUrl(appointment.meetUrl ?? '');
    setNotes(appointment.notes ?? '');
    setStatus(appointment.status ?? 'pending');
    setCalOpen(false);
    if (appointment.date) {
      const d = new Date(appointment.date);
      setSelectedDate(d);
      setHour(String(d.getHours()).padStart(2, '0'));
      setMinute(String(d.getMinutes()).padStart(2, '0'));
    }
  }, [open, appointment]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDate) { toast.error('Selecciona una fecha'); return; }
    const dateObj = new Date(selectedDate);
    dateObj.setHours(parseInt(hour) || 10, parseInt(minute) || 0, 0, 0);
    setSaving(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: appointment.id, name, date: dateObj.toISOString(), meetUrl, notes, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      toast.success('Videollamada actualizada ✓');
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!appointment || !confirm(`¿Eliminar "${appointment.name}"?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/appointments?id=${appointment.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      toast.success('Videollamada eliminada');
      onOpenChange(false);
      onDeleted?.(appointment.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally { setDeleting(false); }
  }

  if (!open) return null;

  const assignees: any[] = appointment?.assignedUsers ?? [];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9990, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div onClick={() => onOpenChange(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(3px)' }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18 }}
        onClick={e => e.stopPropagation()}
        style={{ position: 'relative', zIndex: 9991, width: '100%', maxWidth: 480 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--wl-border)] bg-[var(--wl-hover)]">
              <Video className="h-3.5 w-3.5 text-green-400" strokeWidth={1.5} />
            </div>
            <p className="text-[13px] font-medium text-[var(--wl-text-primary)]">Editar videollamada</p>
          </div>
          <button onClick={() => onOpenChange(false)} className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--wl-text-placeholder)] hover:bg-[var(--wl-hover)] hover:text-[var(--wl-text-secondary)] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--wl-bg)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden', position: 'relative' }} className="p-5">
          <div style={{ position: 'absolute', bottom: -30, right: -30, width: 200, height: 160, background: 'radial-gradient(ellipse, rgba(34,197,94,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <form onSubmit={handleSave} className="relative z-10 space-y-4">
            {/* Título */}
            <div>
              <label className="block text-[11px] font-medium text-[var(--wl-text-muted)] uppercase tracking-widest mb-1.5">Título *</label>
              <input value={name} onChange={e => setName(e.target.value)} required
                className="h-[36px] w-full rounded-lg border border-[var(--wl-border)] bg-[var(--wl-hover)] px-3.5 text-[13px] text-[var(--wl-text-secondary)] placeholder-white/20 outline-none focus:border-green-500/40 focus:ring-1 focus:ring-green-500/10" />
            </div>

            {/* Fecha y hora */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[var(--wl-text-muted)] uppercase tracking-widest mb-1.5">Fecha *</label>
                <div className="relative">
                  <button type="button" onClick={() => setCalOpen(v => !v)}
                    className="h-[36px] w-full flex items-center gap-2 rounded-lg border border-[var(--wl-border)] bg-[var(--wl-hover)] px-3 text-[13px] text-left outline-none hover:border-green-500/40 transition-colors"
                    style={{ color: selectedDate ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.25)' }}>
                    <CalendarIcon className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    {selectedDate ? format(selectedDate, "d MMM yyyy", { locale: es }) : 'Seleccionar'}
                  </button>
                  {calOpen && (
                    <div className="absolute top-10 left-0 z-[9999] rounded-xl border border-[var(--wl-border)] shadow-2xl overflow-hidden" style={{ background: '#0f0f14' }}>
                      <Calendar mode="single" locale={es} selected={selectedDate}
                        onSelect={d => { setSelectedDate(d); setCalOpen(false); }}
                        className="text-[var(--wl-text-primary)]" />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[var(--wl-text-muted)] uppercase tracking-widest mb-1.5">Hora *</label>
                <div className="flex gap-1.5 h-[36px]">
                  <select value={hour} onChange={e => setHour(e.target.value)} style={{ colorScheme: 'dark' }}
                    className="flex-1 rounded-lg border border-[var(--wl-border)] bg-[#0f0f14] px-2 text-[13px] text-[var(--wl-text-secondary)] outline-none focus:border-green-500/40">
                    {Array.from({length:24},(_,i)=>String(i).padStart(2,'0')).map(h=>(
                      <option key={h} value={h} style={{background:'#0f0f14'}}>{h}</option>
                    ))}
                  </select>
                  <span className="flex items-center text-[var(--wl-text-placeholder)] text-[13px]">:</span>
                  <select value={minute} onChange={e => setMinute(e.target.value)} style={{ colorScheme: 'dark' }}
                    className="flex-1 rounded-lg border border-[var(--wl-border)] bg-[#0f0f14] px-2 text-[13px] text-[var(--wl-text-secondary)] outline-none focus:border-green-500/40">
                    {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m=>(
                      <option key={m} value={m} style={{background:'#0f0f14'}}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Meet link */}
            <div>
              <label className="block text-[11px] font-medium text-[var(--wl-text-muted)] uppercase tracking-widest mb-1.5">Link videollamada</label>
              <div className="flex gap-1.5">
                <input value={meetUrl} onChange={e => setMeetUrl(e.target.value)} placeholder="https://meet.google.com/..."
                  className="h-[36px] flex-1 rounded-lg border border-[var(--wl-border)] bg-[var(--wl-hover)] px-3 text-[12px] text-[var(--wl-text-secondary)] placeholder-white/20 outline-none focus:border-green-500/40" />
                {meetUrl && (
                  <a href={meetUrl} target="_blank" rel="noopener noreferrer"
                    className="h-[36px] w-[36px] flex items-center justify-center rounded-lg border border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors">
                    <Link2 className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Estado — solo PM */}
            <div>
              <label className="block text-[11px] font-medium text-[var(--wl-text-muted)] uppercase tracking-widest mb-1.5">Estado</label>
              <select value={status} onChange={e => setStatus(e.target.value)} style={{ colorScheme: 'dark' }}
                className="h-[36px] w-full rounded-lg border border-[var(--wl-border)] bg-[#0f0f14] px-3 text-[13px] text-[var(--wl-text-secondary)] outline-none focus:border-green-500/40">
                <option value="pending"   style={{background:'#0f0f14'}}>🕐 Pendiente</option>
                <option value="confirmed" style={{background:'#0f0f14'}}>✅ Confirmada</option>
                <option value="cancelled" style={{background:'#0f0f14'}}>❌ Cancelada</option>
              </select>
            </div>

            {/* Participantes */}
            {assignees.length > 0 && (
              <div>
                <label className="block text-[11px] font-medium text-[var(--wl-text-muted)] uppercase tracking-widest mb-1.5">Participantes</label>
                <div className="flex flex-wrap gap-1.5">
                  {assignees.slice(0, 8).map((au: any) => {
                    const u = au.user ?? au;
                    return (
                      <div key={u.id} className="flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] border border-[var(--wl-border)] bg-[var(--wl-hover)] text-[var(--wl-text-secondary)]">
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={u.image ?? undefined} />
                          <AvatarFallback className="text-[7px]" style={{ background: (u.color || '#7c3aed') + '33', color: u.color || '#7c3aed' }}>
                            {ini(u.name, u.email)}
                          </AvatarFallback>
                        </Avatar>
                        {u.name || u.email?.split('@')[0]}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notas */}
            <div>
              <label className="block text-[11px] font-medium text-[var(--wl-text-muted)] uppercase tracking-widest mb-1.5">Notas</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Agenda, temas a tratar..."
                className="w-full rounded-lg border border-[var(--wl-border)] bg-[var(--wl-hover)] px-3.5 py-2.5 text-[13px] text-[var(--wl-text-secondary)] placeholder-white/20 outline-none resize-none focus:border-green-500/40" />
            </div>

            {/* Acciones */}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={handleDelete} disabled={deleting}
                className="h-[36px] w-[36px] flex items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50">
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </button>
              <button type="button" onClick={() => onOpenChange(false)}
                className="flex-1 h-[36px] rounded-lg border border-[var(--wl-border)] text-[13px] text-[var(--wl-text-muted)] hover:text-[var(--wl-text-primary)] hover:bg-[var(--wl-hover)] transition-colors">
                Cancelar
              </button>
              <motion.button type="submit" disabled={saving}
                whileHover={{ backgroundColor: '#16a34a' }} whileTap={{ scale: 0.98 }}
                className="flex-1 h-[36px] flex items-center justify-center gap-1.5 rounded-lg bg-green-600 text-[13px] font-medium text-[var(--wl-text-primary)] disabled:opacity-60">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="h-3.5 w-3.5" />Guardar</>}
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
