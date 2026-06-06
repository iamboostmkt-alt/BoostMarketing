'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MANAGER_ROLES } from '@/core/constants/roles';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronLeft, ChevronRight, Calendar, CheckSquare, Clock,
  CheckCircle2, Loader2, AlertCircle, User, Building2, Eye, MessageCircle, Video, Plus,
  ChevronDown, Flag, Pencil, Trash2, Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isToday, addMonths, subMonths, isSameMonth,
} from 'date-fns';
import { es } from 'date-fns/locale';
import ChatContent from '@/components/dashboard/ChatContent';
import { MeetingDialog, TeamUser } from '@/components/dashboard/MeetingsTab';
import TaskForm from '@/components/dashboard/TaskForm';
import { ReportButton } from '@/components/dashboard/ReportButton';
import { DeliverableHistory } from '@/components/client-portal/DeliverableHistory';
import type { Task, Activity } from '@/lib/types';

// ── Nuevo data layer del portal ──────────────────────────────────────────────
import { useClientPortal } from '@/hooks/client-portal/useClientPortal';
import { useClientCalendar, sameLocalDay } from '@/hooks/client-portal/useClientCalendar';
import { toast } from 'sonner';
import TaskFeedbackButtons from '@/components/client-portal/TaskFeedbackButtons';
import PortalAppointmentEditModal from '@/components/client-portal/PortalAppointmentEditModal';
import { PortalCalendar } from '@/components/client-portal/PortalCalendar';
import { ProjectTimeline } from '@/components/client-portal/ProjectTimeline';
import { PortalTaskCard } from '@/components/client-portal/PortalTaskCard';
import { PortalMeetingCard } from '@/components/client-portal/PortalMeetingCard';
import { PortalActivityCard } from '@/components/client-portal/PortalActivityCard';
import { PortalDayModal } from '@/components/client-portal/PortalDayModal';
import { CompletedDeliverables, ProgressBar } from '@/components/client-portal/PortalWidgets';

// ── Constants ─────────────────────────────────────────────────────────────────

const DAY_NAMES   = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

const taskStatusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft:             { label: 'Borrador',         color: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',       icon: <Clock        className="h-3 w-3" /> },
  pending:           { label: 'Pendiente',         color: 'bg-amber-500/15 text-amber-300 border-amber-500/20',   icon: <Clock        className="h-3 w-3" /> },
  in_progress:       { label: 'En producción',     color: 'bg-blue-500/15 text-blue-300 border-blue-500/20',      icon: <Clock        className="h-3 w-3" /> },
  editing:           { label: 'En producción',     color: 'bg-blue-500/15 text-blue-300 border-blue-500/20',      icon: <Clock        className="h-3 w-3" /> },
  internal_review:   { label: 'Revisión interna',  color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/20', icon: <Clock       className="h-3 w-3" /> },
  review:            { label: 'En revisión',        color: 'bg-purple-500/15 text-purple-300 border-purple-500/20', icon: <Eye        className="h-3 w-3" /> },
  client_review:     { label: 'Por revisar',        color: 'bg-purple-500/15 text-purple-300 border-purple-500/20', icon: <Eye        className="h-3 w-3" /> },
  changes_requested: { label: 'Cambios pedidos',    color: 'bg-orange-500/15 text-orange-300 border-orange-500/20', icon: <Clock      className="h-3 w-3" /> },
  approved:          { label: 'Aprobado',           color: 'bg-green-500/15 text-green-300 border-green-500/20',   icon: <CheckCircle2 className="h-3 w-3" /> },
  scheduled:         { label: 'Programado',         color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',      icon: <Clock        className="h-3 w-3" /> },
  published:         { label: 'Publicado',          color: 'bg-teal-500/15 text-teal-300 border-teal-500/20',      icon: <CheckCircle2 className="h-3 w-3" /> },
  completed:         { label: 'Completado',         color: 'bg-green-500/15 text-green-300 border-green-500/20',   icon: <CheckCircle2 className="h-3 w-3" /> },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string | null | undefined, email?: string) {
  return ((name || email || 'U')).split(/[\s@]/).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  try { return format(new Date(iso), "d 'de' MMM yyyy", { locale: es }); } catch { return iso; }
}

function getTasksForDay(tasks: Task[], day: Date): Task[] {
  return tasks.filter((t) => {
    // Subtareas sin fecha no aparecen en el calendario (BUG-03)
    if (t.parentTaskId && !t.dueDate && !t.startDate) return false;
    if (t.dueDate   && sameLocalDay(t.dueDate,   day)) return true;
    if (t.startDate && sameLocalDay(t.startDate, day)) return true;
    // Fallback createdAt solo para tareas madre (no subtareas)
    if (!t.parentTaskId && !t.dueDate && !t.startDate && t.createdAt && sameLocalDay(t.createdAt, day)) return true;
    return false;
  });
}

// ── PortalCalendar ────────────────────────────────────────────────────────────

interface CalendarProps {
  tasks:         Task[];
  appointments?: any[];
  onSelectDay:   (day: Date) => void;
  getDayEvents?: (day: Date) => import('@/lib/client-portal/types').PortalCalendarEvent[];
}

// ── CompletedDeliverables ───────────────────────────────────────────────────────

// ── TaskCard ──────────────────────────────────────────────────────────────────

// ── ProjectTimeline ───────────────────────────────────────────────────────────

// ── Main component ────────────────────────────────────────────────────────────

interface ClientSummary {
  id: string;
  name: string;
  company: string;
  email: string;
  status?: string;
  color?: string;
  assignedManager?: { id: string; name: string; color: string; image?: string | null } | null;
  assignedUsers?: { user: { id: string; name: string; color: string; image?: string | null } }[];
  _count?: { tasks?: number };
}

export default function ClientPortalContent() {
  const { data: session } = useSession();
  const myUserId = (session?.user as any)?.id;
  const router            = useRouter();
  const currentUserRole   = (session?.user as { role?: string })?.role ?? 'CLIENT';
  const isManager         = MANAGER_ROLES.includes(currentUserRole as any);

  // ── Estado UI ────────────────────────────────────────────────────────────
  const searchParams = useSearchParams();
  const [previewClientId, setPreviewClientId] = useState<string>(searchParams?.get('clientId') || '');
  const [clients,         setClients]         = useState<ClientSummary[]>([]);
  const [selectedDay,     setSelectedDay]     = useState<Date | null>(null);
  const [formDate,        setFormDate]        = useState<Date | null>(null);
  const [meetingOpen,     setMeetingOpen]     = useState(false);
  const [meetingTeam,     setMeetingTeam]     = useState<TeamUser[]>([]);
  const [requestOpen,     setRequestOpen]     = useState(false);
  const [portalTaskOpen,  setPortalTaskOpen]  = useState(false);
  const [requestDate,     setRequestDate]     = useState('');
  const [requestNotes,    setRequestNotes]    = useState('');
  const [requestSaving,   setRequestSaving]   = useState(false);
  const [activeTab,       setActiveTab]       = useState<'all' | 'tasks'>('all');
  const [showArchived,    setShowArchived]    = useState(false);
  const [archivedTasks,   setArchivedTasks]   = useState<any[]>([]);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [selectMode,      setSelectMode]      = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [selectedApptIds, setSelectedApptIds] = useState<Set<string>>(new Set());
  const [deletingMultiple, setDeletingMultiple] = useState(false);
  const [editingAppt,     setEditingAppt]     = useState<any>(null);
  const [editingTask,     setEditingTask]     = useState<any>(null);
  const [apptEditOpen,    setApptEditOpen]    = useState(false);
  const [milestoneOpen,    setMilestoneOpen]    = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<any>(null);
  const [milestoneTaskIds, setMilestoneTaskIds] = useState<string[]>([]);
  const [agencyWhatsapp, setAgencyWhatsapp] = useState("521063469");
  useEffect(() => {
    fetch("/api/cms/settings").then(r => r.json()).then(d => {
      if (d.settings?.whatsapp) setAgencyWhatsapp(d.settings.whatsapp);
    }).catch(() => {});
  }, []);
  const [milestoneForm,  setMilestoneForm]  = useState({
    title: "", description: "", date: "", type: "other",
    status: "upcoming", progress: 0, responsibleId: "",
    visibleToClient: true, comments: "",
  });

  // ── Data layer (hook limpio) ─────────────────────────────────────────────
  const {
    client, clientUserId, deliverables, appointments: rawAppointments, activities,
    loading, error, noClient, refetch, refetchSilent, milestones,
  } = useClientPortal({ isManager, previewClientId });

  // Estado local de appointments para updates sin refetch
  const [localAppointments, setLocalAppointments] = useState<any[]>([]);
  useEffect(() => { setLocalAppointments(rawAppointments); }, [rawAppointments]);
  const appointments = localAppointments;

  // Estado local de deliverables como Task[] para compatibilidad con componentes
  const [localDeliverables, setLocalDeliverables] = useState<Task[]>([]);
  useEffect(() => { setLocalDeliverables(deliverables as unknown as Task[]); }, [deliverables]);

  // S-125 fix: usar directamente sin cast doble
  const tasks: Task[] = localDeliverables;

  // Calendario cliente — usa hook con timezone fix y colores por tipo
  async function handleDeleteMultiple() {
    if (selectedTaskIds.size === 0 && selectedApptIds.size === 0) return;
    if (!confirm(`¿Eliminar ${selectedTaskIds.size + selectedApptIds.size} elemento(s) seleccionado(s)?`)) return;
    setDeletingMultiple(true);
    try {
      await Promise.all([
        ...[...selectedTaskIds].map(id =>
          fetch(`/api/tasks?id=${id}`, { method: 'DELETE' })
        ),
        ...[...selectedApptIds].map(id =>
          fetch(`/api/appointments?id=${id}`, { method: 'DELETE' })
        ),
      ]);
      setLocalDeliverables(prev => prev.filter((t: any) => !selectedTaskIds.has(t.id)));
      setLocalAppointments(prev => prev.filter((a: any) => !selectedApptIds.has(a.id)));
      setSelectedTaskIds(new Set());
      setSelectedApptIds(new Set());
      setSelectMode(false);
      toast.success('Elementos eliminados');
    } catch { toast.error('Error al eliminar'); }
    finally { setDeletingMultiple(false); }
  }

  async function handleDeleteMilestone(id: string) {
    if (!confirm('¿Eliminar este milestone?')) return;
    await fetch('/api/milestones?id=' + id, { method: 'DELETE' });
    refetch();
  }

  function handleEditMilestone(id: string) {
    const m = milestones.find((m: any) => m.id === id);
    if (!m) return;
    setEditingMilestone(m);
    setMilestoneForm({
      title: m.title, description: m.description, date: m.date.slice(0, 10),
      type: m.type || 'other', status: m.status || 'upcoming',
      progress: m.progress || 0, responsibleId: m.responsibleId || '',
      visibleToClient: m.visibleToClient ?? true, comments: m.comments || '',
    });
    // Pre-seleccionar tareas ya vinculadas
    const linkedTaskIds = tasks
      .filter((t: any) => t.milestoneId === id)
      .map((t: any) => t.id);
    setMilestoneTaskIds(linkedTaskIds);
    setMilestoneOpen(true);
  }

  async function handleLoadArchived() {
    if (!client) return;
    setLoadingArchived(true);
    try {
      const res = await fetch('/api/tasks/archive?clientId=' + client.id);
      const data = await res.json();
      setArchivedTasks(data.tasks ?? []);
      setShowArchived(true);
    } finally {
      setLoadingArchived(false);
    }
  }

  async function handleDeleteTask(id: string) {
    try {
      const res = await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setLocalDeliverables(prev => prev.filter((t: any) => t.id !== id));
        toast.success('Entrega eliminada');
      } else { alert('Error al eliminar'); }
    } catch { alert('Error de red'); }
  }

  async function handleRemindAppt(id: string) {
    try {
      const res = await fetch('/api/appointments/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: id }),
      });
      if (res.ok) { toast.success('Recordatorio enviado al cliente'); }
      else { toast.error('Error al enviar recordatorio'); }
    } catch { toast.error('Error de red'); }
  }

  async function handleDeleteAppt(id: string) {
    try {
      const res = await fetch(`/api/appointments?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        // Actualizar local sin refetch para evitar flash de loading
        setLocalAppointments(prev => prev.filter(a => a.id !== id));
        toast.success('Videollamada eliminada');
      } else { alert('Error al eliminar'); }
    } catch { alert('Error de red'); }
  }

  const { getDayEvents } = useClientCalendar({
    deliverables: localDeliverables as any[],
    appointments: appointments as any[],
    selectedDay:  selectedDay ?? new Date(),
  });

  // ── Efectos auxiliares ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isManager) return;
    fetch('/api/clients')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.clients) setClients(d.clients); })
      .catch(() => {});
  }, [isManager]);

  useEffect(() => {
    if (!isManager) return;
    fetch('/api/team-members')
      .then(r => r.json())
      .then(d => setMeetingTeam((d.users ?? []).filter((u: any) => u.role !== 'CLIENT' && u.role !== 'UNASSIGNED')))
      .catch(() => {});
  }, [isManager]);

  // ── Admin selector bar ───────────────────────────────────────────────────
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
            — Selecciona un cliente —
          </SelectItem>
          {clients.map((c) => (
            <SelectItem key={c.id} value={c.id} className="focus:bg-white/[0.06]">
              {c.name}{c.company ? ` — ${c.company}` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  ) : null;

  // ── Guards ───────────────────────────────────────────────────────────────
  if (isManager && !previewClientId) {
    const getProgressColor = (p: number) => p >= 75 ? '#10b981' : p >= 40 ? '#f59e0b' : '#ef4444';
    const statusConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
      active:   { label: 'Activo',    bg: 'rgba(34,197,94,0.12)',   text: '#4ade80', border: 'rgba(34,197,94,0.20)'   },
      prospect: { label: 'Prospecto', bg: 'rgba(234,179,8,0.12)',   text: '#facc15', border: 'rgba(234,179,8,0.20)'   },
      inactive: { label: 'Inactivo',  bg: 'rgba(148,163,184,0.10)', text: '#94a3b8', border: 'rgba(148,163,184,0.15)' },
    };
    return (
      <div className="space-y-5">
        {AdminSelectorBar}
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-white/90">Gestión de Cuentas</h1>
            <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-xs font-medium text-purple-300">{clients.length}</span>
          </div>
        </div>
        {/* Search */}
        <div className="relative max-w-xs">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder="Buscar cliente..." className="h-9 w-full rounded-lg border border-white/[0.06] bg-white/[0.03] pl-9 pr-4 text-[13px] text-white/80 placeholder:text-white/30 focus:border-purple-500/40 focus:outline-none focus:ring-1 focus:ring-purple-500/20" />
        </div>
        {/* Grid */}
        {clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <p className="text-white/40 text-sm">No hay cuentas disponibles.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {clients.map((c, i) => {
              const ini = c.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
              const color = c.color || '#7c3aed';
              const st = statusConfig[c.status || 'active'] || statusConfig['active'];
              const pmColor = c.assignedManager?.color || '#7c3aed';
              const pmIni = c.assignedManager?.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '';
              const assignedUsers = (c as any).assignedUsers ?? [];
              const activeTasks = (c as any).activeTasks ?? 0;
              const progress = (c as any).progress ?? 0;
              const progressColor = progress >= 75 ? '#10b981' : progress >= 40 ? '#f59e0b' : '#ef4444';
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  whileHover={{ y: -2, borderColor: 'rgba(124,58,237,0.25)' }}
                  onClick={() => setPreviewClientId(c.id)}
                  className="relative flex flex-col cursor-pointer overflow-hidden rounded-2xl border border-white/[0.06] transition-colors"
                  style={{ background: 'linear-gradient(135deg, #080808 0%, #0e0e14 60%, #0a0a0f 100%)' }}
                >
                  <div className="pointer-events-none absolute bottom-0 right-0 h-[120px] w-[150px] blur-2xl"
                    style={{ background: 'radial-gradient(ellipse at center, rgba(88,28,220,0.18), transparent 70%)' }} />
                  <div className="relative h-14 w-full" style={{ background: 'linear-gradient(180deg, #0e0e14 0%, #130820 100%)' }} />
                  <div className="relative z-10 -mt-5 px-3 flex items-end justify-between">
                    <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full border-2 border-[#0a0a0f] text-xs font-semibold"
                      style={{ backgroundColor: color + '25', color }}>
                      {ini}
                    </div>
                    {assignedUsers.length > 0 && (
                      <div className="flex -space-x-1.5 mb-0.5">
                        {assignedUsers.slice(0, 4).map((u: any, ui: number) => (
                          <div key={ui} className="flex h-6 w-6 items-center justify-center rounded-full border border-[#0a0a0f] text-[8px] font-semibold overflow-hidden"
                            style={{ backgroundColor: (u.color || '#7c3aed') + '33', color: u.color || '#a78bfa' }}>
                            {u.image ? <img src={u.image} alt={u.name} className="w-full h-full object-cover" /> : (u.name || u.email || '').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                        ))}
                        {assignedUsers.length > 4 && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[#0a0a0f] bg-white/[0.08] text-[8px] text-white/50">+{assignedUsers.length - 4}</div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="relative z-10 flex flex-1 flex-col px-3 pt-1.5 pb-3">
                    <div className="mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-[13px] font-bold text-white/90 truncate">{c.name}</h3>
                        <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium border"
                          style={{ background: st.bg, color: st.text, borderColor: st.border }}>{st.label}</span>
                      </div>
                      {c.company && <p className="text-[11px] text-white/35 truncate">{c.company}</p>}
                      <p className="text-[10px] text-white/20 truncate mt-0.5">{c.email}</p>
                    </div>
                    <div className="mb-2 grid grid-cols-3 gap-1.5 rounded-lg bg-white/[0.03] p-2">
                      {[
                        { val: activeTasks, label: 'tareas' },
                        { val: (c as any).meetings ?? 0, label: 'reuniones' },
                        { val: 0, label: 'vencidas' },
                      ].map((s, si) => (
                        <div key={si} className="text-center">
                          <div className="text-[15px] font-semibold text-white/85">{s.val}</div>
                          <div className="text-[9px] text-white/30">{s.label}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mb-2">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[9px] text-white/40">Progreso</span>
                        <span className="text-[9px] font-medium text-white/60">{progress}%</span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: progressColor }} />
                      </div>
                    </div>
                    {c.assignedManager && (
                      <div className="mt-auto flex items-center gap-1.5">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full overflow-hidden text-[8px] font-medium shrink-0"
                          style={{ backgroundColor: pmColor + '33', color: pmColor }}>
                          {c.assignedManager.image ? <img src={c.assignedManager.image} alt={c.assignedManager.name} className="w-full h-full object-cover" /> : pmIni}
                        </div>
                        <span className="text-[10px] text-white/40 truncate">{c.assignedManager.name}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
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
                : 'Tu cuenta de cliente aún no ha sido vinculada al sistema. Contacta a tu Project Manager.'}
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

  if (!client) return null;

  if (!isManager && !client.assignedManagerId) {
    router.replace('/dashboard/waiting-assignment');
    return null;
  }

  // ── Datos derivados ──────────────────────────────────────────────────────
  const assignedManager = client.assignedManager;

  // Equipo directo del cliente — solo usuarios explícitamente asignados via ClientAssignedUser
  const VISIBLE_ROLES_TO_CLIENT = ['PROJECT_MANAGER'];
  const teamMembers = ((client as any).assignedUsers ?? [])
    .map((au: any) => au.user ?? au)
    .filter((u: any) =>
      u.id !== assignedManager?.id &&
      VISIBLE_ROLES_TO_CLIENT.includes(u.role)
    );
  const totalItems     = tasks.length;
  const completedItems = tasks.filter((t) => t.status === 'completed' || t.status === 'approved').length;
  const displayedTasks   = activeTab === 'tasks' ? tasks.filter((t) => t.status !== 'completed' && t.status !== 'approved') : tasks.filter((t) => t.status !== 'completed' && t.status !== 'approved');
  const completedTasks   = tasks.filter((t) => t.status === 'completed' || t.status === 'approved' || (t as any).deliverableStatus === 'approved');

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {AdminSelectorBar}

      {/* Header */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-brand/15 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-brand-light" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white/30 uppercase tracking-widest mb-0.5">Portal</p>
              <h1 className="text-lg font-medium text-white truncate">{client.name}</h1>
              {client.company && <p className="text-xs text-white/40 truncate">{client.company}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap shrink-0">
            {isManager && (
              <ReportButton clientId={client.id} clientName={client.name} clientEmail={client.email} />
            )}
            {assignedManager && (
              <div className="flex items-center gap-3 bg-white/[0.03] rounded-xl px-4 py-2.5">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={assignedManager.image || undefined} />
                  <AvatarFallback className="text-[10px] font-medium"
                    style={{ backgroundColor: (assignedManager.color || '#7c3aed') + '33', color: assignedManager.color || '#7c3aed' }}>
                    {initials(assignedManager.name, assignedManager.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="mr-2">
                  <p className="text-[10px] text-white/30 font-medium uppercase tracking-wider">Tu PM</p>
                  <p className="text-sm text-white/80 font-medium">{assignedManager.name || assignedManager.email}</p>
                </div>
                <a
                  href={`https://wa.me/${agencyWhatsapp}?text=Hola ${encodeURIComponent(assignedManager.name || 'PM')}, soy ${encodeURIComponent(client.name)}.`}
                  target="_blank" rel="noopener noreferrer" title="WhatsApp PM"
                  className="flex items-center gap-1.5 rounded-lg bg-green-500/15 hover:bg-green-500/25 border border-green-500/20 px-2.5 py-1.5 text-green-400 text-xs font-medium transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp
                </a>
              </div>
            )}
          </div>
        </div>

        {totalItems > 0 && <ProgressBar total={totalItems} completed={completedItems} />}

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="bg-white/[0.03] rounded-xl p-3">
            <p className="text-[10px] font-medium text-white/30 uppercase tracking-wide mb-1">Entregas</p>
            <p className="text-2xl font-semibold text-white leading-none">{tasks.length}</p>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-3">
            <p className="text-[10px] font-medium text-white/30 uppercase tracking-wide mb-1">Completadas</p>
            <p className="text-2xl font-semibold text-green-400 leading-none">{completedItems}</p>
          </div>
        </div>

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
                    <p className="text-xs text-white/80 font-medium leading-tight">{assignedManager.name || assignedManager.email}</p>
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
                    <p className="text-xs text-white/80 font-medium leading-tight">{member.name || member.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Calendario */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-white/30 uppercase tracking-widest">Calendario</p>
          {isManager && (
            <button type="button" onClick={() => setMeetingOpen(true)}
              className="flex items-center gap-1 text-[11px] text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-md px-2 py-1 transition-colors">
              <Plus className="w-3 h-3" />
              Agendar reunión
            </button>
          )}
        </div>
        <PortalCalendar tasks={tasks} appointments={appointments} onSelectDay={(day) => { setSelectedDay(day); setFormDate(day); }} getDayEvents={getDayEvents} />
      </div>

      {/* Timeline */}
      <ProjectTimeline tasks={tasks} appointments={appointments} milestones={milestones} isManager={isManager} onAddMilestone={() => { setEditingMilestone(null); setMilestoneOpen(true); }} onEditMilestone={handleEditMilestone} onDeleteMilestone={handleDeleteMilestone} />

      {/* Chat + Tareas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
<div className="glass-card rounded-2xl p-5">
          {(() => {
            const pmId = client.assignedManagerId;
            // Usar clientUserId (usuario CLIENT del portal) para el DM, no myUserId (admin que preview)
            // Si el admin está viendo el portal, el chat debe mostrar la conversación PM-cliente real
            const chatUserId = clientUserId ?? (isManager ? null : myUserId);
            const dmRoom = pmId && chatUserId ? [chatUserId, pmId].sort().join('_DM_') : null;
            return dmRoom ? (
              <ChatContent room={dmRoom} title="Chat con tu Project Manager" subtitle="Mensajes directos con tu PM" />
            ) : (
              <div className="flex items-center justify-center py-8 text-white/30 text-sm">
                Sin Project Manager asignado
              </div>
            );
          })()}
        </div>
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 rounded-full bg-brand" />
              <h3 className="text-sm font-semibold text-white">Entregas</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setPortalTaskOpen(true)}
                className="flex items-center gap-1 text-[11px] text-brand-light hover:text-white bg-brand/10 hover:bg-brand/20 border border-brand/20 rounded-md px-2 py-1 transition-colors">
                <Plus className="w-3 h-3" />
                {isManager ? 'Nueva entrega' : 'Solicitar tarea'}
              </button>
              {isManager && displayedTasks.length >= 5 && (
                <button type="button" onClick={() => { setSelectMode(v => !v); setSelectedTaskIds(new Set()); setSelectedApptIds(new Set()); }}
                  className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${selectMode ? 'bg-brand/20 border-brand/40 text-brand-light' : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white'}`}>
                  {selectMode ? 'Cancelar' : 'Seleccionar'}
                </button>
              )}
              {isManager && tasks.some((t: any) => t.status === 'completed' || t.status === 'approved') && (
                <button type="button"
                  onClick={async () => {
                    if (!confirm('¿Archivar todas las entregas completadas? No aparecerán en el portal.')) return;
                    await fetch('/api/tasks/archive', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ clientId: client?.id }),
                    });
                    refetch();
                  }}
                  className="text-[11px] px-2 py-1 rounded-md border border-yellow-500/20 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors">
                  Archivar completadas
                </button>
              )}
              {(['all', 'tasks'] as const).map((tab) => (
                <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${activeTab === tab ? 'bg-brand text-white' : 'bg-white/[0.04] text-white/50 hover:text-white'}`}>
                  {tab === 'all' ? 'Todas' : 'Abiertas'}
                </button>
              ))}
            </div>
          </div>
          {displayedTasks.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-2 text-center">
              <CheckSquare className="w-8 h-8 text-white/15" />
              <p className="text-white/35 text-sm">No hay entregas.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
              {displayedTasks.map((task) => (
                <div key={task.id} className="relative group/taskwrap">
                  <PortalTaskCard task={task} onFeedback={!isManager ? refetchSilent : undefined} onDelete={isManager ? handleDeleteTask : undefined} />
                  {isManager && (
                    <button type="button"
                      onClick={() => { setEditingTask(task as any); setPortalTaskOpen(true); }}
                      className="absolute top-3 right-3 p-1.5 rounded-md text-white/20 hover:text-white hover:bg-white/[0.08] transition-colors opacity-0 group-hover/taskwrap:opacity-100 z-10">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Ver archivadas */}
          {isManager && (
            <div className="pt-2 border-t border-white/[0.04]">
              <button type="button"
                onClick={() => showArchived ? setShowArchived(false) : handleLoadArchived()}
                className="text-[11px] text-white/30 hover:text-white/60 transition-colors">
                {loadingArchived ? 'Cargando...' : showArchived ? 'Ocultar archivadas' : `Ver entregas archivadas`}
              </button>
              {showArchived && archivedTasks.length > 0 && (
                <div className="mt-2 space-y-2">
                  <p className="text-[10px] text-white/25 uppercase tracking-wider">Archivadas ({archivedTasks.length})</p>
                  {archivedTasks.map((task: any) => (
                    <div key={task.id} className="rounded-lg border border-white/[0.04] bg-white/[0.01] p-3 opacity-50">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-white/50 line-through">{task.title}</p>
                        <button type="button"
                          onClick={async () => {
                            await fetch('/api/tasks/archive?taskId=' + task.id, { method: 'DELETE' });
                            handleLoadArchived();
                            refetch();
                          }}
                          className="text-[10px] text-white/25 hover:text-white/60 transition-colors shrink-0">
                          Restaurar
                        </button>
                      </div>
                      <p className="text-[10px] text-white/25 mt-1">
                        Archivada: {task.archivedAt ? new Date(task.archivedAt).toLocaleDateString('es-MX') : '—'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {showArchived && archivedTasks.length === 0 && (
                <p className="text-xs text-white/25 mt-2">No hay entregas archivadas.</p>
              )}
            </div>
          )}

          {/* Sección Listas colapsable */}
          <CompletedDeliverables tasks={completedTasks} />

          {/* Barra acción selección múltiple entregas */}
          {selectMode && isManager && selectedTaskIds.size > 0 && (
            <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl mt-2">
              <span className="text-xs text-white/60 flex-1">{selectedTaskIds.size} entrega{selectedTaskIds.size !== 1 ? 's' : ''} seleccionada{selectedTaskIds.size !== 1 ? 's' : ''}</span>
              <button type="button" disabled={deletingMultiple} onClick={handleDeleteMultiple}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 hover:bg-red-500/30 border border-red-500/25 text-red-300 transition-colors disabled:opacity-50">
                <Trash2 className="w-3.5 h-3.5" />
                {deletingMultiple ? 'Eliminando...' : 'Eliminar seleccionadas'}
              </button>
            </div>
          )}

          {/* Reuniones */}
          <div className="pt-3 border-t border-white/[0.04] space-y-3 bg-green-500/[0.02] rounded-xl p-3 -mx-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-5 rounded-full bg-green-500" />
                <h3 className="text-sm font-semibold text-white">Reuniones</h3>
                {appointments.length > 0 && (
                  <span className="text-[10px] bg-green-500/15 text-green-300 border border-green-500/20 rounded-full px-2 py-0.5">{appointments.length}</span>
                )}
              </div>
              {isManager ? (
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => setMeetingOpen(true)}
                    className="flex items-center gap-1 text-[11px] text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-md px-2 py-1 transition-colors">
                    <Plus className="w-3 h-3" />
                    Agendar
                  </button>
                  {appointments.length >= 5 && (
                    <button type="button" onClick={() => { setSelectMode(v => !v); setSelectedTaskIds(new Set()); setSelectedApptIds(new Set()); }}
                      className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${selectMode ? 'bg-green-500/20 border-green-500/40 text-green-300' : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white'}`}>
                      {selectMode ? 'Cancelar' : 'Seleccionar'}
                    </button>
                  )}
                </div>
              ) : (
                <button type="button" onClick={() => setRequestOpen(true)}
                  className="flex items-center gap-1 text-[11px] text-brand-light hover:text-white bg-brand/10 hover:bg-brand/20 border border-brand/20 rounded-md px-2 py-1 transition-colors">
                  <Plus className="w-3 h-3" />
                  Solicitar reunión
                </button>
              )}
            </div>
            {appointments.length === 0 ? (
              <div className="py-8 flex flex-col items-center gap-2 text-center">
                <Video className="w-7 h-7 text-white/15" />
                <p className="text-white/35 text-sm">No hay reuniones programadas.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                {appointments.map((appt) => <PortalMeetingCard key={appt.id} appointment={appt} isManager={isManager} onDelete={handleDeleteAppt} onEdit={(apt) => { if (apt) { setEditingAppt(apt); setApptEditOpen(true); } }} />)}
              </div>
            )}

            {/* Barra acción selección múltiple reuniones */}
            {selectMode && isManager && selectedApptIds.size > 0 && (
              <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl mt-2">
                <span className="text-xs text-white/60 flex-1">{selectedApptIds.size} reunión{selectedApptIds.size !== 1 ? 'es' : ''} seleccionada{selectedApptIds.size !== 1 ? 's' : ''}</span>
                <button type="button" disabled={deletingMultiple} onClick={handleDeleteMultiple}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 hover:bg-red-500/30 border border-red-500/25 text-red-300 transition-colors disabled:opacity-50">
                  <Trash2 className="w-3.5 h-3.5" />
                  {deletingMultiple ? 'Eliminando...' : 'Eliminar seleccionadas'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actividades */}
      <div className="space-y-4">
        {!isManager && activities.length > 0 && (
          <div className="glass-card rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 rounded-full bg-brand" />
              <h3 className="text-sm font-semibold text-white">Actualizaciones recientes</h3>
            </div>
            <div className="space-y-3">
              {activities.slice(0, 3).map((a) => <PortalActivityCard key={a.id} activity={a as unknown as Activity} />)}
            </div>
          </div>
        )}
      </div>

      {/* Modales */}
      <PortalDayModal
        day={selectedDay}
        tasks={tasks}
        appointments={appointments}
        isManager={isManager}
        onClose={() => setSelectedDay(null)}
        onDeleteTask={(id) => { handleDeleteTask(id); setSelectedDay(null); }}
        onDeleteAppt={(id) => { handleDeleteAppt(id); setSelectedDay(null); }}
        onEditAppt={(apt) => { if (apt) { setEditingAppt(apt); setApptEditOpen(true); } else { if (isManager) { setMeetingOpen(true); } else { if (selectedDay) { const d = new Date(selectedDay); d.setHours(10,0,0,0); setRequestDate(d.toISOString().slice(0,16)); setRequestOpen(true); } } } }}
        onEditTask={(task) => { setEditingTask(task); if (!task && selectedDay) setFormDate(selectedDay); setPortalTaskOpen(true); }}
        onFeedback={refetchSilent}
      />

      <TaskForm
        open={portalTaskOpen}
        onOpenChange={(v) => { setPortalTaskOpen(v); if (!v) setEditingTask(null); }}
        isManager={isManager}
        initialDate={editingTask ? null : (formDate ?? new Date())}
        initialClientId={client?.id ?? null}
        task={editingTask}
        onSuccess={() => {
          setPortalTaskOpen(false);
          setEditingTask(null);
          refetchSilent();
        }}
      />

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="bg-[#15151c] border-white/[0.08] text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white text-base">
              <Video className="h-4 w-4 text-green-400" />
              Solicitar reunión
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!requestDate) return;
            setRequestSaving(true);
            try {
              const session_email = session?.user?.email ?? '';
              const session_name  = session?.user?.name  ?? 'Cliente';
              const res = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name:   `Solicitud: ${session_name}`,
                  email:  session_email,
                  date:   new Date(requestDate).toISOString(),
                  notes:  requestNotes,
                  status: 'pending',
                }),
              });
              if (!res.ok) throw new Error('Error al enviar solicitud');
              setRequestOpen(false);
              setRequestDate('');
              setRequestNotes('');
              refetchSilent();
            } catch (err) {
              console.error('[solicitar reunion]', err);
              alert('Error al enviar la solicitud. Intenta de nuevo.');
            } finally {
              setRequestSaving(false);
            }
          }} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Fecha y hora propuesta *</Label>
              <Input type="datetime-local" value={requestDate} onChange={e => setRequestDate(e.target.value)} required
                className="bg-white/[0.04] border-white/[0.08] text-white focus-visible:ring-brand [color-scheme:dark]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Motivo / notas</Label>
              <textarea value={requestNotes} onChange={e => setRequestNotes(e.target.value)} rows={3}
                placeholder="¿De qué quieres hablar?"
                className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand resize-none placeholder:text-white/25" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setRequestOpen(false)}
                className="flex-1 border-white/[0.08] text-white/60 hover:text-white">Cancelar</Button>
              <Button type="submit" disabled={requestSaving || !requestDate}
                className="flex-1 bg-brand hover:bg-brand-dark text-white">
                {requestSaving ? 'Enviando...' : 'Enviar solicitud'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Barra selección múltiple */}
      {selectMode && isManager && (selectedTaskIds.size > 0 || selectedApptIds.size > 0) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center">
          <div className="flex items-center gap-3 bg-[#15151c] border border-white/[0.12] rounded-2xl px-5 py-3 shadow-2xl">
          <span className="text-sm text-white/70">
            {selectedTaskIds.size + selectedApptIds.size} seleccionado{selectedTaskIds.size + selectedApptIds.size !== 1 ? 's' : ''}
          </span>
          <button type="button" disabled={deletingMultiple} onClick={handleDeleteMultiple}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 transition-colors disabled:opacity-50">
            <Trash2 className="w-4 h-4" />
            {deletingMultiple ? 'Eliminando...' : 'Eliminar'}
          </button>
          <button type="button" onClick={() => { setSelectMode(false); setSelectedTaskIds(new Set()); setSelectedApptIds(new Set()); }}
            className="text-sm text-white/40 hover:text-white transition-colors">
            Cancelar
          </button>
          </div>
        </div>
      )}

      <PortalAppointmentEditModal
        open={apptEditOpen}
        onOpenChange={setApptEditOpen}
        appointment={editingAppt}
        onSaved={() => { setApptEditOpen(false); refetchSilent(); }}
        onDeleted={() => { setApptEditOpen(false); refetchSilent(); }}
      />

      {isManager && (
        <MeetingDialog
          open={meetingOpen}
          onOpenChange={setMeetingOpen}
          teamUsers={meetingTeam}
          initialClientEmail={client?.email}
          initialDate={formDate ?? new Date()}
          onSaved={() => {
            setMeetingOpen(false);
            refetchSilent();
          }}
        />
      )}
      {/* Modal crear milestone */}
      {milestoneOpen && isManager && client && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setMilestoneOpen(false)}>
          <div className="bg-[#15151c] border border-white/[0.08] rounded-2xl p-6 w-full max-w-lg mx-4 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-white">{editingMilestone ? "Editar milestone" : "Nuevo milestone"}</h3>
            <div className="space-y-1">
              <p className="text-xs text-white/40">Nombre *</p>
              <input type="text" placeholder="Ej: Entrega de diseños finales" value={milestoneForm.title}
                onChange={e => setMilestoneForm(f => ({...f, title: e.target.value}))}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-brand/50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-white/40">Tipo</p>
                <select value={milestoneForm.type} onChange={e => setMilestoneForm(f => ({...f, type: e.target.value}))}
                  className="w-full bg-[#1a1a24] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand/50">
                  <option value="other">General</option>
                  <option value="inicio_proyecto">Inicio proyecto</option>
                  <option value="grabacion">Grabación</option>
                  <option value="entrega_diseno">Entrega diseño</option>
                  <option value="revision_cliente">Revisión cliente</option>
                  <option value="lanzamiento_campana">Lanzamiento campaña</option>
                  <option value="publicacion_contenido">Publicación contenido</option>
                  <option value="entrega_final">Entrega final</option>
                  <option value="reporte_mensual">Reporte mensual</option>
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-white/40">Estado</p>
                <select value={milestoneForm.status} onChange={e => setMilestoneForm(f => ({...f, status: e.target.value}))}
                  className="w-full bg-[#1a1a24] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand/50">
                  <option value="upcoming">Próximo</option>
                  <option value="in_progress">En progreso</option>
                  <option value="review">En revisión</option>
                  <option value="completed">Completado</option>
                  <option value="delayed">Retrasado</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-white/40">Fecha objetivo *</p>
                <input type="date" value={milestoneForm.date} onChange={e => setMilestoneForm(f => ({...f, date: e.target.value}))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand/50 [color-scheme:dark]" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-white/40">Responsable (PM)</p>
                <select value={milestoneForm.responsibleId} onChange={e => setMilestoneForm(f => ({...f, responsibleId: e.target.value}))}
                  className="w-full bg-[#1a1a24] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand/50">
                  <option value="">Sin asignar</option>
                  {meetingTeam.filter((u: any) => u.role === 'PROJECT_MANAGER').map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name || u.email}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-white/40">Progreso: {milestoneForm.progress}%</p>
              <input type="range" min="0" max="100" step="5" value={milestoneForm.progress}
                onChange={e => setMilestoneForm(f => ({...f, progress: parseInt(e.target.value)}))}
                className="w-full accent-brand" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-white/40">Descripción</p>
              <textarea rows={2} placeholder="Descripción corta del milestone" value={milestoneForm.description}
                onChange={e => setMilestoneForm(f => ({...f, description: e.target.value}))}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-brand/50 resize-none" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-white/40">Comentarios / feedback</p>
              <textarea rows={2} placeholder="Notas importantes para el cliente" value={milestoneForm.comments}
                onChange={e => setMilestoneForm(f => ({...f, comments: e.target.value}))}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-brand/50 resize-none" />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="visibleToClient" checked={milestoneForm.visibleToClient}
                onChange={e => setMilestoneForm(f => ({...f, visibleToClient: e.target.checked}))}
                className="w-4 h-4 accent-brand" />
              <label htmlFor="visibleToClient" className="text-sm text-white/60">Visible para el cliente</label>
            </div>

            {/* Tareas vinculadas */}
            {tasks.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-white/40">Tareas vinculadas</p>
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2 max-h-36 overflow-y-auto space-y-1">
                  {tasks.map((task: any) => {
                    const checked = milestoneTaskIds.includes(task.id);
                    return (
                      <button key={task.id} type="button"
                        onClick={() => setMilestoneTaskIds(prev =>
                          checked ? prev.filter(id => id !== task.id) : [...prev, task.id]
                        )}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-xs transition-colors ${checked ? 'bg-brand/20 text-white' : 'text-white/50 hover:bg-white/[0.04] hover:text-white'}`}>
                        <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${checked ? 'border-brand bg-brand' : 'border-white/20'}`}>
                          {checked && <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 6l3 3 5-6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </span>
                        <span className="truncate flex-1">{task.title}</span>
                        {task.milestoneId && task.milestoneId !== editingMilestone?.id && (
                          <span className="text-[9px] text-white/25 shrink-0">vinculada</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {milestoneTaskIds.length > 0 && (
                  <p className="text-[10px] text-white/30">{milestoneTaskIds.length} tarea{milestoneTaskIds.length !== 1 ? 's' : ''} seleccionada{milestoneTaskIds.length !== 1 ? 's' : ''}</p>
                )}
              </div>
            )}
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setMilestoneOpen(false)}
                className="px-4 py-2 text-sm text-white/40 hover:text-white transition-colors">Cancelar</button>
              <button type="button"
                onClick={async () => {
                  if (!milestoneForm.title || !milestoneForm.date) return;
                  let milestoneId = editingMilestone?.id;
                  if (editingMilestone) {
                    await fetch("/api/milestones", {
                      method: "PUT", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: editingMilestone.id, ...milestoneForm }),
                    });
                  } else {
                    const mRes = await fetch("/api/milestones", {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ clientId: client.id, ...milestoneForm }),
                    });
                    const mData = await mRes.json();
                    milestoneId = mData.milestone?.id;
                  }
                  // Vincular tareas seleccionadas
                  if (milestoneId && milestoneTaskIds.length > 0) {
                    await Promise.all(milestoneTaskIds.map(taskId =>
                      fetch('/api/tasks?id=' + taskId, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ milestoneId }),
                      })
                    ));
                  }
                  setMilestoneOpen(false);
                  setEditingMilestone(null);
                  setMilestoneTaskIds([]);
                  setMilestoneForm({ title: "", description: "", date: "", type: "other", status: "upcoming", progress: 0, responsibleId: "", visibleToClient: true, comments: "" });
                  refetch();
                }}
                className="px-4 py-2 text-sm bg-brand hover:bg-brand-dark text-white rounded-lg transition-colors">
                Guardar milestone
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
