'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Search, Users, Shield, Briefcase, Palette,
  Megaphone, ShoppingBag, MoreHorizontal,
  CheckSquare, AlertTriangle, Clock, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { getRoleLabel } from '@/core/constants/roles';
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

const ROLE_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  ADMIN:           { label: 'Administrador',   icon: Shield,      color: '#a78bfa', bg: 'bg-purple-500/10' },
  PROJECT_MANAGER: { label: 'Project Manager', icon: Briefcase,   color: '#38bdf8', bg: 'bg-sky-500/10'    },
  DESIGNER:        { label: 'Diseño',          icon: Palette,     color: '#f472b6', bg: 'bg-pink-500/10'   },
  MARKETING:       { label: 'Marketing',       icon: Megaphone,   color: '#34d399', bg: 'bg-emerald-500/10'},
  TEAM_MEMBER:     { label: 'Equipo',          icon: Users,       color: '#94a3b8', bg: 'bg-slate-500/10'  },
  SALES_REP:       { label: 'Ventas',          icon: ShoppingBag, color: '#fb923c', bg: 'bg-orange-500/10' },
};

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
  const [showTasks, setShowTasks] = useState(false);
  const meta  = ROLE_META[member.role] ?? ROLE_META['TEAM_MEMBER'];
  const Icon  = meta.icon;
  const pct   = workloadPct(member.activeTasks.length);
  const color = workloadColor(pct);
  const label = member.customRole?.label ?? meta.label;
  const badge = member.customRole?.color ?? meta.color;

  const overdue = member.activeTasks.filter(t =>
    t.dueDate && new Date(t.dueDate) < new Date() &&
    !['completed','approved'].includes(t.status)
  ).length;

  return (
    <div className="glass-card rounded-xl p-4 flex flex-col gap-3 transition-all duration-150 hover:border-white/[0.1]">
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <Avatar className="h-11 w-11">
            <AvatarImage src={member.image ?? undefined} alt={member.name} />
            <AvatarFallback
              style={{ backgroundColor: (member.color || '#7c3aed') + '33', color: member.color || '#a78bfa' }}
              className="text-sm font-semibold"
            >
              {initials(member.name)}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white/90 truncate">{member.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Icon className="w-3 h-3 shrink-0" style={{ color: badge }} />
            <span className="text-[11px] truncate" style={{ color: badge }}>{label}</span>
          </div>
          <p className="text-[11px] text-white/25 truncate mt-0.5">{member.email}</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => onRoleChange(member.id, member.role)}
            className="shrink-0 p-1.5 rounded-lg text-white/20 hover:text-[var(--wl-text-secondary)] hover:bg-white/[0.05] transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-white/30">Carga de trabajo</span>
          <div className="flex items-center gap-2">
            {overdue > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-red-400">
                <AlertTriangle className="w-3 h-3" />{overdue} vencida{overdue > 1 ? 's' : ''}
              </span>
            )}
            <span className="text-[11px] font-medium" style={{ color }}>
              {member.activeTasks.length} tarea{member.activeTasks.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
      </div>

      {member.activeTasks.length > 0 && (
        <button
          onClick={() => setShowTasks(v => !v)}
          className="flex items-center justify-between text-[11px] text-white/25 hover:text-white/50 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <CheckSquare className="w-3 h-3" />
            Ver tareas activas
          </span>
          <ChevronRight className={"w-3 h-3 transition-transform " + (showTasks ? 'rotate-90' : '')} />
        </button>
      )}

      {showTasks && (
        <div className="space-y-1.5 border-t border-[var(--wl-border-subtle)] pt-2">
          {member.activeTasks.slice(0, 4).map(task => (
            <div key={task.id} className="flex items-center gap-2">
              <span className={"w-1.5 h-1.5 rounded-full shrink-0 " + (STATUS_DOT[task.status] ?? 'bg-white/20')} />
              <span className="text-[11px] text-white/50 truncate flex-1">{task.title}</span>
              {task.dueDate && (
                <span className={"text-[10px] shrink-0 " + (new Date(task.dueDate) < new Date() ? 'text-red-400' : 'text-white/20')}>
                  <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                  {new Date(task.dueDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
          ))}
          {member.activeTasks.length > 4 && (
            <p className="text-[10px] text-white/20 pl-3.5">+{member.activeTasks.length - 4} más</p>
          )}
        </div>
      )}
    </div>
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
    <div className="space-y-6 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-white/30 uppercase tracking-widest mb-1">Equipo</p>
          <h1 className="text-xl font-medium text-white">Equipo interno</h1>
          <p className="text-[var(--wl-text-muted)] text-sm mt-0.5">
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
          className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/[0.04] border border-[var(--wl-border)] text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 transition-colors"
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
          <p className="text-[var(--wl-text-muted)] text-sm">
            {search ? 'Sin resultados para esa búsqueda' : 'No hay miembros en el equipo'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(g => {
            const Icon = g.meta.icon;
            return (
              <div key={g.role}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-4 h-4" style={{ color: g.meta.color }} />
                  <span className="text-sm font-medium text-[var(--wl-text-secondary)]">{g.meta.label}</span>
                  <span className="text-xs text-white/20 bg-white/[0.05] px-2 py-0.5 rounded-full">{g.members.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {g.members.map(m => (
                    <MemberCard key={m.id} member={m} onRoleChange={handleRoleChange} isAdmin={isAdmin} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
    <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </>
  );
}
