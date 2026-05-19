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
      // Crear usuario del sistema si se solicitó
      if (createUser && userPassword && !client) {
        setCreatingUser(true);
        try {
          await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name,
              email,
              password: userPassword,
              role: 'CLIENT',
              color: '#7c3aed',
            }),
          });
        } catch (e) {
          console.error('Error creando usuario:', e);
        } finally {
          setCreatingUser(false);
        }
      }

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
      <DialogContent className="bg-[#15151c] border-white/[0.06] text-white sm:max-w-md max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">{isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
          <DialogDescription className="text-white/40">
            {isEditing ? 'Modifica los datos del cliente.' : 'Completa los datos para crear un nuevo cliente.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client-name" className="text-white/70">Nombre <span className="text-red-400">*</span></Label>
            <Input id="client-name" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del cliente" required
              className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus-visible:ring-brand" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-email" className="text-white/70">Email <span className="text-red-400">*</span></Label>
            <Input id="client-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com" required
              className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus-visible:ring-brand" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="client-company" className="text-white/70">Empresa</Label>
              <Input id="client-company" value={company} onChange={(e) => setCompany(e.target.value)}
                placeholder="Nombre de la empresa"
                className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus-visible:ring-brand" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-phone" className="text-white/70">Telefono</Label>
              <Input id="client-phone" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="+52 555 123 4567"
                className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus-visible:ring-brand" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white/70">Estado</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white w-full"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#15151c] border-white/[0.08] text-white">
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="prospect">Prospecto</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isAdmin && (
            <div className="space-y-2">
              <Label className="text-white/70">Project Manager responsable</Label>
              <Select value={assignedManagerId || 'none'} onValueChange={(v) => setAssignedManagerId(v === 'none' ? '' : v)}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white w-full"><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                <SelectContent className="bg-[#15151c] border-white/[0.08] text-white max-h-48">
                  <SelectItem value="none" className="text-white/40 focus:bg-white/[0.06]">Sin asignar</SelectItem>
                  {managers.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="focus:bg-white/[0.06]">
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
                <Label className="text-white/70">
                  Equipo asignado
                  {assignedUserIds.length > 0 && <span className="text-brand-light text-xs ml-1">({assignedUserIds.length})</span>}
                </Label>
                {assignedUserIds.length > 0 && (
                  <button type="button" onClick={() => setAssignedUserIds([])}
                    className="text-[11px] text-white/30 hover:text-white/60 transition-colors">
                    Limpiar
                  </button>
                )}
              </div>
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-lg p-1 max-h-44 overflow-y-auto">
                {teamMembers.map((u) => {
                  const checked = assignedUserIds.includes(u.id);
                  return (
                    <button key={u.id} type="button" onClick={() => toggleUser(u.id)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-colors text-left text-sm ${
                        checked ? 'bg-brand/25 text-white' : 'text-white/70 hover:bg-white/[0.04] hover:text-white'
                      }`}>
                      <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        checked ? 'border-brand bg-brand' : 'border-white/20 bg-white/[0.04]'
                      }`}>
                        {checked && (
                          <svg viewBox="0 0 12 12" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2 6l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: u.color || '#7c3aed' }} />
                      <span className="truncate flex-1">{u.name || u.email}</span>
                      <span className="text-[10px] text-white/30">{ROLE_LABELS[u.role] || u.role}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-white/30">El cliente solo vera Project Managers y Admins en su portal.</p>
            </div>
          )}

          <DialogFooter className="pt-2">
            {/* Acceso al portal — solo al crear cliente nuevo */}
            {!client && (
              <div className="space-y-3 pt-2 border-t border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/70">Acceso al portal</p>
                    <p className="text-xs text-white/30">Crear cuenta de usuario para este cliente</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateUser(v => !v)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      createUser ? 'bg-violet-600' : 'bg-white/[0.08]'
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      createUser ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
                {createUser && (
                  <div className="space-y-2">
                    <Label className="text-white/60 text-xs">Contraseña temporal <span className="text-red-400">*</span></Label>
                    <Input
                      type="password"
                      value={userPassword}
                      onChange={e => setUserPassword(e.target.value)}
                      placeholder="Mín. 6 caracteres"
                      minLength={6}
                      className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus-visible:ring-brand"
                    />
                    <p className="text-[10px] text-white/25">
                      El cliente podrá acceder al portal con su email y esta contraseña.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Si ya es cliente existente — botón para crear usuario si no tiene */}
            {client && (
              <div className="pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={async () => {
                    const pwd = prompt('Contraseña temporal para el cliente (mín. 6 caracteres):');
                    if (!pwd || pwd.length < 6) return;
                    setCreatingUser(true);
                    try {
                      const res = await fetch('/api/admin/users', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          name: client.name,
                          email: client.email,
                          password: pwd,
                          role: 'CLIENT',
                          color: '#7c3aed',
                        }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || 'Error');
                      alert('Usuario creado correctamente. El cliente ya puede acceder al portal.');
                    } catch (e: any) {
                      alert(e.message || 'Error al crear usuario');
                    } finally {
                      setCreatingUser(false);
                    }
                  }}
                  disabled={creatingUser}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-violet-500/30 bg-violet-600/10 text-violet-300/80 hover:bg-violet-600/20 text-sm transition-all disabled:opacity-50"
                >
                  {creatingUser ? '⏳ Creando...' : '🔑 Crear acceso al portal'}
                </button>
                <p className="text-[10px] text-white/25 text-center mt-1">
                  Solo si el cliente aún no tiene usuario en el sistema
                </p>
              </div>
            )}

            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}
              className="border-white/[0.1] text-white/70 hover:text-white hover:bg-white/[0.06]">
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