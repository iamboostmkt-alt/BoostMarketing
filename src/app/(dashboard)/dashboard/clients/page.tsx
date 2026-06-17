'use client';
import { toasts } from '@/lib/toast-helpers';
import React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { bus, RT_EVENTS } from '@/lib/event-bus';
import {
  Plus, Search, Mail, Building2, Phone,
  UserCheck, MoreHorizontal, X, Pencil, Trash2, Calendar,
  Send, AlertCircle, Link2, ExternalLink, Instagram, Youtube,
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


// ─── Links esenciales del cliente ─────────────────────────────────────────────
const LINK_PRESETS = [
  { icon: 'drive',    label: 'Drive',     placeholder: 'https://drive.google.com/...' },
  { icon: 'instagram',label: 'Instagram', placeholder: 'https://instagram.com/...' },
  { icon: 'facebook', label: 'Facebook',  placeholder: 'https://facebook.com/...' },
  { icon: 'youtube',  label: 'YouTube',   placeholder: 'https://youtube.com/...' },
  { icon: 'tiktok',   label: 'TikTok',    placeholder: 'https://tiktok.com/@...' },
  { icon: 'web',      label: 'Sitio web', placeholder: 'https://...' },
  { icon: 'link',     label: 'Otro',      placeholder: 'https://...' },
];

// Íconos SVG monocromáticos para los links del cliente
function LinkIcon({ type, size = 13 }: { type: string; size?: number }) {
  const s = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none' as const, stroke: 'currentColor', strokeWidth: 1.75 };
  if (type === 'drive')
    return <svg {...s}><path d="M22 16.92l-6.56-11.36a2 2 0 0 0-3.48 0L5.4 16.92A2 2 0 0 0 7.14 20h9.72a2 2 0 0 0 1.74-3.08z"/><path d="m2 16.92 6.56-11.36"/><path d="m22 16.92H2"/></svg>;
  if (type === 'instagram')
    return <svg {...s}><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>;
  if (type === 'facebook')
    return <svg {...s}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>;
  if (type === 'youtube')
    return <svg {...s}><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>;
  if (type === 'tiktok')
    return <svg {...s}><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>;
  if (type === 'web')
    return <svg {...s}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
  return <svg {...s}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
}

function ClientLinksSection({ client, isAdmin, onSaved }: { client: any; isAdmin: boolean; onSaved: () => void }) {
  const [links, setLinks] = React.useState<{label:string;url:string;icon:string}[]>(
    Array.isArray(client.links) ? client.links : []
  );
  const [adding, setAdding] = React.useState(false);
  const [newLabel, setNewLabel] = React.useState('');
  const [newUrl, setNewUrl]     = React.useState('');
  const [newIcon, setNewIcon]   = React.useState('🔗');
  const [saving, setSaving]     = React.useState(false);

  async function saveLinks(updated: typeof links) {
    setSaving(true);
    try {
      await fetch('/api/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: client.id, links: updated }),
      });
      setLinks(updated);
      onSaved();
    } catch { /* silencioso */ }
    finally { setSaving(false); }
  }

  function addLink() {
    if (!newUrl.trim()) return;
    const url = newUrl.startsWith('http') ? newUrl.trim() : 'https://' + newUrl.trim();
    const preset = LINK_PRESETS.find(p => p.label === newLabel);
    const updated = [...links, { label: newLabel || 'Link', url, icon: newIcon }];
    saveLinks(updated);
    setNewLabel(''); setNewUrl(''); setNewIcon('🔗'); setAdding(false);
  }

  function removeLink(i: number) {
    saveLinks(links.filter((_, j) => j !== i));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-widest text-white/20">Links esenciales</p>
        {isAdmin && !adding && (
          <button onClick={() => setAdding(true)}
            className="text-[11px] text-violet-400/60 hover:text-violet-400 transition-colors">
            + Agregar
          </button>
        )}
      </div>

      {/* Lista de links guardados */}
      <div className="space-y-1.5">
        {links.map((l, i) => (
          <div key={i} className="flex items-center gap-2 glass-card rounded-lg px-3 py-2 group">
            <span className="text-[var(--wl-text-muted)] shrink-0"><LinkIcon type={l.icon || 'link'} /></span>
            <a href={l.url} target="_blank" rel="noopener noreferrer"
              className="flex-1 min-w-0 text-xs text-white/65 hover:text-white/90 transition-colors truncate">
              {l.label}
            </a>
            <a href={l.url} target="_blank" rel="noopener noreferrer"
              className="opacity-0 group-hover:opacity-100 transition-opacity">
              <ExternalLink className="w-3 h-3 text-white/30 hover:text-[var(--wl-text-secondary)]" />
            </a>
            {isAdmin && (
              <button onClick={() => removeLink(i)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-white/25 hover:text-red-400">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
        {links.length === 0 && !adding && (
          <p className="text-[11px] text-white/15 text-center py-2">Sin links agregados</p>
        )}
      </div>

      {/* Form agregar link */}
      {adding && (
        <div className="mt-2 space-y-2 glass-card rounded-lg px-3 py-3">
          {/* Presets rápidos */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {LINK_PRESETS.map(p => (
              <button key={p.label} onClick={() => { setNewLabel(p.label); setNewIcon(p.icon); }}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-colors ${
                  newLabel === p.label ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40' : 'bg-white/[0.04] text-[var(--wl-text-muted)] hover:text-[var(--wl-text-secondary)]'
                }`}>
                <span className="opacity-60"><LinkIcon type={p.icon} size={11} /></span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
          <input value={newUrl} onChange={e => setNewUrl(e.target.value)}
            placeholder={LINK_PRESETS.find(p => p.label === newLabel)?.placeholder || 'https://...'}
            className="w-full rounded-lg bg-white/[0.04] border border-[var(--wl-border)] px-3 py-1.5 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500/50" />
          <div className="flex gap-2">
            <button onClick={addLink} disabled={!newUrl.trim() || saving}
              className="flex-1 py-1.5 rounded-lg bg-violet-600 text-xs text-white font-medium hover:bg-violet-500 transition-colors disabled:opacity-40">
              {saving ? '...' : 'Guardar'}
            </button>
            <button onClick={() => { setAdding(false); setNewLabel(''); setNewUrl(''); }}
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] text-xs text-white/50 hover:text-[var(--wl-text-secondary)] transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
      <div className="relative h-full w-full max-w-sm bg-[#0f0f13] border-l border-[var(--wl-border)] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--wl-border)]">
          <span className="text-sm font-medium text-[var(--wl-text-secondary)]">Detalle de cuenta</span>
          <div className="flex items-center gap-1">
            <button onClick={() => onEdit(client)} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-[var(--wl-hover)] transition-colors">
              <Pencil className="w-4 h-4" />
            </button>
            {isAdmin && (
              <button onClick={() => onDelete(client)} className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-[var(--wl-hover)] transition-colors">
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
              {(client as any).company && <p className="text-sm text-[var(--wl-text-muted)] truncate">{(client as any).company}</p>}
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
                  <p className="text-xs text-[var(--wl-text-secondary)] truncate">{row.value}</p>
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
                  <p className="text-sm text-[var(--wl-text-secondary)] truncate">{(client as any).assignedManager.name}</p>
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
                      <p className="text-xs text-[var(--wl-text-secondary)] truncate">{u.name}</p>
                      <p className="text-[10px] text-white/30 truncate">{u.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Links esenciales del cliente */}
          <ClientLinksSection
            client={client}
            isAdmin={isAdmin}
            onSaved={() => {}}
          />
        </div>
      </div>
    </div>
  );
}

  function ClientCard({ client, onClick, onPortal, onResendInvite, onReportIssue, isAdmin }: {
  client: Client; onClick: () => void; onPortal: () => void;
  onResendInvite?: () => void; onReportIssue?: () => void; isAdmin?: boolean;
}) {
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
      className="relative flex flex-col overflow-hidden rounded-2xl border border-[var(--wl-border)] cursor-pointer transition-colors"
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
            {/* Badge portal status */}
            {(client as any).portalStatus === 'active' && (
              <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium border"
                style={{ background: 'rgba(34,197,94,0.10)', color: '#4ade80', borderColor: 'rgba(34,197,94,0.18)' }}>
                ● Portal activo
              </span>
            )}
            {(client as any).portalStatus === 'invited' && (
              <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium border"
                style={{ background: 'rgba(234,179,8,0.10)', color: '#fbbf24', borderColor: 'rgba(234,179,8,0.18)' }}
                title={(client as any).invitedAt ? `Enviada ${new Date((client as any).invitedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}` : ''}>
                ✉ Invitación enviada{(client as any).invitedAt ? ` · ${Math.floor((Date.now() - new Date((client as any).invitedAt).getTime()) / 86400000)}d` : ''}
              </span>
            )}
            {(client as any).portalStatus === 'pending' && (
              <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium border"
                style={{ background: 'rgba(148,163,184,0.08)', color: '#94a3b8', borderColor: 'rgba(148,163,184,0.14)' }}>
                ⏳ Pendiente
              </span>
            )}
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
            <span className="text-[9px] text-[var(--wl-text-muted)]">Progreso</span>
            <span className="text-[9px] font-medium text-[var(--wl-text-secondary)]">{progress}%</span>
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
              <span className="text-[10px] text-[var(--wl-text-muted)] truncate max-w-[90px]">{pm.name}</span>
            </div>
          ) : <span className="text-[9px] text-white/20">Sin PM</span>}
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setMenuOpen(v => !v)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--wl-text-muted)] transition-colors hover:bg-[var(--wl-hover)] hover:text-[var(--wl-text-secondary)]">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute bottom-full right-0 z-20 mb-1 w-36 overflow-hidden rounded-lg border border-[var(--wl-border)] bg-[#141418] shadow-xl"
                  >
                    <div className="py-1">
                      <button onClick={() => { setMenuOpen(false); onPortal(); }}
                        className="w-full px-3 py-2 text-left text-[12px] text-[var(--wl-text-secondary)] transition-colors hover:bg-[var(--wl-hover)] hover:text-white/90">
                        Ver portal
                      </button>
                      <button onClick={() => { setMenuOpen(false); onClick(); }}
                        className="w-full px-3 py-2 text-left text-[12px] text-[var(--wl-text-secondary)] transition-colors hover:bg-[var(--wl-hover)] hover:text-white/90">
                        Editar
                      </button>
                      <button onClick={() => { setMenuOpen(false); onClick(); }}
                        className="w-full px-3 py-2 text-left text-[12px] text-[var(--wl-text-secondary)] transition-colors hover:bg-[var(--wl-hover)] hover:text-white/90">
                        Asignar PM
                      </button>
                      {/* Reenviar invitación — solo si portalStatus NO es active */}
                      {(client as any).portalStatus !== 'active' && onResendInvite && (
                        <>
                          <div className="my-1 border-t border-[var(--wl-border)]" />
                          <button onClick={() => { setMenuOpen(false); onResendInvite(); }}
                            className="w-full px-3 py-2 text-left text-[12px] text-violet-400 transition-colors hover:bg-violet-500/10 flex items-center gap-2">
                            <Send className="w-3 h-3" /> Reenviar invitación
                          </button>
                        </>
                      )}
                      {/* Reportar problema — solo para PM (no ADMIN) */}
                      {!isAdmin && onReportIssue && (
                        <button onClick={() => { setMenuOpen(false); onReportIssue(); }}
                          className="w-full px-3 py-2 text-left text-[12px] text-amber-400 transition-colors hover:bg-amber-500/10 flex items-center gap-2">
                          <AlertCircle className="w-3 h-3" /> Reportar problema
                        </button>
                      )}
                      <div className="my-1 border-t border-[var(--wl-border)]" />
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
  const [clientsCursor, setClientsCursor] = useState<string | null>(null);
  const [clientsHasMore,setClientsHasMore]= useState(false);
  const [loadingMore,   setLoadingMore]   = useState(false);

  async function loadMoreClients() {
    if (!clientsCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch('/api/clients?cursor=' + clientsCursor + '&limit=50');
      if (res.ok) {
        const data = await res.json();
        setClients((prev: any[]) => [...prev, ...(data.clients || [])]);
        setClientsCursor(data.nextCursor || null);
        setClientsHasMore(data.hasMore || false);
      }
    } finally { setLoadingMore(false); }
  }
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
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
        setClientsCursor(data.nextCursor || null);
        setClientsHasMore(data.hasMore || false);
      }
    } catch { toast.error('Error al cargar'); }
    finally { setLoading(false); }
  }, [search]);

  // Auto-refresh cuando otro usuario activa su portal o se actualiza un cliente
  useEffect(() => {
    const unsub = bus.on(RT_EVENTS.CLIENT_UPDATED, () => { fetchClients(); });
    return () => unsub();
  }, [fetchClients]);

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
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-6 py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-white/30 uppercase tracking-widest mb-1">{label}</p>
          <h1 className="text-xl font-medium text-white">{isAdmin ? 'Gestion de clientes' : 'Mis cuentas'}</h1>
          <p className="text-[var(--wl-text-muted)] text-sm mt-0.5">{clients.length} {label.toLowerCase()} registradas</p>
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
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/[0.04] border border-[var(--wl-border)] text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 transition-colors" />
        </div>
        <div className="flex gap-1 bg-white/[0.03] rounded-lg p-0.5 border border-[var(--wl-border)]">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={"px-3 py-1.5 rounded-md text-xs font-medium transition-all " + (activeTab === tab.key ? 'bg-white/[0.08] text-white' : 'text-white/30 hover:text-[var(--wl-text-secondary)]')}>
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
          <p className="text-[var(--wl-text-muted)] text-sm">{search ? 'Sin resultados' : 'No hay ' + label.toLowerCase() + ' en esta categoria'}</p>
          {activeTab === 'all' && !search && isManager && (
            <button onClick={handleCreate} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--wl-border)] text-[var(--wl-text-muted)] hover:text-white hover:border-white/20 text-sm transition-colors">
              <Plus className="w-4 h-4" />Crear {isAdmin ? 'cliente' : 'cuenta'}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(client => (
            <ClientCard
                key={client.id}
                client={client}
                isAdmin={isAdmin}
                onClick={() => setSelected(client)}
                onPortal={() => router.push('/dashboard/client-portal?clientId=' + client.id)}
                onResendInvite={async () => {
                  try {
                    const res = await fetch('/api/clients/invite', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ clientId: client.id }),
                    });
                    if (res.ok) toasts.inviteSent(client.email || '');
                    else { const d = await res.json(); toast.error(d.error || 'Error al reenviar'); }
                  } catch { toast.error('Error de conexión'); }
                }}
                onReportIssue={!isAdmin ? async () => {
                  const issue = prompt('Describe el problema con el portal de ' + client.name + ':');
                  if (!issue?.trim()) return;
                  try {
                    const res = await fetch('/api/clients/report-issue', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ clientId: client.id, issue: issue.trim() }),
                    });
                    if (res.ok) toast.success('Reporte enviado al admin');
                    else toast.error('Error al enviar reporte');
                  } catch { toast.error('Error de conexión'); }
                } : undefined}
              />
          ))}
        </div>
      )}

      {/* Botón Cargar más */}
      {clientsHasMore && (
        <div className="flex justify-center pt-4">
          <button onClick={loadMoreClients} disabled={loadingMore}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--wl-border)] text-[13px] text-white/50 hover:text-white hover:bg-[var(--wl-hover)] transition-colors disabled:opacity-50">
            {loadingMore ? (
              <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>Cargando...</>
            ) : (
              <>Cargar más cuentas</>
            )}
          </button>
        </div>
      )}

      {selected && (
        <ClientDetail client={selected} onClose={() => setSelected(null)}
          onEdit={handleEdit} onDelete={c => { setSelected(null); setDeleteTarget(c); }} isAdmin={isAdmin} />
      )}

      <ClientForm open={formOpen} onOpenChange={setFormOpen} client={editingClient}
        isAdmin={isManager} onSuccess={() => { setEditingClient(null); fetchClients(); }} />

      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-[var(--wl-surface)] border-[var(--wl-border)] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--wl-text-muted)]">
              Esta accion no se puede deshacer.{' '}
              <span className="text-[var(--wl-text-secondary)] font-medium">{deleteTarget?.name}</span> sera eliminado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/[0.1] text-[var(--wl-text-secondary)] hover:text-white hover:bg-[var(--wl-hover)]">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-500 hover:bg-red-600 text-white">
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
