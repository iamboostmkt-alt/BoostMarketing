'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, Reorder } from 'framer-motion';
import {
  Users, CheckSquare, CheckCircle2, UserCircle, DollarSign,
  Plus, ArrowUpRight, ArrowDownRight, Clock, Video,
  Briefcase, Filter, ChevronDown, ChevronUp, Trash2,
  Pencil, X, Eye, EyeOff, GripVertical,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ActivityTimeline from '@/components/dashboard/ActivityTimeline';
import { SectionWrapper, widthToSpan, type SectionWidth } from '@/components/dashboard/dashboard-components';
import type { DashboardStats, Task, Appointment } from '@/lib/types';
import { statusLabels, priorityLabels, priorityColors, statusStyleMap } from '@/lib/theme-maps';

const MANAGER_ROLES = ['ADMIN', 'PROJECT_MANAGER'];

const SECTION_TITLES: Record<string, string> = {
  stats:             'Estadísticas',
  my_tasks:          'Mis tareas',
  team_tasks:        'Equipo de trabajo',
  upcoming_meetings: 'Próximas reuniones',
  recent_activity:   'Actividad reciente',
  overdue_tasks:     'Tareas vencidas',
  completed_tasks:   'Completadas recientemente',
  recent_messages:   'Mensajes recientes',
};

const DEFAULT_WIDTHS_MANAGER: Record<string, SectionWidth> = {
  stats:             'full',
  team_tasks:        '2/3',
  upcoming_meetings: '1/3',
  my_tasks:          '1/2',
  recent_activity:   '1/2',
  recent_messages:   '1/2',
};

const DEFAULT_WIDTHS_MEMBER: Record<string, SectionWidth> = {
  stats:             'full',
  my_tasks:          '1/2',
  upcoming_meetings: '1/3',
  completed_tasks:   '1/3',
  overdue_tasks:     '1/3',
  recent_messages:   '1/3',
};

const SECTIONS_MANAGER = ['stats', 'team_tasks', 'upcoming_meetings', 'my_tasks', 'recent_activity', 'recent_messages'];
const SECTIONS_MEMBER  = ['stats', 'my_tasks', 'upcoming_meetings', 'completed_tasks', 'overdue_tasks', 'recent_messages'];

interface SectionState {
  id: string;
  width: SectionWidth;
  visible: boolean;
  collapsed: boolean;
}

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  color: string;
}

interface ChatMessage {
  id: string;
  message: string;
  room: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string; color: string; image: string | null };
}

function userInitials(name: string | null, email: string) {
  return (name || email).split(/[\s@]/).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function RealTaskCard({ task, compact = false }: { task: Task; compact?: boolean }) {
  const priorityBar: Record<string, string> = {
    urgent: '#ef4444', high: '#f97316', medium: '#7c3aed', low: '#64748b',
  };
  const bar = priorityBar[task.priority] || '#64748b';
  const style = statusStyleMap[task.status] || { background: 'rgba(226,232,240,0.12)', color: '#E2E8F0' };
  const assignee = task.assignedUser ?? task.user;

  if (compact) {
    return (
      <motion.div
        className="relative overflow-hidden rounded-lg border border-white/[0.06] px-3 py-2"
        style={{ background: 'linear-gradient(135deg, #080808 0%, #0e0e14 100%)' }}
        whileHover={{ borderColor: 'rgba(124,58,237,0.2)' }}
      >
        <div className="absolute top-0 left-0 h-full w-0.5 rounded-full" style={{ background: bar }} />
        <div className="pl-2 flex items-center justify-between gap-2">
          <span className="text-[11px] text-white/85 truncate flex-1">{task.title}</span>
          <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium" style={style}>
            {(statusLabels[task.status] || task.status).split(' ')[0]}
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="relative overflow-hidden rounded-[14px] border border-white/[0.06] p-4"
      style={{ background: 'linear-gradient(135deg, #080808 0%, #0e0e14 100%)' }}
      whileHover={{ y: -2, borderColor: 'rgba(124,58,237,0.2)' }}
      transition={{ duration: 0.2 }}
    >
      <div className="absolute -right-10 -bottom-10 h-32 w-32 opacity-60 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(88,28,220,0.18) 0%, transparent 70%)', filter: 'blur(20px)' }} />
      <div className="absolute top-0 left-0 h-full w-1 rounded-l-[14px]" style={{ background: bar }} />
      <div className="relative z-10 pl-3">
        {task.dueDate && (
          <div className="mb-2 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-white/35" />
            <span className={`text-[11px] ${new Date(task.dueDate) < new Date() ? 'text-red-400' : 'text-white/35'}`}>
              {new Date(task.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        )}
        <h4 className="mb-2 text-[13px] leading-snug text-white/85">{task.title}</h4>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-medium" style={style}>
            {statusLabels[task.status] || task.status}
          </span>
          {task.client?.name && (
            <span className="text-[10px] text-violet-400/60">{task.client.name}</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-medium ${priorityColors[task.priority] || 'text-white/40'}`}>
            {priorityLabels[task.priority] || task.priority}
          </span>
          {assignee && (
            <Avatar className="h-6 w-6">
              <AvatarImage src={(assignee as any).image || undefined} />
              <AvatarFallback className="text-[9px] font-medium"
                style={{ backgroundColor: (assignee.color || '#7c3aed') + '33', color: assignee.color || '#7c3aed' }}>
                {userInitials(assignee.name, assignee.email)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function MeetingCard({ meeting, compact = false }: { meeting: Appointment; compact?: boolean }) {
  const d = new Date(meeting.date);
  if (compact) {
    return (
      <div className="flex items-center gap-2 py-1.5">
        <div className="h-7 w-7 rounded-lg bg-green-500/10 flex flex-col items-center justify-center shrink-0">
          <p className="text-[10px] font-bold text-green-300 leading-none">{d.getDate()}</p>
        </div>
        <span className="text-[11px] text-white/70 truncate">{meeting.name}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.04]"
      style={{ background: 'rgba(255,255,255,0.02)' }}>
      <div className="w-10 h-10 rounded-lg bg-green-500/10 flex flex-col items-center justify-center shrink-0">
        <p className="text-sm font-bold text-green-300 leading-none">{d.getDate()}</p>
        <p className="text-[9px] text-green-400/60 uppercase">
          {d.toLocaleDateString('es-MX', { month: 'short' })}
        </p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/90 truncate">{meeting.name}</p>
        <p className="text-xs text-white/40">{d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p>
      </div>
      {(meeting as any).meetLink && (
        <a href={(meeting as any).meetLink} target="_blank" rel="noopener noreferrer"
          className="shrink-0 text-[10px] px-2 py-1 rounded-lg border border-sky-500/20 text-sky-300 hover:bg-sky-500/20 transition-all"
          style={{ background: 'rgba(14,165,233,0.1)' }}>
          Unirse
        </a>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [stats,           setStats]           = useState<DashboardStats | null>(null);
  const [tasks,           setTasks]           = useState<Task[]>([]);
  const [teamTasks,       setTeamTasks]       = useState<Task[]>([]);
  const [teamUsers,       setTeamUsers]       = useState<AdminUser[]>([]);
  const [meetings,        setMeetings]        = useState<Appointment[]>([]);
  const [loadingStats,    setLoadingStats]    = useState(true);
  const [loadingTasks,    setLoadingTasks]    = useState(true);
  const [loadingTeam,     setLoadingTeam]     = useState(true);
  const [loadingMeet,     setLoadingMeet]     = useState(true);
  const [teamUserFilter,  setTeamUserFilter]  = useState('all');
  const [teamStatusFilter,setTeamStatusFilter]= useState('all');
  const [deletingMeet,    setDeletingMeet]    = useState<string | null>(null);
  const [chatMessages,    setChatMessages]    = useState<ChatMessage[]>([]);
  const [loadingChat,     setLoadingChat]     = useState(true);
  const [editMode,        setEditMode]        = useState(false);
  const [sections,        setSections]        = useState<SectionState[]>([]);
  const [greeting,        setGreeting]        = useState('Hola');
  const [fmtDate,         setFmtDate]         = useState('');

  const userName   = session?.user?.name || 'Usuario';
  const userRole   = session?.user?.role as string | undefined;
  const userImage  = session?.user?.image as string | undefined;
  const userColor  = (session?.user as any)?.color as string | undefined;
  const isManager  = MANAGER_ROLES.includes(userRole ?? '');
  const userInitialsHeader = userName.split(/\s+/).map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting('Buenos días');
    else if (h < 18) setGreeting('Buenas tardes');
    else setGreeting('Buenas noches');
    setFmtDate(new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }));
  }, []);

  useEffect(() => {
    if (!userRole) return;
    const key = `weeklink_sections_v3_${userRole}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try { setSections(JSON.parse(saved)); return; } catch {}
    }
    const defaults = isManager ? SECTIONS_MANAGER : SECTIONS_MEMBER;
    const defaultW = isManager ? DEFAULT_WIDTHS_MANAGER : DEFAULT_WIDTHS_MEMBER;
    setSections(defaults.map(id => ({
      id, width: defaultW[id] || '1/2' as SectionWidth, visible: true, collapsed: false,
    })));
  }, [userRole, isManager]);

  useEffect(() => {
    if (!userRole || sections.length === 0) return;
    localStorage.setItem(`weeklink_sections_v3_${userRole}`, JSON.stringify(sections));
  }, [sections, userRole]);

  useEffect(() => {
    if (status === 'authenticated' && userRole === 'CLIENT')
      router.replace('/dashboard/client-portal');
  }, [status, userRole, router]);

  useEffect(() => {
    fetch('/api/stats').then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStats(d); }).finally(() => setLoadingStats(false));
  }, []);

  useEffect(() => {
    const url = isManager ? '/api/tasks?limit=10' : '/api/tasks?scope=mine';
    fetch(url).then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setTasks(d.tasks || d || []); }).finally(() => setLoadingTasks(false));
  }, [isManager]);

  useEffect(() => {
    if (!isManager) { setLoadingTeam(false); return; }
    Promise.all([
      fetch('/api/tasks?scope=all').then(r => r.ok ? r.json() : null),
      fetch('/api/team-members').then(r => r.ok ? r.json() : null),
    ]).then(([td, ud]) => {
      setTeamTasks(td?.tasks || []);
      setTeamUsers((ud?.users || []).filter((u: any) => u.role !== 'CLIENT' && u.role !== 'UNASSIGNED'));
    }).finally(() => setLoadingTeam(false));
  }, [isManager]);

  useEffect(() => {
    Promise.all([
      fetch('/api/appointments?upcoming=1').then(r => r.ok ? r.json() : null),
      fetch('/api/meetings').then(r => r.ok ? r.json() : null),
    ]).then(([appts, meets]) => {
      const a = appts?.appointments || [];
      const m = (meets?.meetings || []).filter((x: any) => new Date(x.date) >= new Date());
      setMeetings([...a, ...m].sort((a: any, b: any) => +new Date(a.date) - +new Date(b.date)));
    }).finally(() => setLoadingMeet(false));
  }, []);

  useEffect(() => {
    fetch('/api/chat?room=TEAM')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.messages) setChatMessages(d.messages.slice(-8).reverse()); })
      .finally(() => setLoadingChat(false));
  }, []);

  const updateSection = useCallback((id: string, updates: Partial<SectionState>) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const now = new Date();
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());
  const overdueTasks    = tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed' && t.status !== 'approved');
  const activeTasks     = tasks.filter(t => t.status !== 'completed' && t.status !== 'approved');
  const completedRecent = tasks.filter(t => (t.status === 'completed' || t.status === 'approved') && t.updatedAt && new Date(t.updatedAt) >= startOfWeek);
  const todayTasks      = tasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === now.toDateString() && t.status !== 'completed' && t.status !== 'approved');
  const nextMeeting     = meetings.filter(m => new Date(m.date) >= now)[0];

  const filteredTeamTasks = teamTasks.filter(t => {
    if (teamStatusFilter !== 'all' && t.status !== teamStatusFilter) return false;
    if (teamUserFilter !== 'all') {
      const uid = teamUserFilter;
      const inPivot = (t.assignedUsers ?? []).some(u => u.id === uid);
      if (t.userId !== uid && t.assignedUserId !== uid && !inPivot) return false;
    }
    return true;
  });

  async function handleDeleteMeeting(id: string) {
    if (!confirm('¿Eliminar esta videollamada?')) return;
    setDeletingMeet(id);
    try {
      const res = await fetch('/api/appointments?id=' + id, { method: 'DELETE' });
      if (res.ok) setMeetings(prev => prev.filter(m => m.id !== id));
    } finally { setDeletingMeet(null); }
  }

  const statCards = isManager ? [
    { label: 'Total Contactos',   value: stats?.totalContacts ?? 0,                                icon: Users,       color: '#a78bfa', change: '+12%', up: true  },
    { label: 'Tareas Pendientes', value: stats ? stats.totalTasks - stats.completedTasks : 0,      icon: CheckSquare, color: '#38bdf8', change: '-5%',  up: false },
    { label: 'Clientes Activos',  value: stats?.activeClients ?? 0,                                icon: UserCircle,  color: '#4ade80', change: '+8%',  up: true  },
    { label: 'Ingresos Totales',  value: `$${(stats?.totalRevenue ?? 0).toLocaleString('es-ES')}`, icon: DollarSign,  color: '#fbbf24', change: '+23%', up: true  },
  ] : [
    { label: 'Tareas Hoy',         value: todayTasks.length,      icon: CheckSquare, color: '#38bdf8', change: '', up: true  },
    { label: 'Vencidas',           value: overdueTasks.length,    icon: Clock,       color: overdueTasks.length > 0 ? '#f87171' : 'rgba(255,255,255,0.3)', change: '', up: false },
    { label: 'Listas esta semana', value: completedRecent.length, icon: UserCircle,  color: '#4ade80', change: '', up: true  },
    { label: 'Próxima reunión',    value: nextMeeting ? new Date(nextMeeting.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—', icon: Video, color: '#fbbf24', change: '', up: true },
  ];

  const getContentMode = (w: SectionWidth): 'compact' | 'medium' | 'wide' => {
    if (w === '1/4' || w === '1/3') return 'compact';
    if (w === '1/2') return 'medium';
    return 'wide';
  };

  const renderSection = (id: string, width: SectionWidth) => {
    const isCompact = getContentMode(width) === 'compact';

    switch (id) {
      case 'stats':
        return (
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {statCards.map(s => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.label}
                  className="flex-1 rounded-[14px] border border-white/[0.06] p-4 group hover:border-white/[0.1] transition-colors"
                  style={{
                    background: 'linear-gradient(135deg, #080808 0%, #0e0e14 100%)',
                    minWidth: '180px',
                    maxWidth: '260px',
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Glow */}
                  <div className="absolute -right-6 -bottom-6 h-20 w-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'radial-gradient(circle, rgba(88,28,220,0.15) 0%, transparent 70%)', filter: 'blur(12px)' }} />
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-white/35 truncate pr-2">{s.label}</span>
                    {s.change && (
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${s.up ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {s.up ? '+' : ''}{s.change}
                      </span>
                    )}
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    {loadingStats ? <Skeleton className="h-9 w-16" /> : (
                      <motion.span
                        key={String(s.value)}
                        className="text-3xl font-semibold text-white/90 leading-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4 }}
                      >
                        {s.value}
                      </motion.span>
                    )}
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: s.color + '1a' }}>
                      <Icon className="w-4 h-4" style={{ color: s.color }} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        );

      case 'my_tasks':
        return (
          <div className="flex flex-col gap-2">
            <div className="overflow-y-auto custom-scrollbar space-y-2"
              style={{ maxHeight: '300px' }}>
              {loadingTasks
                ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
                : activeTasks.length === 0
                  ? <p className="text-xs text-white/30 text-center py-6">Sin tareas activas 🎉</p>
                  : activeTasks.slice(0, 3).map(t => <RealTaskCard key={t.id} task={t} compact={false} />)
              }
            </div>
            {!loadingTasks && activeTasks.length > 0 && (
              <Link href="/dashboard/tasks">
                <button className="w-full text-[11px] text-white/25 hover:text-violet-400 transition-colors py-1.5 text-center border-t border-white/[0.04]">
                  Ver todas ({activeTasks.length}) →
                </button>
              </Link>
            )}
          </div>
        );

      case 'overdue_tasks':
        return (
          <div className={`overflow-y-auto custom-scrollbar ${isCompact ? 'space-y-1' : 'space-y-2'}`}
            style={{ maxHeight: '260px' }}>
            {loadingTasks
              ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)
              : overdueTasks.length === 0
                ? <p className="text-xs text-white/30 text-center py-6">Sin tareas vencidas ✓</p>
                : overdueTasks.slice(0, isCompact ? 5 : 3).map(t => <RealTaskCard key={t.id} task={t} compact={isCompact} />)
            }
          </div>
        );

      case 'completed_tasks':
        return (
          <div className="divide-y divide-white/[0.04] overflow-y-auto custom-scrollbar"
            style={{ maxHeight: '260px' }}>
            {loadingTasks
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full my-1" />)
              : completedRecent.length === 0
                ? <p className="text-xs text-white/30 text-center py-6">Sin completadas esta semana</p>
                : completedRecent.slice(0, 5).map(t => (
                    <div key={t.id} className="flex items-center gap-3 py-2.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400/60 shrink-0" />
                      <span className="flex-1 text-xs text-white/40 line-through truncate">{t.title}</span>
                      {t.client?.name && <span className="text-[10px] text-white/20 shrink-0">{t.client.name}</span>}
                    </div>
                  ))
            }
          </div>
        );

      case 'team_tasks':
        return (
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <Filter className="w-3 h-3 text-white/30 shrink-0" />
              <Select value={teamStatusFilter} onValueChange={setTeamStatusFilter}>
                <SelectTrigger className="h-7 w-32 bg-white/[0.04] border-white/[0.08] text-white text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#15151c] border-white/[0.08] text-white">
                  <SelectItem value="all"         className="text-xs">Todos estados</SelectItem>
                  <SelectItem value="pending"     className="text-xs">Pendiente</SelectItem>
                  <SelectItem value="in_progress" className="text-xs">En progreso</SelectItem>
                  <SelectItem value="completed"   className="text-xs">Completado</SelectItem>
                </SelectContent>
              </Select>
              {teamUsers.length > 0 && (
                <Select value={teamUserFilter} onValueChange={setTeamUserFilter}>
                  <SelectTrigger className="h-7 w-36 bg-white/[0.04] border-white/[0.08] text-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#15151c] border-white/[0.08] text-white">
                    <SelectItem value="all" className="text-xs">Todos usuarios</SelectItem>
                    {teamUsers.map(u => (
                      <SelectItem key={u.id} value={u.id} className="text-xs">{u.name || u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="divide-y divide-white/[0.04] overflow-y-auto custom-scrollbar" style={{ maxHeight: "280px" }}>
              {loadingTeam
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 py-3">
                      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                      <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-3/4" /><Skeleton className="h-2.5 w-1/3" /></div>
                    </div>
                  ))
                : filteredTeamTasks.length === 0
                  ? <p className="text-xs text-white/30 text-center py-6">No hay tareas con estos filtros</p>
                  : filteredTeamTasks.slice(0, 8).map(task => {
                      const owner = task.user;
                      const assignee = task.assignedUser;
                      return (
                        <div key={task.id} className="flex items-center gap-3 py-2.5 hover:bg-white/[0.02] transition-colors rounded-lg -mx-1 px-1">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={(owner as any)?.image || undefined} />
                            <AvatarFallback
                              className="text-xs font-bold"
                              style={{ backgroundColor: (owner?.color || '#7c3aed') + '40', color: owner?.color || '#a78bfa' }}>
                              {userInitials(owner?.name ?? null, owner?.email ?? '')}
                              {userInitials(owner?.name ?? null, owner?.email ?? '')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white/90 truncate">{task.title}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs text-white/35">{owner?.name || owner?.email}</span>
                              {assignee && assignee.id !== owner?.id && (
                                <span className="text-[10px] text-white/25">→ {assignee.name || assignee.email}</span>
                              )}
                              {task.dueDate && (
                                <div className="flex items-center gap-0.5 text-xs text-white/25">
                                  <Clock className="w-3 h-3" />
                                  {new Date(task.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                            style={statusStyleMap[task.status] || { background: 'rgba(226,232,240,0.12)', color: '#E2E8F0' }}>
                            {statusLabels[task.status] || task.status}
                          </span>
                        </div>
                      );
                    })
              }
            </div>
            {!loadingTeam && teamTasks.length > 20 && (
              <Link href="/dashboard/tasks">
                <button className="w-full text-[11px] text-white/30 hover:text-violet-400 transition-colors py-2 text-center mt-2">
                  Ver todas las tareas del equipo →
                </button>
              </Link>
            )}
          </div>
        );

      case 'upcoming_meetings':
        return (
          <div className={isCompact ? 'space-y-1' : 'space-y-2'}>
            {loadingMeet
              ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)
              : meetings.length === 0
                ? <p className="text-xs text-white/30 text-center py-6">Sin reuniones próximas</p>
                : meetings.filter(m => new Date(m.date) >= now).slice(0, isCompact ? 5 : 4).map(m => (
                    <MeetingCard key={m.id} meeting={m} compact={isCompact} />
                  ))
            }
          </div>
        );

      case 'recent_activity':
        return (
          <div className="max-h-72 overflow-y-auto custom-scrollbar">
            <ActivityTimeline />
          </div>
        );

      case 'recent_messages':
        return (
          <div className="divide-y divide-white/[0.04] overflow-y-auto custom-scrollbar" style={{ maxHeight: "280px" }}>
            {loadingChat
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-3">
                    <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-1/3" />
                      <Skeleton className="h-2.5 w-2/3" />
                    </div>
                  </div>
                ))
              : chatMessages.length === 0
                ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-2">
                    <p className="text-xs text-white/30">Sin mensajes recientes</p>
                    <Link href="/dashboard/chat">
                      <button className="text-[11px] text-violet-400/70 hover:text-violet-400 transition-colors">
                        Ir al chat →
                      </button>
                    </Link>
                  </div>
                )
                : chatMessages.map(msg => {
                    const initials = userInitials(msg.user.name, msg.user.email);
                    const timeAgo = (() => {
                      const diff = Date.now() - new Date(msg.createdAt).getTime();
                      const mins = Math.floor(diff / 60000);
                      if (mins < 1) return 'ahora';
                      if (mins < 60) return `hace ${mins}m`;
                      const hrs = Math.floor(mins / 60);
                      if (hrs < 24) return `hace ${hrs}h`;
                      return `hace ${Math.floor(hrs / 24)}d`;
                    })();
                    return (
                      <div key={msg.id} className="flex items-start gap-3 py-3 hover:bg-white/[0.02] transition-colors -mx-1 px-1 rounded-lg">
                        <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-medium"
                          style={{ backgroundColor: (msg.user.color || '#7c3aed') + '33', color: msg.user.color || '#7c3aed' }}>
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <span className="text-[12px] font-medium text-white/80">
                              {msg.user.name || msg.user.email.split('@')[0]}
                            </span>
                            <span className="text-[10px] text-white/25">{timeAgo}</span>
                          </div>
                          <p className={`text-[11px] text-white/50 ${isCompact ? 'truncate' : 'line-clamp-2'}`}>
                            {msg.message}
                          </p>
                        </div>
                      </div>
                    );
                  })
            }
            {!loadingChat && chatMessages.length > 0 && (
              <div className="pt-2">
                <Link href="/dashboard/chat">
                  <button className="w-full text-[11px] text-white/30 hover:text-violet-400 transition-colors py-1 text-center">
                    Ver chat completo →
                  </button>
                </Link>
              </div>
            )}
          </div>
        );

      default:
        return <p className="text-xs text-white/20 text-center py-4">Sección: {id}</p>;
    }
  };

  const roleBadge: Record<string, string> = {
    ADMIN: 'Admin',
    PROJECT_MANAGER: 'Project Manager',
    TEAM_MEMBER: 'Team Member',
    DESIGNER: 'Designer',
    MARKETING: 'Marketing',
    SALES: 'Sales Rep',
    CLIENT: 'Client',
  };

  // Quick actions por rol (estilo v0)
  const quickActions = isManager
    ? [
        { label: 'Nueva tarea',    href: '/dashboard/tasks?action=create',        icon: Plus,       solid: false },
        { label: 'Nueva reunión',  href: '/dashboard/appointments?action=create', icon: Video,      solid: false },
        { label: 'Nuevo cliente',  href: '/dashboard/clients?action=create',      icon: UserCircle, solid: false },
      ]
    : [
        { label: 'Nueva tarea',    href: '/dashboard/tasks?action=create',        icon: Plus,       solid: false },
      ];

  const draggableSections = sections.filter(s => s.id !== 'stats' && (s.visible || editMode));

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* ══ ZONA 1: Header fijo — greeting arriba, botones debajo ══ */}
      <div className="shrink-0 pb-4 pt-1">

        {/* Fila 1: avatar + greeting + badge */}
        <div className="mb-3 flex items-center gap-4">
          {/* Avatar usuario */}
          <Avatar className="h-11 w-11 shrink-0 ring-2 ring-white/[0.06] rounded-xl">
            <AvatarImage src={userImage || undefined} alt={userName} className="rounded-xl object-cover" />
            <AvatarFallback
              className="rounded-xl text-sm font-semibold"
              style={{
                backgroundColor: (userColor || '#7c3aed') + '33',
                color: userColor || '#a78bfa',
              }}
            >
              {userInitialsHeader}
            </AvatarFallback>
          </Avatar>

          {/* Texto */}
          <div>
            <motion.h1
              className="text-2xl font-semibold text-white/90"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {greeting},{' '}
              <span style={{ background: 'linear-gradient(90deg, #a78bfa, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {userName.split(' ')[0]}
              </span>
            </motion.h1>
            <div className="mt-0.5 flex items-center gap-3">
              <span className="text-[13px] text-white/35 capitalize">{fmtDate}</span>
              {userRole && (
                <span className="rounded-full px-2.5 py-0.5 text-[10px] font-medium"
                  style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa' }}>
                  {roleBadge[userRole] || userRole}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Fila 2: quick actions debajo del greeting — estilo v0 */}
        <div className="flex items-center gap-2 flex-wrap">
          {quickActions.map(action => {
            const Icon = action.icon;
            return (
              <Link key={action.label} href={action.href}>
                <motion.button
                  className="flex h-9 items-center gap-2 rounded-lg px-4 text-[12px] transition-colors"
                  style={action.solid
                    ? { background: '#7c3aed', color: '#fff' }
                    : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }
                  }
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Icon className="h-4 w-4" />
                  {action.label}
                </motion.button>
              </Link>
            );
          })}

          {/* Separador */}
          <div className="h-5 w-px" style={{ background: 'rgba(255,255,255,0.08)' }} />

          {/* Editar / Guardar */}
          <motion.button
            onClick={() => setEditMode(e => !e)}
            className="flex h-9 items-center gap-2 rounded-lg px-3 text-[12px] transition-colors"
            style={editMode
              ? { background: '#7c3aed', color: '#fff' }
              : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.06)' }
            }
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            {editMode ? <CheckSquare className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            {editMode ? 'Guardar' : 'Editar'}
          </motion.button>
        </div>
      </div>

      {/* ══ ZONA 2: Stats fijos — max 260px por card ══ */}
      <div className="shrink-0 pb-4">
        {renderSection('stats', 'full')}
      </div>

      {/* Edit mode hint */}
      {editMode && (
        <motion.div
          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="shrink-0 mb-3 rounded-xl border border-violet-500/20 px-4 py-2.5 text-xs text-violet-300/70 flex items-center gap-2"
          style={{ background: 'rgba(124,58,237,0.06)' }}
        >
          <GripVertical className="w-3.5 h-3.5 text-violet-400/60 shrink-0" />
          <span>
            <span className="font-medium text-violet-300">Modo edición:</span>{' '}
            Arrastra secciones · Handle derecho para cambiar ancho · Ojo para ocultar
          </span>
        </motion.div>
      )}

      {/* ══ ZONA 3: Grid de secciones — flex-1 con scroll interno por card ══ */}
      {/* ══ ZONA 3: Filas calculadas — sin grid CSS en Reorder para evitar encimamiento ══
          Estrategia: calcular filas manualmente, un Reorder.Group por fila.
          Cada fila suma spans hasta 12. Al cambiar ancho se recalculan las filas.
          El drag es solo dentro de cada fila (axis="x").
          Para reordenar entre filas se usa el handle vertical del SectionWrapper. */}
      {(() => {
        // Calcular filas: agrupar secciones hasta completar 12 columnas
        const rows: typeof draggableSections[] = [];
        let currentRow: typeof draggableSections = [];
        let currentSpan = 0;

        draggableSections.forEach(section => {
          const span = widthToSpan[section.width];
          if (currentSpan + span > 12 && currentRow.length > 0) {
            rows.push(currentRow);
            currentRow = [section];
            currentSpan = span;
          } else {
            currentRow.push(section);
            currentSpan += span;
          }
        });
        if (currentRow.length > 0) rows.push(currentRow);

        return (
          <div className="space-y-4">
            {rows.map((row, rowIdx) => (
              <Reorder.Group
                key={row.map(s => s.id).join('-')}
                axis="x"
                as="div"
                values={row.map(s => s.id)}
                onReorder={(newOrder) => {
                  setSections(prev => {
                    const map = new Map(prev.map(s => [s.id, s]));
                    const fixed = prev.filter(s => s.id === 'stats');
                    // Reconstruir el array manteniendo el orden de filas
                    const allDraggable = draggableSections.map(s => s.id);
                    const rowStart = rows.slice(0, rowIdx).reduce((acc, r) => acc + r.length, 0);
                    const newAll = [...allDraggable];
                    newOrder.forEach((id, i) => { newAll[rowStart + i] = id; });
                    const reordered = newAll.map(id => map.get(id)!).filter(Boolean);
                    const hidden = prev.filter(s => s.id !== 'stats' && !s.visible && !editMode);
                    return [...fixed, ...reordered, ...hidden];
                  });
                }}
                className="flex gap-4"
              >
                {row.map(section => {
                  const spanPct = (widthToSpan[section.width] / 12) * 100;
                  return (
                    <Reorder.Item
                      key={section.id}
                      value={section.id}
                      as="div"
                      dragListener={editMode}
                      style={{ width: `calc(${spanPct}% - 0.5rem)`, minWidth: 0, flexShrink: 0 }}
                      transition={{ layout: { duration: 0.2, ease: 'easeInOut' } }}
                    >
                      <SectionWrapper
                        id={section.id}
                        title={SECTION_TITLES[section.id] || section.id}
                        editMode={editMode}
                        isVisible={section.visible}
                        isCollapsed={section.collapsed}
                        width={section.width}
                        onToggleVisibility={() => updateSection(section.id, { visible: !section.visible })}
                        onToggleCollapse={() => updateSection(section.id, { collapsed: !section.collapsed })}
                        onWidthChange={(w) => updateSection(section.id, { width: w })}
                        contentMode={getContentMode(section.width)}
                      >
                        {renderSection(section.id, section.width)}
                      </SectionWrapper>
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
