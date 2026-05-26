'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import {
  Plus, Search, Mail, Building2, Phone,
  UserCheck, MoreHorizontal, X, Pencil, Trash2, Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import ClientForm from '@/components/dashboard/ClientForm';
import type { Client } from '@/lib/types';

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  active:   { label: 'Activo',    color: 'text-emerald-400', dot: 'bg-emerald-400' },
  prospect: { label: 'Prospecto', color: 'text-amber-400',   dot: 'bg-amber-400'   },
  inactive: { label: 'Inactivo',  color: 'text-white/30',    dot: 'bg-white/20'    },
  lead:     { label: 'Lead',      color: 'text-purple-400',  dot: 'bg-purple-400'  },
};

const TABS = [
  { key: 'all',      label: 'Todos',      color: '#a78bfa' },
  { key: 'active',   label: 'Activos',    color: '#34d399' },
  { key: 'prospect', label: 'Prospectos', color: '#fbbf24' },
  { key: 'inactive', label: 'Inactivos',  color: '#94a3b8' },
] as const;
type TabKey = typeof TABS[number]['key'];

function ClientDetail({ client, onClose, onEdit, onDelete, isAdmin }: {
  client: Client; onClose: () => void; onEdit: (c: Client) => void;
  onDelete: (c: Client) => void; isAdmin: boolean;
}) {
  const [taskCount, setTaskCount] = useState<number | null>(null);
  const sm = STATUS_META[client.status] ?? STATUS_META.inactive;

  useEffect(() => {
    fetch('/api/tasks/count?clientId=' + client.id)
      .then(r => r.json())
      .then(d => setTaskCount(d.count ?? 0))
      .catch(() => setTaskCount(0));
  }, [client.id]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="relative h-full w-full max-w-sm bg-[#0f0f13] border-l border-white/[0.06] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <span className="text-sm font-medium text-white/60">Detalle de cuenta</span>
          <div className="flex items-center gap-1">
            <button onClick={() => onEdit(client)} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors">
              <Pencil className="w-4 h-4" />
            </button>
            {isAdmin && (
              <button onClick={() => onDelete(client)} className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-5 py-5 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-brand/10 flex items-center justify-center text-lg font-semibold text-brand-light shrink-0">
              {initials(client.name)}
            </div>
            <div className="min-w-0">
              <p className="text-base font-medium text-white truncate">{client.name}</p>
              {(client as any).company && <p className="text-sm text-white/40 truncate">{(client as any).company}</p>}
              <div className="flex items-center gap-1.5 mt-1">
                <span className={"w-1.5 h-1.5 rounded-full " + sm.dot} />
                <span className={"text-xs " + sm.color}>{sm.label}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-white/20">Informacion</p>
            {[
              { icon: Mail,      label: 'Email',    value: client.email },
              { icon: Phone,     label: 'Telefono', value: (client as any).phone || 'No registrado' },
              { icon: Building2, label: 'Empresa',  value: (client as any).company || 'No registrada' },
              { icon: Calendar,  label: 'Alta',     value: new Date((client as any).createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) },
            ].map(row => (
              <div key={row.label} className="flex items-start gap-3">
                <row.icon className="w-3.5 h-3.5 text-white/25 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-white/25">{row.label}</p>
                  <p className="text-xs text-white/70 truncate">{row.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card rounded-lg px-3 py-2.5">
              <p className="text-[10px] text-white/25 mb-1">Tareas activas</p>
              <p className="text-xl font-medium text-cyan-400">{taskCount === null ? '...' : taskCount}</p>
            </div>
            <div className="glass-card rounded-lg px-3 py-2.5">
              <p className="text-[10px] text-white/25 mb-1">Equipo asignado</p>
              <p className="text-xl font-medium text-purple-400">{((client as any).assignedUsers ?? []).length}</p>
            </div>
          </div>

          {(client as any).assignedManager && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/20 mb-2">Project Manager</p>
              <div className="flex items-center gap-3 glass-card rounded-lg px-3 py-2.5">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={(client as any).assignedManager.image} />
                  <AvatarFallback style={{ backgroundColor: ((client as any).assignedManager.color || '#7c3aed') + '33', color: (client as any).assignedManager.color || '#a78bfa' }} className="text-xs font-semibold">
                    {initials((client as any).assignedManager.name || (client as any).assignedManager.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm text-white/80 truncate">{(client as any).assignedManager.name}</p>
                  <p className="text-[11px] text-white/30 truncate">{(client as any).assignedManager.email}</p>
                </div>
              </div>
            </div>
          )}

          {((client as any).assignedUsers ?? []).length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/20 mb-2">Equipo asignado</p>
              <div className="space-y-2">
                {((client as any).assignedUsers ?? []).map((u: any) => (
                  <div key={u.id} className="flex items-center gap-3 glass-card rounded-lg px-3 py-2">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={u.image} />
                      <AvatarFallback style={{ backgroundColor: (u.color || '#7c3aed') + '33', color: u.color || '#a78bfa' }} className="text-[10px] font-semibold">
                        {initials(u.name || u.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs text-white/70 truncate">{u.name}</p>
                      <p className="text-[10px] text-white/30 truncate">{u.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ClientCard({ client, onClick, onPortal }: { client: Client; onClick: () => void; onPortal: () => void }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const sm = STATUS_META[client.status] ?? STATUS_META.inactive;
  const assignedUsers = (client as any).assignedUsers ?? [];
  const pm = (client as any).assignedManager;
  const color = (client as any).color || '#7c3aed';
  const pmColor = pm?.color || '#7c3aed';
  const pmIni = pm ? initials(pm.name || pm.email) : '';
  const activeTasks = (client as any).activeTasks ?? 0;
  const progress = (client as any).progress ?? 0;
  const progressColor = progress >= 75 ? '#10b981' : progress >= 40 ? '#f59e0b' : '#ef4444';
  const statusStyle: Record<string, { bg: string; text: string; border: string }> = {
    active:   { bg: 'rgba(34,197,94,0.12)',   text: '#4ade80', border: 'rgba(34,197,94,0.20)'   },
    prospect: { bg: 'rgba(234,179,8,0.12)',   text: '#facc15', border: 'rgba(234,179,8,0.20)'   },
    inactive: { bg: 'rgba(148,163,184,0.10)', text: '#94a3b8', border: 'rgba(148,163,184,0.15)' },
  };
  const st = statusStyle[client.status] || statusStyle['inactive'];
  return (
    <motion.div
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, borderColor: "rgba(124,58,237,0.25)" }}
      transition={{ duration: 0.2 }}
      className="relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] cursor-pointer transition-colors"
      style={{ background: "linear-gradient(135deg, #080808 0%, #0e0e14 60%, #0a0a0f 100%)" }}
    >
      {/* Glow */}
      <div className="pointer-events-none absolute bottom-0 right-0 h-[120px] w-[150px] blur-2xl"
        style={{ background: "radial-gradient(ellipse at center, rgba(88,28,220,0.18), transparent 70%)" }} />
      {/* Banner */}
      <div className="relative h-14 w-full" style={{ background: "linear-gradient(180deg, #0e0e14 0%, #130820 100%)" }} />
      {/* Avatar + equipo */}
      <div className="relative z-10 -mt-5 px-3 flex items-end justify-between">
        <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full border-2 border-[#0a0a0f] text-xs font-semibold"
          style={{ backgroundColor: color + "25", color }}>
          {initials(client.name)}
        </div>
        {/* Equipo stack */}
        {assignedUsers.length > 0 && (
          <div className="flex -space-x-1.5 mb-0.5">
            {assignedUsers.slice(0, 4).map((u: any, i: number) => (
              <div key={i} className="flex h-6 w-6 items-center justify-center rounded-full border border-[#0a0a0f] text-[8px] font-semibold overflow-hidden"
                style={{ backgroundColor: (u.color || "#7c3aed") + "33", color: u.color || "#a78bfa" }}>
                {u.image ? <img src={u.image} alt={u.name} className="w-full h-full object-cover" /> : initials(u.name || u.email)}
              </div>
            ))}
            {assignedUsers.length > 4 && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[#0a0a0f] bg-white/[0.08] text-[8px] text-white/50">
                +{assignedUsers.length - 4}
              </div>
            )}
          </div>
        )}
      </div>
      {/* Content */}
      <div className="relative z-10 flex flex-1 flex-col px-3 pt-1.5 pb-3">
        <div className="mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-[13px] font-bold text-white/90 truncate">{client.name}</h3>
            <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium border"
              style={{ background: st.bg, color: st.text, borderColor: st.border }}>
              {sm.label}
            </span>
          </div>
          {(client as any).company && <p className="text-[11px] text-white/35 truncate">{(client as any).company}</p>}
          <p className="text-[10px] text-white/20 truncate mt-0.5">{client.email}</p>
        </div>
        {/* Stats */}
        <div className="mb-2 grid grid-cols-3 gap-1.5 rounded-lg bg-white/[0.03] p-2">
          {[
            { val: activeTasks, label: "tareas" },
            { val: assignedUsers.length, label: "equipo" },
            { val: 0, label: "vencidas" },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-[15px] font-semibold text-white/85">{s.val}</div>
              <div className="text-[9px] text-white/30">{s.label}</div>
            </div>
          ))}
        </div>
        {/* Progress */}
        <div className="mb-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[9px] text-white/40">Progreso</span>
            <span className="text-[9px] font-medium text-white/60">{progress}%</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: progressColor }} />
          </div>
        </div>
        {/* PM + menu */}
        <div className="mt-auto flex items-center justify-between">
          {pm ? (
            <div className="flex items-center gap-1.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-full overflow-hidden text-[8px] font-medium shrink-0"
                style={{ backgroundColor: pmColor + "33", color: pmColor }}>
                {pm.image ? <img src={pm.image} alt={pm.name} className="w-full h-full object-cover" /> : pmIni}
              </div>
              <span className="text-[10px] text-white/40 truncate max-w-[90px]">{pm.name}</span>
            </div>
          ) : <span className="text-[9px] text-white/20">Sin PM</span>}
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setMenuOpen(v => !v)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/60">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute bottom-full right-0 z-20 mb-1 w-36 overflow-hidden rounded-lg border border-white/[0.08] bg-[#141418] shadow-xl"
                  >
                    <div className="py-1">
                      {["Ver portal", "Editar", "Asignar PM"].map(item => (
                        <button key={item} onClick={() => { setMenuOpen(false); item === "Ver portal" ? onPortal() : onClick(); }}
                          className="w-full px-3 py-2 text-left text-[12px] text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white/90">
                          {item}
                        </button>
                      ))}
                      <div className="my-1 border-t border-white/[0.06]" />
                      <button onClick={() => setMenuOpen(false)}
                        className="w-full px-3 py-2 text-left text-[12px] text-red-400 transition-colors hover:bg-red-500/10">
                        Archivar
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}



export default function ClientsPage() {
  const { data: session } = useSession();
  const role      = session?.user?.role as string | undefined;
  const isAdmin   = role === 'ADMIN';
  const isManager = ['ADMIN', 'PROJECT_MANAGER'].includes(role ?? '');
  const label     = isAdmin ? 'Clientes' : 'Cuentas';

  const [clients,       setClients]       = useState<Client[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [activeTab,     setActiveTab]     = useState<TabKey>('all');
  const [formOpen,      setFormOpen]      = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<Client | null>(null);
  const [deleting,      setDeleting]      = useState(false);
  const router = useRouter();
  const [selected,      setSelected]      = useState<Client | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch('/api/clients?' + params.toString());
      if (res.ok) { const data = await res.json(); setClients(data.clients || []); }
    } catch { toast.error('Error al cargar'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => fetchClients(), 300);
    return () => clearTimeout(t);
  }, [fetchClients]);

  const filtered = useMemo(() => {
    if (activeTab === 'all') return clients;
    return clients.filter(c => c.status === activeTab);
  }, [clients, activeTab]);

  const counts = useMemo(() => ({
    all:      clients.length,
    active:   clients.filter(c => c.status === 'active').length,
    prospect: clients.filter(c => c.status === 'prospect').length,
    inactive: clients.filter(c => c.status === 'inactive').length,
  }), [clients]);

  const handleEdit = (client: Client) => { setSelected(null); setEditingClient(client); setFormOpen(true); };
  const handleCreate = () => { setEditingClient(null); setFormOpen(true); };
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/clients?id=' + deleteTarget.id, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success('Eliminado');
      setDeleteTarget(null); setSelected(null); fetchClients();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-white/30 uppercase tracking-widest mb-1">{label}</p>
          <h1 className="text-xl font-medium text-white">{isAdmin ? 'Gestion de clientes' : 'Mis cuentas'}</h1>
          <p className="text-white/40 text-sm mt-0.5">{clients.length} {label.toLowerCase()} registradas</p>
        </div>
        {isManager && (
          <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-medium transition-colors self-start">
            <Plus className="w-4 h-4" />{isAdmin ? 'Nuevo cliente' : 'Nueva cuenta'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',      value: clients.length,                                                    color: '#a78bfa' },
          { label: 'Activos',    value: counts.active,                                                     color: '#34d399' },
          { label: 'Prospectos', value: counts.prospect,                                                   color: '#fbbf24' },
          { label: 'Con equipo', value: clients.filter(c => ((c as any).assignedUsers?.length ?? 0) > 0).length, color: '#38bdf8' },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-xl px-4 py-3">
            <p className="text-[11px] text-white/30 uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-2xl font-medium" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email o empresa..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 transition-colors" />
        </div>
        <div className="flex gap-1 bg-white/[0.03] rounded-lg p-0.5 border border-white/[0.06]">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={"px-3 py-1.5 rounded-md text-xs font-medium transition-all " + (activeTab === tab.key ? 'bg-white/[0.08] text-white' : 'text-white/30 hover:text-white/60')}>
              {tab.label}
              <span className="ml-1.5 text-[10px] opacity-60">{counts[tab.key as keyof typeof counts] ?? clients.length}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="w-12 h-12 text-white/10 mb-3" />
          <p className="text-white/40 text-sm">{search ? 'Sin resultados' : 'No hay ' + label.toLowerCase() + ' en esta categoria'}</p>
          {activeTab === 'all' && !search && isManager && (
            <button onClick={handleCreate} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg border border-white/[0.08] text-white/40 hover:text-white hover:border-white/20 text-sm transition-colors">
              <Plus className="w-4 h-4" />Crear {isAdmin ? 'cliente' : 'cuenta'}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(client => (
            <ClientCard key={client.id} client={client} onClick={() => setSelected(client)} onPortal={() => router.push('/dashboard/client-portal?clientId=' + client.id)} />
          ))}
        </div>
      )}

      {selected && (
        <ClientDetail client={selected} onClose={() => setSelected(null)}
          onEdit={handleEdit} onDelete={c => { setSelected(null); setDeleteTarget(c); }} isAdmin={isAdmin} />
      )}

      <ClientForm open={formOpen} onOpenChange={setFormOpen} client={editingClient}
        isAdmin={isManager} onSuccess={() => { setEditingClient(null); fetchClients(); }} />

      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-[#15151c] border-white/[0.06] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/40">
              Esta accion no se puede deshacer.{' '}
              <span className="text-white/70 font-medium">{deleteTarget?.name}</span> sera eliminado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/[0.1] text-white/70 hover:text-white hover:bg-white/[0.06]">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-500 hover:bg-red-600 text-white">
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
