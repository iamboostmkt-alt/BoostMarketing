'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ListTodo, Users, BadgeCheck, Wallet, Clock, Video,
  Plus, ArrowUpRight, ArrowDownRight, BrainCircuit,
  UserCircle, MessageSquare, X, ChevronRight,
  CalendarDays, UsersRound, Target, Pencil,
} from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { DashboardStats, Task, Appointment } from '@/lib/types';
import { statusLabels, priorityLabels } from '@/lib/theme-maps';
import TaskForm from '@/components/dashboard/TaskForm';
import ClientForm from '@/components/dashboard/ClientForm';
import { InviteModal } from '@/components/dashboard/InviteModal';

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
function SectionCard({ title, action, actionHref, children }: {
  title: string; action?: string; actionHref?: string; children: React.ReactNode;
}) {
  return (
    <div className="wl-kpi-card rounded-[20px] p-5 flex flex-col gap-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-semibold" style={{ color: 'var(--wl-text-primary)' }}>{title}</h3>
        {action && actionHref && (
          <Link href={actionHref} className="text-[12px] font-medium text-[#8B5CF6] hover:text-[#7C3AED] transition-colors flex items-center gap-1">
            {action} <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────
function Empty({ msg }: { msg: string }) {
  return (
    <div className="py-8 text-center">
      <p className="text-[13px]" style={{ color: 'var(--wl-text-muted)' }}>{msg}</p>
    </div>
  );
}

export default function DashboardHome() {
  const { data: session } = useSession();
  const router = useRouter();
  const userName   = session?.user?.name || session?.user?.email || 'Usuario';
  const userImage  = (session?.user as any)?.image || null;
  const userColor  = (session?.user as any)?.color || '#7c3aed';
  const userRole   = (session?.user as any)?.role as string | undefined;
  const isManager  = MANAGER_ROLES.includes(userRole || '');

  // ── State ──────────────────────────────────────────────
  const [stats, setStats]             = useState<DashboardStats | null>(null);
  const [tasks, setTasks]             = useState<Task[]>([]);
  const [meetings, setMeetings]       = useState<Appointment[]>([]);
  const [messages, setMessages]       = useState<any[]>([]);
  const [clients, setClients]         = useState<any[]>([]);
  const [teamLoad, setTeamLoad]       = useState<any[]>([]);
  const [briefOpen, setBriefOpen]     = useState(true);
  const [taskFormOpen, setTaskFormOpen]   = useState(false);
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [inviteOpen, setInviteOpen]   = useState(false);
  const [loading, setLoading]         = useState(true);

  // ── Fetch ───────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsR, tasksR, meetsR, msgsR, clientsR, workloadR] = await Promise.all([
        fetch('/api/stats').then(r => r.json()).catch(() => null),
        fetch('/api/tasks?scope=mine&limit=8').then(r => r.json()).catch(() => ({ tasks: [] })),
        fetch('/api/meetings?limit=4').then(r => r.json()).catch(() => ({ meetings: [] })),
        fetch('/api/chat?room=TEAM&limit=4').then(r => r.json()).catch(() => ({ messages: [] })),
        fetch('/api/clients?limit=4').then(r => r.json()).catch(() => ({ clients: [] })),
        fetch('/api/team/workload').then(r => r.json()).catch(() => ({ members: [] })),
      ]);
      if (statsR) setStats(statsR);
      setTasks(tasksR?.tasks || []);
      setMeetings(meetsR?.meetings || []);
      setMessages(msgsR?.messages || []);
      setClients(clientsR?.clients || []);
      setTeamLoad(workloadR?.members || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Computed ────────────────────────────────────────────
  const overdue   = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed' && t.status !== 'approved');
  const todayTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === new Date().toDateString());
  const nextMeeting = meetings[0] || null;
  const pending   = tasks.filter(t => t.status !== 'completed' && t.status !== 'approved' && t.status !== 'cancelled');

  const kpis = isManager ? [
    { label: 'Tareas pendientes',     value: pending.length,                       icon: ListTodo,   color: '#3B82F6', change: '+12%', up: true,  href: '/dashboard/tasks'    },
    { label: 'Clientes activos',      value: stats?.activeClients ?? 0,            icon: UsersRound, color: '#10B981', change: '+8%',  up: true,  href: '/dashboard/clients'  },
    { label: 'Aprobaciones pendientes', value: stats?.pendingDeals ?? 0,           icon: BadgeCheck, color: '#F59E0B', change: '',     up: false, href: '/dashboard/files'    },
    { label: 'Ingresos este mes',     value: `$${((stats?.totalRevenue ?? 0)/1000).toFixed(0)}k`, icon: Wallet, color: '#8B5CF6', change: '+18%', up: true, href: '/billing' },
  ] : [
    { label: 'Tareas hoy',            value: todayTasks.length,                    icon: ListTodo,   color: '#3B82F6', change: '', up: true,  href: '/dashboard/tasks'   },
    { label: 'Vencidas',              value: overdue.length,                       icon: Clock,      color: overdue.length > 0 ? '#EF4444' : '#94A3B8', change: '', up: false, href: '/dashboard/tasks' },
    { label: 'Completadas esta semana', value: tasks.filter(t => t.status === 'completed').length, icon: BadgeCheck, color: '#10B981', change: '', up: true, href: '/dashboard/tasks' },
    { label: 'Próxima reunión',       value: nextMeeting ? new Date(nextMeeting.date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—', icon: Video, color: '#F59E0B', change: '', up: true, href: '/dashboard/calendar' },
  ];

  const priorityColor: Record<string, string> = { urgent: '#EF4444', high: '#F97316', medium: '#F59E0B', low: '#94A3B8' };
  const statusColor: Record<string, { bg: string; text: string }> = {
    pending: { bg: '#F3F4F6', text: '#6B7280' },
    in_progress: { bg: '#DBEAFE', text: '#2563EB' },
    review: { bg: '#FEF3C7', text: '#D97706' },
    completed: { bg: '#D1FAE5', text: '#059669' },
    approved: { bg: '#D1FAE5', text: '#059669' },
  };

  const workloadColor = (pct: number) => pct > 80 ? '#EF4444' : pct > 60 ? '#F59E0B' : '#10B981';

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

        {/* ── HEADER ───────────────────────────────────────── */}
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
                  {userName.split(' ')[0].length > 10
                    ? userName.split(' ')[0].slice(0, 10) + '…'
                    : userName.split(' ')[0]}
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

          {/* Quick actions */}
          <div className="flex items-center gap-2 shrink-0">
            <motion.button
              onClick={() => setTaskFormOpen(true)}
              whileTap={{ scale: 0.97 }}
              className="flex h-9 w-9 sm:w-auto items-center justify-center sm:gap-1.5 rounded-[12px] sm:px-4 text-[13px] font-semibold text-white transition-all"
              style={{ background: '#7C3AED', boxShadow: '0 4px 12px rgba(124,58,237,0.25)' }}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nueva tarea</span>
            </motion.button>
            {isManager && (
              <motion.button onClick={() => setInviteOpen(true)} whileTap={{ scale: 0.97 }}
                className="flex h-9 w-9 items-center justify-center rounded-[12px] transition-all"
                style={{ background: 'var(--wl-surface)', border: '1px solid var(--wl-border)', boxShadow: 'var(--wl-shadow)' }}>
                <Users className="h-4 w-4" style={{ color: 'var(--wl-text-muted)' }} />
              </motion.button>
            )}
          </div>
        </div>

        {/* ── AI DAILY BRIEF ───────────────────────────────── */}
        {briefOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="relative rounded-[20px] p-5 flex items-start gap-4"
            style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(124,58,237,0.10) 100%)', border: '1px solid rgba(139,92,246,0.12)' }}
          >
            <div className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0"
              style={{ background: 'rgba(139,92,246,0.12)' }}>
              <BrainCircuit className="w-5 h-5 text-[#8B5CF6]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-[13px] font-semibold" style={{ color: 'var(--wl-text-primary)' }}>Daily Brief</p>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-[#8B5CF6]"
                  style={{ background: 'rgba(139,92,246,0.10)' }}>IA</span>
              </div>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--wl-text-secondary)' }}>
                {pending.length > 0
                  ? `Tienes ${pending.length} tarea${pending.length > 1 ? 's' : ''} pendiente${pending.length > 1 ? 's' : ''}.${overdue.length > 0 ? ` ${overdue.length} vencida${overdue.length > 1 ? 's' : ''} — atención inmediata.` : ''}${nextMeeting ? ` Reunión próxima: ${nextMeeting.name}.` : ''}`
                  : 'Todo al día. Sin tareas pendientes por ahora.'}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <Link href="/dashboard/tasks" className="text-[12px] font-medium text-[#7C3AED] flex items-center gap-1 hover:underline">
                  Ver mis tareas <ChevronRight className="w-3.5 h-3.5" />
                </Link>
                <Link href="/dashboard/calendar" className="text-[12px] font-medium text-[var(--wl-text-muted)] flex items-center gap-1 hover:text-[var(--wl-text-primary)] transition-colors">
                  Abrir calendario <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
            <button onClick={() => setBriefOpen(false)} className="text-[var(--wl-text-placeholder)] hover:text-[var(--wl-text-muted)] transition-colors shrink-0">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* ── KPI CARDS ─────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-2.5">
          {kpis.map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <KpiCard {...k} onClick={() => router.push(k.href)} />
            </motion.div>
          ))}
        </div>

        {/* ── FILA 1: Focus Today + Actividad + Producción ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Focus Today */}
          <SectionCard title="🎯 Focus Today" action="Ver todas" actionHref="/dashboard/tasks">
            {pending.length === 0 ? (
              <Empty msg="Sin tareas pendientes. ¡Todo al día! ✓" />
            ) : (
              <div className="space-y-2">
                {pending.slice(0, 5).map(t => (
                  <Link key={t.id} href={`/dashboard/tasks`}
                    className="flex items-center gap-3 p-3 rounded-[14px] group transition-all hover:bg-[var(--wl-hover)]">
                    <div className="w-1.5 h-8 rounded-full shrink-0" style={{ background: priorityColor[t.priority] || '#94A3B8' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate group-hover:text-[#7C3AED] transition-colors" style={{ color: 'var(--wl-text-primary)' }}>{t.title}</p>
                      <p className="text-[11px] text-[var(--wl-text-muted)] mt-0.5">
                        {t.client?.name && <span className="mr-2">{t.client.name}</span>}
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

          {/* Actividad del equipo */}
          <SectionCard title="⚡ Actividad del equipo" action="Ver todo" actionHref="/dashboard/tasks">
            {messages.length === 0 ? (
              <Empty msg="Sin actividad reciente" />
            ) : (
              <div className="space-y-3">
                {messages.slice(0, 5).map((msg: any) => (
                  <div key={msg.id} className="flex items-start gap-3">
                    <Avatar className="h-7 w-7 shrink-0 rounded-full overflow-hidden">
                      <AvatarImage src={msg.user?.image || undefined} />
                      <AvatarFallback className="text-[9px] font-semibold"
                        style={{ background: (msg.user?.color || '#7c3aed') + '20', color: msg.user?.color || '#7c3aed' }}>
                        {userInitials(msg.user?.name || null, msg.user?.email || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium" style={{ color: 'var(--wl-text-primary)' }}>{msg.user?.name || msg.user?.email}</p>
                      <p className="text-[11px] text-[var(--wl-text-muted)] truncate mt-0.5">{msg.message}</p>
                    </div>
                    <span className="text-[10px] text-[var(--wl-text-placeholder)] shrink-0">
                      {new Date(msg.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Próximas reuniones */}
          <SectionCard title="📅 Próximas reuniones" action="Ver calendario" actionHref="/dashboard/calendar">
            {meetings.length === 0 ? (
              <Empty msg="Sin reuniones próximas" />
            ) : (
              <div className="space-y-3">
                {meetings.slice(0, 4).map((m: any) => {
                  const d = new Date(m.date);
                  const isToday = d.toDateString() === new Date().toDateString();
                  const minsLeft = (d.getTime() - Date.now()) / 60000;
                  return (
                    <div key={m.id} className="flex items-center gap-3 p-3 rounded-[14px] transition-all hover:bg-[var(--wl-hover)]">
                      <div className="w-10 h-10 rounded-[10px] flex flex-col items-center justify-center shrink-0"
                        style={{ background: 'rgba(16,185,129,0.08)' }}>
                        <p className="text-[10px] font-bold text-emerald-600 leading-none">{d.getDate()}</p>
                        <p className="text-[9px] text-emerald-500">{d.toLocaleDateString('es-ES', { month: 'short' })}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate" style={{ color: 'var(--wl-text-primary)' }}>{m.name}</p>
                        <p className="text-[11px] text-[var(--wl-text-muted)] mt-0.5">
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

        {/* ── FILA 2: Mensajes + Clientes + Team Workload ───── */}
        {isManager && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Mensajes recientes */}
            <SectionCard title="💬 Mensajes recientes" action="Ver todo" actionHref="/dashboard/chat">
              {messages.length === 0 ? (
                <Empty msg="Sin mensajes recientes" />
              ) : (
                <div className="space-y-3">
                  {messages.slice(0, 4).map((msg: any) => (
                    <Link key={msg.id} href="/dashboard/chat"
                      className="flex items-start gap-3 p-2.5 rounded-[12px] hover:bg-[var(--wl-hover)] transition-all">
                      <div className="text-[13px] font-semibold text-[#8B5CF6]">#</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-[#7C3AED] mb-0.5">{msg.room?.replace('TEAM_', '').toLowerCase() || 'general'}</p>
                        <p className="text-[12px] text-[var(--wl-text-primary)] font-medium">{msg.user?.name?.split(' ')[0]}: <span className="font-normal text-[var(--wl-text-secondary)]">{msg.message?.slice(0, 50)}{msg.message?.length > 50 ? '…' : ''}</span></p>
                      </div>
                      <span className="text-[10px] text-[var(--wl-text-placeholder)] shrink-0">
                        {new Date(msg.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Clientes activos */}
            <SectionCard title="🏢 Clientes activos" action="Ver todos" actionHref="/dashboard/clients">
              {clients.length === 0 ? (
                <Empty msg="Sin clientes activos" />
              ) : (
                <div className="space-y-3">
                  {clients.slice(0, 4).map((c: any) => {
                    const progress = c.taskCount > 0 ? Math.round((c.completedTaskCount / c.taskCount) * 100) : 0;
                    const progressColor = progress > 75 ? '#10B981' : progress > 40 ? '#F59E0B' : '#EF4444';
                    return (
                      <Link key={c.id} href={`/dashboard/clients`}
                        className="flex items-center gap-3 p-2.5 rounded-[12px] hover:bg-[var(--wl-hover)] transition-all">
                        <div className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                          style={{ background: c.color || '#7C3AED' }}>
                          {(c.name || 'C')[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium truncate" style={{ color: 'var(--wl-text-primary)' }}>{c.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--wl-elevated)' }}>
                              <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: progressColor }} />
                            </div>
                            <span className="text-[10px] font-medium shrink-0" style={{ color: progressColor }}>{progress}%</span>
                          </div>
                        </div>
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: '#10B981' }} title="Activo" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            {/* Team Workload */}
            <SectionCard title="👥 Carga del equipo" action="Ver todo" actionHref="/dashboard/tasks">
              {teamLoad.length === 0 ? (
                <Empty msg="Sin datos de equipo" />
              ) : (
                <div className="space-y-3">
                  {teamLoad.slice(0, 5).map((member: any) => {
                    const pct = Math.min(Math.round((member.activeTasks / Math.max(member.totalTasks, 1)) * 100), 100);
                    const col = workloadColor(pct);
                    return (
                      <div key={member.id} className="flex items-center gap-3">
                        <Avatar className="h-7 w-7 shrink-0 rounded-full overflow-hidden">
                          <AvatarImage src={member.image || undefined} />
                          <AvatarFallback className="text-[9px] font-semibold"
                            style={{ background: (member.color || '#7c3aed') + '20', color: member.color || '#7c3aed' }}>
                            {userInitials(member.name, member.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[12px] font-medium truncate" style={{ color: 'var(--wl-text-primary)' }}>{member.name?.split(' ')[0]}</p>
                            <span className="text-[11px] font-semibold ml-2 shrink-0" style={{ color: col }}>{pct}%</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--wl-elevated)' }}>
                            <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6, delay: 0.1 }} style={{ background: col }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>
        )}

      </div>

      {/* ── Modals ─────────────────────────────────────────── */}
      <TaskForm open={taskFormOpen} onOpenChange={setTaskFormOpen} onSuccess={() => { fetchAll(); setTaskFormOpen(false); }} isManager={isManager} />
      <ClientForm open={clientFormOpen} onOpenChange={setClientFormOpen} onSuccess={() => { fetchAll(); setClientFormOpen(false); }} isAdmin={userRole === 'ADMIN'} />
      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </>
  );
}
