'use client';

import { useState } from 'react';
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

interface ClientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onSuccess?: () => void;
}

export default function ClientForm({
  open,
  onOpenChange,
  client,
  onSuccess,
}: ClientFormProps) {
  const isEditing = !!client;
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(client?.name || '');
  const [email, setEmail] = useState(client?.email || '');
  const [company, setCompany] = useState(client?.company || '');
  const [phone, setPhone] = useState(client?.phone || '');
  const [status, setStatus] = useState(client?.status || 'active');

  // Reset form when dialog opens with new client data
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setName(client?.name || '');
      setEmail(client?.email || '');
      setCompany(client?.company || '');
      setPhone(client?.phone || '');
      setStatus(client?.status || 'active');
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      toast.error('Nombre y email son requeridos');
      return;
    }

    setLoading(true);
    try {
      const url = '/api/clients';
      const method = isEditing ? 'PUT' : 'POST';
      const body = isEditing
        ? { id: client.id, name, email, company, phone, status }
        : { name, email, company, phone, status };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar el cliente');
      }

      toast.success(
        isEditing ? 'Cliente actualizado correctamente' : 'Cliente creado correctamente'
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar el cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-[#15151c] border-white/[0.06] text-white sm:max-w-md">
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

          <div className="space-y-2">
            <Label htmlFor="client-status" className="text-white/70">
              Estado
            </Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white w-full focus-visible:ring-brand">
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent className="bg-[#15151c] border-white/[0.08] text-white">
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {isEditing ? 'Guardando...' : 'Creando...'}
                </div>
              ) : isEditing ? (
                'Guardar Cambios'
              ) : (
                'Crear Cliente'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
