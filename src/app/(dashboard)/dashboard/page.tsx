'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Users,
  CheckSquare, CheckCircle2,
  UserCircle,
  DollarSign,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  User,
  Briefcase,
  Filter,
  Video,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ActivityTimeline from '@/components/dashboard/ActivityTimeline';
import type { DashboardStats, Task, Appointment } from '@/lib/types';
import {
  statusLabels, statusColors, priorityLabels, priorityColors,
} from '@/lib/theme-maps';

const MANAGER_ROLES = ['ADMIN', 'PROJECT_MANAGER'];

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  color: string;
}

function userInitials(name: string | null, email: string) {
  return (name || email).split(/[\s@]/).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function RecentTasksList({ tasks }: { tasks: Task[] }) {
  const [showCompleted, setShowCompleted] = useState(false);
  const activeTasks    = tasks.filter(t => t.status !== 'completed' && t.status !== 'approved');
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'approved');

  return (
    <>
      {activeTasks.map((task) => (
        <div key={task.id} className="flex items-center gap-4 p-4 md:px-6 hover:bg-white/[0.02] transition-colors">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white/90 truncate">{task.title}</p>
            {task.description && (
              <p className="text-xs text-white/40 mt-0.5 truncate">{task.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[task.status] || 'status-pending'}`}>
              {statusLabels[task.status] || task.status}
            </span>
            <span className={`text-xs font-medium hidden sm:inline ${priorityColors[task.priority] || 'text-white/40'}`}>
              {priorityLabels[task.priority] || task.priority}
            </span>
            {task.dueDate && (
              <div className="hidden md:flex items-center gap-1 text-xs text-white/30">
                <Clock className="w-3 h-3" />
                {new Date(task.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </div>
            )}
          </div>
        </div>
      ))}
      {completedTasks.length > 0 && (
        <div className="border-t border-white/[0.04]">
          <button type="button" onClick={() => setShowCompleted(v => !v)}
            className="w-full flex items-center justify-between px-4 md:px-6 py-2.5 hover:bg-white/[0.02] transition-colors">
            <div className="flex items-center gap-2 text-xs text-white/30">
              <CheckSquare className="w-3.5 h-3.5 text-green-400/50" />
              Listas ({completedTasks.length})
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-white/20 transition-transform ${showCompleted ? 'rotate-180' : ''}`} />
          </button>
          {showCompleted && completedTasks.map((task) => (
            <div key={task.id} className="flex items-center gap-4 px-4 md:px-6 py-2.5 opacity-50">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/50 line-through truncate">{task.title}</p>
              </div>
              <span className="text-[10px] text-green-400/60">Completada</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats]           = useState<DashboardStats | null>(null);
  const [tasks, setTasks]           = useState<Task[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);

  // Team tasks state (admin/PM only)
  const [teamTasks,        setTeamTasks]        = useState<Task[]>([]);
  const [loadingTeam,      setLoadingTeam]       = useState(true);
  const [teamUsers,        setTeamUsers]         = useState<AdminUser[]>([]);
  const [teamUserFilter,   setTeamUserFilter]    = useState('all');
  const [teamStatusFilter, setTeamStatusFilter]  = useState('all');

  // Meetings state (admin/PM only)
  const [meetings,        setMeetings]        = useState<Appointment[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [meetingsOpen,    setMeetingsOpen]    = useState(true);
  const [deletingMeeting, setDeletingMeeting] = useState<string | null>(null);

  const userName  = session?.user?.name || 'Usuario';
  const userRole  = session?.user?.role as string | undefined;
  const isManager = MANAGER_ROLES.includes(userRole ?? '');

  // Redirect CLIENT users to their portal
  useEffect(() => {
    if (status === 'authenticated' && userRole === 'CLIENT') {
      router.replace('/dashboard/client-portal');
    }
  }, [status, userRole, router]);

  // ── Fetch personal data ──────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/stats').then((r) => r.ok ? r.json() : null).then((d) => {
      if (d) setStats(d);
    }).finally(() => setLoadingStats(false));
  }, []);

  useEffect(() => {
    const url = isManager ? '/api/tasks?limit=5' : '/api/tasks?scope=mine';
    fetch(url).then((r) => r.ok ? r.json() : null).then((d) => {
      if (d) setTasks(d.tasks || d || []);
    }).finally(() => setLoadingTasks(false));
  }, [isManager]);

  // ── Fetch team data (admin/PM only) ──────────────────────────────────────
  useEffect(() => {
    if (!isManager) { setLoadingTeam(false); return; }
    Promise.all([
      fetch('/api/tasks?scope=all').then(r => r.ok ? r.json() : null),
      fetch('/api/team-members').then(r => r.ok ? r.json() : null),
    ]).then(([tasksData, usersData]) => {
      const all: Task[] = tasksData?.tasks || [];
      setTeamTasks(all);
      // Usar todos los usuarios del equipo, no solo los que tienen tareas
      const allUsers: AdminUser[] = (usersData?.users || [])
        .filter((u: any) => u.role !== 'CLIENT' && u.role !== 'UNASSIGNED');
      setTeamUsers(allUsers);
    }).finally(() => setLoadingTeam(false));
  }, [isManager]);

  // Fetch upcoming meetings — todos los roles
  useEffect(() => {
    Promise.all([
      fetch('/api/appointments?upcoming=1').then(r => r.ok ? r.json() : null),
      fetch('/api/meetings').then(r => r.ok ? r.json() : null),
    ]).then(([appts, meets]) => {
      const a = appts?.appointments || [];
      const m = (meets?.meetings || []).filter((x: any) => new Date(x.date) >= new Date());
      setMeetings([...a, ...m].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    }).finally(() => setLoadingMeetings(false));
  }, []);

  async function handleDeleteMeeting(id: string) {
    if (!confirm('¿Eliminar esta videollamada?')) return;
    setDeletingMeeting(id);
    try {
      const res = await fetch('/api/appointments?id=' + id, { method: 'DELETE' });
      if (res.ok) setMeetings((prev) => prev.filter((m) => m.id !== id));
    } finally { setDeletingMeeting(null); }
  }

  const filteredTeamTasks = teamTasks.filter((t) => {
    if (teamStatusFilter !== 'all' && t.status !== teamStatusFilter) return false;
    if (teamUserFilter !== 'all') {
      const uid = teamUserFilter;
      const inPivot = (t.assignedUsers ?? []).some((u) => u.id === uid);
      if (t.userId !== uid && t.assignedUserId !== uid && !inPivot) return false;
    }
    return true;
  });

  const now = new Date();
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());
  const todayTasks  = tasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === now.toDateString() && t.status !== 'completed' && t.status !== 'approved');
  const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed' && t.status !== 'approved');
  const completedThisWeek = tasks.filter(t => (t.status === 'completed' || t.status === 'approved') && t.updatedAt && new Date(t.updatedAt) >= startOfWeek);
  const nextMeeting = meetings.filter(m => new Date(m.date) >= now).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const statCards = isManager ? [
    {
      label: 'Total Contactos',
      value: stats?.totalContacts || 0,
      icon: Users,
      color: 'text-brand-light',
      bgColor: 'bg-brand/10',
      change: '+12%', up: true,
    },
    {
      label: 'Tareas Pendientes',
      value: stats ? stats.totalTasks - stats.completedTasks : 0,
      icon: CheckSquare,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-400/10',
      change: '-5%', up: false,
    },
    {
      label: 'Clientes Activos',
      value: stats?.activeClients || 0,
      icon: UserCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
      change: '+8%', up: true,
    },
    {
      label: 'Ingresos Totales',
      value: `$${(stats?.totalRevenue || 0).toLocaleString('es-ES')}`,
      icon: DollarSign,
      color: 'text-amber-400',
      bgColor: 'bg-amber-400/10',
      change: '+23%', up: true,
    },
  ] : [
    {
      label: 'Tareas Hoy',
      value: todayTasks.length,
      icon: CheckSquare,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-400/10',
      change: '', up: true,
    },
    {
      label: 'Vencidas',
      value: overdueTasks.length,
      icon: Clock,
      color: overdueTasks.length > 0 ? 'text-red-400' : 'text-white/40',
      bgColor: overdueTasks.length > 0 ? 'bg-red-400/10' : 'bg-white/[0.04]',
      change: '', up: false,
    },
    {
      label: 'Listas esta semana',
      value: completedThisWeek.length,
      icon: UserCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
      change: '', up: true,
    },
    {
      label: 'Próxima reunión',
      value: nextMeeting ? new Date(nextMeeting.date).toLocaleDateString('es-MX', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '—',
      icon: Video,
      color: 'text-amber-400',
      bgColor: 'bg-amber-400/10',
      change: '', up: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-white/30 uppercase tracking-widest mb-1">Dashboard</p>
          <h2 className="text-xl font-medium text-white">
            Hola,{' '}
            <span className="text-gradient-brand">{userName}</span>
          </h2>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="glass-card rounded-xl p-5 hover:border-white/[0.1] transition-colors duration-200 group">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-white/35 uppercase tracking-wide">{stat.label}</p>
                {stat.change && (
                  <div className={`flex items-center gap-0.5 text-[11px] font-medium ${stat.up ? 'text-green-400/70' : 'text-red-400/70'}`}>
                    {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {stat.change}
                  </div>
                )}
              </div>
              <div className="flex items-end justify-between">
                {loadingStats ? (
                  <Skeleton className="h-9 w-24" />
                ) : (
                  <motion.p
                    key={String(stat.value)}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="text-3xl font-semibold text-white leading-none"
                  >
                    {stat.value}
                  </motion.p>
                )}
                <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${stat.bgColor} opacity-60 group-hover:opacity-100 transition-opacity duration-200`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/tasks?action=create">
          <Button size="sm" className="bg-brand hover:bg-brand-dark text-white gap-2">
            <Plus className="w-4 h-4" />Nueva Tarea
          </Button>
        </Link>
        <Link href="/dashboard/crm?action=create">
          <Button size="sm" variant="outline" className="border-white/[0.1] text-white/70 hover:text-white hover:bg-white/[0.06] gap-2">
            <Plus className="w-4 h-4" />Nuevo Contacto
          </Button>
        </Link>
        <Link href="/dashboard/clients?action=create">
          <Button size="sm" variant="outline" className="border-white/[0.1] text-white/70 hover:text-white hover:bg-white/[0.06] gap-2">
            <Plus className="w-4 h-4" />Nuevo Cliente
          </Button>
        </Link>
      </div>

      {/* ── Equipo + Reuniones + Tareas en grid 3 cols ── */}
      {isManager && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
        <div className="glass-card rounded-xl">
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/[0.06] flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-semibold text-white">Equipo de Trabajo</h3>
              <span className="text-xs text-white/30 ml-1">
                {loadingTeam ? '…' : `${filteredTeamTasks.length} tareas`}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-white/30" />
              {/* Status filter */}
              <Select value={teamStatusFilter} onValueChange={setTeamStatusFilter}>
                <SelectTrigger className="h-7 w-32 bg-white/[0.04] border-white/[0.08] text-white text-xs focus:ring-brand">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#15151c] border-white/[0.08] text-white">
                  <SelectItem value="all" className="text-xs focus:bg-white/[0.06]">Todos estados</SelectItem>
                  <SelectItem value="pending"     className="text-xs focus:bg-white/[0.06]">Pendiente</SelectItem>
                  <SelectItem value="in_progress" className="text-xs focus:bg-white/[0.06]">En progreso</SelectItem>
                  <SelectItem value="completed"   className="text-xs focus:bg-white/[0.06]">Completado</SelectItem>
                </SelectContent>
              </Select>
              {/* User filter */}
              {teamUsers.length > 0 && (
                <Select value={teamUserFilter} onValueChange={setTeamUserFilter}>
                  <SelectTrigger className="h-7 w-36 bg-white/[0.04] border-white/[0.08] text-white text-xs focus:ring-brand">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#15151c] border-white/[0.08] text-white">
                    <SelectItem value="all" className="text-xs focus:bg-white/[0.06]">Todos usuarios</SelectItem>
                    {teamUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id} className="text-xs focus:bg-white/[0.06]">
                        {u.name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <div className="divide-y divide-white/[0.04] max-h-80 overflow-y-auto custom-scrollbar">
            {loadingTeam ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 md:px-6">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))
            ) : filteredTeamTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Briefcase className="w-8 h-8 text-white/15 mb-3" />
                <p className="text-sm text-white/40">No hay tareas con los filtros actuales</p>
              </div>
            ) : (
              filteredTeamTasks.map((task) => {
                const owner = task.user;
                const assignee = task.assignedUser;
                return (
                  <div key={task.id} className="flex items-center gap-3 p-4 md:px-6 hover:bg-white/[0.02] transition-colors">
                    {/* Owner avatar */}
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={(owner as { image?: string } | null | undefined)?.image || undefined} />
                      <AvatarFallback
                        className="text-xs font-medium"
                        style={{
                          backgroundColor: (owner?.color || '#7c3aed') + '33',
                          color: owner?.color || '#7c3aed',
                        }}
                      >
                        {userInitials(owner?.name ?? null, owner?.email ?? '')}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/90 truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-white/35">{owner?.name || owner?.email}</span>
                        {assignee && assignee.id !== owner?.id && (
                          <>
                            <span className="text-white/20 text-xs">→</span>
                            <div className="flex items-center gap-1">
                              <Avatar className="h-4 w-4">
                                <AvatarFallback
                                  className="text-[9px]"
                                  style={{
                                    backgroundColor: (assignee.color || '#7c3aed') + '33',
                                    color: assignee.color || '#7c3aed',
                                  }}
                                >
                                  {userInitials(assignee.name, assignee.email)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-white/30">{assignee.name || assignee.email}</span>
                            </div>
                          </>
                        )}
                        {task.dueDate && (
                          <div className="flex items-center gap-1 text-xs text-white/25">
                            <Clock className="w-3 h-3" />
                            {new Date(task.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[task.status] || 'status-pending'}`}>
                        {statusLabels[task.status] || task.status}
                      </span>
                      <span className={`text-xs font-medium hidden sm:inline ${priorityColors[task.priority] || 'text-white/40'}`}>
                        {priorityLabels[task.priority] || task.priority}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {!loadingTeam && teamTasks.length > 10 && (
            <div className="p-4 border-t border-white/[0.04]">
              <Link href="/dashboard/tasks">
                <Button variant="ghost" size="sm" className="w-full text-white/40 hover:text-white hover:bg-white/[0.06] text-xs">
                  Ver todas las tareas del equipo
                </Button>
              </Link>
            </div>
          )}
        </div>


          </div>
          <div>
            <div className="glass-card rounded-xl">
          <div
            className="flex items-center justify-between p-4 md:p-6 border-b border-white/[0.06] cursor-pointer select-none"
            onClick={() => setMeetingsOpen((p) => !p)}
          >
            <div className="flex items-center gap-2">
              <Video className="w-5 h-5 text-green-400" />
              <h3 className="text-base font-semibold text-white">Reuniones Proximas</h3>
              <span className="text-xs text-white/30 ml-1">
                {loadingMeetings ? '...' : `${meetings.length} reunion${meetings.length !== 1 ? 'es' : ''}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {meetings.length > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20 text-[10px] font-bold text-green-300">
                  {meetings.length}
                </span>
              )}
              {meetingsOpen ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
            </div>
          </div>

          {meetingsOpen && (
            <div className="divide-y divide-white/[0.04] max-h-80 overflow-y-auto custom-scrollbar">
              {loadingMeetings ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 md:px-6">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                ))
              ) : meetings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Video className="w-8 h-8 text-white/15 mb-3" />
                  <p className="text-sm text-white/40">No hay reuniones proximas</p>
                </div>
              ) : (
                meetings.map((m) => {
                  const assigned = (m as any).assignedUsers ?? [];
                  return (
                    <div key={m.id} className="flex items-center gap-3 p-4 md:px-6 hover:bg-white/[0.02] transition-colors group">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/10 shrink-0">
                        <Video className="w-4 h-4 text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white/90 truncate">{m.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-white/35">{m.email}</span>
                          <div className="flex items-center gap-1 text-xs text-white/25">
                            <Clock className="w-3 h-3" />
                            {new Date(m.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {assigned.length > 0 && (
                            <div className="flex -space-x-1">
                              {assigned.slice(0, 3).map((a: any) => {
                                const u = a.user ?? a;
                                return (
                                  <Avatar key={u.id} className="h-4 w-4 border border-[#0e0e14]">
                                    <AvatarImage src={u.image || undefined} />
                                    <AvatarFallback className="text-[8px]"
                                      style={{ backgroundColor: (u.color || '#7c3aed') + '33', color: u.color || '#7c3aed' }}>
                                      {(u.name || u.email || '?').slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                );
                              })}
                              {assigned.length > 3 && (
                                <span className="text-[10px] text-white/30 pl-1">+{assigned.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          m.status === 'confirmed' ? 'bg-green-500/15 text-green-300' :
                          m.status === 'cancelled' ? 'bg-red-500/15 text-red-300' :
                          'bg-amber-500/15 text-amber-300'
                        }`}>
                          {m.status === 'confirmed' ? 'Confirmada' : m.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                        </span>
                        <button
                          type="button"
                          disabled={deletingMeeting === m.id}
                          onClick={() => handleDeleteMeeting(m.id)}
                          className="p-1 rounded text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
        </div>

        {/* Col 3: Tareas activas */}
        <div className="glass-card rounded-xl flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">Tareas Activas</h3>
              <span className="text-[10px] bg-cyan-500/15 text-cyan-300 px-1.5 py-0.5 rounded-full">
                {tasks.filter(t => t.status !== 'completed' && t.status !== 'approved').length}
              </span>
            </div>
            <Link href="/dashboard/tasks">
              <Button variant="ghost" size="sm" className="text-white/40 hover:text-white hover:bg-white/[0.06] text-xs h-7">Ver todas</Button>
            </Link>
          </div>
          <div className="divide-y divide-white/[0.04] flex-1 overflow-y-auto max-h-[400px] custom-scrollbar">
            {loadingTasks ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="h-3 w-3 rounded shrink-0" />
                  <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-3/4" /><Skeleton className="h-2.5 w-1/3" /></div>
                </div>
              ))
            ) : tasks.filter(t => t.status !== 'completed' && t.status !== 'approved').length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckSquare className="w-8 h-8 text-white/20 mb-2" />
                <p className="text-xs text-white/40">Sin tareas activas</p>
              </div>
            ) : (
              <RecentTasksList tasks={tasks} />
            )}
          </div>
        </div>

        </div>
      )}

      {/* ── Dashboard Equipo de Trabajo ── */}
      {!isManager && (
        <div className="space-y-6">

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Col 1: Mis tareas activas */}
            <div className="glass-card rounded-xl flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-violet-400" />
                  <h3 className="text-sm font-semibold text-white">Mis Tareas</h3>
                  <span className="text-[10px] bg-violet-500/15 text-violet-300 px-1.5 py-0.5 rounded-full">
                    {tasks.filter(t => t.status !== 'completed' && t.status !== 'approved').length}
                  </span>
                </div>
                <Link href="/dashboard/tasks">
                  <Button variant="ghost" size="sm" className="text-white/40 hover:text-white hover:bg-white/[0.06] text-xs h-7">
                    Ver todas
                  </Button>
                </Link>
              </div>
              <div className="divide-y divide-white/[0.04] flex-1 overflow-y-auto max-h-[400px] custom-scrollbar">
                {loadingTasks ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3">
                      <Skeleton className="h-3 w-3 rounded shrink-0" />
                      <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-3/4" /><Skeleton className="h-2.5 w-1/3" /></div>
                    </div>
                  ))
                ) : tasks.filter(t => t.status !== 'completed' && t.status !== 'approved').length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <CheckSquare className="w-8 h-8 text-white/20 mb-2" />
                    <p className="text-xs text-white/40">Sin tareas activas 🎉</p>
                  </div>
                ) : (
                  <RecentTasksList tasks={tasks.filter(t => t.status !== 'completed' && t.status !== 'approved')} />
                )}
              </div>
            </div>

            {/* Col 2: Próximas reuniones */}
            <div className="glass-card rounded-xl">
              <div className="flex items-center gap-2 p-4 border-b border-white/[0.06]">
                <Video className="w-4 h-4 text-green-400" />
                <h3 className="text-sm font-semibold text-white">Próximas Reuniones</h3>
              </div>
              <div className="p-4 space-y-3">
                {loadingMeetings ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="flex gap-3"><Skeleton className="h-10 w-10 rounded-lg" /><div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-3/4" /><Skeleton className="h-2.5 w-1/2" /></div></div>
                  ))
                ) : meetings.length === 0 ? (
                  <p className="text-xs text-white/30 text-center py-6">Sin reuniones próximas</p>
                ) : (
                  meetings.filter((m: any) => new Date(m.date) >= new Date()).slice(0, 5).map((m: any) => (
                    <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 flex flex-col items-center justify-center shrink-0">
                        <p className="text-sm font-bold text-green-300 leading-none">{new Date(m.date).getDate()}</p>
                        <p className="text-[9px] text-green-400/60 uppercase">{new Date(m.date).toLocaleDateString('es-MX', { month: 'short' })}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white/90 truncate">{m.name || m.title}</p>
                        <p className="text-xs text-white/40">{new Date(m.date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      {m.meetLink && (
                        <a href={m.meetLink} target="_blank" rel="noopener noreferrer"
                          className="shrink-0 text-[10px] px-2 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300 hover:bg-sky-500/20 transition-all">
                          Unirse
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Tareas completadas recientemente */}
            <div className="glass-card rounded-xl">
              <div className="flex items-center gap-2 p-4 border-b border-white/[0.06]">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <h3 className="text-sm font-semibold text-white">Completadas Recientemente</h3>
              </div>
              <div className="divide-y divide-white/[0.04] max-h-[280px] overflow-y-auto custom-scrollbar">
                {loadingTasks ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3">
                      <Skeleton className="h-3 w-3 rounded-full shrink-0" />
                      <Skeleton className="h-3 flex-1" />
                    </div>
                  ))
                ) : tasks.filter(t => t.status === 'completed' || t.status === 'approved').length === 0 ? (
                  <p className="text-xs text-white/30 text-center py-6">Aún no hay tareas completadas</p>
                ) : (
                  tasks.filter(t => t.status === 'completed' || t.status === 'approved').slice(0, 10).map(t => (
                    <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400/60 shrink-0" />
                      <span className="flex-1 text-xs text-white/40 line-through truncate">{t.title}</span>
                      {(t as any).client?.name && (
                        <span className="text-[10px] text-white/20 shrink-0">{(t as any).client.name}</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
