'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ListTodo, Users, BadgeCheck, Clock, Video,
  Plus, ArrowUpRight, ArrowDownRight, BrainCircuit,
  MessageSquare, X, ChevronRight,
  CalendarDays, UsersRound, Target, Zap, Bell,
  CalendarPlus, UserPlus, Building2, Pencil, Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { DashboardStats, Task, Appointment } from '@/lib/types';
import { statusLabels } from '@/lib/theme-maps';
import TaskForm from '@/components/dashboard/TaskForm';
import ClientForm from '@/components/dashboard/ClientForm';
import { InviteModal } from '@/components/dashboard/InviteModal';
import AppointmentEditModal from '@/components/calendar/AppointmentEditModal';

const MANAGER_ROLES = ['ADMIN', 'PROJECT_MANAGER'];

function userInitials(name: string | null, email: string) {
  return (name || email).split(/[\s@]/).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}
function fmtDate() {
  return new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
function timeAgo(date: string | Date) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return 'Ahora';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
  return `Hace ${Math.floor(diff / 86400)} días`;
}

const roleBadge: Record<string, string> = {
  ADMIN: 'Administrador', PROJECT_MANAGER: 'Project Manager',
  TEAM_MEMBER: 'Team Member', DESIGNER: 'Diseñador',
  MARKETING: 'Marketing', SALES_REP: 'Ventas', CLIENT: 'Cliente',
};

// ─── KPI Card ──────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, color, change, up, onClick }: {
  label: string; value: string | number; icon: any; color: string;
  change?: string; up?: boolean; onClick?: () => void;
}) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.15 }}
      className="wl-kpi-card rounded-[16px] p-3.5 cursor-pointer"
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: color + '18' }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        {change && (
          <div className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${up ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-400 bg-red-400/10'}`}>
            {up ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
            {change}
          </div>
        )}
      </div>
      <p className="text-[22px] font-bold leading-none mb-1" style={{ color: 'var(--wl-text-primary)' }}>{value}</p>
      <p className="text-[11px] font-medium leading-tight" style={{ color: 'var(--wl-text-muted)' }}>{label}</p>
    </motion.div>
  );
}

// ─── Section Card ───────────────────────────────────────────
function SectionCard({ title, action, actionHref, children, minH }: {
  title: string; action?: string; actionHref?: string; children: React.ReactNode; minH?: number;
}) {
  return (
    <div className="wl-kpi-card rounded-[20px] p-5 flex flex-col" style={{ minHeight: minH }}>
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h3 className="text-[15px] font-semibold" style={{ color: 'var(--wl-text-primary)' }}>{title}</h3>
        {action && actionHref && (
          <Link href={actionHref} className="text-[12px] font-medium text-[#8B5CF6] hover:text-[#7C3AED] transition-colors flex items-center gap-1">
            {action} <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="py-8 text-center">
      <p className="text-[13px]" style={{ color: 'var(--wl-text-muted)' }}>{msg}</p>
    </div>
  );
}

// ─── Inbox: DMs + canales de clientes, con avatar ──────────
function MsgList({ messages }: { messages: any[] }) {
  if (!messages.length) return <Empty msg="Sin mensajes recientes" />;
  return (
    <div className="space-y-1">
      {messages.map((item: any) => {
        const isDM = item.type === 'dm';
        const isChannel = item.type === 'channel';

        // Avatar: DM → foto del otro participante; canal → inicial del cliente
        const avatarUser = isDM ? item.participant : item.sender;
        const avatarColor = isDM
          ? (item.participant?.color || '#7c3aed')
          : (item.client?.color || '#7c3aed');
        const avatarName = isDM
          ? (item.participant?.name || item.participant?.email || 'U')
          : (item.client?.name || 'C');
        const avatarImage = isDM ? (item.participant?.image || null) : null;

        // Nombre a mostrar
        const displayName = isDM
          ? (item.participant?.name?.split(' ')[0] || 'Usuario')
          : (item.client?.name || 'Canal');

        // Sub-label: DM = "Mensaje directo"; canal = "#clientname"
        const subLabel = isDM ? 'Mensaje directo' : `#${(item.client?.name || '').toLowerCase().replace(/\s+/g, '')}`;

        return (
          <Link key={item.id} href={item.href || '/dashboard/chat'}
            className="flex items-center gap-3 px-2.5 py-2 rounded-[12px] hover:bg-[var(--wl-hover)] transition-all group">

            {/* Avatar */}
            {isDM ? (
              <Avatar className="h-8 w-8 shrink-0 rounded-full overflow-hidden">
                <AvatarImage src={avatarImage || undefined} />
                <AvatarFallback className="text-[10px] font-bold"
                  style={{ background: avatarColor + '25', color: avatarColor }}>
                  {userInitials(avatarName, '')}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-8 w-8 shrink-0 rounded-[8px] flex items-center justify-center text-[11px] font-bold text-white"
                style={{ background: avatarColor }}>
                {avatarName[0]?.toUpperCase() || '#'}
              </div>
            )}

            {/* Contenido */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[12px] font-semibold truncate group-hover:text-[#7C3AED] transition-colors"
                  style={{ color: 'var(--wl-text-primary)' }}>
                  {displayName}
                </span>
                <span className="text-[10px] shrink-0" style={{ color: 'var(--wl-text-placeholder)' }}>
                  {new Date(item.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-[11px] truncate" style={{ color: 'var(--wl-text-muted)' }}>
                {item.preview || '—'}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Actividad de Clientes (Admin) ──────────────────────────
function ClientActivityList({ items }: { items: any[] }) {
  if (!items.length) return <Empty msg="Sin actividad reciente de clientes" />;
  const actionIcon: Record<string, string> = {
    task_created: '📝', task_completed: '✅', file_uploaded: '📎',
    meeting_scheduled: '📅', message_sent: '💬', task_approved: '✅',
    client_commented: '💬', task_updated: '🔄',
  };
  return (
    <div className="space-y-2">
      {items.slice(0, 6).map((item: any, i: number) => (
        <Link key={i} href={item.href || '/dashboard/clients'}
          className="flex items-start gap-3 p-2.5 rounded-[12px] hover:bg-[var(--wl-hover)] transition-all">
          <div className="w-7 h-7 rounded-[8px] flex items-center justify-center text-[13px] shrink-0 mt-0.5"
            style={{ background: 'rgba(139,92,246,0.10)' }}>
            {actionIcon[item.action] || '📌'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium truncate" style={{ color: 'var(--wl-text-primary)' }}>
              {item.clientName}
            </p>
            <p className="text-[11px] truncate" style={{ color: 'var(--wl-text-muted)' }}>
              {item.description}
            </p>
          </div>
          <span className="text-[10px] shrink-0 mt-0.5" style={{ color: 'var(--wl-text-placeholder)' }}>
            {timeAgo(item.createdAt)}
          </span>
        </Link>
      ))}
    </div>
  );
}

// ─── Actividad Relacionada (Team Member) ───────────────────
function RelatedActivityList({ items }: { items: any[] }) {
  if (!items.length) return <Empty msg="Sin actividad reciente relacionada contigo" />;
  return (
    <div className="space-y-2">
      {items.slice(0, 6).map((item: any, i: number) => (
        <Link key={i} href={item.href || '/dashboard/tasks'}
          className="flex items-start gap-3 p-2.5 rounded-[12px] hover:bg-[var(--wl-hover)] transition-all">
          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: (item.actorColor || '#7c3aed') + '20' }}>
            <Avatar className="h-7 w-7">
              <AvatarImage src={item.actorImage || undefined} />
              <AvatarFallback className="text-[9px] font-semibold"
                style={{ background: (item.actorColor || '#7c3aed') + '20', color: item.actorColor || '#7c3aed' }}>
                {userInitials(item.actorName || null, 'U')}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium" style={{ color: 'var(--wl-text-primary)' }}>
              <span style={{ color: '#7C3AED' }}>{item.actorName?.split(' ')[0]}</span>{' '}
              <span style={{ color: 'var(--wl-text-secondary)' }}>{item.description}</span>
            </p>
            {item.context && (
              <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--wl-text-muted)' }}>{item.context}</p>
            )}
          </div>
          <span className="text-[10px] shrink-0 mt-0.5" style={{ color: 'var(--wl-text-placeholder)' }}>
            {timeAgo(item.createdAt)}
          </span>
        </Link>
      ))}
    </div>
  );
}

// ─── Clientes activos card ──────────────────────────────────
function ClientsGrid({ clients, myClientsOnly }: { clients: any[]; myClientsOnly?: boolean }) {
  if (!clients.length) return <Empty msg="Sin clientes activos" />;
  return (
    <div className="space-y-2.5">
      {clients.slice(0, 5).map((c: any) => {
        const totalC = (c.activeTasks || 0) + (c.completedTasks || 0) + (c.taskCount || 0);
        const doneC = c.completedTasks || c.completedTaskCount || 0;
        const progress = totalC > 0 ? Math.round((doneC / totalC) * 100) : 0;
        const progressColor = progress > 75 ? '#10B981' : progress > 40 ? '#F59E0B' : '#EF4444';
        const pm = c.assignedManager || c.manager;
        const lastActivity = c.lastActivity || c.updatedAt;
        return (
          <Link key={c.id} href={`/dashboard/clients`}
            className="flex items-center gap-3 p-2.5 rounded-[12px] hover:bg-[var(--wl-hover)] transition-all group">
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[12px] font-bold text-white shrink-0"
              style={{ background: c.color || '#7C3AED' }}>
              {(c.name || 'C')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-1">
                <p className="text-[13px] font-semibold truncate group-hover:text-[#7C3AED] transition-colors" style={{ color: 'var(--wl-text-primary)' }}>{c.name}</p>
                <span className="text-[10px] shrink-0" style={{ color: 'var(--wl-text-muted)' }}>{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ background: 'var(--wl-elevated)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: progressColor }} />
              </div>
              <div className="flex items-center gap-2">
                {pm && <span className="text-[10px]" style={{ color: 'var(--wl-text-muted)' }}>PM: {pm.name?.split(' ')[0]}</span>}
                {(c.activeTasks || 0) > 0 && <span className="text-[10px]" style={{ color: 'var(--wl-text-muted)' }}>{c.activeTasks} pendientes</span>}
                {lastActivity && <span className="text-[10px]" style={{ color: 'var(--wl-text-placeholder)' }}>{timeAgo(lastActivity)}</span>}
              </div>
            </div>
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: '#10B981' }} />
          </Link>
        );
      })}
    </div>
  );
}

// ─── Team Workload ──────────────────────────────────────────
function WorkloadList({ members, onClick }: { members: any[]; onClick?: (id: string) => void }) {
  if (!members.length) return <Empty msg="Sin datos de equipo" />;
  const col = (pct: number) => pct > 80 ? '#EF4444' : pct > 60 ? '#F59E0B' : '#10B981';
  return (
    <div className="space-y-3">
      {members.slice(0, 6).map((m: any) => {
        const activeArr = Array.isArray(m.activeTasks) ? m.activeTasks : [];
        const activeCnt = activeArr.filter((t: any) => t.status !== 'completed' && t.status !== 'approved').length;
        const totalCnt = activeArr.length || m.totalTasks || 0;
        const pct = totalCnt > 0 ? Math.min(Math.round((activeCnt / totalCnt) * 100), 100) : 0;
        const c = col(pct);
        return (
          <div key={m.id} className="flex items-center gap-3 cursor-pointer group"
            onClick={() => onClick?.(m.id)}>
            <Avatar className="h-7 w-7 shrink-0 rounded-full overflow-hidden">
              <AvatarImage src={m.image || undefined} />
              <AvatarFallback className="text-[9px] font-semibold"
                style={{ background: (m.color || '#7c3aed') + '20', color: m.color || '#7c3aed' }}>
                {userInitials(m.name, m.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[12px] font-medium truncate group-hover:text-[#7C3AED] transition-colors" style={{ color: 'var(--wl-text-primary)' }}>
                  {m.name?.split(' ')[0]}
                </p>
                <span className="text-[11px] font-bold ml-2 shrink-0" style={{ color: c }}>{pct}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--wl-elevated)' }}>
                <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, delay: 0.1 }} style={{ background: c }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Panel de Consejos IA (Admin/PM) ───────────────────────
function TipsPanel({ clients, isManager, onCreateTask, show }: {
  clients: any[]; isManager: boolean; onCreateTask: (title: string) => void; show: boolean;
}) {
  const [tips, setTips] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState('');
  const [created, setCreated] = useState<string[]>([]);

  if (!show) return null;

  const generate = async () => {
    setLoading(true); setTips([]);
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: clientId || null, freeContext: null }),
      });
      const d = await res.json();
      setTips(d.suggestions || []);
    } catch {}
    finally { setLoading(false); }
  };

  const typeEmoji: Record<string, string> = {
    reel: '🎬', post: '📸', story: '📖', email: '✉️',
    campaign: '📣', copy: '✏️', strategy: '🎯',
  };

  return (
    <div className="rounded-[20px] p-4" style={{ background: 'var(--wl-surface)', border: '1px solid var(--wl-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#8B5CF6]" />
          <span className="text-[14px] font-semibold" style={{ color: 'var(--wl-text-primary)' }}>Consejos IA</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(139,92,246,0.1)', color: '#8B5CF6' }}>BETA</span>
        </div>
        <Link href="/dashboard/ai-studio" className="text-[11px] text-[#8B5CF6] hover:underline flex items-center gap-1">
          AI Studio <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Selector de cliente + botón generar */}
      <div className="flex gap-2 mb-3">
        <select
          value={clientId}
          onChange={e => setClientId(e.target.value)}
          className="flex-1 rounded-[10px] px-3 py-2 text-[12px] outline-none"
          style={{ background: 'var(--wl-elevated)', border: '1px solid var(--wl-border)', color: 'var(--wl-text-primary)' }}
        >
          <option value="">Seleccionar cuenta...</option>
          {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={generate} disabled={loading || !clientId}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12px] font-semibold text-white disabled:opacity-50 transition-all"
          style={{ background: '#7C3AED', whiteSpace: 'nowrap' }}>
          {loading
            ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Sparkles className="w-3.5 h-3.5" />}
          Generar
        </button>
      </div>

      {/* Tips */}
      {!loading && tips.length === 0 && (
        <p className="text-[12px] text-center py-3" style={{ color: 'var(--wl-text-muted)' }}>
          Selecciona una cuenta y genera consejos de contenido
        </p>
      )}
      {loading && (
        <div className="space-y-2">
          {[1,2,3].map(i => (
            <div key={i} className="h-12 rounded-[10px] animate-pulse" style={{ background: 'var(--wl-elevated)' }} />
          ))}
        </div>
      )}
      <div className="space-y-2">
        {tips.slice(0, 4).map((t: any, i: number) => (
          <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-[12px]"
            style={{ background: 'var(--wl-elevated)', border: '1px solid var(--wl-border)' }}>
            <span className="text-base shrink-0 mt-0.5">{typeEmoji[t.type] || '💡'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--wl-text-primary)' }}>{t.title}</p>
              <p className="text-[11px] line-clamp-2 mt-0.5" style={{ color: 'var(--wl-text-muted)' }}>{t.description}</p>
            </div>
            <button
              onClick={() => { onCreateTask(t.title); setCreated(prev => [...prev, t.id || String(i)]); }}
              disabled={created.includes(t.id || String(i))}
              className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-[7px] text-[10px] font-semibold transition-all disabled:opacity-50"
              style={{ background: created.includes(t.id || String(i)) ? '#10B98115' : 'rgba(124,58,237,0.12)', color: created.includes(t.id || String(i)) ? '#10B981' : '#7C3AED' }}
              title="Crear tarea desde este consejo"
            >
              {created.includes(t.id || String(i)) ? '✓' : <Plus className="w-3 h-3" />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardHome() {
  const { data: session } = useSession();
  const router = useRouter();
  const userName  = session?.user?.name || session?.user?.email || 'Usuario';
  const userImage = (session?.user as any)?.image || null;
  const userColor = (session?.user as any)?.color || '#7c3aed';
  const userRole  = (session?.user as any)?.role as string | undefined;
  const userId    = (session?.user as any)?.id as string | undefined;
  const isAdmin   = userRole === 'ADMIN';
  const isPM      = userRole === 'PROJECT_MANAGER';
  const isManager = MANAGER_ROLES.includes(userRole || '');
  const isTeam    = !isManager && userRole !== 'CLIENT';

  // ── State ──────────────────────────────────────────────
  const [stats, setStats]           = useState<DashboardStats | null>(null);
  const [tasks, setTasks]           = useState<Task[]>([]);
  const [meetings, setMeetings]     = useState<Appointment[]>([]);
  const [messages, setMessages]     = useState<any[]>([]);
  const [clients, setClients]       = useState<any[]>([]);
  const [teamLoad, setTeamLoad]     = useState<any[]>([]);
  const [projects, setProjects]     = useState<any[]>([]);
  const [clientActivity, setClientActivity] = useState<any[]>([]);
  const [relatedActivity, setRelatedActivity] = useState<any[]>([]);
  const [briefOpen, setBriefOpen]   = useState(true);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [tips, setTips] = useState<any[]>([]);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [tipsClient, setTipsClient] = useState<string>('');
  const [loading, setLoading]       = useState(true);

  // ── Fetch ───────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      // Fetches comunes a todos los roles
      const basePromises = [
        fetch('/api/stats').then(r => r.json()).catch(() => null),
        fetch('/api/tasks?scope=mine&limit=5').then(r => r.json()).catch(() => ({ tasks: [] })),
        fetch('/api/meetings?limit=3').then(r => r.json()).catch(() => ({ meetings: [] })),
        fetch('/api/chat/inbox').then(r => r.json()).catch(() => ({ inbox: [] })),
        fetch('/api/projects?limit=4').then(r => r.json()).catch(() => ({ projects: [] })),
      ];

      const [statsR, tasksR, meetsR, msgsR, projectsR] = await Promise.all(basePromises);
      if (statsR) setStats(statsR);
      setTasks(tasksR?.tasks || []);
      setMeetings(meetsR?.meetings || []);
      setMessages(msgsR?.inbox || []);
      setProjects(projectsR?.projects || []);

      // Admin: clientes + workload + actividad de clientes
      if (isAdmin) {
        // Paralelo: clientes + workload (sin activity que es lenta)
        const [clientsR, workloadR] = await Promise.all([
          fetch('/api/clients?limit=5').then(r => r.json()).catch(() => ({ clients: [] })),
          fetch('/api/team/workload').then(r => r.json()).catch(() => ({ members: [] })),
        ]);
        setClients(clientsR?.clients || []);
        setTeamLoad(workloadR?.users || workloadR?.members || []);
        setClientActivity([]); // Se carga de forma diferida
      }

      // PM: sus clientes + su equipo
      if (isPM) {
        const [clientsR, workloadR] = await Promise.all([
          fetch('/api/clients?limit=8&myClients=true').then(r => r.json()).catch(() => ({ clients: [] })),
          fetch('/api/team/workload?myTeam=true').then(r => r.json()).catch(() => ({ members: [] })),
        ]);
        setClients(clientsR?.clients || []);
        setTeamLoad(workloadR?.users || workloadR?.members || []);
      }

      // Team: sin fetch de actividad (datos no útiles)

    } finally {
      setLoading(false);
    }
  }, [userRole]);

  useEffect(() => { if (userRole) fetchAll(); }, [fetchAll, userRole]);

  // ── Computed ────────────────────────────────────────────
  const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed' && t.status !== 'approved');
  const now = new Date();
  const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const meetingsThisWeek = meetings.filter(m => { const d = new Date((m as any).date); return d >= now && d <= endOfWeek; });
  const meetingsToday = meetings.filter(m => { const d = new Date((m as any).date); return d.toDateString() === now.toDateString(); });
  const todayTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === new Date().toDateString());
  const nextMeeting = meetings[0] || null;
  const pending = tasks.filter(t => t.status !== 'completed' && t.status !== 'approved' && t.status !== 'cancelled');

  // KPIs por rol
  const adminKpis = [
    { label: 'Tareas activas',       value: pending.length,                  icon: ListTodo,   color: '#3B82F6', change: '+12%', up: true,  href: '/dashboard/tasks'   },
    { label: 'Clientes activos',     value: stats?.activeClients ?? clients.length, icon: UsersRound, color: '#10B981', change: '+8%', up: true, href: '/dashboard/clients' },
    { label: 'Aprobaciones pendientes', value: stats?.pendingDeals ?? 0,     icon: BadgeCheck, color: '#F59E0B', href: '/dashboard/tasks' },
    { label: meetingsToday.length > 0 ? 'Reuniones hoy' : 'Esta semana', value: meetingsToday.length > 0 ? meetingsToday.length : meetingsThisWeek.length, icon: Video, color: '#8B5CF6', href: '/dashboard/calendar' },
  ];
  const pmKpis = [
    { label: 'Mis tareas activas',   value: pending.length,                  icon: Target,     color: '#3B82F6', href: '/dashboard/tasks'   },
    { label: 'Mis clientes',         value: clients.length,                  icon: UsersRound, color: '#10B981', href: '/dashboard/clients' },
    { label: 'Por aprobar',          value: stats?.pendingDeals ?? 0,        icon: BadgeCheck, color: '#F59E0B', href: '/dashboard/tasks'   },
    { label: 'Reuniones esta semana',value: meetingsThisWeek.length,         icon: Video,      color: '#8B5CF6', href: '/dashboard/calendar' },
  ];
  const teamKpis = [
    { label: 'Tareas hoy',           value: todayTasks.length,               icon: ListTodo,   color: '#3B82F6', href: '/dashboard/tasks'   },
    { label: 'Vencidas',             value: overdue.length,                  icon: Clock,      color: overdue.length > 0 ? '#EF4444' : '#94A3B8', href: '/dashboard/tasks' },
    { label: 'Completadas esta semana', value: tasks.filter(t => t.status === 'completed').length, icon: BadgeCheck, color: '#10B981', href: '/dashboard/tasks' },
    { label: 'Próxima reunión',      value: nextMeeting ? new Date((nextMeeting as any).date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—', icon: Video, color: '#F59E0B', href: '/dashboard/calendar' },
  ];
  const kpis = isAdmin ? adminKpis : isPM ? pmKpis : teamKpis;

  const priorityColor: Record<string, string> = { urgent: '#EF4444', high: '#F97316', medium: '#F59E0B', low: '#94A3B8' };
  const statusColor: Record<string, { bg: string; text: string }> = {
    pending: { bg: '#F3F4F6', text: '#6B7280' }, in_progress: { bg: '#DBEAFE', text: '#2563EB' },
    review: { bg: '#FEF3C7', text: '#D97706' }, completed: { bg: '#D1FAE5', text: '#059669' }, approved: { bg: '#D1FAE5', text: '#059669' },
  };

  // ── Skeleton ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="wl-dashboard-bg px-4 sm:px-6 lg:px-8 py-6 space-y-6" style={{ minHeight: '100%' }}>
        <div className="grid grid-cols-4 gap-2.5">
          {[1,2,3,4].map(i => (
            <div key={i} className="rounded-[20px] p-5 animate-pulse" style={{ height: 120, background: 'var(--wl-surface)', border: '1px solid var(--wl-border)' }}>
              <div className="w-10 h-10 rounded-xl mb-4" style={{ background: 'var(--wl-hover)' }} />
              <div className="h-7 rounded w-12 mb-2" style={{ background: 'var(--wl-hover)' }} />
              <div className="h-3 rounded w-24" style={{ background: 'var(--wl-hover)' }} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="rounded-[20px] p-5 animate-pulse" style={{ height: 200, background: 'var(--wl-surface)', border: '1px solid var(--wl-border)' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="wl-dashboard-bg flex flex-col px-4 sm:px-6 lg:px-8 py-5 gap-5" style={{ minHeight: '100%' }}>

        {/* ── HEADER ── */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0 flex-1 overflow-hidden">
            <Avatar className="h-10 w-10 shrink-0 rounded-[12px] overflow-hidden ring-1 ring-black/[0.06]">
              <AvatarImage src={userImage || undefined} alt={userName} className="object-cover" />
              <AvatarFallback className="rounded-[12px] text-sm font-semibold"
                style={{ backgroundColor: (userColor || '#7c3aed') + '20', color: userColor || '#7c3aed' }}>
                {userInitials(session?.user?.name || null, session?.user?.email || '')}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 overflow-hidden">
              <h1 className="text-[15px] sm:text-[19px] font-bold leading-snug" style={{ color: 'var(--wl-text-primary)' }}>
                {greeting()},{' '}
                <span className="text-[#7C3AED]">
                  {userName.split(' ')[0].length > 10 ? userName.split(' ')[0].slice(0, 10) + '…' : userName.split(' ')[0]}
                </span>{' '}👋
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[12px] capitalize" style={{ color: 'var(--wl-text-muted)' }}>{fmtDate()}</span>
                {userRole && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(124,58,237,0.08)', color: '#7C3AED' }}>
                    {roleBadge[userRole] || userRole}
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* Botón principal nuevo */}
          <motion.button onClick={() => setTaskFormOpen(true)} whileTap={{ scale: 0.97 }}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-[12px] px-4 text-[13px] font-semibold text-white transition-all"
            style={{ background: '#7C3AED', boxShadow: '0 4px 12px rgba(124,58,237,0.25)' }}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nueva tarea</span>
          </motion.button>
        </div>

        {/* ── BARRA DE ACCIONES RÁPIDAS ── */}
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
          {[
            { icon: Plus,         label: 'Nueva tarea',   fn: () => setTaskFormOpen(true),   always: true },
            { icon: CalendarPlus, label: 'Nueva reunión', fn: () => setMeetingOpen(true),     always: true },
            { icon: Building2,    label: 'Nuevo cliente', fn: () => setClientFormOpen(true),  roles: ['ADMIN','PROJECT_MANAGER'] },
            { icon: UserPlus,     label: 'Invitar',       fn: () => setInviteOpen(true),      roles: ['ADMIN','PROJECT_MANAGER'] },
          ]
            .filter(a => a.always || (a.roles && a.roles.includes(userRole || '')))
            .map((a, i) => (
              <motion.button key={i} onClick={a.fn} whileTap={{ scale: 0.97 }}
                className="flex items-center justify-center gap-1.5 h-9 px-3 rounded-[10px] text-[12px] font-medium transition-all w-full"
                style={{ background: 'var(--wl-surface)', border: '1px solid var(--wl-border)', color: 'var(--wl-text-secondary)' }}>
                <a.icon className="w-3.5 h-3.5 shrink-0" style={{ color: '#8B5CF6' }} />
                <span className="truncate">{a.label}</span>
              </motion.button>
            ))
          }
        </div>

        {/* ── DAILY BRIEF ── */}
        {briefOpen && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="relative rounded-[20px] p-5 flex items-start gap-4"
            style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(124,58,237,0.10) 100%)', border: '1px solid rgba(139,92,246,0.12)' }}>
            <div className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0" style={{ background: 'rgba(139,92,246,0.12)' }}>
              <BrainCircuit className="w-5 h-5 text-[#8B5CF6]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-[13px] font-semibold" style={{ color: 'var(--wl-text-primary)' }}>Daily Brief</p>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-[#8B5CF6]"
                  style={{ background: 'rgba(139,92,246,0.10)' }}>IA</span>
              </div>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--wl-text-secondary)' }}>
                {isAdmin && clients.length > 0
                  ? `Tienes ${clients.length} cliente${clients.length > 1 ? 's' : ''} activo${clients.length > 1 ? 's' : ''}. ${pending.length > 0 ? `${pending.length} tarea${pending.length > 1 ? 's' : ''} pendiente${pending.length > 1 ? 's' : ''} en el equipo.` : 'Todo al día.'} ${overdue.length > 0 ? `${overdue.length} vencida${overdue.length > 1 ? 's' : ''} — atención inmediata.` : ''}`
                  : pending.length > 0
                  ? `Tienes ${pending.length} tarea${pending.length > 1 ? 's' : ''} pendiente${pending.length > 1 ? 's' : ''}.${overdue.length > 0 ? ` ${overdue.length} vencida${overdue.length > 1 ? 's' : ''} — atención inmediata.` : ''}${nextMeeting ? ` Próxima reunión: ${(nextMeeting as any).name}.` : ''}`
                  : 'Todo al día. Sin tareas pendientes por ahora.'}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <Link href="/dashboard/tasks" className="text-[12px] font-medium text-[#7C3AED] flex items-center gap-1 hover:underline">
                  {isAdmin ? 'Ver tareas del equipo' : 'Ver mis tareas'} <ChevronRight className="w-3.5 h-3.5" />
                </Link>
                <Link href="/dashboard/calendar" className="text-[12px] font-medium flex items-center gap-1 hover:text-[var(--wl-text-primary)] transition-colors" style={{ color: 'var(--wl-text-muted)' }}>
                  Abrir calendario <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
            <button onClick={() => setBriefOpen(false)} className="hover:text-[var(--wl-text-muted)] transition-colors shrink-0" style={{ color: 'var(--wl-text-placeholder)' }}>
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* ── KPIs ── */}
        <div className="grid grid-cols-4 gap-2.5">
          {kpis.map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <KpiCard {...k} onClick={() => router.push(k.href)} />
            </motion.div>
          ))}
        </div>

        {/* ─────────────────────────────────────── */}
        {/* FILA 1: Focus Today + columna central + Reuniones */}
        {/* ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Focus Today — igual para todos los roles */}
          <SectionCard title="🎯 Focus Today" action="Ver todas" actionHref="/dashboard/tasks">
            {pending.length === 0 ? (
              <Empty msg="Sin tareas pendientes. ¡Todo al día! ✓" />
            ) : (
              <div className="space-y-2">
                {pending.slice(0, 5).map(t => (
                  <Link key={t.id} href="/dashboard/tasks"
                    className="flex items-center gap-3 p-3 rounded-[14px] group transition-all hover:bg-[var(--wl-hover)]">
                    <div className="w-1.5 h-8 rounded-full shrink-0" style={{ background: priorityColor[t.priority] || '#94A3B8' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate group-hover:text-[#7C3AED] transition-colors" style={{ color: 'var(--wl-text-primary)' }}>{t.title}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--wl-text-muted)' }}>
                        {(t as any).client?.name && <span className="mr-2">{(t as any).client.name}</span>}
                        {t.dueDate && <span className={new Date(t.dueDate) < new Date() ? 'text-red-500' : ''}>{new Date(t.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>}
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full shrink-0"
                      style={{ background: (statusColor[t.status] || { bg: '#F3F4F6', text: '#6B7280' }).bg, color: (statusColor[t.status] || { bg: '#F3F4F6', text: '#6B7280' }).text }}>
                      {statusLabels[t.status] || t.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Columna central: Actividad de Clientes (Admin/PM) | Producción Activa (Team) */}
          {(isAdmin || isPM) ? (
            <SectionCard
              title={isAdmin ? '📢 Actividad de Clientes' : '📢 Actividad de Mis Clientes'}
              action="Ver clientes" actionHref="/dashboard/clients">
              {clientActivity.length > 0
                ? <ClientActivityList items={clientActivity} />
                : (
                  // Si no hay actividad del log, mostrar proyectos en curso como fallback
                  projects.length === 0 ? <Empty msg="Sin actividad reciente" /> : (
                    <div className="space-y-2">
                      {projects.slice(0, 4).map((p: any) => {
                        const total = p._count?.tasks || 0;
                        const done = p.tasks?.filter((t: any) => t.status === 'completed' || t.status === 'approved').length || 0;
                        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                        return (
                          <Link key={p.id} href={`/dashboard/projects/${p.id}`}
                            className="flex items-center gap-3 p-2.5 rounded-[12px] hover:bg-[var(--wl-hover)] transition-all">
                            <div className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                              style={{ background: p.color || '#7C3AED' }}>
                              {(p.name || 'P')[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-medium truncate" style={{ color: 'var(--wl-text-primary)' }}>{p.name}</p>
                              {total > 0 && (
                                <div className="flex items-center gap-1.5 mt-1">
                                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--wl-elevated)' }}>
                                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: p.color || '#7C3AED' }} />
                                  </div>
                                  <span className="text-[9px] shrink-0" style={{ color: 'var(--wl-text-muted)' }}>{pct}%</span>
                                </div>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )
                )
              }
            </SectionCard>
          ) : (
            // Team Member: Producción activa de su equipo
            <SectionCard title="🚀 Producción activa" action="Ver todos" actionHref="/dashboard/projects">
              {projects.length === 0 ? <Empty msg="Sin proyectos activos" /> : (
                <div className="space-y-2">
                  {projects.slice(0, 4).map((p: any) => {
                    const total = p._count?.tasks || 0;
                    const done = p.tasks?.filter((t: any) => t.status === 'completed' || t.status === 'approved').length || 0;
                    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                    return (
                      <Link key={p.id} href={`/dashboard/projects/${p.id}`}
                        className="flex items-center gap-3 p-2.5 rounded-[12px] hover:bg-[var(--wl-hover)] transition-all">
                        <div className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{ background: p.color || '#7C3AED' }}>
                          {(p.name || 'P')[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium truncate" style={{ color: 'var(--wl-text-primary)' }}>{p.name}</p>
                          {total > 0 && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--wl-elevated)' }}>
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: p.color || '#7C3AED' }} />
                              </div>
                              <span className="text-[9px] shrink-0" style={{ color: 'var(--wl-text-muted)' }}>{pct}%</span>
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          )}

          {/* Próximas Reuniones — todos los roles */}
          <SectionCard title="📅 Próximas reuniones" action="Ver calendario" actionHref="/dashboard/calendar">
            {meetings.length === 0 ? <Empty msg="Sin reuniones próximas" /> : (
              <div className="space-y-3">
                {meetings.slice(0, 4).map((m: any) => {
                  const d = new Date(m.date);
                  const isToday = d.toDateString() === now.toDateString();
                  const minsLeft = (d.getTime() - Date.now()) / 60000;
                  return (
                    <div key={m.id} className="flex items-center gap-3 p-3 rounded-[14px] hover:bg-[var(--wl-hover)] transition-all">
                      <div className="w-10 h-10 rounded-[10px] flex flex-col items-center justify-center shrink-0"
                        style={{ background: 'rgba(16,185,129,0.08)' }}>
                        <p className="text-[10px] font-bold text-emerald-600 leading-none">{d.getDate()}</p>
                        <p className="text-[9px] text-emerald-500">{d.toLocaleDateString('es-ES', { month: 'short' })}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate" style={{ color: 'var(--wl-text-primary)' }}>{m.name}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--wl-text-muted)' }}>
                          {isToday ? 'Hoy' : d.toLocaleDateString('es-ES', { weekday: 'short' })}, {d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {minsLeft > 0 && minsLeft < 15 && m.meetUrl && (
                        <a href={m.meetUrl} target="_blank" rel="noopener noreferrer"
                          className="text-[11px] font-semibold px-3 py-1.5 rounded-[8px] text-white shrink-0"
                          style={{ background: '#7C3AED' }}>
                          Unirse
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* ── PANEL CONSEJOS IA — solo Admin/PM ── */}
        <TipsPanel
          clients={clients}
          isManager={isManager}
          onCreateTask={(title) => setTaskFormOpen(true)}
          show={isManager && clients.length > 0}
        />

        {/* ─────────────────────────────────────── */}
        {/* FILA 2: diferenciada por rol */}
        {/* ─────────────────────────────────────── */}

        {/* ADMIN: Mensajes + Clientes Activos + Carga del Equipo */}
        {isAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SectionCard title="💬 Mensajes recientes" action="Ver todo" actionHref="/dashboard/chat">
              <MsgList messages={messages} />
            </SectionCard>
            <SectionCard title="🏢 Clientes activos" action="Ver todos" actionHref="/dashboard/clients">
              <ClientsGrid clients={clients} />
            </SectionCard>
            <SectionCard title="👥 Carga del equipo" action="Ver todo" actionHref="/dashboard/tasks">
              <WorkloadList members={teamLoad} onClick={(id) => router.push(`/dashboard/tasks?assignee=${id}`)} />
            </SectionCard>
          </div>
        )}

        {/* PM: Mensajes + Mis Clientes + Carga de Mi Equipo */}
        {isPM && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SectionCard title="💬 Mensajes recientes" action="Ver todo" actionHref="/dashboard/chat">
              <MsgList messages={messages} />
            </SectionCard>
            <SectionCard title="👤 Mis clientes" action="Ver todos" actionHref="/dashboard/clients">
              <ClientsGrid clients={clients} myClientsOnly />
            </SectionCard>
            <SectionCard title="👥 Carga de mi equipo" action="Ver todo" actionHref="/dashboard/tasks">
              <WorkloadList members={teamLoad} />
            </SectionCard>
          </div>
        )}

        {/* TEAM MEMBER: Mensajes + Tareas completadas recientemente */}
        {isTeam && !isAdmin && !isPM && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title="💬 Mensajes recientes" action="Ver todo" actionHref="/dashboard/chat">
              <MsgList messages={messages} />
            </SectionCard>
            <SectionCard title="✅ Mis tareas completadas" action="Ver todas" actionHref="/dashboard/tasks">
              {tasks.filter(t => t.status === 'completed' || t.status === 'approved').length === 0
                ? <Empty msg="Sin tareas completadas recientemente" />
                : (
                  <div className="space-y-2">
                    {tasks.filter(t => t.status === 'completed' || t.status === 'approved').slice(0, 5).map(t => (
                      <Link key={t.id} href="/dashboard/tasks"
                        className="flex items-center gap-3 p-2.5 rounded-[12px] hover:bg-[var(--wl-hover)] transition-all">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: '#10B98115' }}>
                          <span className="text-[12px]">✓</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium truncate" style={{ color: 'var(--wl-text-primary)' }}>{t.title}</p>
                          {(t as any).client?.name && (
                            <p className="text-[11px]" style={{ color: 'var(--wl-text-muted)' }}>{(t as any).client.name}</p>
                          )}
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: '#10B98115', color: '#10B981' }}>
                          {t.status === 'approved' ? 'Aprobada' : 'Completada'}
                        </span>
                      </Link>
                    ))}
                  </div>
                )
              }
            </SectionCard>
          </div>
        )}

      </div>

      {/* Modals */}
      <TaskForm open={taskFormOpen} onOpenChange={setTaskFormOpen} onSuccess={() => { fetchAll(); setTaskFormOpen(false); }} isManager={isManager} />
      <AppointmentEditModal open={meetingOpen} onOpenChange={setMeetingOpen} appointment={null} onSaved={() => { fetchAll(); setMeetingOpen(false); }} />
      <ClientForm open={clientFormOpen} onOpenChange={setClientFormOpen} onSuccess={() => { fetchAll(); setClientFormOpen(false); }} isAdmin={userRole === 'ADMIN'} />
      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </>
  );
}
