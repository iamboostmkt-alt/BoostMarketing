'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { Client } from '@/lib/types';

interface Manager { id: string; name: string | null; email: string; color: string; }
interface TeamMember { id: string; name: string | null; email: string; color: string; role: string; }

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin', PROJECT_MANAGER: 'PM', TEAM_MEMBER: 'Equipo',
  DESIGNER: 'Diseno', MARKETING: 'Marketing', SALES_REP: 'Ventas',
};

interface ClientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onSuccess?: () => void;
  isAdmin?: boolean;
}

export default function ClientForm({ open, onOpenChange, client, onSuccess, isAdmin = false }: ClientFormProps) {
  const isEditing = !!client;
  const [loading,           setLoading]           = useState(false);
  const [name,              setName]              = useState('');
  const [email,             setEmail]             = useState('');
  const [createUser,        setCreateUser]        = useState(false);
  const [userPassword,      setUserPassword]      = useState('');
  const [creatingUser,      setCreatingUser]      = useState(false);
  const [company,           setCompany]           = useState('');
  const [phone,             setPhone]             = useState('');
  const [status,            setStatus]            = useState('active');
  const [assignedManagerId, setAssignedManagerId] = useState('');
  const [assignedUserIds,   setAssignedUserIds]   = useState<string[]>([]);
  const [managers,          setManagers]          = useState<Manager[]>([]);
  const [teamMembers,       setTeamMembers]       = useState<TeamMember[]>([]);

  useEffect(() => {
    if (open) {
      setName(client?.name || '');
      setEmail(client?.email || '');
      setCompany(client?.company || '');
      setPhone(client?.phone || '');
      setStatus(client?.status || 'active');
      setAssignedManagerId(client?.assignedManagerId || '');
      const existingIds = ((client as any)?.assignedUsers ?? [])
        .map((u: any) => u.id ?? u.userId ?? u.user?.id)
        .filter(Boolean);
      setAssignedUserIds(existingIds);

      if (isAdmin) {
        fetch('/api/managers')
          .then((r) => r.json())
          .then((d) => setManagers(d.managers ?? []))
          .catch(() => {});
      }
      fetch('/api/team-members')
        .then((r) => r.json())
        .then((d) => setTeamMembers(d.users ?? []))
        .catch(() => {});
    }
  }, [open, client, isAdmin]);

  function toggleUser(id: string) {
    setAssignedUserIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) { toast.error('Nombre y email son requeridos'); return; }
    setLoading(true);
    try {
      const body = {
        ...(isEditing ? { id: client!.id } : {}),
        name, email, company, phone, status,
        assignedManagerId: assignedManagerId || null,
        assignedUserIds,
      };
      // Portal se crea automáticamente en el backend al crear el cliente

      const res = await fetch('/api/clients', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
      <DialogContent className="bg-[var(--wl-surface)] border-[var(--wl-border)] text-[var(--wl-text-primary)] sm:max-w-md max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[var(--wl-text-primary)]">{isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
          <DialogDescription className="text-[var(--wl-text-muted)]">
            {isEditing ? 'Modifica los datos del cliente.' : 'Completa los datos para crear un nuevo cliente.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client-name" className="text-[var(--wl-text-secondary)]">Nombre <span className="text-red-400">*</span></Label>
            <Input id="client-name" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del cliente" required
              className="bg-[var(--wl-hover)] border-[var(--wl-border)] text-[var(--wl-text-primary)] placeholder:text-[var(--wl-text-placeholder)] focus-visible:ring-brand" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-email" className="text-[var(--wl-text-secondary)]">Email <span className="text-red-400">*</span></Label>
            <Input id="client-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com" required
              className="bg-[var(--wl-hover)] border-[var(--wl-border)] text-[var(--wl-text-primary)] placeholder:text-[var(--wl-text-placeholder)] focus-visible:ring-brand" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="client-company" className="text-[var(--wl-text-secondary)]">Empresa</Label>
              <Input id="client-company" value={company} onChange={(e) => setCompany(e.target.value)}
                placeholder="Nombre de la empresa"
                className="bg-[var(--wl-hover)] border-[var(--wl-border)] text-[var(--wl-text-primary)] placeholder:text-[var(--wl-text-placeholder)] focus-visible:ring-brand" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-phone" className="text-[var(--wl-text-secondary)]">Telefono</Label>
              <Input id="client-phone" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="+52 555 123 4567"
                className="bg-[var(--wl-hover)] border-[var(--wl-border)] text-[var(--wl-text-primary)] placeholder:text-[var(--wl-text-placeholder)] focus-visible:ring-brand" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[var(--wl-text-secondary)]">Estado</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-[var(--wl-hover)] border-[var(--wl-border)] text-[var(--wl-text-primary)] w-full"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[var(--wl-surface)] border-[var(--wl-border)] text-[var(--wl-text-primary)]">
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="prospect">Prospecto</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isAdmin && (
            <div className="space-y-2">
              <Label className="text-[var(--wl-text-secondary)]">Project Manager responsable</Label>
              <Select value={assignedManagerId || 'none'} onValueChange={(v) => setAssignedManagerId(v === 'none' ? '' : v)}>
                <SelectTrigger className="bg-[var(--wl-hover)] border-[var(--wl-border)] text-[var(--wl-text-primary)] w-full"><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                <SelectContent className="bg-[var(--wl-surface)] border-[var(--wl-border)] text-[var(--wl-text-primary)] max-h-48">
                  <SelectItem value="none" className="text-[var(--wl-text-muted)] focus:bg-[var(--wl-hover)]">Sin asignar</SelectItem>
                  {managers.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="focus:bg-[var(--wl-hover)]">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0 inline-block" style={{ backgroundColor: m.color || '#7c3aed' }} />
                        {m.name || m.email}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {teamMembers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[var(--wl-text-secondary)]">
                  Equipo asignado
                  {assignedUserIds.length > 0 && <span className="text-brand-light text-xs ml-1">({assignedUserIds.length})</span>}
                </Label>
                {assignedUserIds.length > 0 && (
                  <button type="button" onClick={() => setAssignedUserIds([])}
                    className="text-[11px] text-[var(--wl-text-placeholder)] hover:text-[var(--wl-text-secondary)] transition-colors">
                    Limpiar
                  </button>
                )}
              </div>
              <div className="bg-[var(--wl-hover)] border border-[var(--wl-border)] rounded-lg p-1 max-h-44 overflow-y-auto">
                {teamMembers.map((u) => {
                  const checked = assignedUserIds.includes(u.id);
                  return (
                    <button key={u.id} type="button" onClick={() => toggleUser(u.id)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-colors text-left text-sm ${
                        checked ? 'bg-brand/25 text-white' : 'text-[var(--wl-text-secondary)] hover:bg-[var(--wl-hover)] hover:text-[var(--wl-text-primary)]'
                      }`}>
                      <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        checked ? 'border-brand bg-brand' : 'border-white/20 bg-[var(--wl-hover)]'
                      }`}>
                        {checked && (
                          <svg viewBox="0 0 12 12" className="w-3 h-3 text-[var(--wl-text-primary)]" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2 6l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: u.color || '#7c3aed' }} />
                      <span className="truncate flex-1">{u.name || u.email}</span>
                      <span className="text-[10px] text-[var(--wl-text-placeholder)]">{ROLE_LABELS[u.role] || u.role}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-[var(--wl-text-placeholder)]">El cliente solo vera Project Managers y Admins en su portal.</p>
            </div>
          )}

          <DialogFooter className="pt-2">
            {/* Portal creado automáticamente — sin toggle ni contraseña manual */}
            {!client && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-600/10 border border-violet-500/20 text-[11px] text-violet-300/80 w-full">
                <span>🔐</span>
                <span>Se creará acceso al portal automáticamente. El cliente recibirá un link de activación por email.</span>
              </div>
            )}

            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}
              className="border-white/[0.1] text-[var(--wl-text-secondary)] hover:text-[var(--wl-text-primary)] hover:bg-[var(--wl-hover)]">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-brand hover:bg-brand-dark text-white">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {isEditing ? 'Guardando...' : 'Creando...'}
                </span>
              ) : isEditing ? 'Guardar Cambios' : 'Crear Cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}