'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, Reorder } from 'framer-motion';
import {
  Users, CheckSquare, CheckCircle2, UserCircle, DollarSign,
  Plus, ArrowUpRight, ArrowDownRight, Clock, Video,
  Briefcase, Filter, ChevronDown, ChevronUp, Trash2,
  Pencil, X, Eye, EyeOff, GripVertical, ClipboardCheck, BadgeDollarSign,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ActivityTimeline from '@/components/dashboard/ActivityTimeline';
import { SectionWrapper, widthToSpan, type SectionWidth } from '@/components/dashboard/dashboard-components';
import type { DashboardStats, Task, Appointment } from '@/lib/types';
import { statusLabels, priorityLabels, priorityColors, statusStyleMap } from '@/lib/theme-maps';
import TaskForm from '@/components/dashboard/TaskForm';
import ClientForm from '@/components/dashboard/ClientForm';
import { InviteModal } from '@/components/dashboard/InviteModal';

const MANAGER_ROLES = ['ADMIN', 'PROJECT_MANAGER'];

const SECTION_TITLES: Record<string, string> = {
  stats:             'Estadísticas',
  my_tasks:          'Mis tareas',
  recent_tasks:      'Tareas recientes',
  team_tasks:        'Equipo de trabajo',
  upcoming_meetings: 'Próximas reuniones',
  recent_activity:   'Actividad reciente',
  overdue_tasks:     'Tareas vencidas',
  completed_tasks:   'Completadas recientemente',
  recent_messages:   'Mensajes recientes',
  entregas_revision: 'Entregas en revisión',
  team_activity:     'Actividad del equipo',
  active_clients:    'Clientes activos',
};

const DEFAULT_WIDTHS_MANAGER: Record<string, SectionWidth> = {
  stats:             'full',
  recent_tasks:      '1/2',
  entregas_revision: '1/3',
  upcoming_meetings: '1/3',
  team_activity:     '1/2',
  active_clients:    '1/3',
  team_tasks:        '2/3',
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

const SECTIONS_MANAGER = ['stats', 'recent_tasks', 'team_activity', 'upcoming_meetings', 'entregas_revision', 'active_clients', 'team_tasks', 'recent_activity', 'recent_messages'];
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
        className="relative overflow-hidden rounded-xl border border-white/[0.06] px-3 py-2.5"
        style={{ background: 'linear-gradient(135deg, #080808 0%, #0e0e14 100%)' }}
        whileHover={{ borderColor: 'rgba(124,58,237,0.2)' }}
      >
        <div className="absolute top-0 left-0 h-full w-0.5 rounded-full" style={{ background: bar }} />
        <div className="pl-2">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className="text-[12px] font-medium text-white/85 truncate flex-1">{task.title}</span>
            <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium" style={style}>
              {(statusLabels[task.status] || task.status).split(' ')[0]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {task.dueDate && (
              <span className={`text-[10px] flex items-center gap-1 ${new Date(task.dueDate) < new Date() ? 'text-red-400' : 'text-white/30'}`}>
                <Clock className="h-3 w-3" />
                {new Date(task.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </span>
            )}
            {task.client?.name && (
              <span className="text-[10px] text-violet-400/50 truncate">{task.client.name}</span>
            )}
            <span className={`text-[10px] font-medium ml-auto ${priorityColors[task.priority] || 'text-white/30'}`}>
              {priorityLabels[task.priority] || task.priority}
            </span>
          </div>
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
  const [taskTab,         setTaskTab]         = useState<'pending'|'in_progress'|'completed'>('pending');
  const [deliverables,    setDeliverables]    = useState<Task[]>([]);
  const [activeClients,   setActiveClients]   = useState<Array<{id:string;name:string;company:string;progress:number;activeTasks:number;completedTasks:number}>>([]);
  const [activityData,    setActivityData]    = useState<Array<{day:string;completed:number;created:number}>>([]);
  const [loadingChat,     setLoadingChat]     = useState(true);
  const [editMode,        setEditMode]        = useState(false);
  const [sections,        setSections]        = useState<SectionState[]>([]);
  const [greeting,        setGreeting]        = useState('Hola');
  const [fmtDate,         setFmtDate]         = useState('');
  // Modales de acción rápida
  const [taskFormOpen,    setTaskFormOpen]    = useState(false);
  const [clientFormOpen,  setClientFormOpen]  = useState(false);
  const [inviteOpen,      setInviteOpen]      = useState(false);

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
    const key = `weeklink_sections_v4_${userRole}`;
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
    localStorage.setItem(`weeklink_sections_v4_${userRole}`, JSON.stringify(sections));
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
    // scope=mine siempre — "Mis tareas" muestra solo las del usuario actual
    // team_tasks usa scope=all por separado
    fetch('/api/tasks?scope=mine').then(r => r.ok ? r.json() : null)
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
    // appointments solo para managers, meetings para todos
    const fetches = isManager
      ? [
          fetch('/api/appointments?upcoming=1').then(r => r.ok ? r.json() : null),
          fetch('/api/meetings').then(r => r.ok ? r.json() : null),
        ]
      : [
          Promise.resolve(null),
          fetch('/api/meetings').then(r => r.ok ? r.json() : null),
        ];

    Promise.all(fetches).then(([appts, meets]) => {
      const a = appts?.appointments || [];
      const m = (meets?.meetings || []).filter((x: any) => new Date(x.date) >= new Date());
      setMeetings([...a, ...m].sort((a: any, b: any) => +new Date(a.date) - +new Date(b.date)));
    }).finally(() => setLoadingMeet(false));
  }, [isManager]);

  useEffect(() => {
    fetch('/api/chat?room=TEAM')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.messages) setChatMessages(d.messages.slice(-8).reverse()); })
      .finally(() => setLoadingChat(false));
  }, []);

  useEffect(() => {
    if (!isManager) return;
    fetch('/api/tasks?scope=all')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const all = d?.tasks || [];
        setDeliverables(all.filter((t: Task) => t.status === 'internal_review' || t.status === 'client_review'));
        // Generar actividad semanal desde tareas
        const days = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
        const today = new Date();
        const data = days.map((day, i) => {
          const date = new Date(today);
          date.setDate(today.getDate() - (today.getDay() - 1 - i + 7) % 7);
          const dateStr = date.toDateString();
          return {
            day,
            completed: all.filter((t: Task) => t.updatedAt && new Date(t.updatedAt).toDateString() === dateStr && (t.status === 'completed' || t.status === 'approved')).length,
            created: all.filter((t: Task) => t.createdAt && new Date((t as any).createdAt).toDateString() === dateStr).length,
          };
        });
        setActivityData(data);
      });
    fetch('/api/clients')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.clients) setActiveClients(d.clients.slice(0, 5)); });
  }, [isManager]);

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
    { label: 'Tareas Pendientes',    value: stats ? stats.totalTasks - stats.completedTasks : 0,      icon: ClipboardCheck, color: '#38bdf8', change: '+12%', up: true  },
    { label: 'Clientes Activos',     value: stats?.activeClients ?? 0,                                icon: Users,          color: '#4ade80', change: '+8%',  up: true  },
    { label: 'Entregables Revisión', value: deliverables.length,                                      icon: Eye,            color: '#f59e0b', change: '-3%',  up: false },
    { label: 'Ingresos este mes',    value: `$${(stats?.totalRevenue ?? 0).toLocaleString('es-ES')}`, icon: BadgeDollarSign,color: '#a78bfa', change: '+23%', up: true  },
  ] : [
    { label: 'Tareas Hoy',         value: todayTasks.length,      icon: ClipboardCheck, color: '#38bdf8', change: '', up: true  },
    { label: 'Vencidas',           value: overdueTasks.length,    icon: Clock,          color: overdueTasks.length > 0 ? '#f87171' : 'rgba(255,255,255,0.3)', change: '', up: false },
    { label: 'Listas esta semana', value: completedRecent.length, icon: CheckCircle2,   color: '#4ade80', change: '', up: true  },
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {statCards.map(s => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.label}
                  className="rounded-[14px] border border-white/[0.06] p-5 group hover:border-white/[0.08] transition-all overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #080808 0%, #0e0e14 100%)',
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Glow — contenido por overflow-hidden del padre */}
                  <div className="absolute right-0 bottom-0 w-20 h-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'radial-gradient(circle at bottom right, rgba(88,28,220,0.18) 0%, transparent 70%)' }} />
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
                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 relative"
                      style={{ background: s.color + '18', boxShadow: `0 0 20px ${s.color}33` }}>
                      <Icon className="w-5 h-5" style={{ color: s.color }} />
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
            <div className="overflow-y-auto custom-scrollbar space-y-1.5"
              style={{ maxHeight: '320px' }}>
              {loadingTasks
                ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)
                : activeTasks.length === 0
                  ? <p className="text-xs text-white/30 text-center py-6">Sin tareas activas 🎉</p>
                  : activeTasks.slice(0, 6).map(t => (
                      <div key={t.id} className="flex items-center gap-2.5">
                        {/* Avatar con inicial */}
                        <div className="h-7 w-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold"
                          style={{
                            backgroundColor: (t.assignedUser?.color || t.user?.color || '#7c3aed') + '33',
                            color: t.assignedUser?.color || t.user?.color || '#a78bfa',
                          }}>
                          {userInitials(
                            t.assignedUser?.name ?? t.user?.name ?? null,
                            t.assignedUser?.email ?? t.user?.email ?? ''
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <RealTaskCard task={t} compact={true} />
                        </div>
                      </div>
                    ))
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
          <div className={`overflow-y-auto custom-scrollbar ${isCompact ? 'space-y-1' : 'space-y-2'}`}>
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
          <div className="divide-y divide-white/[0.04]">
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
            <div className="divide-y divide-white/[0.04] overflow-y-auto custom-scrollbar" style={{ maxHeight: "260px" }}>
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
                              {owner ? userInitials(owner.name ?? null, owner.email ?? '') : '?'}
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
          <div className="space-y-1 overflow-y-auto custom-scrollbar" style={{ maxHeight: '280px' }}>
            {loadingMeet
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)
              : meetings.filter(m => new Date(m.date) >= now).length === 0
                ? <p className="text-xs text-white/30 text-center py-6">Sin reuniones próximas</p>
                : meetings.filter(m => new Date(m.date) >= now).slice(0, 5).map(m => {
                    const d = new Date(m.date);
                    const timeStr = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                    const dateStr = d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
                    const isToday = d.toDateString() === now.toDateString();
                    return (
                      <div key={m.id} className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-white/[0.03] transition-colors group">
                        <div className="w-16 shrink-0 text-right">
                          <p className="text-sm font-semibold text-white/80">{timeStr}</p>
                          <p className="text-[10px] text-white/30">{isToday ? 'Hoy' : dateStr}</p>
                        </div>
                        <div className="w-px h-8 rounded-full shrink-0" style={{ background: 'rgba(124,58,237,0.4)' }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white/85 truncate">{m.name}</p>
                          {(m as any).assignedUsers?.length > 0 && (
                            <div className="flex -space-x-1 mt-1">
                              {(m as any).assignedUsers.slice(0, 3).map((au: any) => (
                                <div key={au.userId || au.id} className="h-4 w-4 rounded-full border border-[#0a0a0a] flex items-center justify-center text-[8px] font-bold"
                                  style={{ backgroundColor: (au.user?.color || '#7c3aed') + '55', color: au.user?.color || '#a78bfa' }}>
                                  {userInitials(au.user?.name ?? null, au.user?.email ?? '')}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {(m as any).meetUrl && (
                          <a href={(m as any).meetUrl} target="_blank" rel="noopener noreferrer"
                            className="shrink-0 text-[10px] px-2 py-1 rounded-lg border border-sky-500/20 text-sky-300 hover:bg-sky-500/20 transition-all opacity-0 group-hover:opacity-100"
                            style={{ background: 'rgba(14,165,233,0.08)' }}>
                            Unirse
                          </a>
                        )}
                      </div>
                    );
                  })
            }
          </div>
        );

      case 'recent_activity':
        return (
          <div className="overflow-y-auto custom-scrollbar" style={{ maxHeight: "260px" }}>
            <ActivityTimeline />
          </div>
        );

      case 'recent_messages':
        return (
          <div className="divide-y divide-white/[0.04] overflow-y-auto custom-scrollbar" style={{ maxHeight: "260px" }}>
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

      case 'recent_tasks': {
        const tabTasks = {
          pending:     tasks.filter(t => t.status === 'pending'),
          in_progress: tasks.filter(t => t.status === 'in_progress'),
          completed:   tasks.filter(t => t.status === 'completed' || t.status === 'approved'),
        };
        const tabs = [
          { id: 'pending' as const,     label: 'Pendientes',  count: tabTasks.pending.length },
          { id: 'in_progress' as const, label: 'En progreso', count: tabTasks.in_progress.length },
          { id: 'completed' as const,   label: 'Completadas', count: tabTasks.completed.length },
        ];
        return (
          <div className="flex flex-col gap-3">
            <div className="flex gap-1">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setTaskTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${taskTab === tab.id ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
                  style={taskTab === tab.id ? { background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)' } : { border: '1px solid transparent' }}>
                  {tab.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${taskTab === tab.id ? 'bg-violet-500/30 text-violet-300' : 'bg-white/[0.06] text-white/30'}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
            <div className="space-y-1.5 overflow-y-auto custom-scrollbar" style={{ maxHeight: '280px' }}>
              {loadingTasks
                ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)
                : tabTasks[taskTab].length === 0
                  ? <p className="text-xs text-white/30 text-center py-6">Sin tareas en este estado</p>
                  : tabTasks[taskTab].slice(0, 8).map(t => (
                      <div key={t.id} className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold"
                          style={{ backgroundColor: (t.assignedUser?.color || '#7c3aed') + '33', color: t.assignedUser?.color || '#a78bfa' }}>
                          {userInitials(t.assignedUser?.name ?? t.user?.name ?? null, t.assignedUser?.email ?? t.user?.email ?? '')}
                        </div>
                        <div className="flex-1 min-w-0"><RealTaskCard task={t} compact={true} /></div>
                      </div>
                    ))
              }
            </div>
            <Link href="/dashboard/tasks">
              <button className="w-full text-[11px] text-white/25 hover:text-violet-400 transition-colors py-1.5 text-center border-t border-white/[0.04]">
                Ver todas las tareas →
              </button>
            </Link>
          </div>
        );
      }

      case 'entregas_revision':
        return (
          <div className="space-y-2 overflow-y-auto custom-scrollbar" style={{ maxHeight: '280px' }}>
            {deliverables.length === 0
              ? <p className="text-xs text-white/30 text-center py-6">Sin entregas en revisión</p>
              : deliverables.slice(0, 5).map(t => {
                  const imgAttachment = (t as any).attachments?.find((a: any) => a.fileType?.startsWith('image/'));
                  const timeAgo = (() => {
                    const diff = Date.now() - new Date(t.updatedAt || t.createdAt).getTime();
                    const hrs = Math.floor(diff / 3600000);
                    if (hrs < 1) return 'Hace menos de 1h';
                    if (hrs < 24) return `Hace ${hrs} hora${hrs !== 1 ? 's' : ''}`;
                    return `Hace ${Math.floor(hrs / 24)} día${Math.floor(hrs/24) !== 1 ? 's' : ''}`;
                  })();
                  const assignee = t.assignedUser ?? t.user;
                  return (
                    <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-white/[0.05] hover:border-violet-500/20 transition-all"
                      style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-white/[0.06] flex items-center justify-center">
                        {imgAttachment
                          ? <img src={imgAttachment.fileUrl} alt={t.title} className="w-full h-full object-cover" />
                          : <CheckSquare className="w-5 h-5 text-white/20" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white/85 truncate">{t.title}</p>
                        <p className="text-[10px] text-white/35 truncate">{t.client?.name || 'Sin cliente'}</p>
                        <p className="text-[10px] text-white/25 mt-0.5">
                          Por {assignee?.name || assignee?.email?.split('@')[0] || 'Usuario'} · {timeAgo}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium"
                        style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}>
                        En revisión
                      </span>
                    </div>
                  );
                })
            }
            <Link href="/dashboard/tasks">
              <button className="w-full text-[11px] text-white/25 hover:text-violet-400 transition-colors py-1.5 text-center border-t border-white/[0.04]">
                Ver todas →
              </button>
            </Link>
          </div>
        );

      case 'team_activity':
        return (
          <div className="flex flex-col gap-4">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={activityData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#16161e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '8px 12px' }}
                  labelStyle={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', marginBottom: '4px' }}
                  itemStyle={{ color: '#a78bfa', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="completed" stroke="#8B5CF6" strokeWidth={2.5} dot={{ fill: '#8B5CF6', r: 4 }} activeDot={{ r: 6, fill: '#a78bfa' }} name="Completadas" />
                <Line type="monotone" dataKey="created" stroke="rgba(139,92,246,0.3)" strokeWidth={1.5} dot={false} name="Creadas" strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Completadas', value: activityData.reduce((a,d) => a+d.completed, 0), color: '#22C55E', trend: '+18%' },
                { label: 'Creadas', value: activityData.reduce((a,d) => a+d.created, 0), color: '#8B5CF6', trend: '+12%' },
                { label: 'En revisión', value: deliverables.length, color: '#F59E0B', trend: '' },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3 border border-white/[0.05]" style={{ background: '#0F1117' }}>
                  <p className="text-[10px] text-white/35 mb-1">{s.label}</p>
                  <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  {s.trend && <p className="text-[10px] text-green-400/70 mt-0.5">▲ {s.trend}</p>}
                </div>
              ))}
            </div>
          </div>
        );

      case 'active_clients':
        return (
          <div className="space-y-2 overflow-y-auto custom-scrollbar" style={{ maxHeight: '280px' }}>
            {activeClients.length === 0
              ? <p className="text-xs text-white/30 text-center py-6">Sin clientes activos</p>
              : activeClients.map(c => {
                  const pct = c.progress ?? (c.completedTasks && c.activeTasks + c.completedTasks > 0
                    ? Math.round(c.completedTasks / (c.activeTasks + c.completedTasks) * 100) : 0);
                  const health = pct >= 70 ? '#22C55E' : pct >= 40 ? '#F59E0B' : '#EF4444';
                  return (
                    <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-white/[0.05] hover:border-white/[0.08] transition-all"
                      style={{ background: '#0F1117' }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
                        style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa' }}>
                        {(c.name || 'C')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-white/85 truncate">{c.name}</p>
                          <span className="text-xs font-semibold shrink-0 ml-2" style={{ color: health }}>{pct}%</span>
                        </div>
                        <p className="text-[10px] text-white/35 truncate mb-1.5">{c.company || 'Sin campaña'}</p>
                        <div className="h-1.5 rounded-full w-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <motion.div className="h-full rounded-full"
                            style={{ background: 'linear-gradient(90deg, #7C3AED, #A855F7)' }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
            }
            <Link href="/dashboard/clients">
              <button className="w-full text-[11px] text-white/25 hover:text-violet-400 transition-colors py-1.5 text-center border-t border-white/[0.04]">
                Ver todos →
              </button>
            </Link>
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
        { label: 'Nueva tarea',   icon: Plus,       onClick: () => setTaskFormOpen(true)   },
        { label: 'Nueva reunión', icon: Video,      onClick: () => router.push('/dashboard/calendar') },
        { label: 'Nuevo cliente', icon: UserCircle, onClick: () => setClientFormOpen(true) },
        { label: 'Invitar',       icon: Users,      onClick: () => setInviteOpen(true)     },
      ]
    : [
        { label: 'Nueva tarea',   icon: Plus,       onClick: () => setTaskFormOpen(true)   },
      ];

  const draggableSections = sections.filter(s => s.id !== 'stats' && (s.visible || editMode));

  return (
    <div className="flex flex-col max-w-full overflow-x-hidden px-4 sm:px-6 lg:px-8 py-4 sm:py-6">

      {/* ══ ZONA 1: Header sticky dentro del scroll ══ */}
      <div className="sticky top-0 z-20 pb-4 pt-1 -mx-4 px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8"
        style={{ background: 'transparent' }}>

        {/* Fila 1: avatar + greeting + badge */}
        <div className="mb-3 flex items-center gap-3 pl-1">
          {/* Avatar usuario */}
          <Avatar className="h-9 w-9 shrink-0 ring-1 ring-white/[0.08] rounded-xl overflow-hidden">
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
              <motion.button
                key={action.label}
                onClick={action.onClick}
                className="flex h-9 items-center gap-2 rounded-lg px-4 text-[12px] transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}
                whileHover={{ scale: 1.02, background: 'rgba(255,255,255,0.07)' }}
                whileTap={{ scale: 0.97 }}
              >
                <Icon className="h-4 w-4" />
                {action.label}
              </motion.button>
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

      {/* ══ ZONA 2: Stats sticky debajo del header ══ */}
      <div className="sticky z-10 pb-4 -mx-4 px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8"
        style={{ top: 'var(--header-h, 120px)', background: 'transparent' }}>
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
      {/* ══ ZONA 3: Grid CSS puro — sin Reorder para evitar bugs layout ══
          Grid de 12 columnas. Cada sección ocupa su span.
          En editMode se activa el drag (Reorder).
          Máximo 8 secciones visibles en layout 2 filas x 4 cols. */}
      {!editMode ? (
        // Modo normal: CSS grid puro, sin framer-motion layout
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
            gap: '1rem',
            gridAutoFlow: 'row dense',
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          {draggableSections.map(section => (
            <div
              key={section.id}
              style={{ gridColumn: `span ${widthToSpan[section.width]}`, minWidth: 0, overflow: 'hidden' }}
            >
              <SectionWrapper
                id={section.id}
                title={SECTION_TITLES[section.id] || section.id}
                editMode={false}
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
            </div>
          ))}
        </div>
      ) : (
        // Modo edición: grid CSS + botones ↑↓ para mover secciones
        // El grid recalcula filas automáticamente al mover
        (() => {
          const rows: typeof draggableSections[] = [];
          let cur: typeof draggableSections = [];
          let curSpan = 0;
          draggableSections.forEach(s => {
            const sp = widthToSpan[s.width];
            if (curSpan + sp > 12 && cur.length > 0) {
              rows.push(cur); cur = [s]; curSpan = sp;
            } else { cur.push(s); curSpan += sp; }
          });
          if (cur.length > 0) rows.push(cur);

          // Mover sección a una posición específica en el array
          const moveSection = (id: string, direction: 'up' | 'down') => {
            setSections(prev => {
              const fixed = prev.filter(s => s.id === 'stats');
              const draggable = prev.filter(s => s.id !== 'stats');
              const idx = draggable.findIndex(s => s.id === id);
              if (idx === -1) return prev;
              const newDraggable = [...draggable];
              if (direction === 'up' && idx > 0) {
                [newDraggable[idx], newDraggable[idx - 1]] = [newDraggable[idx - 1], newDraggable[idx]];
              } else if (direction === 'down' && idx < newDraggable.length - 1) {
                [newDraggable[idx], newDraggable[idx + 1]] = [newDraggable[idx + 1], newDraggable[idx]];
              }
              return [...fixed, ...newDraggable];
            });
          };

          // Mover sección a otra fila directamente
          const moveSectionToRow = (id: string, targetRowIdx: number) => {
            setSections(prev => {
              const fixed = prev.filter(s => s.id === 'stats');
              const draggable = prev.filter(s => s.id !== 'stats');
              const idx = draggable.findIndex(s => s.id === id);
              if (idx === -1) return prev;
              const section = draggable[idx];
              const newDraggable = draggable.filter(s => s.id !== id);
              // Insertar al inicio de la fila destino
              const rowStart = rows.slice(0, targetRowIdx).reduce((a, r) => a + r.length, 0);
              const insertAt = Math.min(rowStart, newDraggable.length);
              newDraggable.splice(insertAt, 0, section);
              return [...fixed, ...newDraggable];
            });
          };

          return (
            <div className="space-y-4">
              {rows.map((row, ri) => (
                <motion.div
                  key={row.map(s => s.id).join('-')}
                  layout
                  className="flex gap-4 relative"
                >
                  {/* Drop zone indicator */}
                  <div className="absolute -top-2 left-0 right-0 h-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'rgba(124,58,237,0.3)' }} />

                  {row.map((section, si) => {
                    const pct = (widthToSpan[section.width] / 12) * 100;
                    const gapCorr = (row.length - 1) * 16 / row.length;
                    const globalIdx = draggableSections.findIndex(s => s.id === section.id);
                    const isFirst = globalIdx === 0;
                    const isLast = globalIdx === draggableSections.length - 1;

                    return (
                      <motion.div
                        key={section.id}
                        layout
                        style={{ width: `calc(${pct}% - ${gapCorr}px)`, minWidth: 0, flexShrink: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                      >
                        {/* Controles de posición en editMode */}
                        <div className="flex items-center justify-between mb-1.5 px-1">
                          <div className="flex items-center gap-1">
                            {/* Mover a fila anterior */}
                            {ri > 0 && (
                              <button
                                onClick={() => moveSectionToRow(section.id, ri - 1)}
                                className="flex items-center gap-1 text-[10px] text-white/30 hover:text-violet-400 transition-colors px-1.5 py-0.5 rounded border border-white/[0.06] hover:border-violet-500/30"
                                title="Mover a fila anterior"
                              >
                                ↑ Subir fila
                              </button>
                            )}
                            {/* Mover a fila siguiente */}
                            {ri < rows.length - 1 && (
                              <button
                                onClick={() => moveSectionToRow(section.id, ri + 1)}
                                className="flex items-center gap-1 text-[10px] text-white/30 hover:text-violet-400 transition-colors px-1.5 py-0.5 rounded border border-white/[0.06] hover:border-violet-500/30"
                                title="Mover a fila siguiente"
                              >
                                ↓ Bajar fila
                              </button>
                            )}
                          </div>
                          {/* Mover izq/der dentro de la fila */}
                          <div className="flex items-center gap-1">
                            {!isFirst && (
                              <button onClick={() => moveSection(section.id, 'up')}
                                className="text-[10px] text-white/25 hover:text-violet-400 transition-colors w-5 h-5 flex items-center justify-center rounded border border-white/[0.06]">
                                ←
                              </button>
                            )}
                            {!isLast && (
                              <button onClick={() => moveSection(section.id, 'down')}
                                className="text-[10px] text-white/25 hover:text-violet-400 transition-colors w-5 h-5 flex items-center justify-center rounded border border-white/[0.06]">
                                →
                              </button>
                            )}
                          </div>
                        </div>

                        <SectionWrapper
                          id={section.id}
                          title={SECTION_TITLES[section.id] || section.id}
                          editMode={true}
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
                      </motion.div>
                    );
                  })}
                </motion.div>
              ))}
            </div>
          );
        })()
      )}



      {/* ══ Modales de acción rápida ══ */}
      <TaskForm
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        isManager={isManager}
        onSuccess={() => {
          setTaskFormOpen(false);
          fetch('/api/tasks?scope=mine').then(r => r.ok ? r.json() : null).then(d => { if (d) setTasks(d.tasks || d || []); });
        }}
      />
      <ClientForm
        open={clientFormOpen}
        onOpenChange={setClientFormOpen}
        isAdmin={userRole === 'ADMIN'}
        onSuccess={() => setClientFormOpen(false)}
      />
      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />
    </div>
  );
}