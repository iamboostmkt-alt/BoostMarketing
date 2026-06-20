'use client';
import React from 'react';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { toasts } from '@/lib/toast-helpers';
import { Video, Plus, Pencil, Trash2, RefreshCw, X, Check, Loader2, Link2, CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
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
  // Lock scroll cuando está abierto
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);
  const isManager = ['ADMIN', 'PROJECT_MANAGER'].includes(userRole);
  const isEdit    = !!meeting;

  const [name,        setName]        = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [hour,        setHour]        = useState('10');
  const [minute,      setMinute]      = useState('00');
  const [calOpen,     setCalOpen]     = useState(false);
  const [notes,       setNotes]       = useState('');
  const [meetUrl,     setMeetUrl]     = useState('');
  const [gcalLoading, setGcalLoading] = useState(false);
  const [gcalError,   setGcalError]   = useState('');
  const [assigned,    setAssigned]    = useState<string[]>([]);
  const [clientEmail, setClientEmail] = useState('');
  const [clientId,    setClientId]    = useState('');
  const [guestEmails, setGuestEmails] = useState<string[]>([]);
  const [guestInput,  setGuestInput]  = useState('');
  const [visibility,  setVisibility]  = useState<'internal' | 'team' | 'client_visible'>('team');
  const [saving,      setSaving]      = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(meeting?.name ?? '');
    if (meeting?.date) {
      const d = new Date(meeting.date);
      setSelectedDate(d);
      setHour(String(d.getHours()).padStart(2, '0'));
      setMinute(String(d.getMinutes()).padStart(2, '0'));
    } else if (initialDate) {
      setSelectedDate(initialDate);
      setHour('10'); setMinute('00');
    } else {
      setSelectedDate(undefined); setHour('10'); setMinute('00');
    }
    setCalOpen(false);
    setNotes(meeting?.notes ?? '');
    // Auto-generar link Google Meet para nuevas reuniones
    if (!meeting) {
      const chars = 'abcdefghijklmnop';
      const seg = (n: number) => Array.from({length: n}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      setMeetUrl(`https://meet.google.com/${seg(3)}-${seg(4)}-${seg(3)}`);
    } else {
      setMeetUrl(meeting?.meetUrl ?? '');
    }
    setAssigned((meeting?.assignedUsers ?? []).map((au: any) => au.user?.id ?? au.userId));
    setClientEmail(initialClientEmail ?? (meeting as any)?.email ?? '');
    setClientId(clients.find(c => c.email === (initialClientEmail ?? (meeting as any)?.email ?? ''))?.id ?? '');
    setVisibility('team');
    setGuestEmails((meeting as any)?.guestEmails ?? []);
    setGuestInput('');
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
    if (!name.trim() || !selectedDate) { toast.error('Nombre y fecha requeridos.'); return; }
    const dateObj = new Date(selectedDate);
    dateObj.setHours(parseInt(hour) || 10, parseInt(minute) || 0, 0, 0);
    const date = dateObj.toISOString();
    setSaving(true);
    try {
      // Siempre usar /api/meetings desde el dashboard (evita crear prospectos)
      // clientId y clientEmail se pasan para notificaciones en el room del cliente
      const body = {
        name, date: new Date(date).toISOString(), notes, meetUrl,
        assignedUserIds: assigned, visibility,
        guestEmails: guestEmails.filter(e => e.includes('@')),
        ...(clientId    ? { clientId }           : {}),
        ...(clientEmail ? { clientEmail }        : {}),
      };
      const res = isEdit
        ? await fetch('/api/meetings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: meeting!.id, ...body }) })
        : await fetch('/api/meetings', { method: 'POST',  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      if (isEdit) {
        toast.success('Reunión actualizada ✓');
      } else {
        toasts.meetingCreated(name, meetUrl || undefined);
      }
      onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally { setSaving(false); }
  }

  // Crear evento real en Google Calendar
  async function createGoogleCalendarEvent() {
    if (!name.trim()) { setGcalError('Escribe el nombre de la reunión primero'); return; }
    if (!selectedDate) { setGcalError('Selecciona fecha y hora primero'); return; }
    setGcalLoading(true); setGcalError('');
    try {
      const startDt = new Date(selectedDate);
      startDt.setHours(parseInt(hour), parseInt(minute), 0, 0);
      const endDt = new Date(startDt.getTime() + 60 * 60 * 1000);
      const attendeeEmails = teamUsers.filter(u => assigned.includes(u.id) && u.email).map(u => u.email);
      const res = await fetch('/api/google/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: name, startTime: startDt.toISOString(), endTime: endDt.toISOString(),
          attendeeEmails, description: notes || 'Reunión desde Weeklink',
        }),
      });
      const data = await res.json();
      if (!res.ok) { setGcalError(data.error || 'Error al crear el evento'); return; }
      if (data.meetLink) { setMeetUrl(data.meetLink); setGcalError(''); }
      else { setGcalError('Evento creado pero sin Meet link — verifica Google Calendar'); }
    } catch { setGcalError('Error de conexión'); }
    finally { setGcalLoading(false); }
  }

  function generateMeetLink(service: 'meet' | 'jitsi' | 'zoom' = 'meet') {
    // Google Meet usa letras a-p, formato xxx-xxxx-xxx
    const chars = 'abcdefghijklmnop';
    const seg = (n: number) => Array.from({length: n}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    if (service === 'jitsi') {
      const room = 'Weeklink-' + Math.random().toString(36).slice(2, 10).toUpperCase();
      setMeetUrl(`https://meet.jit.si/${room}`);
    } else if (service === 'zoom') {
      const id = Math.floor(Math.random() * 9_000_000_000) + 1_000_000_000;
      setMeetUrl(`https://zoom.us/j/${id}`);
    } else {
      setMeetUrl(`https://meet.google.com/${seg(3)}-${seg(4)}-${seg(3)}`);
    }
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
        style={{ position: 'relative', zIndex: 9991, width: '100%', maxWidth: 520, maxHeight: 'calc(100dvh - 56px)', overflowY: 'auto', borderRadius: '16px 16px 0 0' }}
        className="sm:rounded-2xl"
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

            {/* Fecha, hora y link en grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-white/40 uppercase tracking-widest mb-1.5">Fecha *</label>
                <div className="relative">
                  <button type="button" onClick={() => setCalOpen(v => !v)}
                    className="h-[36px] w-full flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 text-[13px] text-left outline-none hover:border-purple-500/40 transition-colors"
                    style={{ color: selectedDate ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.25)' }}>
                    <CalendarIcon className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    {selectedDate ? format(selectedDate, "d MMM yyyy", { locale: es }) : 'Seleccionar fecha'}
                  </button>
                  {calOpen && (
                    <div className="absolute top-10 left-0 z-[9999] rounded-xl border border-white/[0.08] shadow-2xl overflow-hidden"
                      style={{ background: '#0f0f14' }}>
                      <Calendar mode="single" locale={es} selected={selectedDate}
                        onSelect={d => { setSelectedDate(d); setCalOpen(false); }}
                        className="text-white" />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-white/40 uppercase tracking-widest mb-1.5">Hora *</label>
                <div className="flex gap-1.5 h-[36px]">
                  <select value={hour} onChange={e => setHour(e.target.value)}
                    style={{ fontSize: '16px', colorScheme: 'dark' }}
                    className="wl-select w-full flex-1 rounded-lg border border-white/[0.07] bg-[#0f0f14] px-2 text-[13px] text-white/70 outline-none focus:border-purple-500/40">
                    {Array.from({length:24},(_,i)=>String(i).padStart(2,'0')).map(h=>(
                      <option key={h} value={h} style={{background:'#0f0f14'}}>{h}</option>
                    ))}
                  </select>
                  <span className="flex items-center text-white/30 text-[13px]">:</span>
                  <select value={minute} onChange={e => setMinute(e.target.value)}
                    style={{ fontSize: '16px', colorScheme: 'dark' }}
                    className="wl-select w-full flex-1 rounded-lg border border-white/[0.07] bg-[#0f0f14] px-2 text-[13px] text-white/70 outline-none focus:border-purple-500/40">
                    {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m=>(
                      <option key={m} value={m} style={{background:'#0f0f14'}}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            {/* Google Meet */}
            <div>
              <label className="block text-[11px] font-medium text-white/40 uppercase tracking-widest mb-1.5">Google Meet</label>
              <div className="flex gap-1.5">
                <input value={meetUrl} onChange={e => setMeetUrl(e.target.value)}
                  placeholder="https://meet.google.com/..."
                  className="h-[36px] flex-1 min-w-0 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 text-[12px] text-white/70 placeholder-white/15 outline-none focus:border-purple-500/40" />
                <button type="button" onClick={createGoogleCalendarEvent} disabled={gcalLoading}
                  title="Crear evento real en Google Calendar con Meet"
                  className="h-[36px] px-2.5 shrink-0 flex items-center gap-1 rounded-lg border border-white/[0.07] bg-white/[0.03] hover:bg-purple-500/10 hover:border-purple-500/30 transition-all disabled:opacity-40 text-[10px] font-semibold"
                  style={{ color: gcalLoading ? 'rgba(139,92,246,0.6)' : '#a78bfa' }}>
                  {gcalLoading
                    ? <span className="w-3 h-3 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin block" />
                    : <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5C3.89 4 3.01 4.9 3.01 6L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/></svg>
                  }
                  {gcalLoading ? '' : 'Meet'}
                </button>
              </div>
              {gcalError && <p className="text-[10px] text-red-400 mt-1">{gcalError}</p>}
              {meetUrl.includes('meet.google.com') && !gcalError && (
                <p className="text-[10px] text-emerald-400 mt-1">✓ Meet real listo</p>
              )}
            </div>

            {/* Cliente */}
            {clients.length > 0 && (
              <div>
                <label className="block text-[11px] font-medium text-white/40 uppercase tracking-widest mb-1.5">Cuenta cliente (opcional)</label>
                <select value={clientId} onChange={e => handleClientChange(e.target.value)}
                  className="wl-select w-full">
                  <option value="" style={{ background: '#0f0f14', color: 'rgba(255,255,255,0.7)' }}>Sin cliente</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id} style={{ background: '#0f0f14', color: 'rgba(255,255,255,0.7)' }}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>
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

            {/* Invitados externos */}
            <div>
              <label className="block text-[11px] font-medium text-white/40 uppercase tracking-widest mb-1.5">
                Invitados externos <span className="text-white/20 normal-case">(opcional · recibirán email de invitación)</span>
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="email"
                  value={guestInput}
                  onChange={e => setGuestInput(e.target.value)}
                  onKeyDown={e => {
                    if ((e.key === 'Enter' || e.key === ',') && guestInput.includes('@')) {
                      e.preventDefault();
                      const email = guestInput.trim().toLowerCase();
                      if (!guestEmails.includes(email)) setGuestEmails(prev => [...prev, email]);
                      setGuestInput('');
                    }
                  }}
                  placeholder="correo@cliente.com → Enter para agregar"
                  className="flex-1 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-[12px] text-white/70 placeholder-white/20 outline-none focus:border-purple-500/40"
                />
                <button type="button"
                  onClick={() => {
                    const email = guestInput.trim().toLowerCase();
                    if (email.includes('@') && !guestEmails.includes(email)) {
                      setGuestEmails(prev => [...prev, email]);
                      setGuestInput('');
                    }
                  }}
                  className="px-3 py-2 rounded-lg text-[11px] font-medium border border-white/[0.07] bg-white/[0.03] text-white/50 hover:text-white hover:border-purple-500/30 transition-colors">
                  + Agregar
                </button>
              </div>
              {guestEmails.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {guestEmails.map(email => (
                    <span key={email}
                      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] border"
                      style={{ background: 'rgba(124,58,237,0.08)', borderColor: 'rgba(124,58,237,0.25)', color: '#c4b5fd' }}>
                      ✉ {email}
                      <button type="button" onClick={() => setGuestEmails(prev => prev.filter(e => e !== email))}
                        className="text-white/30 hover:text-red-400 transition-colors ml-0.5">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

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
                  <button type="button" onClick={() => generateMeetLink('jitsi')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] border border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/40 transition-colors">
                    <Video className="h-3 w-3" /> Jitsi ✓
                  </button>
                  <button type="button" onClick={() => generateMeetLink('meet')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] border border-white/[0.08] bg-white/[0.03] text-white/50 hover:text-white hover:border-purple-500/30 transition-colors">
                    <Video className="h-3 w-3" /> Google Meet
                  </button>
                  <button type="button" onClick={() => generateMeetLink('zoom')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] border border-white/[0.08] bg-white/[0.03] text-white/50 hover:text-white hover:border-purple-500/30 transition-colors">
                    <Video className="h-3 w-3" /> Zoom
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
  const [meetings,     setMeetings]     = useState<Appointment[]>([]);
  const [meetCursor,   setMeetCursor]   = useState<string | null>(null);
  const [meetHasMore,  setMeetHasMore]  = useState(false);
  const [meetLoadMore, setMeetLoadMore] = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('all');
  const [dialog,    setDialog]    = useState(false);
  const [editing,   setEditing]   = useState<Appointment | null>(null);
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [viewMeeting, setViewMeeting] = useState<Appointment | null>(null);
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [clients,   setClients]   = useState<{ id: string; name: string; email: string; company: string }[]>([]);

  const fetchMeetings = useCallback(async (status = 'all') => {
    setLoading(true);
    setMeetCursor(null);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (status !== 'all') params.set('status', status);
      const res = await fetch('/api/meetings?' + params);
      const data = await res.json();
      setMeetings(data.meetings ?? []);
      setMeetCursor(data.nextCursor ?? null);
      setMeetHasMore(data.hasMore ?? false);
    } catch { toast.error('Error al cargar reuniones.'); }
    finally { setLoading(false); }
  }, []);

  async function loadMoreMeetings() {
    if (!meetCursor || meetLoadMore) return;
    setMeetLoadMore(true);
    try {
      const params = new URLSearchParams({ cursor: meetCursor, limit: '50' });
      if (filter !== 'all') params.set('status', filter);
      const res = await fetch('/api/meetings?' + params);
      const data = await res.json();
      setMeetings(prev => [...prev, ...(data.meetings ?? [])]);
      setMeetCursor(data.nextCursor ?? null);
      setMeetHasMore(data.hasMore ?? false);
    } finally { setMeetLoadMore(false); }
  }

  useEffect(() => {
    fetchMeetings();
    fetch('/api/team-members')
      .then(r => r.json())
      .then(d => setTeamUsers((d.users ?? []).filter((u: TeamUser & { role: string }) => u.role !== 'CLIENT' && u.role !== 'UNASSIGNED')))
      .catch(() => {});
    // BUG-16: sidebar=1 devuelve solo clientes asignados al PM/TEAM
    fetch('/api/clients?sidebar=1')
      .then(r => r.json())
      .then(d => setClients((d.clients ?? []).map((cl: any) => ({
        id: cl.id, name: cl.name, email: cl.email || '', company: '',
      }))))
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
                          className="h-7 w-7 text-white/30 hover:text-violet-400 hover:bg-violet-500/10"
                          onClick={() => setViewMeeting(meet)} title="Ver detalle">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </Button>
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
      {/* Modal Detalle de Reunión */}
      {/* Cargar más reuniones */}
      {meetHasMore && (
        <div className="flex justify-center py-3">
          <button onClick={loadMoreMeetings} disabled={meetLoadMore}
            className="flex items-center gap-2 px-5 py-2 rounded-xl border border-white/[0.08] text-[12px] text-white/40 hover:text-white hover:bg-white/[0.04] transition-colors disabled:opacity-50">
            {meetLoadMore ? 'Cargando...' : `Cargar más reuniones`}
          </button>
        </div>
      )}

      {viewMeeting && (() => {
        const st = STATUS[(viewMeeting as any).status] ?? STATUS.pending;
        const dateStr = (viewMeeting as any).date
          ? new Date((viewMeeting as any).date).toLocaleDateString('es-MX', { weekday:'long', day:'numeric', month:'long' }) + ' — ' + new Date((viewMeeting as any).date).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' })
          : '';
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9990, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div onClick={() => setViewMeeting(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} />
            <div style={{ position: 'relative', zIndex: 9991, width: '100%', maxWidth: 420, background: '#080808', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, overflow: 'hidden', maxHeight: 'calc(100dvh - 32px)', display: 'flex', flexDirection: 'column' }}>
              <div className="flex items-start justify-between p-5 pb-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04]">
                    <Video className="h-4 w-4 text-green-400" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-white">{viewMeeting.name}</p>
                    <span className="text-[11px] font-medium" style={{ color: st.color }}>{st.label}</span>
                  </div>
                </div>
                <button onClick={() => setViewMeeting(null)} className="text-white/30 hover:text-white p-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div className="px-5 pb-5 space-y-2.5 overflow-y-auto" style={{ overscrollBehavior: "contain" }}>
                {dateStr && (
                  <div className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <p className="text-[13px] text-white/70">{dateStr}</p>
                  </div>
                )}
                {(viewMeeting as any).meetUrl && (
                  <a href={(viewMeeting as any).meetUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 hover:bg-emerald-500/10 transition-colors">
                    <Video className="h-4 w-4 text-emerald-400" />
                    <p className="text-[12px] text-emerald-300 truncate">{(viewMeeting as any).meetUrl}</p>
                  </a>
                )}
                {((viewMeeting as any).assignedUsers ?? []).length > 0 && (
                  <div>
                    <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1.5">Participantes</p>
                    <div className="flex flex-wrap gap-1.5">
                      {((viewMeeting as any).assignedUsers ?? []).slice(0,8).map((au: any) => {
                        const u = au.user ?? au;
                        return (
                          <div key={u.id} className="flex items-center gap-1.5 rounded-full px-2 py-1 border border-white/[0.07] bg-white/[0.03] text-[11px] text-white/60">
                            <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ background: (u.color||'#7c3aed')+'44' }}>
                              {(u.name||u.email||'U').slice(0,1).toUpperCase()}
                            </div>
                            {u.name || u.email?.split('@')[0]}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {(viewMeeting as any).notes && (
                  <div className="py-2 px-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1">Notas</p>
                    <p className="text-[13px] text-white/60">{(viewMeeting as any).notes}</p>
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => { setViewMeeting(null); setEditing(viewMeeting); setDialog(true); }}
                    className="flex-1 h-9 flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] text-[12px] text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors">
                    <Pencil className="h-3.5 w-3.5" />Editar
                  </button>
                  {(viewMeeting as any).meetUrl && (
                    <a href={(viewMeeting as any).meetUrl} target="_blank" rel="noopener noreferrer"
                      className="flex-1 h-9 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 text-[12px] font-medium text-white hover:bg-emerald-700 transition-colors">
                      <Video className="h-3.5 w-3.5" />Unirse
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <MeetingDialog open={dialog} onOpenChange={setDialog} meeting={editing} teamUsers={teamUsers} clients={clients} userRole={myRole} onSaved={() => fetchMeetings(filter)} />
    </div>
  );
}
