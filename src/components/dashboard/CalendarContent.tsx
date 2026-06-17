'use client';
 
import { useEffect, useState, useMemo, useCallback } from 'react';
import { MANAGER_ROLES } from '@/core/constants/roles';
import { useSession } from 'next-auth/react';
import {
  CalendarDays, Plus, CheckSquare, CheckCircle2, ChevronDown, Clock, Video, Pencil, Trash2,
  Sparkles,
} from 'lucide-react';
import {
  format, isSameDay, isToday,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
 
import TaskForm from '@/components/dashboard/TaskForm';
import TaskDetailModal from '@/components/dashboard/TaskDetailModal';
import CalendarGrid from '@/components/dashboard/CalendarGrid';
import type { Task, Activity, Appointment } from '@/lib/types';
import { bus, RT_EVENTS } from '@/lib/event-bus';
import {
  statusColors, statusLabels, priorityColors, priorityLabels, statusStyleMap,
} from '@/lib/theme-maps';
 
 
import { dayLabel, sameLocalDay } from '@/components/calendar/calendar-utils';
import AppointmentEditModal from '@/components/calendar/AppointmentEditModal';
import { MeetingDialog } from '@/components/dashboard/MeetingsTab';
import CalendarDayModal from '@/components/calendar/CalendarDayModal';

function TaskAvatar({ u }: { u: { name: string | null; email: string; color: string; image?: string | null } | undefined }) {
  if (!u) return null;
  const initials = (u.name || u.email || 'U').split(/[\s@]/).map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <Avatar className="w-5 h-5">
      {u.image && <AvatarImage src={u.image} />}
      <AvatarFallback style={{ background: u.color }} className="text-[8px] text-white font-bold">{initials}</AvatarFallback>
    </Avatar>
  );
}

function CompletedTasksSection({ tasks }: { tasks: any[] }) {
  const [open, setOpen] = useState(false);
  if (tasks.length === 0) return null;
  return (
    <div className="border border-[var(--wl-border)] rounded-xl overflow-hidden">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-[11px] text-[var(--wl-text-muted)] hover:text-[var(--wl-text-secondary)] transition-colors">
        <span>Completadas ({tasks.length})</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1">
          {tasks.map((task: any) => (
            <div key={task.id} className="flex items-center gap-2 py-1">
              <CheckCircle2 className="w-3 h-3 text-green-400/50 shrink-0" />
              <span className="text-[11px] text-white/30 line-through truncate">{task.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Wrapper que carga teamUsers/clients para el MeetingDialog
function MeetingDialogWrapper({ open, onOpenChange, onSaved, initialDate }: {
  open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void; initialDate?: Date | null;
}) {
  const { data: session } = useSession();
  const myRole = (session?.user as any)?.role || '';
  const [teamUsers, setTeamUsers] = useState<any[]>([]);
  const [clients,   setClients]   = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;
    fetch('/api/team-members').then(r => r.json()).then(d => setTeamUsers(d.users ?? [])).catch(() => {});
    fetch('/api/clients').then(r => r.json()).then(d => setClients(d.clients ?? [])).catch(() => {});
  }, [open]);

  return (
    <MeetingDialog
      open={open}
      onOpenChange={onOpenChange}
      teamUsers={teamUsers}
      clients={clients.map((c: any) => ({ id: c.id, name: c.name, email: c.email || '', company: c.company || '' }))}
      userRole={myRole}
      initialDate={initialDate ?? undefined}
      onSaved={onSaved}
    />
  );
}

export default function CalendarContent() {
  const { data: session } = useSession();
  const role      = session?.user?.role ?? '';
  const userId    = session?.user?.id ?? '';
  const isAdmin   = role === 'ADMIN';
  const isPM      = role === 'PROJECT_MANAGER';
  const isManager = isAdmin || isPM;
  const isClient  = role === 'CLIENT';

  type CalView = 'mine' | 'team' | 'clients' | 'all' | 'meetings' | 'deliveries';
  interface ClientOption { id: string; name: string; company?: string | null; }

  const [calView,      setCalView]      = useState<CalView>('mine');
  const [selectedClientId,  setSelectedClientId]  = useState<string>('all');
  const [clientOptions,     setClientOptions]     = useState<ClientOption[]>([]);
  const [tasks,        setTasks]        = useState<Task[]>([]);
  const [activities,   setActivities]   = useState<Activity[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [selectedDay,  setSelectedDay]  = useState<Date>(new Date());
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask,        setEditingTask]        = useState<Task | null>(null);
  const [detailTask,         setDetailTask]         = useState<Task | null>(null);
  const [detailOpen,         setDetailOpen]         = useState(false);
  const [apptEditOpen,       setApptEditOpen]       = useState(false);
  const [meetDialogOpen,     setMeetDialogOpen]     = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [apptInitialDate,    setApptInitialDate]    = useState<Date | null>(null);
  const [milestones,         setMilestones]         = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Endpoint unificado — 1 fetch en lugar de 4
      let scope = 'mine';
      if (calView === 'all' && isAdmin)         scope = 'all';
      else if (calView === 'team' && isManager) scope = 'all';
      else if (calView === 'clients')           scope = 'clients-with-tasks';
      else if (calView === 'deliveries')        scope = isAdmin ? 'all' : 'mine';

      const res = await fetch(`/api/calendar?scope=${scope}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
        setActivities(data.activities || []);
        setMilestones(data.milestones || []);
        if (!isClient) {
          const allAppointments = [
            ...(data.appointments || []),
            ...(data.meetings     || []),
          ];
          setAppointments(allAppointments);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [calView, isAdmin, isManager, isClient]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Cargar opciones de clientes para el selector
  useEffect(() => {
    if (!role) return; // esperar a que session esté lista
    fetch('/api/clients')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.clients) setClientOptions(d.clients);
      })
      .catch(() => {});
  }, [role]);



  useEffect(() => {
    const unsubs = [
      bus.on<{ task: Task }>(RT_EVENTS.TASK_CREATED, ({ task }) => {
        setTasks((prev) => prev.some((t) => t.id === task.id) ? prev : [task, ...prev]);
      }),
      bus.on<{ task: Task }>(RT_EVENTS.TASK_UPDATED, ({ task }) => {
        setTasks((prev) => prev.map((t) => t.id === task.id ? task : t));
      }),
      bus.on<{ id: string }>(RT_EVENTS.TASK_DELETED, ({ id }) => {
        setTasks((prev) => prev.filter((t) => t.id !== id));
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 12_000);
    return () => clearTimeout(t);
  }, []);

  const handleDeleteTask = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== id));
        bus.emit(RT_EVENTS.TASK_DELETED, { id });
        toast.success('Tarea eliminada');
      } else { toast.error('Error al eliminar la tarea'); }
    } catch { toast.error('Error de red'); }
  };

  const handleDeleteAppointment = async (id: string) => {
    try {
      const appt = appointments.find(a => a.id === id);
      const isMeeting = appt && (appt as any).email?.endsWith('@internal.boost');
      const apiUrl = isMeeting ? `/api/meetings?id=${id}` : `/api/appointments?id=${id}`;
      const res = await fetch(apiUrl, { method: 'DELETE' });
      if (res.ok) {
        setAppointments((prev) => prev.filter((a) => a.id !== id));
        toast.success(isMeeting ? 'Reunion eliminada' : 'Videollamada eliminada');
      } else { toast.error('Error al eliminar'); }
    } catch { toast.error('Error de red'); }
  };

  function handleSelectDay(day: Date) {
    setSelectedDay(day);
    setDayModalOpen(true);
  }

  const dayTasks = useMemo(
    () => tasks.filter((t) =>
      t.dueDate &&
      (sameLocalDay(t.dueDate, selectedDay) || (t.startDate && sameLocalDay(t.startDate, selectedDay)) ||
        (t.startDate && t.dueDate && new Date(t.startDate) <= selectedDay && selectedDay <= new Date(t.dueDate))) &&
      t.status !== 'completed' &&
      t.status !== 'approved' &&
      (t as any).deliverableStatus !== 'approved'
    ),
    [tasks, selectedDay]
  );
  const dayCompletedTasksPanel = useMemo(
    () => tasks.filter((t) =>
      t.dueDate &&
      sameLocalDay(t.dueDate, selectedDay) &&
      (t.status === 'completed' || t.status === 'approved' || (t as any).deliverableStatus === 'approved')
    ),
    [tasks, selectedDay]
  );

  const dayAppointments = useMemo(
    () => appointments.filter((a) => sameLocalDay(a.date, selectedDay)),
    [appointments, selectedDay]
  );

  const filteredTasks = useMemo(
    () => selectedClientId === 'all' ? tasks : tasks.filter(t => t.clientId === selectedClientId),
    [tasks, selectedClientId]
  );

  const filteredDayTasks = useMemo(
    () => filteredTasks.filter((t) =>
      t.dueDate &&
      (sameLocalDay(t.dueDate, selectedDay) || (t.startDate && sameLocalDay(t.startDate, selectedDay)) ||
        (t.startDate && t.dueDate && new Date(t.startDate) <= selectedDay && selectedDay <= new Date(t.dueDate))) &&
      t.status !== 'completed' &&
      t.status !== 'approved' &&
      (t as any).deliverableStatus !== 'approved'
    ),
    [filteredTasks, selectedDay]
  );

  const total = dayTasks.length + dayAppointments.length;
  const capitalizedLabel = dayLabel(selectedDay);

  const calTabs = [
    { id: 'mine'    as CalView, label: 'Mi Calendario', show: true },
    { id: 'team'    as CalView, label: 'Equipo',        show: isManager },
    { id: 'clients' as CalView, label: 'Clientes',      show: isManager || role === 'TEAM_MEMBER' },
    { id: 'all'       as CalView, label: 'Todos',        show: isAdmin },
    { id: 'meetings'  as CalView, label: 'Reuniones',     show: isManager },
    { id: 'deliveries' as CalView, label: 'Entregas',     show: isManager || role === 'TEAM_MEMBER' },
  ].filter(t => t.show);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-20 rounded bg-white/[0.04]" />
            <Skeleton className="h-4 w-36 rounded bg-white/[0.06]" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-28 rounded-lg bg-white/[0.04]" />
            <Skeleton className="h-8 w-24 rounded-lg bg-white/[0.06]" />
          </div>
        </div>
        <div className="flex gap-2 border-b border-[var(--wl-border)]">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-t-lg bg-white/[0.04]" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[var(--wl-surface)] border border-[var(--wl-border)] rounded-xl p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32 rounded bg-white/[0.06]" />
              <div className="flex gap-1">
                <Skeleton className="h-7 w-7 rounded-lg bg-white/[0.04]" />
                <Skeleton className="h-7 w-10 rounded-lg bg-white/[0.04]" />
                <Skeleton className="h-7 w-7 rounded-lg bg-white/[0.04]" />
              </div>
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-4 rounded bg-white/[0.03]" />
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="min-h-[72px] border-b border-r border-white/[0.03] p-1 space-y-1">
                  <Skeleton className="h-3 w-4 rounded bg-white/[0.04]" />
                  {i % 4 === 0 && <Skeleton className="h-2 w-full rounded bg-white/[0.03]" />}
                  {i % 7 === 0 && <Skeleton className="h-2 w-3/4 rounded bg-white/[0.03]" />}
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[var(--wl-surface)] border border-[var(--wl-border)] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[var(--wl-border)] space-y-1.5">
              <Skeleton className="h-4 w-24 rounded bg-white/[0.06]" />
              <Skeleton className="h-3 w-16 rounded bg-white/[0.04]" />
            </div>
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1.5 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex gap-2">
                    <Skeleton className="h-4 w-16 rounded-full bg-white/[0.06]" />
                    <Skeleton className="h-3 flex-1 rounded bg-white/[0.04]" />
                  </div>
                  <Skeleton className="h-2.5 w-2/3 rounded bg-white/[0.03]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-medium text-white/30 uppercase tracking-widest mb-1">Calendario</p>
          <p className="text-[var(--wl-text-muted)] text-sm">Haz clic en un día para ver su detalle</p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end min-w-0 shrink-0">
          {/* Selector de cliente — solo en tabs clientes/entregas */}
          {!isClient && clientOptions.length > 0 && (calView === 'clients' || calView === 'deliveries') && (
            <div className="flex items-center gap-2">
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="bg-white/[0.04] border-[var(--wl-border)] text-white text-sm h-9 w-auto min-w-[160px] max-w-[220px] focus:ring-brand">
                  <SelectValue placeholder="Todos los clientes" />
                </SelectTrigger>
                <SelectContent className="bg-[var(--wl-surface)] border-[var(--wl-border)] text-white">
                  {(isAdmin || isPM) && (
                    <SelectItem value="all" className="focus:bg-white/[0.06]">
                      {isAdmin ? 'Todos los clientes' : 'Todos mis clientes'}
                    </SelectItem>
                  )}
                  {clientOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="focus:bg-white/[0.06]">
                      {c.name}{c.company ? ` — ${c.company}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedClientId !== 'all' && (
                <button onClick={() => setSelectedClientId('all')}
                  className="text-xs text-[var(--wl-text-muted)] hover:text-[var(--wl-text-secondary)] transition-colors underline underline-offset-2">
                  Todos
                </button>
              )}
            </div>
          )}
          <Button
            onClick={() => setMeetDialogOpen(true)}
            variant="outline"
            className="border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-green-300 gap-2">
            <Video className="w-4 h-4" />
            Agendar Reunión
          </Button>
          <Button
            onClick={() => { setEditingTask(null); setTaskFormOpen(true); }}
            className="bg-brand hover:bg-brand-dark text-white gap-2">
            <Plus className="w-4 h-4" />
            Nueva Tarea
          </Button>
        </div>
      </div>

      {/* Tabs de vista */}
      {calTabs.length > 1 && (
        <div className="flex gap-1 border-b border-[var(--wl-border)] pb-0 overflow-x-auto scrollbar-none flex-nowrap">
          {calTabs.map((tab) => (
            <button key={tab.id} onClick={() => setCalView(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
                calView === tab.id
                  ? 'border-brand text-white'
                  : 'border-transparent text-[var(--wl-text-muted)] hover:text-[var(--wl-text-secondary)] hover:border-white/20'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[var(--wl-surface)] border border-[var(--wl-border)] rounded-xl p-4 md:p-6">
          <CalendarGrid
            tasks={calView === "meetings" ? [] : calView === "deliveries" ? filteredTasks.filter(t => !!t.dueDate) : filteredTasks}
            activities={calView === "meetings" ? [] : activities}
            appointments={calView === "deliveries" ? [] : appointments}
            milestones={milestones}
            selectedDay={selectedDay}
            onSelectDay={handleSelectDay}
          />
        </div>

        <div className="bg-[var(--wl-surface)] border border-[var(--wl-border)] rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 md:p-5 border-b border-[var(--wl-border)] shrink-0">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-brand-light" />
              <div>
                <p className="text-sm font-semibold text-white leading-tight">
                  {isToday(selectedDay) ? 'Hoy' : capitalizedLabel}
                </p>
                {isToday(selectedDay) && (
                  <p className="text-[11px] text-white/35">{capitalizedLabel}</p>
                )}
              </div>
            </div>
            {total > 0 && (
              <span className="text-[11px] font-medium bg-brand/20 text-brand-light px-2 py-0.5 rounded-full">
                {total} item{total !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-5 space-y-4">
            {filteredDayTasks.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--wl-text-muted)] uppercase tracking-wider">
                  <CheckSquare className="w-3 h-3" />
                  Tareas ({filteredDayTasks.length})
                </div>
                {filteredDayTasks.map((task) => (
                  <div key={task.id}
                    className={`w-full text-left rounded-lg p-3.5 transition-colors group relative overflow-hidden border
                      ${task.priority === "urgent" ? "bg-red-500/[0.06] border-red-500/20 hover:border-red-500/30" :
                        task.priority === "high" ? "bg-orange-500/[0.05] border-orange-500/15 hover:border-orange-500/25" :
                        task.priority === "medium" ? "bg-amber-500/[0.04] border-amber-500/10 hover:border-amber-500/20" :
                        "bg-emerald-500/[0.04] border-emerald-500/10 hover:border-emerald-500/20"}`}>
                    <div className={`absolute left-0 top-0 bottom-0 w-0.5 rounded-l-lg
                      ${task.priority === "urgent" ? "bg-red-500" :
                        task.priority === "high" ? "bg-orange-400" :
                        task.priority === "medium" ? "bg-amber-400" :
                        "bg-emerald-400"}`} />
                    <button type="button" className="w-full text-left"
                      onClick={() => { setDetailTask(task); setDetailOpen(true); }}>
                      <div className="flex items-start gap-2.5">
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 mt-0.5" style={statusStyleMap[task.status] || { background: 'rgba(226,232,240,0.12)', color: '#E2E8F0' }}>
                          {statusLabels[task.status] || task.status}
                        </span>
                        <p className="text-sm font-medium text-white/90 leading-tight group-hover:text-white transition-colors">
                          {task.title}
                        </p>
                      </div>
                      {task.description && (
                        <p className="text-xs text-white/35 mt-2 line-clamp-2 pl-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2.5 pl-1 flex-wrap">
                        <span className={`text-[10px] font-medium ${priorityColors[task.priority] || 'text-[var(--wl-text-muted)]'}`}>
                          {priorityLabels[task.priority] || task.priority}
                        </span>
                        {task.dueDate && (
                          <div className="flex items-center gap-1 text-[10px] text-white/25">
                            <Clock className="w-2.5 h-2.5" />
                            {format(new Date(task.dueDate), 'HH:mm')}
                          </div>
                        )}
                        {(task as any).client?.name && (
                          <span className="text-[10px] text-white/30 bg-white/[0.04] px-1.5 py-0.5 rounded-full">
                            {(task as any).client.name}
                          </span>
                        )}
                        {task.assignedUser && <TaskAvatar u={task.assignedUser} />}
                      </div>
                    </button>
                    {isManager && (
                      <button type="button"
                        onClick={async () => {
                          if (!confirm(`Eliminar "${task.title}"?`)) return;
                          await handleDeleteTask(task.id);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-md text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {dayCompletedTasksPanel.length > 0 && (
              <CompletedTasksSection tasks={dayCompletedTasksPanel} />
            )}

            {dayAppointments.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--wl-text-muted)] uppercase tracking-wider">
                  <Video className="w-3 h-3" />
                  Videollamadas ({dayAppointments.length})
                </div>
                {dayAppointments.map((apt) => (
                  <div key={apt.id} className="bg-green-500/[0.06] border border-green-500/20 rounded-lg p-3 group relative">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 bg-green-500/20 text-green-300">
                          {apt.status === "confirmed" ? "Confirmada" : apt.status === "cancelled" ? "Cancelada" : "Pendiente"}
                        </span>
                        <button type="button"
                          onClick={() => { setEditingAppointment(apt); setApptEditOpen(true); }}
                          className="text-xs font-medium text-[var(--wl-text-secondary)] hover:text-green-300 transition-colors truncate text-left">
                          {apt.name}
                        </button>
                      </div>
                      {isManager && (
                        <div className="flex gap-1 shrink-0">
                          <button type="button"
                            onClick={() => { setEditingAppointment(apt); setApptEditOpen(true); }}
                            className="p-1 rounded text-white/20 hover:text-green-400 hover:bg-green-500/10 transition-colors">
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button type="button"
                            onClick={async () => {
                              if (!confirm("Eliminar esta videollamada?")) return;
                              await handleDeleteAppointment(apt.id);
                            }}
                            className="p-1 rounded text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-white/30">{apt.email}</span>
                      <div className="flex items-center gap-1 text-[10px] text-white/25">
                        <Clock className="w-2.5 h-2.5" />
                        {format(new Date(apt.date), "HH:mm")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {total === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white/20" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--wl-text-muted)]">Sin elementos este dia</p>
                  <p className="text-xs text-white/25 mt-0.5">
                    {isToday(selectedDay) ? 'Todo en orden por hoy' : 'No hay nada programado'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm"
                    className="text-[var(--wl-text-muted)] hover:text-white hover:bg-[var(--wl-hover)] text-xs gap-1"
                    onClick={() => { setEditingTask(null); setTaskFormOpen(true); }}>
                    <Plus className="w-3.5 h-3.5" />
                    Tarea
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <CalendarDayModal
        open={dayModalOpen}
        onClose={() => setDayModalOpen(false)}
        day={selectedDay}
        tasks={tasks}
        activities={activities}
        appointments={appointments}
        milestones={milestones}
        isManager={isManager}
        onEditTask={(t) => { setDetailTask(t); setDetailOpen(true); }}
        onNewTask={() => { setEditingTask(null); setTaskFormOpen(true); }}
        onNewAppointment={() => { setEditingAppointment(null); setApptInitialDate(selectedDay); setApptEditOpen(true); }}
        onDeleteTask={handleDeleteTask}
        onEditAppointment={(apt) => { setEditingAppointment(apt); setApptEditOpen(true); }}
        onDeleteAppointment={handleDeleteAppointment}
      />

      <TaskForm
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        initialDate={editingTask ? null : selectedDay}
        task={editingTask}
        isManager={isManager}
        onSuccess={fetchData}
      />

      <MeetingDialogWrapper open={meetDialogOpen} onOpenChange={setMeetDialogOpen} onSaved={() => { setMeetDialogOpen(false); fetchData(); }} initialDate={apptInitialDate} />

      <AppointmentEditModal
        open={apptEditOpen}
        onOpenChange={setApptEditOpen}
        appointment={editingAppointment}
        onSaved={fetchData}
        onDeleted={(id) => setAppointments(prev => prev.filter(a => a.id !== id))}
        initialDate={apptInitialDate}
      />

      <TaskDetailModal
        task={detailTask}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onEdit={(t) => { setDetailOpen(false); setEditingTask(t); setTaskFormOpen(true); }}
        isManager={isManager}
        currentUserId={userId}
      />
    </div>
  );
}