'use client';

import { useState, useEffect } from 'react';
import { Loader2, Tags } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export interface CustomRole {
  id: string;
  name: string;
  label: string;
  color: string;
  description: string;
  permissions: Record<string, boolean>;
  createdAt: string;
}

const ROLE_COLORS = [
  '#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626',
  '#0891b2', '#db2777', '#65a30d', '#ea580c', '#6366f1',
];

export const ALL_PERMISSIONS: { key: string; label: string; desc: string }[] = [
  { key: 'canViewDashboard',  label: 'Ver Dashboard',      desc: 'Acceso al panel principal' },
  { key: 'canEditTasks',      label: 'Editar Tareas',       desc: 'Crear y modificar tareas' },
  { key: 'canAssignClients',  label: 'Asignar Clientes',    desc: 'Asociar clientes a proyectos' },
  { key: 'canManageUsers',    label: 'Gestionar Usuarios',  desc: 'Crear y modificar usuarios' },
  { key: 'canViewFinancials', label: 'Ver Finanzas',        desc: 'Acceso a datos financieros' },
  { key: 'canEditCalendar',   label: 'Editar Calendario',   desc: 'Crear y editar eventos' },
  { key: 'canViewCRM',        label: 'Ver CRM',             desc: 'Acceso al módulo de contactos' },
  { key: 'canViewAnalytics',  label: 'Ver Analytics',       desc: 'Acceso a estadísticas y reportes' },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  role?: CustomRole | null;
  onSaved: () => void;
}

export default function CustomRoleDialog({ open, onOpenChange, role, onSaved }: Props) {
  const isEdit = !!role;
  const [label,       setLabel]       = useState('');
  const [description, setDescription] = useState('');
  const [color,       setColor]       = useState('#7c3aed');
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [saving,      setSaving]      = useState(false);

  useEffect(() => {
    if (open) {
      setLabel(role?.label ?? '');
      setDescription(role?.description ?? '');
      setColor(role?.color ?? '#7c3aed');
      const base: Record<string, boolean> = {};
      ALL_PERMISSIONS.forEach(({ key }) => { base[key] = false; });
      setPermissions({ ...base, ...(role?.permissions ?? {}) });
    }
  }, [open, role]);

  function togglePermission(key: string) {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) { toast.error('El nombre visible es requerido.'); return; }

    setSaving(true);
    try {
      const url    = '/api/admin/roles';
      const method = isEdit ? 'PATCH' : 'POST';
      const body   = isEdit
        ? { id: role!.id, label, color, description, permissions }
        : { name: label, label, color, description, permissions };

      const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');

      toast.success(isEdit ? 'Rol actualizado.' : 'Rol creado.');
      onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--wl-surface)] border-[var(--wl-border)] text-[var(--wl-text-primary)] max-w-lg w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[var(--wl-text-primary)]">
            <Tags className="h-4 w-4 text-brand-light" />
            {isEdit ? 'Editar Rol' : 'Crear Rol Personalizado'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-5 mt-2">
          {/* Label */}
          <div className="space-y-1.5">
            <Label className="text-[var(--wl-text-secondary)] text-xs">Nombre visible *</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ej: Editor de Video, Fotógrafo, Community Manager"
              className="bg-[var(--wl-hover)] border-[var(--wl-border)] text-[var(--wl-text-primary)] placeholder:text-[var(--wl-text-placeholder)] focus-visible:ring-brand"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-[var(--wl-text-secondary)] text-xs">Descripción</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Responsabilidades del rol…"
              className="bg-[var(--wl-hover)] border-[var(--wl-border)] text-[var(--wl-text-primary)] placeholder:text-[var(--wl-text-placeholder)] focus-visible:ring-brand"
            />
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <Label className="text-[var(--wl-text-secondary)] text-xs">Color del rol</Label>
            <div className="flex flex-wrap gap-2 items-center">
              {ROLE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none"
                  style={{ backgroundColor: c, borderColor: color === c ? 'white' : 'transparent' }}
                />
              ))}
              <div className="flex items-center gap-2 ml-1">
                <div className="h-7 w-7 rounded-full border border-white/20" style={{ backgroundColor: color }} />
                <span className="text-xs text-[var(--wl-text-muted)] font-mono">{color}</span>
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div className="space-y-2">
            <Label className="text-[var(--wl-text-secondary)] text-xs">Permisos del módulo</Label>
            <div className="rounded-xl border border-[var(--wl-border)] divide-y divide-white/[0.04] overflow-hidden">
              {ALL_PERMISSIONS.map(({ key, label: permLabel, desc }) => (
                <div key={key} className="flex items-center justify-between px-4 py-3 hover:bg-[var(--wl-hover)] transition-colors">
                  <div className="min-w-0 mr-3">
                    <p className="text-sm font-medium text-[var(--wl-text-secondary)]">{permLabel}</p>
                    <p className="text-xs text-[var(--wl-text-muted)]">{desc}</p>
                  </div>
                  <Switch
                    checked={permissions[key] ?? false}
                    onCheckedChange={() => togglePermission(key)}
                    className="shrink-0"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="flex-1 border-[var(--wl-border)] text-[var(--wl-text-secondary)] hover:text-[var(--wl-text-primary)] hover:bg-[var(--wl-hover)]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 bg-brand hover:bg-brand-dark text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? 'Guardar' : 'Crear Rol'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
