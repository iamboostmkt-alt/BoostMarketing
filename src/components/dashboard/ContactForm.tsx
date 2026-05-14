'use client';

import { useState, useEffect } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { crmStages } from '@/lib/theme-maps';
import type { Contact } from '@/lib/types';

interface ContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
  defaultStatus?: string;
  onSuccess: () => void;
}

export default function ContactForm({
  open,
  onOpenChange,
  contact,
  defaultStatus,
  onSuccess,
}: ContactFormProps) {
  const isEditing = !!contact;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('prospect');
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (contact) {
      setName(contact.name);
      setEmail(contact.email);
      setCompany(contact.company || '');
      setPhone(contact.phone || '');
      setStatus(contact.status || 'lead');
      setValue(contact.value ? String(contact.value) : '');
      setNotes(contact.notes || '');
    } else {
      setName('');
      setEmail('');
      setCompany('');
      setPhone('');
      setStatus(defaultStatus || 'prospect');
      setValue('');
      setNotes('');
    }
  }, [contact, defaultStatus, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      toast.error('Nombre y email son requeridos');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        company: company.trim(),
        phone: phone.trim(),
        status,
        value: value ? parseFloat(value) : 0,
        notes: notes.trim(),
        ...(isEditing ? { id: contact!.id } : {}),
      };

      const res = await fetch('/api/contacts', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar contacto');
      }

      toast.success(isEditing ? 'Contacto actualizado' : 'Contacto creado');
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar contacto');
    } finally {
      setLoading(false);
    }
  };

  async function handleDelete() {
    if (!contact?.id) return;
    if (!confirm("Eliminar este contacto?")) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/contacts?id=" + contact.id, { method: "DELETE" });
      if (res.ok) { toast.success("Contacto eliminado."); onSuccess(); onOpenChange(false); }
      else { const d = await res.json(); toast.error(d.error || "Error al eliminar."); }
    } catch { toast.error("Error de red."); }
    finally { setDeleting(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#15151c] border-white/[0.06] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isEditing ? 'Editar Contacto' : 'Nuevo Contacto'}
          </DialogTitle>
          <DialogDescription className="text-white/40">
            {isEditing
              ? 'Modifica los datos del contacto.'
              : 'Agrega un nuevo contacto a tu pipeline.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="contact-name" className="text-white/60 text-xs">
              Nombre <span className="text-red-400">*</span>
            </Label>
            <Input
              id="contact-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del contacto"
              required
              className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus-visible:border-brand focus-visible:ring-brand/30"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="contact-email" className="text-white/60 text-xs">
              Email <span className="text-red-400">*</span>
            </Label>
            <Input
              id="contact-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@ejemplo.com"
              required
              className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus-visible:border-brand focus-visible:ring-brand/30"
            />
          </div>

          {/* Empresa + Teléfono */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contact-company" className="text-white/60 text-xs">
                Empresa
              </Label>
              <Input
                id="contact-company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Nombre empresa"
                className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus-visible:border-brand focus-visible:ring-brand/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-phone" className="text-white/60 text-xs">
                Teléfono
              </Label>
              <Input
                id="contact-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+52 555 1234"
                className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus-visible:border-brand focus-visible:ring-brand/30"
              />
            </div>
          </div>

          {/* Estado + Valor */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Estado</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white w-full h-9">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent className="bg-[#1c1c27] border-white/[0.08]">
                  {crmStages.map((stage) => (
                    <SelectItem
                      key={stage.id}
                      value={stage.id}
                      className="text-white/80 focus:bg-white/[0.06] focus:text-white"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${stage.color}`} />
                        {stage.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-value" className="text-white/60 text-xs">
                Valor ($)
              </Label>
              <Input
                id="contact-value"
                type="number"
                min="0"
                step="100"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="10,000"
                className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus-visible:border-brand focus-visible:ring-brand/30"
              />
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label htmlFor="contact-notes" className="text-white/60 text-xs">
              Notas
            </Label>
            <Textarea
              id="contact-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionales..."
              rows={3}
              className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus-visible:border-brand focus-visible:ring-brand/30 resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            {isEditing && (
              <Button type="button" variant="ghost" onClick={handleDelete} disabled={deleting || loading}
                className="text-red-400 hover:text-red-300 hover:bg-red-400/10 mr-auto gap-1.5">
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Eliminar
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-white/50 hover:text-white hover:bg-white/[0.06]"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-brand hover:bg-brand-dark text-white gap-2 min-w-[120px]"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? 'Guardar' : 'Crear Contacto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
