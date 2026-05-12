'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import {
  Shield,
  Users,
  Calendar,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  CheckSquare,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  LayoutTemplate,
  UserPlus,
  ToggleLeft,
  ToggleRight,
  Tags,
  Lock,
  Upload,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getRoleLabel } from '@/lib/roles';
import CMSContent from '@/components/dashboard/CMSContent';
import CustomRoleDialog, { type CustomRole, ALL_PERMISSIONS } from '@/components/dashboard/CustomRoleDialog';
import { statusColors, statusLabels, priorityColors, priorityLabels } from '@/lib/theme-maps';
import type { Appointment, Task } from '@/lib/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  lifecycleStatus: string | null;
  color: string;
  active: boolean;
  createdAt: string;
  customRoleId: string | null;
  customRole: { id: string; label: string; color: string } | null;
}

interface MiniRole { id: string; label: string; color: string; }

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLES = [
  'UNASSIGNED',
  'ADMIN',
  'CLIENT',
  'PROJECT_MANAGER',
  'TEAM_MEMBER',
] as const;

const roleColorMap: Record<string, string> = {
  UNASSIGNED:      'bg-slate-500/15 text-slate-300 border-slate-500/20',
  ADMIN:           'bg-amber-500/15 text-amber-300 border-amber-500/20',
  CLIENT:          'bg-green-500/15 text-green-300 border-green-500/20',
  TEAM_MEMBER:     'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
  DESIGNER:        'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
  MARKETING:       'bg-purple-500/15 text-purple-300 border-purple-500/20',
  PROJECT_MANAGER: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
};

const apptStatusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pendiente',  color: 'bg-amber-500/15 text-amber-300',  icon: <Clock        className="h-3 w-3" /> },
  confirmed: { label: 'Confirmada', color: 'bg-green-500/15 text-green-300',  icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { label: 'Cancelada',  color: 'bg-red-500/15 text-red-300',      icon: <XCircle      className="h-3 w-3" /> },
};

const lifecycleBadgeMap: Record<string, { label: string; className: string }> = {
  PROSPECT: { label: 'Prospecto', className: 'bg-amber-500/15 text-amber-300 border border-amber-500/25' },
  ACTIVE:   { label: 'Activo',    className: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25' },
  INACTIVE: { label: 'Inactivo',  className: 'bg-slate-500/15 text-slate-400 border border-slate-500/20' },
};

const USER_COLORS = [
  '#7c3aed','#2563eb','#059669','#d97706','#dc2626',
  '#0891b2','#7c3aed','#db2777','#65a30d','#ea580c',
];

function initials(name: string | null, email: string) {
  return (name || email).split(/[\s@]/).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}
function fmtDate(iso: string) {
  try { return format(new Date(iso), 'd MMM yyyy', { locale: es }); } catch { return iso; }
}

// ── User dialog (create / edit) ───────────────────────────────────────────────

interface UserDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user?: AdminUser | null;
  onSaved: () => void;
}

function UserDialog({ open, onOpenChange, user, onSaved }: UserDialogProps) {
  const isEdit = !!user;
  const [name,         setName]         = useState('');
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [role,         setRole]         = useState<string>('UNASSIGNED');
  const [color,        setColor]        = useState('#7c3aed');
  const [customRoleId, setCustomRoleId] = useState<string>('none');
  const [miniRoles,    setMiniRoles]    = useState<MiniRole[]>([]);
  const [saving,       setSaving]       = useState(false);
  const [image,        setImage]        = useState<string | null>(null);
  const [uploading,    setUploading]    = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(user?.name ?? '');
      setEmail(user?.email ?? '');
      setPassword('');
      setRole(user?.role ?? 'UNASSIGNED');
      setColor(user?.color ?? '#7c3aed');
      setCustomRoleId(user?.customRoleId ?? 'none');
      setImage(user?.image ?? null);
      fetch('/api/admin/roles')
        .then((r) => r.json())
        .then((d) => setMiniRoles(d.roles ?? []))
        .catch(() => {});
    }
  }, [open, user]);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'avatars');
      const res = await fetch('/api/cms/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al subir imagen');
      setImage(data.url);
      toast.success('Foto subida');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al subir foto');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      let res: Response;
      const crId = customRoleId === 'none' ? null : customRoleId;
      if (isEdit) {
        res = await fetch('/api/admin/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user!.id, name, email, role, color, customRoleId: crId, image }),
        });
      } else {
        res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, role, color }),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      toast.success(isEdit ? 'Usuario actualizado.' : 'Usuario creado.');
      onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#15151c] border-white/[0.08] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            {isEdit ? <Pencil className="h-4 w-4 text-brand-light" /> : <UserPlus className="h-4 w-4 text-brand-light" />}
            {isEdit ? 'Editar Usuario' : 'Crear Usuario'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 mt-2">
          {/* Profile photo — edit mode only */}
          {isEdit && (
            <div className="space-y-2">
              <Label className="text-white/70 text-xs">Foto de perfil</Label>
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={image || undefined} />
                    <AvatarFallback
                      className="text-lg font-semibold"
                      style={{ backgroundColor: (color || '#7c3aed') + '33', color: color || '#7c3aed' }}>
                      {initials(name || null, email || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  {image && (
                    <button
                      type="button"
                      onClick={() => setImage(null)}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors">
                      <X className="h-3 w-3 text-white" />
                    </button>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                    className="border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.06] gap-2 text-xs">
                    <Upload className="h-3.5 w-3.5" />
                    {uploading ? 'Subiendo…' : image ? 'Cambiar foto' : 'Subir foto'}
                  </Button>
                  <p className="text-[10px] text-white/25 mt-1">JPG, PNG o WebP · Máx 5 MB</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo"
              className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus-visible:ring-brand" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Email *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@email.com" required
              className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus-visible:ring-brand" />
          </div>
          {!isEdit && (
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Contraseña *</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mín. 6 caracteres" required minLength={6}
                className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus-visible:ring-brand" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Rol</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white text-sm focus:ring-brand">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#15151c] border-white/[0.08] text-white">
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="focus:bg-white/[0.06]">{getRoleLabel(r)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Color</Label>
              <div className="flex flex-wrap gap-1.5">
                {USER_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                    style={{ backgroundColor: c, borderColor: color === c ? 'white' : 'transparent' }}
                  />
                ))}
              </div>
            </div>
          </div>
          {/* Custom role — only shown when editing and custom roles exist */}
          {isEdit && miniRoles.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Rol Personalizado</Label>
              <Select value={customRoleId} onValueChange={setCustomRoleId}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white text-sm focus:ring-brand">
                  <SelectValue placeholder="Sin rol personalizado" />
                </SelectTrigger>
                <SelectContent className="bg-[#15151c] border-white/[0.08] text-white">
                  <SelectItem value="none" className="focus:bg-white/[0.06]">
                    Sin rol personalizado
                  </SelectItem>
                  {miniRoles.map((cr) => (
                    <SelectItem key={cr.id} value={cr.id} className="focus:bg-white/[0.06]">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: cr.color }} />
                        {cr.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}
              className="flex-1 border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.06]">
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="flex-1 bg-brand hover:bg-brand-dark text-white">
              {saving ? 'Guardando…' : isEdit ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const role    = session?.user?.role as string | undefined;
  const isAdmin = role === 'ADMIN';

  // Users state
  const [users,        setUsers]        = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search,       setSearch]       = useState('');
  const [userDialog,   setUserDialog]   = useState(false);
  const [editingUser,  setEditingUser]  = useState<AdminUser | null>(null);
  const [deleteUser,   setDeleteUser]   = useState<AdminUser | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [togglingUser, setTogglingUser] = useState<string | null>(null);
  const [userListView, setUserListView] = useState<'all' | 'prospects'>('all');
  const [activatingUser, setActivatingUser] = useState<string | null>(null);

  // Appointments state
  const [appointments,  setAppointments]  = useState<Appointment[]>([]);
  const [loadingAppts,  setLoadingAppts]  = useState(true);
  const [apptFilter,    setApptFilter]    = useState<string>('all');
  const [updatingAppt,  setUpdatingAppt]  = useState<string | null>(null);

  // Tasks (reemplaza el antiguo módulo de actividades)
  const [tasks,       setTasks]       = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [taskFilter,   setTaskFilter]   = useState<string>('all');
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);

  // Custom roles state
  const [customRoles,   setCustomRoles]  = useState<CustomRole[]>([]);
  const [loadingRoles,  setLoadingRoles] = useState(true);
  const [roleDialog,    setRoleDialog]   = useState(false);
  const [editingRole,   setEditingRole]  = useState<CustomRole | null>(null);
  const [deleteRole,    setDeleteRole]   = useState<CustomRole | null>(null);
  const [deletingRole,  setDeletingRole] = useState(false);

  // ── Fetchers ───────────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async (q = '', view: 'all' | 'prospects' = userListView) => {
    setLoadingUsers(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('search', q);
      if (view === 'prospects') params.set('lifecycle', 'PROSPECT');
      const qs = params.toString();
      const res = await fetch(`/api/admin/users${qs ? `?${qs}` : ''}`);
      if (!res.ok) throw new Error('Error');
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch { toast.error('No se pudieron cargar los usuarios.'); }
    finally { setLoadingUsers(false); }
  }, [userListView]);

  const fetchAppointments = useCallback(async (status = 'all') => {
    setLoadingAppts(true);
    try {
      const q = status !== 'all' ? `?status=${status}` : '';
      const res = await fetch(`/api/appointments${q}`);
      if (!res.ok) throw new Error('Error');
      const data = await res.json();
      setAppointments(data.appointments ?? []);
    } catch { toast.error('No se pudieron cargar las citas.'); }
    finally { setLoadingAppts(false); }
  }, []);

  const fetchTasks = useCallback(async (status = 'all') => {
    setLoadingTasks(true);
    try {
      const q = new URLSearchParams({ scope: 'all' });
      if (status !== 'all') q.set('status', status);
      const res = await fetch(`/api/tasks?${q.toString()}`);
      if (!res.ok) throw new Error('Error');
      const data = await res.json();
      setTasks(data.tasks ?? []);
    } catch { toast.error('No se pudieron cargar las tareas.'); }
    finally { setLoadingTasks(false); }
  }, []);

  const fetchRoles = useCallback(async () => {
    setLoadingRoles(true);
    try {
      const res = await fetch('/api/admin/roles');
      if (res.ok) { const data = await res.json(); setCustomRoles(data.roles ?? []); }
    } catch { /* table may not exist yet — silently ignore */ }
    finally { setLoadingRoles(false); }
  }, []);

  useEffect(() => { if (isAdmin) { fetchAppointments(); fetchRoles(); } }, [fetchAppointments, fetchRoles, isAdmin]);
  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  useEffect(() => {
    if (!isAdmin) return;
    const t = setTimeout(() => { fetchUsers(search, userListView); }, 350);
    return () => clearTimeout(t);
  }, [search, fetchUsers, isAdmin, userListView]);

  async function handleToggleActive(user: AdminUser) {
    setTogglingUser(user.id);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, active: !user.active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, active: data.user.active } : u)));
      toast.success(data.user.active ? 'Usuario activado.' : 'Usuario desactivado.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally { setTogglingUser(null); }
  }

  async function handleActivateClient(user: AdminUser) {
    setActivatingUser(user.id);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, lifecycleStatus: 'ACTIVE' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setUsers((prev) => {
        if (userListView === 'prospects') return prev.filter((u) => u.id !== user.id);
        return prev.map((u) => (u.id === user.id ? { ...u, lifecycleStatus: 'ACTIVE' } : u));
      });
      toast.success('Cliente marcado como activo.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setActivatingUser(null);
    }
  }

  async function handleDeleteUser() {
    if (!deleteUser) return;
    setDeletingUser(true);
    try {
      const res = await fetch(`/api/admin/users?id=${deleteUser.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setUsers((prev) => prev.filter((u) => u.id !== deleteUser.id));
      toast.success('Usuario eliminado.');
      setDeleteUser(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally { setDeletingUser(false); }
  }

  // ── Appointment actions ────────────────────────────────────────────────────

  async function handleApptStatus(id: string, status: string) {
    setUpdatingAppt(id);
    try {
      const res = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: data.appointment.status } : a)));
      toast.success('Estado actualizado.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally { setUpdatingAppt(null); }
  }

  // ── Task actions ───────────────────────────────────────────────────────────

  async function handleTaskStatusChange(id: string, status: string) {
    setUpdatingTask(id);
    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: data.task.status } : t)));
      toast.success('Estado actualizado.');
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error'); }
    finally { setUpdatingTask(null); }
  }

  // ── Custom role actions ────────────────────────────────────────────────────

  async function handleDeleteRole() {
    if (!deleteRole) return;
    setDeletingRole(true);
    try {
      const res = await fetch(`/api/admin/roles?id=${deleteRole.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setCustomRoles((prev) => prev.filter((r) => r.id !== deleteRole.id));
      toast.success('Rol eliminado.');
      setDeleteRole(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally { setDeletingRole(false); }
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  const roleCounts = userListView === 'all'
    ? ROLES.reduce<Record<string, number>>((acc, r) => {
        acc[r] = users.filter((u) => u.role === r).length;
        return acc;
      }, {})
    : {};
  const pendingAppts = appointments.filter((a) => a.status === 'pending').length;
  const openTasks    = tasks.filter((t) => t.status !== 'completed').length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isAdmin ? 'Panel Administrador' : 'Panel Project Manager'}
          </h1>
          <p className="text-sm text-white/45">
            Sesión: <span className="text-white/70 font-medium">{session?.user?.email}</span>
          </p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {isAdmin && (
          <>
            <div className="glass-card rounded-xl p-4">
              <p className="text-xs text-white/40 mb-1">
                {userListView === 'prospects' ? 'Prospectos (videollamada)' : 'Total usuarios'}
              </p>
              <p className="text-2xl font-bold text-white">{loadingUsers ? '—' : users.length}</p>
            </div>
            <div className="glass-card rounded-xl p-4">
              <p className="text-xs text-white/40 mb-1">Citas pendientes</p>
              <p className="text-2xl font-bold text-amber-300">{loadingAppts ? '—' : pendingAppts}</p>
            </div>
          </>
        )}
        <div className="glass-card rounded-xl p-4">
          <p className="text-xs text-white/40 mb-1">Tareas</p>
          <p className="text-2xl font-bold text-white">{loadingTasks ? '—' : tasks.length}</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-xs text-white/40 mb-1">Abiertas</p>
          <p className="text-2xl font-bold text-brand-light">{loadingTasks ? '—' : openTasks}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={isAdmin ? 'users' : 'tasks'}>
        <TabsList className="bg-white/[0.04] border border-white/[0.06] flex-wrap h-auto gap-1 p-1">
          {isAdmin && (
            <>
              <TabsTrigger value="users" className="data-[state=active]:bg-brand data-[state=active]:text-white text-white/50 gap-2">
                <Users className="h-4 w-4" />Usuarios
              </TabsTrigger>
              <TabsTrigger value="appointments" className="data-[state=active]:bg-brand data-[state=active]:text-white text-white/50 gap-2">
                <Calendar className="h-4 w-4" />Citas
                {pendingAppts > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black">
                    {pendingAppts}
                  </span>
                )}
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="tasks" className="data-[state=active]:bg-brand data-[state=active]:text-white text-white/50 gap-2">
            <CheckSquare className="h-4 w-4" />Tareas
            {openTasks > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/80 text-[10px] font-bold text-white">
                {openTasks}
              </span>
            )}
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="roles" className="data-[state=active]:bg-brand data-[state=active]:text-white text-white/50 gap-2">
                <Tags className="h-4 w-4" />Roles
              </TabsTrigger>
              <TabsTrigger value="cms" className="data-[state=active]:bg-brand data-[state=active]:text-white text-white/50 gap-2">
                <LayoutTemplate className="h-4 w-4" />Contenido
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* ── Users tab ──────────────────────────────────────────────────────── */}
        {isAdmin && (
          <TabsContent value="users" className="mt-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <div className="flex gap-2 flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nombre o email…"
                    className="pl-9 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={() => void fetchUsers(search, userListView)}
                  className="border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.06] shrink-0">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button onClick={() => { setEditingUser(null); setUserDialog(true); }}
                  className="bg-brand hover:bg-brand-dark text-white gap-1.5 shrink-0">
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Crear</span>
                </Button>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-white/35 hidden sm:inline">Vista</span>
                <div className="flex rounded-lg border border-white/[0.08] p-0.5 bg-white/[0.02]">
                  <button
                    type="button"
                    onClick={() => setUserListView('all')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      userListView === 'all' ? 'bg-brand text-white' : 'text-white/50 hover:text-white/80'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserListView('prospects')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      userListView === 'prospects' ? 'bg-amber-600 text-white' : 'text-white/50 hover:text-white/80'
                    }`}
                  >
                    Prospectos
                  </button>
                </div>
              </div>
            </div>

            {/* Role chips (solo vista “Todos”: los conteos reflejan la página actual) */}
            {userListView === 'all' && (
              <div className="flex flex-wrap gap-2">
                {ROLES.map((r) => (
                  <span key={r} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${roleColorMap[r]}`}>
                    {getRoleLabel(r)} <span className="opacity-70">({roleCounts[r] ?? 0})</span>
                  </span>
                ))}
              </div>
            )}
            {/* Users table */}
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Usuario</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Rol</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Cliente</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider hidden md:table-cell">Registrado</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {loadingUsers
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i}>
                            <td className="px-4 py-3"><div className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-full shrink-0" /><div className="space-y-1.5"><Skeleton className="h-3.5 w-28" /><Skeleton className="h-3 w-36" /></div></div></td>
                            <td className="px-4 py-3"><Skeleton className="h-8 w-40" /></td>
                            <td className="px-4 py-3"><Skeleton className="h-6 w-24" /></td>
                            <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-3 w-24" /></td>
                            <td className="px-4 py-3"><Skeleton className="h-8 w-20 ml-auto" /></td>
                          </tr>
                        ))
                      : users.length === 0
                      ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-12 text-center text-sm text-white/30">
                              No se encontraron usuarios
                            </td>
                          </tr>
                        )
                      : users.map((user) => (
                          <tr key={user.id} className={`hover:bg-white/[0.02] transition-colors ${!user.active ? 'opacity-50' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="relative shrink-0">
                                  <Avatar className="h-9 w-9">
                                    <AvatarImage src={user.image || undefined} />
                                    <AvatarFallback className="text-xs font-medium"
                                      style={{ backgroundColor: user.color + '33', color: user.color }}>
                                      {initials(user.name, user.email)}
                                    </AvatarFallback>
                                  </Avatar>
                                  {!user.active && (
                                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border-2 border-[#0e0e14]" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-white truncate">{user.name || '—'}</p>
                                  <p className="text-xs text-white/40 truncate">{user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium w-fit ${roleColorMap[user.role] || ''}`}>
                                  {getRoleLabel(user.role)}
                                </span>
                                {user.customRole && (
                                  <span
                                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium w-fit"
                                    style={{
                                      backgroundColor: user.customRole.color + '22',
                                      color: user.customRole.color,
                                    }}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: user.customRole.color }} />
                                    {user.customRole.label}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top">
                              {user.role === 'CLIENT' && user.lifecycleStatus ? (
                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                                    lifecycleBadgeMap[user.lifecycleStatus]?.className
                                    ?? 'bg-white/[0.06] text-white/50 border border-white/[0.08]'
                                  }`}
                                >
                                  {lifecycleBadgeMap[user.lifecycleStatus]?.label ?? user.lifecycleStatus}
                                </span>
                              ) : (
                                <span className="text-xs text-white/25">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              <span className="text-xs text-white/40">{fmtDate(user.createdAt)}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1 flex-wrap">
                                {user.role === 'CLIENT' && user.lifecycleStatus === 'PROSPECT' && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-[10px] border-emerald-500/35 text-emerald-400 hover:bg-emerald-500/10 shrink-0"
                                    disabled={activatingUser === user.id}
                                    onClick={() => void handleActivateClient(user)}
                                  >
                                    {activatingUser === user.id ? '…' : 'Activar'}
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon"
                                  className="h-7 w-7 text-white/30 hover:text-white hover:bg-white/[0.06]"
                                  title={user.active ? 'Desactivar' : 'Activar'}
                                  disabled={togglingUser === user.id}
                                  onClick={() => handleToggleActive(user)}>
                                  {user.active
                                    ? <ToggleRight className="h-4 w-4 text-green-400" />
                                    : <ToggleLeft  className="h-4 w-4 text-red-400" />}
                                </Button>
                                <Button variant="ghost" size="icon"
                                  className="h-7 w-7 text-white/30 hover:text-white hover:bg-white/[0.06]"
                                  onClick={() => { setEditingUser(user); setUserDialog(true); }}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon"
                                  className="h-7 w-7 text-white/30 hover:text-red-400 hover:bg-red-400/10"
                                  onClick={() => setDeleteUser(user)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        )}

        {/* ── Appointments tab ──────────────────────────────────────────────── */}
        {isAdmin && (
          <TabsContent value="appointments" className="mt-4 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              {(['all', 'pending', 'confirmed', 'cancelled'] as const).map((f) => (
                <button key={f}
                  onClick={() => { setApptFilter(f); fetchAppointments(f); }}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    apptFilter === f ? 'bg-brand text-white' : 'bg-white/[0.04] text-white/50 hover:text-white hover:bg-white/[0.08]'
                  }`}>
                  {f === 'all' ? 'Todas' : apptStatusMap[f]?.label ?? f}
                </button>
              ))}
              <Button variant="outline" size="icon" onClick={() => fetchAppointments(apptFilter)}
                className="ml-auto border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.06] h-7 w-7">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="glass-card rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Contacto</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider hidden sm:table-cell">Fecha</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider hidden lg:table-cell">Notas</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {loadingAppts
                      ? Array.from({ length: 4 }).map((_, i) => (
                          <tr key={i}>
                            <td className="px-4 py-3"><div className="space-y-1.5"><Skeleton className="h-3.5 w-28" /><Skeleton className="h-3 w-36" /></div></td>
                            <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-3 w-24" /></td>
                            <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-3 w-40" /></td>
                            <td className="px-4 py-3"><Skeleton className="h-8 w-36" /></td>
                          </tr>
                        ))
                      : appointments.length === 0
                      ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-12 text-center text-sm text-white/30">
                              No hay citas {apptFilter !== 'all' ? `con estado "${apptStatusMap[apptFilter]?.label}"` : ''}
                            </td>
                          </tr>
                        )
                      : appointments.map((appt) => {
                          const st = apptStatusMap[appt.status] ?? apptStatusMap.pending;
                          return (
                            <tr key={appt.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-4 py-3">
                                <p className="font-medium text-white">{appt.name}</p>
                                <p className="text-xs text-white/40">{appt.email}</p>
                                {appt.phone && <p className="text-xs text-white/30">{appt.phone}</p>}
                              </td>
                              <td className="px-4 py-3 hidden sm:table-cell">
                                <span className="text-xs text-white/60">
                                  {new Date(appt.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                              </td>
                              <td className="px-4 py-3 hidden lg:table-cell">
                                <p className="text-xs text-white/40 max-w-xs truncate">{appt.notes || '—'}</p>
                              </td>
                              <td className="px-4 py-3">
                                <Select value={appt.status} onValueChange={(val) => handleApptStatus(appt.id, val)} disabled={updatingAppt === appt.id}>
                                  <SelectTrigger className="w-36 h-8 bg-white/[0.04] border-white/[0.08] text-white text-xs focus:ring-brand">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${st.color}`}>
                                        {st.icon}{st.label}
                                      </span>
                                    </div>
                                  </SelectTrigger>
                                  <SelectContent className="bg-[#15151c] border-white/[0.08] text-white">
                                    {Object.entries(apptStatusMap).map(([key, val]) => (
                                      <SelectItem key={key} value={key} className="text-sm focus:bg-white/[0.06]">
                                        <div className="flex items-center gap-1.5">{val.icon}{val.label}</div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                            </tr>
                          );
                        })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        )}

        {/* ── Tasks tab (sustituye actividades) ───────────────────────────────── */}
        <TabsContent value="tasks" className="mt-4 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            {(['all', 'pending', 'in_progress', 'completed'] as const).map((f) => (
              <button key={f}
                type="button"
                onClick={() => { setTaskFilter(f); fetchTasks(f); }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  taskFilter === f ? 'bg-brand text-white' : 'bg-white/[0.04] text-white/50 hover:text-white hover:bg-white/[0.08]'
                }`}>
                {f === 'all' ? 'Todas' : (statusLabels[f] ?? f)}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => fetchTasks(taskFilter)}
                className="border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.06] h-7 w-7">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Button asChild size="sm" className="bg-brand hover:bg-brand-dark text-white gap-1.5 h-7 text-xs px-3">
                <Link href="/dashboard/tasks?action=create">
                  <Plus className="h-3.5 w-3.5" />Nueva tarea
                </Link>
              </Button>
            </div>
          </div>

          <div className="glass-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Tarea</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider hidden sm:table-cell">Vence</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider hidden md:table-cell">Asignado</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {loadingTasks
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i}>
                          <td className="px-4 py-3"><div className="space-y-1.5"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-24" /></div></td>
                          <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-3 w-28" /></td>
                          <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-3 w-24" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-8 w-36" /></td>
                        </tr>
                      ))
                    : tasks.length === 0
                    ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-12 text-center text-sm text-white/30">
                            No hay tareas {taskFilter !== 'all' ? `con estado "${statusLabels[taskFilter] ?? taskFilter}"` : ''}
                          </td>
                        </tr>
                      )
                    : tasks.map((tk) => (
                        <tr key={tk.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-white truncate max-w-[200px]">{tk.title}</p>
                            {tk.description && (
                              <p className="text-xs text-white/35 truncate max-w-[200px]">{tk.description}</p>
                            )}
                            <span className={`mt-1 inline-flex text-[10px] font-medium ${priorityColors[tk.priority] || 'text-white/40'}`}>
                              {priorityLabels[tk.priority] || tk.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className="text-xs text-white/50">
                              {tk.dueDate ? fmtDate(tk.dueDate) : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            {tk.assignedUser ? (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={tk.assignedUser.image || undefined} />
                                  <AvatarFallback className="text-[9px] font-medium"
                                    style={{ backgroundColor: (tk.assignedUser.color || '#7c3aed') + '33', color: tk.assignedUser.color || '#7c3aed' }}>
                                    {initials(tk.assignedUser.name, tk.assignedUser.email)}
                                  </AvatarFallback>
                                </Avatar>
                                <p className="text-xs text-white/60 truncate max-w-[120px]">
                                  {tk.assignedUser.name || tk.assignedUser.email}
                                </p>
                              </div>
                            ) : (
                              <span className="text-xs text-white/25">Sin asignar</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Select
                              value={tk.status}
                              onValueChange={(val) => handleTaskStatusChange(tk.id, val)}
                              disabled={updatingTask === tk.id}
                            >
                              <SelectTrigger className="w-40 h-8 bg-white/[0.04] border-white/[0.08] text-white text-xs focus:ring-brand">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[tk.status] || 'status-pending'}`}>
                                  {statusLabels[tk.status] || tk.status}
                                </span>
                              </SelectTrigger>
                              <SelectContent className="bg-[#15151c] border-white/[0.08] text-white">
                                {(['pending', 'in_progress', 'completed'] as const).map((s) => (
                                  <SelectItem key={s} value={s} className="text-sm focus:bg-white/[0.06]">
                                    {statusLabels[s]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-white/35">
            Gestión detallada (multi-asignación, cliente, eliminar): ir a{' '}
            <Link href="/dashboard/tasks" className="text-brand-light hover:underline">Tareas</Link>.
          </p>
        </TabsContent>

        {/* ── Roles tab ─────────────────────────────────────────────────────── */}
        {isAdmin && (
          <TabsContent value="roles" className="mt-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-white/50">
                Crea roles personalizados para tu equipo con permisos específicos por módulo.
              </p>
              <Button
                size="sm"
                onClick={() => { setEditingRole(null); setRoleDialog(true); }}
                className="bg-brand hover:bg-brand-dark text-white gap-1.5"
              >
                <Plus className="h-4 w-4" />Nuevo Rol
              </Button>
            </div>

            {loadingRoles ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="glass-card rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-white/[0.06] animate-pulse" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-4 w-24 rounded bg-white/[0.06] animate-pulse" />
                        <div className="h-3 w-16 rounded bg-white/[0.06] animate-pulse" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : customRoles.length === 0 ? (
              <div className="glass-card rounded-xl flex flex-col items-center justify-center py-16 text-center gap-4">
                <div className="w-14 h-14 rounded-full bg-brand/10 flex items-center justify-center">
                  <Tags className="w-6 h-6 text-brand-light/60" />
                </div>
                <div>
                  <p className="text-white/60 font-medium">Sin roles personalizados</p>
                  <p className="text-white/30 text-sm mt-1">Crea roles como Fotógrafo, Editor Video, Community Manager…</p>
                </div>
                <Button
                  onClick={() => { setEditingRole(null); setRoleDialog(true); }}
                  className="bg-brand hover:bg-brand-dark text-white gap-2"
                >
                  <Plus className="w-4 h-4" />Crear primer rol
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {customRoles.map((cr) => {
                  const activePerms = ALL_PERMISSIONS.filter(({ key }) => cr.permissions?.[key]);
                  return (
                    <div key={cr.id} className="glass-card rounded-xl p-4 hover:bg-white/[0.03] transition-colors group">
                      <div className="flex items-start gap-3 mb-3">
                        <div
                          className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: cr.color + '22' }}
                        >
                          <Tags className="h-4 w-4" style={{ color: cr.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: cr.color }}
                            />
                            <p className="font-semibold text-white text-sm truncate">{cr.label}</p>
                          </div>
                          <p className="text-xs text-white/35 font-mono mt-0.5">{cr.name}</p>
                        </div>
                      </div>

                      {cr.description && (
                        <p className="text-xs text-white/40 mb-3 line-clamp-2">{cr.description}</p>
                      )}

                      {/* Permission chips */}
                      <div className="flex flex-wrap gap-1 mb-4">
                        {activePerms.length === 0 ? (
                          <span className="text-[10px] text-white/25 flex items-center gap-1">
                            <Lock className="h-3 w-3" />Sin permisos asignados
                          </span>
                        ) : (
                          activePerms.slice(0, 4).map(({ key, label }) => (
                            <span
                              key={key}
                              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: cr.color + '22', color: cr.color }}
                            >
                              {label}
                            </span>
                          ))
                        )}
                        {activePerms.length > 4 && (
                          <span className="text-[10px] text-white/30">+{activePerms.length - 4} más</span>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-white/30 hover:text-white hover:bg-white/[0.06]"
                          onClick={() => { setEditingRole(cr); setRoleDialog(true); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-white/30 hover:text-red-400 hover:bg-red-400/10"
                          onClick={() => setDeleteRole(cr)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        )}

        {/* ── CMS tab ───────────────────────────────────────────────────────── */}
        {isAdmin && (
          <TabsContent value="cms" className="mt-4">
            <CMSContent />
          </TabsContent>
        )}
      </Tabs>

      {/* User create/edit dialog */}
      <UserDialog
        open={userDialog}
        onOpenChange={setUserDialog}
        user={editingUser}
        onSaved={() => void fetchUsers(search, userListView)}
      />

      {/* Delete user confirm */}
      <AlertDialog open={!!deleteUser} onOpenChange={(o) => !o && setDeleteUser(null)}>
        <AlertDialogContent className="bg-[#15151c] border-white/[0.06] text-white">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-red-400/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <AlertDialogTitle className="text-white">Eliminar Usuario</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-white/50">
              ¿Eliminar a <strong className="text-white/80">{deleteUser?.name || deleteUser?.email}</strong>?
              Todos sus datos serán eliminados. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/[0.04] border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.06]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={deletingUser}
              className="bg-red-500 hover:bg-red-600 text-white">
              {deletingUser ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Custom role dialog */}
      <CustomRoleDialog
        open={roleDialog}
        onOpenChange={setRoleDialog}
        role={editingRole}
        onSaved={fetchRoles}
      />

      {/* Delete custom role confirm */}
      <AlertDialog open={!!deleteRole} onOpenChange={(o) => !o && setDeleteRole(null)}>
        <AlertDialogContent className="bg-[#15151c] border-white/[0.06] text-white">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-red-400/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <AlertDialogTitle className="text-white">Eliminar Rol</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-white/50">
              ¿Eliminar el rol &ldquo;{deleteRole?.label}&rdquo;? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/[0.04] border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.06]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRole} disabled={deletingRole}
              className="bg-red-500 hover:bg-red-600 text-white">
              {deletingRole ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
