'use client';

import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Client } from '@/lib/types';

interface Manager {
  id: string;
  name: string | null;
  email: string;
  color: string;
}

interface ClientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onSuccess?: () => void;
  isAdmin?: boolean;
}

export default function ClientForm({
  open,
  onOpenChange,
  client,
  onSuccess,
  isAdmin = false,
}: ClientFormProps) {
  const isEditing = !!client;
  const [loading,           setLoading]           = useState(false);
  const [name,              setName]              = useState('');
  const [email,             setEmail]             = useState('');
  const [company,           setCompany]           = useState('');
  const [phone,             setPhone]             = useState('');
  const [status,            setStatus]            = useState('active');
  const [assignedManagerId, setAssignedManagerId] = useState('');
  const [managers,          setManagers]          = useState<Manager[]>([]);

  useEffect(() => {
    if (open) {
      setName(client?.name              || '');
      setEmail(client?.email            || '');
      setCompany(client?.company        || '');
      setPhone(client?.phone            || '');
      setStatus(client?.status          || 'active');
      setAssignedManagerId(client?.assignedManagerId || '');

      if (isAdmin) {
        fetch('/api/managers')
          .then((r) => r.json())
          .then((d) => setManagers(d.managers ?? []))
          .catch(() => {});
      }
    }
  }, [open, client, isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      toast.error('Nombre y email son requeridos');
      return;
    }

    setLoading(true);
    try {
      const method = isEditing ? 'PUT' : 'POST';
      const body = isEditing
        ? { id: client!.id, name, email, company, phone, status, assignedManagerId: assignedManagerId || null }
        : { name, email, company, phone, status, assignedManagerId: assignedManagerId || null };

      const res = await fetch('/api/clients', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar el cliente');
      }

      toast.success(isEditing ? 'Cliente actualizado' : 'Cliente creado');
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar el cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#15151c] border-white/[0.06] text-white sm:max-w-md max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
          </DialogTitle>
          <DialogDescription className="text-white/40">
            {isEditing
              ? 'Modifica los datos del cliente.'
              : 'Completa los datos para crear un nuevo cliente.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client-name" className="text-white/70">
              Nombre <span className="text-red-400">*</span>
            </Label>
            <Input
              id="client-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del cliente"
              required
              className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus-visible:ring-brand"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-email" className="text-white/70">
              Email <span className="text-red-400">*</span>
            </Label>
            <Input
              id="client-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              required
              className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus-visible:ring-brand"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="client-company" className="text-white/70">
                Empresa
              </Label>
              <Input
                id="client-company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Nombre de la empresa"
                className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus-visible:ring-brand"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-phone" className="text-white/70">
                Teléfono
              </Label>
              <Input
                id="client-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+52 555 123 4567"
                className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus-visible:ring-brand"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white/70">Estado</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white w-full focus-visible:ring-brand">
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent className="bg-[#15151c] border-white/[0.08] text-white">
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="prospect">Prospecto</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Assigned manager — admin only */}
          {isAdmin && (
            <div className="space-y-2">
              <Label className="text-white/70">Project Manager responsable</Label>
              <Select value={assignedManagerId || 'none'} onValueChange={(v) => setAssignedManagerId(v === 'none' ? '' : v)}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white w-full focus-visible:ring-brand">
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent className="bg-[#15151c] border-white/[0.08] text-white max-h-48">
                  <SelectItem value="none" className="text-white/40 focus:bg-white/[0.06]">
                    Sin asignar
                  </SelectItem>
                  {managers.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="focus:bg-white/[0.06]">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0 inline-block"
                          style={{ backgroundColor: m.color || '#7c3aed' }} />
                        {m.name || m.email}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-white/30">
                Los PMs solo ven sus propios clientes asignados.
              </p>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-white/[0.1] text-white/70 hover:text-white hover:bg-white/[0.06]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-brand hover:bg-brand-dark text-white"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {isEditing ? 'Guardando…' : 'Creando…'}
                </span>
              ) : isEditing ? 'Guardar Cambios' : 'Crear Cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
