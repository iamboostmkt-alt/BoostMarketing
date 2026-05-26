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
};

const DEFAULT_WIDTHS_MANAGER: Record<string, SectionWidth> = {
  stats:             'full',
  team_tasks:        '2/3',
  upcoming_meetings: '1/3',
  my_tasks:          '1/2',
  recent_activity:   '1/2',
};

const DEFAULT_WIDTHS_MEMBER: Record<string, SectionWidth> = {
  stats:             'full',
  my_tasks:          '1/2',
  upcoming_meetings: '1/3',
  completed_tasks:   '1/3',
  overdue_tasks:     '1/3',
};

const SECTIONS_MANAGER = ['stats', 'team_tasks', 'upcoming_meetings', 'my_tasks', 'recent_activity'];
const SECTIONS_MEMBER  = ['stats', 'my_tasks', 'upcoming_meetings', 'completed_tasks', 'overdue_tasks'];

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
  const [editMode,        setEditMode]        = useState(false);
  const [sections,        setSections]        = useState<SectionState[]>([]);
  const [greeting,        setGreeting]        = useState('Hola');
  const [fmtDate,         setFmtDate]         = useState('');

  const userName  = session?.user?.name || 'Usuario';
  const userRole  = session?.user?.role as string | undefined;
  const isManager = MANAGER_ROLES.includes(userRole ?? '');

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
          <div className={`grid gap-3 ${isCompact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
            {statCards.map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-xl p-4 border border-white/[0.06] hover:border-white/[0.1] transition-colors group"
                  style={{ background: 'linear-gradient(135deg, #080808 0%, #0e0e14 60%, #0a0a0f 100%)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-medium text-white/35 uppercase tracking-wide truncate pr-1">{s.label}</p>
                    {s.change && (
                      <div className={`flex items-center gap-0.5 text-[10px] font-medium shrink-0 ${s.up ? 'text-green-400/70' : 'text-red-400/70'}`}>
                        {s.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {s.change}
                      </div>
                    )}
                  </div>
                  <div className="flex items-end justify-between">
                    {loadingStats ? <Skeleton className="h-8 w-16" /> : (
                      <motion.p key={String(s.value)} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }} className="text-2xl font-semibold text-white leading-none">
                        {s.value}
                      </motion.p>
                    )}
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity"
                      style={{ background: s.color + '1a' }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );

      case 'my_tasks':
        return (
          <div className={isCompact ? 'space-y-1' : 'space-y-2'}>
            {loadingTasks
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)
              : activeTasks.length === 0
                ? <p className="text-xs text-white/30 text-center py-6">Sin tareas activas 🎉</p>
                : activeTasks.slice(0, isCompact ? 8 : 5).map(t => <RealTaskCard key={t.id} task={t} compact={isCompact} />)
            }
            {!loadingTasks && activeTasks.length > 5 && (
              <Link href="/dashboard/tasks">
                <button className="w-full text-[11px] text-white/30 hover:text-violet-400 transition-colors py-1.5 text-center">
                  Ver todas ({activeTasks.length}) →
                </button>
              </Link>
            )}
          </div>
        );

      case 'overdue_tasks':
        return (
          <div className={isCompact ? 'space-y-1' : 'space-y-2'}>
            {loadingTasks
              ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)
              : overdueTasks.length === 0
                ? <p className="text-xs text-white/30 text-center py-6">Sin tareas vencidas ✓</p>
                : overdueTasks.slice(0, isCompact ? 6 : 4).map(t => <RealTaskCard key={t.id} task={t} compact={isCompact} />)
            }
          </div>
        );

      case 'completed_tasks':
        return (
          <div className="divide-y divide-white/[0.04]">
            {loadingTasks
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full my-1" />)
              : completedRecent.length === 0
                ? <p className="text-xs text-white/30 text-center py-6">Sin completadas esta semana</p>
                : completedRecent.slice(0, 10).map(t => (
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
            <div className="divide-y divide-white/[0.04] max-h-72 overflow-y-auto">
              {loadingTeam
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 py-3">
                      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                      <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-3/4" /><Skeleton className="h-2.5 w-1/3" /></div>
                    </div>
                  ))
                : filteredTeamTasks.length === 0
                  ? <p className="text-xs text-white/30 text-center py-6">No hay tareas con estos filtros</p>
                  : filteredTeamTasks.slice(0, 20).map(task => {
                      const owner = task.user;
                      const assignee = task.assignedUser;
                      return (
                        <div key={task.id} className="flex items-center gap-3 py-2.5 hover:bg-white/[0.02] transition-colors rounded-lg -mx-1 px-1">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={(owner as any)?.image || undefined} />
                            <AvatarFallback className="text-xs font-medium"
                              style={{ backgroundColor: (owner?.color || '#7c3aed') + '33', color: owner?.color || '#7c3aed' }}>
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
          <div className="max-h-72 overflow-y-auto">
            <ActivityTimeline />
          </div>
        );

      default:
        return <p className="text-xs text-white/20 text-center py-4">Sección: {id}</p>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-white/30 capitalize mb-0.5">{fmtDate}</p>
          <h2 className="text-xl font-medium text-white">
            {greeting},{' '}
            <span style={{ background: 'linear-gradient(90deg, #a78bfa, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {userName.split(' ')[0]}
            </span>
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/tasks?action=create">
            <Button size="sm" className="gap-1.5 text-white" style={{ background: '#7c3aed' }}>
              <Plus className="w-3.5 h-3.5" />Nueva tarea
            </Button>
          </Link>
          <Button size="sm" variant="outline"
            className={`gap-1.5 border-white/[0.1] transition-all ${editMode ? 'text-violet-400 border-violet-500/40' : 'text-white/50 hover:text-white'}`}
            style={{ background: editMode ? 'rgba(124,58,237,0.08)' : undefined }}
            onClick={() => setEditMode(e => !e)}>
            {editMode ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
            {editMode ? 'Listo' : 'Editar layout'}
          </Button>
        </div>
      </div>

      {editMode && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-violet-500/20 px-4 py-3 text-xs text-violet-300/70"
          style={{ background: 'rgba(124,58,237,0.06)' }}>
          <span className="font-medium text-violet-300">Modo edición:</span>{' '}
          Arrastra secciones para reordenar · Handle derecho para cambiar ancho · Ojo para ocultar
        </motion.div>
      )}

      <Reorder.Group
        axis="y"
        as="div"
        values={sections.filter(s => s.visible || editMode).map(s => s.id)}
        onReorder={(newOrder) => {
          setSections(prev => {
            const map = new Map(prev.map(s => [s.id, s]));
            const reordered = newOrder.map(id => map.get(id)!).filter(Boolean);
            const hidden = prev.filter(s => !s.visible && !editMode);
            return [...reordered, ...hidden];
          });
        }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: '1rem',
          gridAutoFlow: 'row dense',
        }}
      >
        {sections
          .filter(s => s.visible || editMode)
          .map(section => (
            <Reorder.Item
              key={section.id}
              value={section.id}
              as="div"
              dragListener={editMode}
              layout
              style={{ gridColumn: `span ${widthToSpan[section.width]}` }}
              transition={{ layout: { duration: 0.25, ease: 'easeInOut' } }}
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
          ))
        }
      </Reorder.Group>
    </div>
  );
}
