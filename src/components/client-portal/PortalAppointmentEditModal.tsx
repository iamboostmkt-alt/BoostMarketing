'use client';

// ─────────────────────────────────────────────────────────────────────────────
// src/components/client-portal/PortalAppointmentEditModal.tsx
//
// Modal para que el PM edite o elimine una videollamada desde el portal cliente
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { Video, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface PortalAppointmentEditModalProps {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  appointment:  any | null;
  onSaved:      () => void;
  onDeleted?:   (id: string) => void;
}

export default function PortalAppointmentEditModal({
  open, onOpenChange, appointment, onSaved, onDeleted,
}: PortalAppointmentEditModalProps) {
  const [name,    setName]    = useState('');
  const [date,    setDate]    = useState('');
  const [meetUrl, setMeetUrl] = useState('');
  const [notes,   setNotes]   = useState('');
  const [status,  setStatus]  = useState('pending');
  const [saving,  setSaving]  = useState(false);
  const [deleting,setDeleting]= useState(false);

  useEffect(() => {
    if (open && appointment) {
      setName(appointment.name ?? '');
      setMeetUrl(appointment.meetUrl ?? '');
      setNotes(appointment.notes ?? '');
      setStatus(appointment.status ?? 'pending');
      try {
        const d   = new Date(appointment.date);
        const pad = (n: number) => String(n).padStart(2, '0');
        setDate(
          `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
        );
      } catch { setDate(''); }
    }
  }, [open, appointment]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/appointments', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          id:      appointment.id,
          name,
          date:    date ? new Date(date).toISOString() : undefined,
          meetUrl,
          notes,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      toast.success('Videollamada actualizada');
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!appointment) return;
    if (!confirm(`¿Eliminar "${appointment.name}"?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/appointments?id=${appointment.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      toast.success('Videollamada eliminada');
      onOpenChange(false);
      onDeleted?.(appointment.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#15151c] border-white/[0.08] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Video className="h-4 w-4 text-green-400" />
            Editar Videollamada
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Título *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} required
              className="bg-white/[0.04] border-white/[0.08] text-white focus-visible:ring-brand" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Fecha y hora *</Label>
            <Input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} required
              className="bg-white/[0.04] border-white/[0.08] text-white focus-visible:ring-brand [color-scheme:dark]" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Link Google Meet</Label>
            <Input value={meetUrl} onChange={e => setMeetUrl(e.target.value)}
              placeholder="https://meet.google.com/xxx-xxxx-xxx"
              className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus-visible:ring-brand" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Estado</Label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand">
              <option value="pending">Pendiente</option>
              <option value="confirmed">Confirmada</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Notas</Label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand resize-none placeholder:text-white/25"
              placeholder="Notas opcionales..." />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" disabled={deleting} onClick={handleDelete}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 px-3">
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}
              className="flex-1 border-white/[0.08] text-white/60 hover:text-white">
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}
              className="flex-1 bg-brand hover:bg-brand-dark text-white">
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
