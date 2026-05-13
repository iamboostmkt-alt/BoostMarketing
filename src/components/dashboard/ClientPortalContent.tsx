'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, ChevronRight, Calendar, CheckSquare, Clock,
  CheckCircle2, Loader2, AlertCircle, User, Building2, Eye, MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameDay, isToday,
  addMonths, subMonths, isSameMonth,
} from 'date-fns';
import { es } from 'date-fns/locale';
import ChatContent from '@/components/dashboard/ChatContent';
import { ReportButton } from '@/components/dashboard/ReportButton';
import type { ClientPortalData, Task, TaskAssignee } from '@/lib/types';

// â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const DAY_NAMES   = ['Lun', 'Mar', 'MiÃ©', 'Jue', 'Vie', 'SÃ¡b', 'Dom'];
const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

const taskStatusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:     { label: 'Pendiente',    color: 'bg-amber-500/15 text-amber-300 border-amber-500/20',   icon: <Clock        className="h-3 w-3" /> },
  in_progress: { label: 'En progreso',  color: 'bg-blue-500/15 text-blue-300 border-blue-500/20',     icon: <Clock        className="h-3 w-3" /> },
  editing:     { label: 'En progreso',  color: 'bg-blue-500/15 text-blue-300 border-blue-500/20',     icon: <Clock        className="h-3 w-3" /> },
  review:      { label: 'En progreso',  color: 'bg-blue-500/15 text-blue-300 border-blue-500/20',      icon: <Clock        className="h-3 w-3" /> },
  completed:   { label: 'Completado',   color: 'bg-green-500/15 text-green-300 border-green-500/20',  icon: <CheckCircle2 className="h-3 w-3" /> },
};

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function initials(name: string | null | undefined, email?: string) {
  return ((name || email || 'U')).split(/[\s@]/).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return 'â€”';
  try { return format(new Date(iso), "d 'de' MMM yyyy", { locale: es }); } catch { return iso; }
}

function getTasksForDay(tasks: Task[], day: Date): Task[] {
  return tasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), day));
}

// â”€â”€ Day detail modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface DayModalProps {
  day: Date | null;
  tasks: Task[];
  onClose: () => void;
}

function DayModal({ day, tasks, onClose }: DayModalProps) {
  if (!day) return null;

  const dayTasks      = getTasksForDay(tasks, day);
  const hasItems      = dayTasks.length > 0;

  const label = format(day, "EEEE d 'de' MMMM", { locale: es });

  return (
    <Dialog open={!!day} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#15151c] border-white/[0.08] text-white max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white capitalize">{label}</DialogTitle>
        </DialogHeader>

        {!hasItems ? (
          <div className="py-12 flex flex-col items-center gap-3 text-center">
            <Calendar className="w-10 h-10 text-white/15" />
            <p className="text-white/40 text-sm">No hay tareas con vencimiento este dÃ­a.</p>
          </div>
        ) : (
          <div className="space-y-4 mt-1">
            {dayTasks.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Tareas</p>
                {dayTasks.map((task) => {
                  const cfg = taskStatusConfig[task.status] ?? taskStatusConfig.pending;
                  return (
                    <div key={task.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-white">{task.title}</p>
                        <span className={`flex-shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}>
                          {cfg.icon}{cfg.label}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-xs text-white/40 line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-[11px] text-white/35">
                        {task.dueDate && <span>Vence: {fmtDate(task.dueDate)}</span>}
                        {task.assignedUser && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {task.assignedUser.name || task.assignedUser.email}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// â”€â”€ Calendar grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface CalendarProps {
  tasks: Task[];
  onSelectDay: (day: Date) => void;
}

function PortalCalendar({ tasks, onSelectDay }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd   = endOfMonth(currentMonth);
    const calStart   = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd     = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const monthLabel = `${MONTH_NAMES[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm"
            className="h-8 w-8 p-0 text-white/50 hover:text-white hover:bg-white/[0.06]"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm"
            className="h-8 px-2.5 text-xs text-white/50 hover:text-white hover:bg-white/[0.06]"
            onClick={() => setCurrentMonth(new Date())}>
            Hoy
          </Button>
          <Button variant="ghost" size="sm"
            className="h-8 w-8 p-0 text-white/50 hover:text-white hover:bg-white/[0.06]"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_NAMES.map((name) => (
          <div key={name} className="text-center text-[11px] font-medium text-white/30 py-2">{name}</div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayTasks       = getTasksForDay(tasks, day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const today          = isToday(day);
          const hasItems       = dayTasks.length > 0;

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => { if (isCurrentMonth) onSelectDay(day); }}
              className={`
                relative flex flex-col items-center justify-center min-h-[52px] md:min-h-[64px] rounded-lg transition-all
                border border-transparent
                ${isCurrentMonth ? 'text-white/80' : 'text-white/15 cursor-default'}
                ${today ? 'border-brand/40 bg-brand/[0.06]' : ''}
                ${isCurrentMonth && !today ? 'hover:bg-white/[0.03] hover:border-white/[0.06]' : ''}
              `}
            >
              <span className={`text-sm font-medium ${today ? 'text-brand-light' : ''}`}>
                {format(day, 'd')}
              </span>

              {hasItems && isCurrentMonth && (
                <div className="flex items-center gap-0.5 mt-0.5 flex-wrap justify-center max-w-[40px]">
                  {dayTasks.slice(0, 4).map((t, i) => (
                    <span key={`t${i}`} className={`w-1.5 h-1.5 rounded-full ${
                      t.status === 'completed' ? 'bg-green-400' : 'bg-amber-400'
                    }`} />
                  ))}
                  {dayTasks.length > 4 && (
                    <span className="text-[8px] text-white/30">
                      +{dayTasks.length - 4}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 pt-1 border-t border-white/[0.04]">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          <span className="text-[11px] text-white/30">Tareas pendientes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
          <span className="text-[11px] text-white/30">Completadas</span>
        </div>
      </div>
    </div>
  );
}

// â”€â”€ Task cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function TaskCard({ task }: { task: Task }) {
  const cfg = taskStatusConfig[task.status] ?? taskStatusConfig.pending;
  return (
    <div className="glass-card rounded-xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <CheckSquare className="h-4 w-4 text-amber-400 shrink-0" />
          <p className="text-sm font-semibold text-white truncate">{task.title}</p>
        </div>
        <span className={`flex-shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}>
          {cfg.icon}{cfg.label}
        </span>
      </div>
      {task.description && (
        <p className="text-xs text-white/45 line-clamp-2 pl-6">{task.description}</p>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-6 text-[11px] text-white/35">
        {task.dueDate && <span>Vence: {fmtDate(task.dueDate)}</span>}
        {task.assignedUser && (
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {task.assignedUser.name || task.assignedUser.email}
          </span>
        )}
      </div>
    </div>
  );
}

// â”€â”€ Progress bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ProgressBar({ total, completed }: { total: number; completed: number }) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-white/50">
        <span>Progreso general</span>
        <span className="font-semibold text-white/80">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand to-brand-light transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-white/30">{completed} de {total} Ã­tems completados</p>
    </div>
  );
}

// â”€â”€ Main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const MANAGER_ROLES = ['ADMIN', 'PROJECT_MANAGER'];

interface ClientSummary { id: string; name: string; company: string; email: string; }

export default function ClientPortalContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const currentUserRole = (session?.user as { role?: string })?.role ?? 'CLIENT';

  const isManager = MANAGER_ROLES.includes(currentUserRole);

  // Admin preview: list of clients + selected clientId
  const [clients,          setClients]          = useState<ClientSummary[]>([]);
  const [previewClientId,  setPreviewClientId]  = useState<string>('');

  const [data,     setData]     = useState<ClientPortalData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [noClient, setNoClient] = useState(false);
  const [selectedDay,      setSelectedDay]      = useState<Date | null>(null);
  const [activeTab,        setActiveTab]        = useState<'all' | 'tasks'>('all');

  // Load client list for admin/PM selector
  useEffect(() => {
    if (!isManager) return;
    fetch('/api/clients')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.clients) setClients(d.clients);
      })
      .catch(() => {});
  }, [isManager]);

  useEffect(() => {
    // Managers need a clientId selected before fetching
    if (isManager && !previewClientId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setNoClient(false);
    setData(null);

    const url = isManager
      ? `/api/client-portal?clientId=${previewClientId}`
      : '/api/client-portal';

    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d.client === null) { setNoClient(true); return; }
        if (d.error)           { setError(d.error); return; }
        setData(d);
      })
      .catch(() => setError('Error al cargar el portal. Intenta nuevamente.'))
      .finally(() => setLoading(false));
  }, [isManager, previewClientId]);

  // Admin selector header (always visible for managers)
  const AdminSelectorBar = isManager ? (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4">
      <Eye className="w-4 h-4 text-amber-400 shrink-0" />
      <span className="text-sm text-amber-300 font-medium shrink-0">Vista previa:</span>
      <Select value={previewClientId || 'none'} onValueChange={(v) => setPreviewClientId(v === 'none' ? '' : v)}>
        <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white text-sm h-8 flex-1 max-w-xs focus:ring-amber-500">
          <SelectValue placeholder="Selecciona un cliente..." />
        </SelectTrigger>
        <SelectContent className="bg-[#15151c] border-white/[0.08] text-white">
          <SelectItem value="none" className="text-white/40 focus:bg-white/[0.06]">
            â€” Selecciona un cliente â€”
          </SelectItem>
          {clients.map((c) => (
            <SelectItem key={c.id} value={c.id} className="focus:bg-white/[0.06]">
              {c.name}{c.company ? ` â€” ${c.company}` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  ) : null;

  if (isManager && !previewClientId) {
    return (
      <div className="space-y-4">
        {AdminSelectorBar}
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <Eye className="w-10 h-10 text-white/15" />
          <p className="text-white/40 text-sm">Selecciona un cliente para previsualizar su portal.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {AdminSelectorBar}
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-brand-light animate-spin" />
        </div>
      </div>
    );
  }

  if (noClient) {
    return (
      <div className="space-y-4">
        {AdminSelectorBar}
        <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-brand-light/60" />
          </div>
          <div>
            <p className="text-white font-semibold">Cuenta no configurada</p>
            <p className="text-white/40 text-sm mt-1 max-w-sm">
              {isManager
                ? 'Este cliente no tiene un registro en el sistema.'
                : 'Tu cuenta de cliente aÃºn no ha sido vinculada al sistema. Contacta a tu Project Manager.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        {AdminSelectorBar}
        <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
          <AlertCircle className="w-10 h-10 text-red-400/60" />
          <p className="text-white/50">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { client, tasks } = data;

  // Redirect CLIENT users without assigned PM to waiting screen
  if (!isManager && !client.assignedManagerId) {
    router.replace('/dashboard/waiting-assignment');
    return null;
  }

  const assignedManager = client.assignedManager;

  const teamMembersMap = new Map<string, TaskAssignee>();
  tasks.forEach((t) => {
    if (t.assignedUser && t.assignedUser.id !== assignedManager?.id) {
      const u = t.assignedUser;
      teamMembersMap.set(u.id, {
        id: u.id, name: u.name, email: u.email, color: u.color, image: u.image ?? null,
      });
    }
    for (const u of t.assignedUsers ?? []) {
      if (u.id !== assignedManager?.id) teamMembersMap.set(u.id, u);
    }
  });
  const teamMembers = [...teamMembersMap.values()];

  const totalItems     = tasks.length;
  const completedItems = tasks.filter((t) => t.status === 'completed').length;

  const displayedTasks =
    activeTab === 'tasks'
      ? tasks.filter((t) => t.status !== 'completed')
      : tasks;

  return (
    <div className="space-y-6">
      {AdminSelectorBar}

      {/* Header */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-brand/15 flex items-center justify-center shrink-0">
              <Building2 className="w-7 h-7 text-brand-light" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-white truncate">{client.name}</h1>
              {client.company && (
                <p className="text-sm text-white/50 truncate">{client.company}</p>
              )}
              <p className="text-xs text-white/30">{client.email}</p>
            </div>
          </div>

          {/* Assigned manager + WhatsApp */}
          {client.assignedManager && (
            <div className="flex items-center gap-3 bg-white/[0.03] rounded-xl px-4 py-2.5 shrink-0">
              <Avatar className="h-8 w-8">
                <AvatarImage src={client.assignedManager.image || undefined} />
                <AvatarFallback className="text-[10px] font-medium"
                  style={{
                    backgroundColor: (client.assignedManager.color || '#7c3aed') + '33',
                    color:            client.assignedManager.color || '#7c3aed',
                  }}>
                  {initials(client.assignedManager.name, client.assignedManager.email)}
                </AvatarFallback>
              </Avatar>
              <div className="mr-2">
                <p className="text-[10px] text-white/30 font-medium uppercase tracking-wider">Tu PM</p>
                <p className="text-sm text-white/80 font-medium">
                  {client.assignedManager.name || client.assignedManager.email}
                </p>
              </div>
              <a
                href={`https://wa.me/${(client.assignedManager.phone || '521063469').replace(/\D/g, '')}?text=Hola ${encodeURIComponent(client.assignedManager.name || 'PM')}, soy ${encodeURIComponent(client.name)}.`}
                target="_blank"
                rel="noopener noreferrer"
                title="WhatsApp PM"
                className="flex items-center gap-1.5 rounded-lg bg-green-500/15 hover:bg-green-500/25 border border-green-500/20 px-2.5 py-1.5 text-green-400 text-xs font-medium transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </a>
            </div>
          )}
        </div>

        {/* Progress */}
        {totalItems > 0 && <ProgressBar total={totalItems} completed={completedItems} />}

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{tasks.length}</p>
            <p className="text-[11px] text-white/35">Tareas</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">{completedItems}</p>
            <p className="text-[11px] text-white/35">Completadas</p>
          </div>
        </div>

        {/* Personal Asignado */}
        {(assignedManager || teamMembers.length > 0) && (
          <div className="pt-1 border-t border-white/[0.04] space-y-3">
            <p className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">Personal Asignado</p>
            <div className="flex flex-wrap gap-3">
              {assignedManager && (
                <div className="flex items-center gap-2.5 bg-white/[0.03] rounded-xl px-3 py-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={assignedManager.image || undefined} />
                    <AvatarFallback className="text-[10px] font-medium"
                      style={{ backgroundColor: (assignedManager.color || '#7c3aed') + '33', color: assignedManager.color || '#7c3aed' }}>
                      {initials(assignedManager.name, assignedManager.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-[9px] text-white/30 uppercase tracking-wider font-semibold">PM</p>
                    <p className="text-xs text-white/80 font-medium leading-tight">
                      {assignedManager.name || assignedManager.email}
                    </p>
                  </div>
                </div>
              )}
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-2.5 bg-white/[0.03] rounded-xl px-3 py-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={member.image || undefined} />
                    <AvatarFallback className="text-[10px] font-medium"
                      style={{ backgroundColor: (member.color || '#06b6d4') + '33', color: member.color || '#06b6d4' }}>
                      {initials(member.name, member.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-[9px] text-white/30 uppercase tracking-wider font-semibold">Equipo</p>
                    <p className="text-xs text-white/80 font-medium leading-tight">
                      {member.name || member.email}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Report Button */}
      {isManager && client && (
        <div className="flex items-center justify-between flex-wrap gap-3 px-1">
          <p className="text-sm font-medium text-white/50">Reporte mensual</p>
          <ReportButton
            clientId={client.id}
            clientName={client.name}
            clientEmail={client.email}
          />
        </div>
      )}

      {/* Calendar */}
      <div className="glass-card rounded-2xl p-5">
        <PortalCalendar
          tasks={tasks}
          onSelectDay={setSelectedDay}
        />
      </div>

      {/* List â€” tabs */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'tasks'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-brand text-white'
                  : 'bg-white/[0.04] text-white/50 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              {tab === 'all' ? 'Todas' : 'Abiertas'}
            </button>
          ))}
        </div>

        {displayedTasks.length === 0 ? (
          <div className="glass-card rounded-xl py-16 flex flex-col items-center gap-3 text-center">
            <Calendar className="w-10 h-10 text-white/15" />
            <p className="text-white/35 text-sm">No hay Ã­tems para mostrar.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedTasks.map((task) => <TaskCard key={task.id} task={task} />)}
          </div>
        )}
      </div>

      {/* Day modal */}
      <DayModal
        day={selectedDay}
        tasks={tasks}
        onClose={() => setSelectedDay(null)}
      />

      {/* Real-time chat with the agency */}
      <div className="glass-card rounded-2xl p-5">
        <ChatContent
          room={client.id}
          title="Chat con tu equipo"
          subtitle="Habla en tiempo real con tu Project Manager y el equipo de la agencia"
        />
      </div>
    </div>
  );
}

