'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Search, Users, Shield, Briefcase, Palette,
  Megaphone, ShoppingBag, MoreHorizontal, ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { getRoleLabel } from '@/lib/roles';
import { InviteModal } from '@/components/dashboard/InviteModal';

interface ActiveTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: string;
  color: string;
  customRole?: { label: string; color: string } | null;
  activeTasks: ActiveTask[];
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

const ROLE_ORDER = ['ADMIN', 'PROJECT_MANAGER', 'DESIGNER', 'MARKETING', 'TEAM_MEMBER', 'SALES_REP'];

const ROLE_META: Record<string, { label: string; icon: any; color: string }> = {
  ADMIN:           { label: 'Administrador',   icon: Shield,      color: '#a78bfa' },
  PROJECT_MANAGER: { label: 'Project Manager', icon: Briefcase,   color: '#38bdf8' },
  DESIGNER:        { label: 'Diseño',          icon: Palette,     color: '#f472b6' },
  MARKETING:       { label: 'Marketing',       icon: Megaphone,   color: '#34d399' },
  TEAM_MEMBER:     { label: 'Equipo',          icon: Users,       color: '#94a3b8' },
  SALES_REP:       { label: 'Ventas',          icon: ShoppingBag, color: '#fb923c' },
};

const ROLE_VALUES = ['ADMIN','PROJECT_MANAGER','DESIGNER','MARKETING','TEAM_MEMBER','SALES_REP'] as const;

function RoleSelect({ value, onChange }: { value: string; onChange: (r: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function out(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    if (isOpen) document.addEventListener('mousedown', out);
    return () => document.removeEventListener('mousedown', out);
  }, [isOpen]);
  const meta = ROLE_META[value] ?? ROLE_META['TEAM_MEMBER'];
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(v => !v)}
        className="flex items-center gap-1 transition-all"
        style={{
          height: 26, padding: '0 10px', borderRadius: 20,
          background: isOpen ? 'rgba(124,58,237,0.08)' : '#1a1a1f',
          border: isOpen ? '1px solid rgba(124,58,237,0.40)' : '1px solid rgba(255,255,255,0.08)',
          fontSize: 11, fontWeight: 500,
          color: isOpen ? 'rgba(255,255,255,0.85)' : meta.color,
        }}
        onMouseEnter={e => { if (!isOpen) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; }}
        onMouseLeave={e => { if (!isOpen) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
      >
        <span>{meta.label}</span>
        <ChevronDown style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.25)', marginLeft: 4, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-1.5 overflow-hidden shadow-2xl"
            style={{ minWidth: 160, background: '#16161e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '4px 0' }}
          >
            {ROLE_VALUES.map(r => {
              const m = ROLE_META[r];
              const isSelected = r === value;
              return (
                <button
                  key={r}
                  onClick={() => { onChange(r); setIsOpen(false); }}
                  className="relative flex w-full items-center transition-colors"
                  style={{
                    padding: '7px 12px', fontSize: 12,
                    background: isSelected ? '#1a1a1a' : 'transparent',
                    color: isSelected ? '#a78bfa' : 'rgba(255,255,255,0.60)',
                    fontWeight: isSelected ? 500 : 400,
                  }}
                  onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.90)'; } }}
                  onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.60)'; } }}
                >
                  {isSelected && <div className="pointer-events-none absolute inset-y-0 right-0 w-full" style={{ background: 'linear-gradient(to left, rgba(124,58,237,0.25) 0%, rgba(124,58,237,0.05) 50%, transparent 100%)' }} />}
                  {isSelected && <div className="absolute left-0 top-0 h-full" style={{ width: 2, background: '#7c3aed' }} />}
                  <span className="relative z-10" style={{ color: isSelected ? '#a78bfa' : m.color }}>{m.label}</span>
                  {isSelected && <div className="absolute right-3 top-1/2 -translate-y-1/2" style={{ width: 6, height: 6, borderRadius: '50%', background: '#8b5cf6' }} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const STATUS_DOT: Record<string, string> = {
  in_progress:       'bg-cyan-400',
  internal_review:   'bg-purple-400',
  client_review:     'bg-amber-400',
  changes_requested: 'bg-red-400',
  pending:           'bg-white/30',
  draft:             'bg-white/20',
};

function workloadPct(count: number): number {
  return Math.min(Math.round((count / 5) * 100), 100);
}

function workloadColor(pct: number): string {
  if (pct >= 90) return '#ef4444';
  if (pct >= 60) return '#f59e0b';
  return '#22c55e';
}

function MemberCard({ member, onRoleChange, isAdmin }: {
  member: TeamMember;
  onRoleChange: (id: string, role: string) => void;
  isAdmin: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [roleChanged, setRoleChanged] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const meta  = ROLE_META[member.role] ?? ROLE_META['TEAM_MEMBER'];
  const label = member.customRole?.label ?? meta.label;
  const badge = member.customRole?.color ?? meta.color;

  useEffect(() => {
    if (!menuOpen) return;
    function out(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', out);
    return () => document.removeEventListener('mousedown', out);
  }, [menuOpen]);

  function handleRoleSelect(r: string) {
    onRoleChange(member.id, r);
    setRoleChanged(true);
    setTimeout(() => setRoleChanged(false), 300);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15 }}
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
      className="flex items-center justify-between rounded-lg px-2 py-2.5"
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={member.image ?? undefined} alt={member.name} />
          <AvatarFallback
            style={{ backgroundColor: (member.color || '#7c3aed') + '33', color: member.color || '#a78bfa' }}
            className="text-xs font-semibold"
          >
            {initials(member.name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-[13px] font-medium text-white/85">{member.name}</p>
          <p className="text-[12px] text-white/30">{member.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <motion.div animate={roleChanged ? { scale: [1, 1.06, 1] } : {}} transition={{ duration: 0.2 }}>
          {isAdmin
            ? <RoleSelect value={member.role} onChange={handleRoleSelect} />
            : <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium" style={{ background: badge + '18', color: badge, border: '1px solid ' + badge + '30' }}>{label}</span>
          }
        </motion.div>
        {isAdmin && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-white/25 transition-colors hover:bg-white/[0.05] hover:text-white/50"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full z-10 mt-1 w-44 overflow-hidden rounded-[10px] border border-white/[0.08] bg-[#16161e] py-1 shadow-xl"
                >
                  <button
                    onClick={() => { setMenuOpen(false); onRoleChange(member.id, member.role); }}
                    className="flex w-full items-center px-3 py-2 text-left text-[12px] text-white/60 transition-colors hover:bg-white/[0.05] hover:text-white"
                  >
                    Cambiar rol
                  </button>
                  <div className="my-1 h-px bg-white/[0.06]" />
                  <button
                    onClick={() => { setMenuOpen(false); toast.error('Eliminar miembro próximamente'); }}
                    className="flex w-full items-center px-3 py-2 text-left text-[12px] text-red-400 transition-colors hover:bg-red-500/[0.08]"
                  >
                    Eliminar miembro
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

    </motion.div>
  );
}

export default function TeamPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const role    = session?.user?.role as string | undefined;
  const isAdmin = role === 'ADMIN';
  const isPM    = role === 'PROJECT_MANAGER';

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    // Esperar a que la sesión cargue antes de evaluar el rol
    if (session === undefined || session === null) return;
    if (session && !isAdmin && !isPM) {
      router.replace('/dashboard');
      return;
    }
    fetch('/api/team/workload')
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          toast.error(d.error);
          return;
        }
        setMembers(d.users ?? []);
      })
      .catch(() => toast.error('Error al cargar el equipo'))
      .finally(() => setLoading(false));
  }, [isAdmin, isPM, router, session]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return members.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      getRoleLabel(m.role).toLowerCase().includes(q)
    );
  }, [members, search]);

  const groups = useMemo(() => {
    return ROLE_ORDER
      .map(r => ({
        role: r,
        meta: ROLE_META[r],
        members: filtered.filter(m => m.role === r),
      }))
      .filter(g => g.members.length > 0);
  }, [filtered]);

  const totalActive  = members.reduce((a, m) => a + m.activeTasks.length, 0);
  const totalOverdue = members.reduce((a, m) =>
    a + m.activeTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length, 0
  );

  function handleRoleChange(userId: string, currentRole: string) {
    router.push('/dashboard/admin');
  }

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-white/30 uppercase tracking-widest mb-1">Equipo</p>
          <h1 className="text-xl font-medium text-white">Equipo interno</h1>
          <p className="text-white/40 text-sm mt-0.5">
            {members.length} miembro{members.length !== 1 ? 's' : ''} · {totalActive} tareas activas
            {totalOverdue > 0 && <span className="text-red-400 ml-2">· {totalOverdue} vencidas</span>}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setInviteOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-medium transition-colors self-start"
          >
            <Users className="w-4 h-4" />
            Invitar miembro
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Miembros',      value: members.length, color: '#a78bfa' },
          { label: 'Tareas activas',value: totalActive,    color: '#38bdf8' },
          { label: 'Vencidas',      value: totalOverdue,   color: totalOverdue > 0 ? '#ef4444' : '#94a3b8' },
          { label: 'Roles',         value: groups.length,  color: '#34d399' },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-xl px-4 py-3">
            <p className="text-[11px] text-white/30 uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-2xl font-medium" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, email o rol…"
          className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 transition-colors"
        />
      </div>

      {loading ? (
        <div className="space-y-6">
          {[3, 2, 4].map((n, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: n }).map((_, j) => <Skeleton key={j} className="h-40 rounded-xl" />)}
              </div>
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="w-12 h-12 text-white/10 mb-3" />
          <p className="text-white/40 text-sm">
            {search ? 'Sin resultados para esa búsqueda' : 'No hay miembros en el equipo'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sección: invite + contador */}
          <div className="rounded-xl border border-white/[0.06] bg-[#16161e] p-5 px-6">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-[14px] font-medium text-white/80">Personas con acceso</h2>
              <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-medium text-purple-300">
                {members.length} miembro{members.length !== 1 ? 's' : ''}
              </span>
            </div>
            {groups.map(g => {
              const Icon = g.meta.icon;
              return (
                <div key={g.role} className="mb-4 last:mb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-3.5 h-3.5" style={{ color: g.meta.color }} />
                    <span className="text-[11px] font-medium uppercase tracking-widest" style={{ color: g.meta.color + 'aa' }}>{g.meta.label}</span>
                    <span className="text-[10px] text-white/20 bg-white/[0.05] px-1.5 py-0.5 rounded-full">{g.members.length}</span>
                  </div>
                  <div className="space-y-0.5">
                    <AnimatePresence mode="popLayout">
                      {g.members.map((m, i) => (
                        <motion.div
                          key={m.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.15, delay: i * 0.03 }}
                        >
                          <MemberCard member={m} onRoleChange={handleRoleChange} isAdmin={isAdmin} />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  {g.role !== groups[groups.length - 1].role && (
                    <div className="mt-3 h-px bg-white/[0.04]" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
    <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </>
  );
}
