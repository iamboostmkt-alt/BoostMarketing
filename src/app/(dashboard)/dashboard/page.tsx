'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Users,
  CheckSquare,
  UserCircle,
  DollarSign,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  User,
  Briefcase,
  Filter,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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
import type { DashboardStats, Task } from '@/lib/types';
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
    fetch('/api/tasks?limit=5').then((r) => r.ok ? r.json() : null).then((d) => {
      if (d) setTasks(d.tasks || d || []);
    }).finally(() => setLoadingTasks(false));
  }, []);

  // ── Fetch team data (admin/PM only) ──────────────────────────────────────
  useEffect(() => {
    if (!isManager) { setLoadingTeam(false); return; }
    fetch('/api/tasks?scope=all&limit=50').then((r) => r.ok ? r.json() : null).then((d) => {
      const all: Task[] = d?.tasks || [];
      setTeamTasks(all);
      const seen = new Set<string>();
      const users: AdminUser[] = [];
      const pushUser = (u: { id: string; name: string | null; email: string; color: string } | null | undefined) => {
        if (!u || seen.has(u.id)) return;
        seen.add(u.id);
        users.push(u as AdminUser);
      };
      for (const t of all) {
        pushUser(t.user);
        pushUser(t.assignedUser);
        for (const u of t.assignedUsers ?? []) pushUser(u);
      }
      setTeamUsers(users);
    }).finally(() => setLoadingTeam(false));
  }, [isManager]);

  const filteredTeamTasks = teamTasks.filter((t) => {
    if (teamStatusFilter !== 'all' && t.status !== teamStatusFilter) return false;
    if (teamUserFilter !== 'all') {
      const uid = teamUserFilter;
      const inPivot = (t.assignedUsers ?? []).some((u) => u.id === uid);
      if (t.userId !== uid && t.assignedUserId !== uid && !inPivot) return false;
    }
    return true;
  });

  const statCards = [
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
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-white">
          Bienvenido,{' '}
          <span className="text-gradient-brand">{userName}</span>
        </h2>
        <p className="text-white/40 mt-1">Aquí tienes un resumen de tu actividad reciente.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="glass-card rounded-xl p-5 hover:border-white/[0.1] transition-colors">
              <div className="flex items-start justify-between">
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${stat.up ? 'text-green-400' : 'text-red-400'}`}>
                  {stat.up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {stat.change}
                </div>
              </div>
              <div className="mt-4">
                {loadingStats ? (
                  <Skeleton className="h-8 w-20 mb-1" />
                ) : (
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                )}
                <p className="text-sm text-white/40 mt-0.5">{stat.label}</p>
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

      {/* ── Team tasks (admin / PM only) ─────────────────────────────────────── */}
      {isManager && (
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
      )}

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent tasks */}
        <div className="lg:col-span-2 glass-card rounded-xl">
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-semibold text-white">Tareas Recientes</h3>
            </div>
            <Link href="/dashboard/tasks">
              <Button variant="ghost" size="sm" className="text-white/40 hover:text-white hover:bg-white/[0.06] text-xs">
                Ver todas
              </Button>
            </Link>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {loadingTasks ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 md:px-6">
                  <Skeleton className="h-4 w-4 rounded shrink-0" />
                  <div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/3" /></div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))
            ) : tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckSquare className="w-10 h-10 text-white/20 mb-3" />
                <p className="text-sm text-white/40">No hay tareas recientes</p>
                <Link href="/dashboard/tasks?action=create">
                  <Button size="sm" variant="outline" className="mt-3 border-white/[0.1] text-white/50 hover:text-white hover:bg-white/[0.06]">
                    <Plus className="w-4 h-4 mr-1" />Crear tarea
                  </Button>
                </Link>
              </div>
            ) : (
              tasks.map((task) => (
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
              ))
            )}
          </div>
        </div>

        {/* Activity timeline */}
        <div className="glass-card rounded-xl">
          <div className="flex items-center gap-2 p-4 md:p-6 border-b border-white/[0.06]">
            <Clock className="w-5 h-5 text-brand-light" />
            <h3 className="text-base font-semibold text-white">Actividad Reciente</h3>
          </div>
          <ActivityTimeline />
        </div>
      </div>
    </div>
  );
}
