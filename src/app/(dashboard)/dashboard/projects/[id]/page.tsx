'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft, Plus, CheckCircle2, Circle, Clock, AlertCircle,
  Pencil, Trash2, ChevronDown, ChevronRight, Users, Calendar,
  Target, BarChart3, Loader2, X, Check, Flag,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Types ─────────────────────────────────────────── */
interface Milestone {
  id: string;
  title: string;
  description: string;
  date: string;
  status: 'upcoming' | 'in_progress' | 'completed' | 'blocked';
  progress: number;
  tasks: ProjectTask[];
}

interface ProjectTask {
  id: string;
  title: string;
  status: string;
  dueDate?: string;
  assignedUsers: { user: { id: string; name: string; color: string; image?: string } }[];
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  color: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  client?: { id: string; name: string; color: string };
  creator: { id: string; name: string; color: string; image?: string };
  assignedUsers: { user: { id: string; name: string; color: string; image?: string; role: string } }[];
  milestones: Milestone[];
  tasks: ProjectTask[];
  _count: { tasks: number; milestones: number };
}

/* ─── Constantes ────────────────────────────────────── */
const MS_STATUS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  upcoming:    { label: 'Próxima',      color: '#94a3b8', icon: Circle       },
  in_progress: { label: 'En curso',     color: '#60a5fa', icon: Clock        },
  completed:   { label: 'Completada',   color: '#4ade80', icon: CheckCircle2 },
  blocked:     { label: 'Bloqueada',    color: '#f87171', icon: AlertCircle  },
};

const TASK_STATUS_COLOR: Record<string, string> = {
  pending:          '#94a3b8',
  in_progress:      '#60a5fa',
  internal_review:  '#fb923c',
  approved:         '#4ade80',
  completed:        '#a78bfa',
  cancelled:        '#f87171',
};

/* ─── Avatar ────────────────────────────────────────── */
function Avatar({ name, color, image, size = 24 }: { name: string; color: string; image?: string | null; size?: number }) {
  if (image) return <img src={image} alt={name} className="rounded-full object-cover shrink-0 ring-1 ring-white/10" style={{ width: size, height: size }} />;
  const ini = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="rounded-full flex items-center justify-center shrink-0 text-white font-semibold ring-1 ring-white/10"
      style={{ width: size, height: size, background: color || '#8B5CF6', fontSize: size * 0.38 }}>
      {ini}
    </div>
  );
}

/* ─── MilestoneModal ────────────────────────────────── */
function MilestoneModal({ open, onClose, onSaved, projectId, milestone }: {
  open: boolean; onClose: () => void; onSaved: () => void;
  projectId: string; milestone?: Milestone | null;
}) {
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [date,        setDate]        = useState('');
  const [status,      setStatus]      = useState<string>('upcoming');
  const [progress,    setProgress]    = useState(0);
  const [loading,     setLoading]     = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(milestone?.title ?? '');
      setDescription(milestone?.description ?? '');
      setDate(milestone?.date ? milestone.date.slice(0, 10) : '');
      setStatus(milestone?.status ?? 'upcoming');
      setProgress(milestone?.progress ?? 0);
    }
  }, [open, milestone]);

  async function save() {
    if (!title.trim()) { toast.error('El título es requerido'); return; }
    setLoading(true);
    try {
      const body = milestone
        ? { id: milestone.id, title, description, date: date || undefined, status, progress }
        : { projectId, title, description, date: date || undefined, status, progress };
      const res = await fetch('/api/projects/milestones', {
        method: milestone ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success(milestone ? 'Fase actualizada' : 'Fase creada');
      onSaved(); onClose();
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar');
    } finally { setLoading(false); }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ background: '#0f0f14', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--wl-border)]">
          <h3 className="text-[15px] font-semibold text-white">{milestone ? 'Editar fase' : 'Nueva fase'}</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[11px] text-[var(--wl-text-muted)] uppercase tracking-wider mb-1.5 block">Título *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Ej. Entrega de diseños, Lanzamiento..."
              className="w-full rounded-xl bg-white/[0.04] border border-[var(--wl-border)] px-3 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-violet-500/50" />
          </div>
          <div>
            <label className="text-[11px] text-[var(--wl-text-muted)] uppercase tracking-wider mb-1.5 block">Descripción</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              placeholder="¿Qué incluye esta fase?"
              className="w-full rounded-xl bg-white/[0.04] border border-[var(--wl-border)] px-3 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-violet-500/50 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-[var(--wl-text-muted)] uppercase tracking-wider mb-1.5 block">Fecha límite</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full rounded-xl bg-white/[0.04] border border-[var(--wl-border)] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/50 [color-scheme:dark]" />
            </div>
            <div>
              <label className="text-[11px] text-[var(--wl-text-muted)] uppercase tracking-wider mb-1.5 block">Estado</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full rounded-xl bg-white/[0.04] border border-[var(--wl-border)] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/50">
                {Object.entries(MS_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] text-[var(--wl-text-muted)] uppercase tracking-wider">Progreso</label>
              <span className="text-[12px] font-medium text-[var(--wl-text-secondary)]">{progress}%</span>
            </div>
            <input type="range" min={0} max={100} value={progress}
              onChange={e => setProgress(Number(e.target.value))}
              className="w-full accent-violet-500" />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 rounded-xl border border-[var(--wl-border)] py-2.5 text-[13px] text-white/50 hover:text-white transition-colors">
              Cancelar
            </button>
            <button onClick={save} disabled={loading}
              className="flex-1 rounded-xl bg-violet-600 py-2.5 text-[13px] font-semibold text-white hover:bg-violet-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {milestone ? 'Guardar' : 'Crear fase'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── MilestoneCard ─────────────────────────────────── */
function MilestoneCard({ milestone, color, isManager, onEdit, onDelete, onStatusChange }: {
  milestone: Milestone; color: string; isManager: boolean;
  onEdit: () => void; onDelete: () => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = MS_STATUS[milestone.status] ?? MS_STATUS.upcoming;
  const Icon = cfg.icon;
  const doneTasks  = milestone.tasks.filter(t => ['completed','approved'].includes(t.status)).length;
  const totalTasks = milestone.tasks.length;
  const autoProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : milestone.progress;

  return (
    <div className="rounded-2xl border border-[var(--wl-border)] bg-white/[0.02] overflow-hidden transition-all">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        {/* Estado */}
        <button onClick={() => {
          const order = ['upcoming','in_progress','completed','blocked'];
          const next = order[(order.indexOf(milestone.status) + 1) % order.length];
          onStatusChange(milestone.id, next);
        }} disabled={!isManager} title="Cambiar estado"
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--wl-hover)]"
          style={{ color: cfg.color }}>
          <Icon className="w-4 h-4" />
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(v => !v)}>
          <div className="flex items-center gap-2">
            <p className={`text-[13px] font-medium leading-snug ${milestone.status === 'completed' ? 'text-[var(--wl-text-muted)] line-through' : 'text-white/85'}`}>
              {milestone.title}
            </p>
            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: cfg.color + '20', color: cfg.color }}>
              {cfg.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            {milestone.date && (
              <span className="text-[11px] text-white/30 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(milestone.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
              </span>
            )}
            {totalTasks > 0 && (
              <span className="text-[11px] text-white/30">
                {doneTasks}/{totalTasks} tareas
              </span>
            )}
          </div>
        </div>

        {/* Progress ring */}
        <div className="shrink-0 relative w-9 h-9">
          <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
            <circle cx="18" cy="18" r="14" fill="none" stroke={color} strokeWidth="3"
              strokeDasharray={`${(autoProgress / 100) * 87.96} 87.96`}
              strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-[var(--wl-text-secondary)]">
            {autoProgress}%
          </span>
        </div>

        {/* Acciones */}
        {isManager && (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onEdit} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-[var(--wl-text-secondary)] hover:bg-[var(--wl-hover)] transition-colors">
              <Pencil className="w-3 h-3" />
            </button>
            <button onClick={onDelete} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}

        <button onClick={() => setExpanded(v => !v)} className="text-white/25 shrink-0">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-white/[0.04]">
        <div className="h-full transition-all duration-500 rounded-full"
          style={{ width: `${autoProgress}%`, background: color }} />
      </div>

      {/* Tareas expandidas */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden">
            <div className="px-4 pb-3 pt-2 space-y-1.5">
              {milestone.tasks.length === 0 ? (
                <p className="text-[12px] text-white/25 py-2 text-center">Sin tareas vinculadas a esta fase</p>
              ) : milestone.tasks.map(task => {
                const tc = TASK_STATUS_COLOR[task.status] || '#94a3b8';
                return (
                  <div key={task.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-[var(--wl-hover)] transition-colors">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: tc }} />
                    <span className={`text-[12px] flex-1 truncate ${task.status === 'completed' || task.status === 'approved' ? 'text-white/35 line-through' : 'text-white/65'}`}>
                      {task.title}
                    </span>
                    <div className="flex -space-x-1 shrink-0">
                      {task.assignedUsers.slice(0, 3).map(au => (
                        <Avatar key={au.user.id} name={au.user.name} color={au.user.color} image={au.user.image} size={18} />
                      ))}
                    </div>
                    {task.dueDate && (
                      <span className="text-[10px] text-white/25 shrink-0">
                        {new Date(task.dueDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Página principal ──────────────────────────────── */
export default function ProjectDetailPage() {
  const params   = useParams();
  const router   = useRouter();
  const { data: session } = useSession();
  const role     = (session?.user as any)?.role ?? '';
  const isManager = ['ADMIN', 'PROJECT_MANAGER'].includes(role);

  const [project,    setProject]    = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [msModal,    setMsModal]    = useState(false);
  const [editMs,     setEditMs]     = useState<Milestone | null>(null);
  const [activeTab,  setActiveTab]  = useState<'milestones' | 'tasks' | 'team'>('milestones');

  const projectId = params.id as string;

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects?id=${projectId}`);
      if (!res.ok) { router.push('/dashboard/projects'); return; }
      const d = await res.json();
      setProject(d.project);
    } catch { toast.error('Error al cargar proyecto'); }
    finally { setLoading(false); }
  }, [projectId, router]);

  const fetchMilestones = useCallback(async () => {
    const res = await fetch(`/api/projects/milestones?projectId=${projectId}`);
    if (res.ok) { const d = await res.json(); setMilestones(d.milestones ?? []); }
  }, [projectId]);

  useEffect(() => { fetchProject(); fetchMilestones(); }, [fetchProject, fetchMilestones]);

  async function deleteMs(id: string) {
    if (!confirm('¿Eliminar esta fase?')) return;
    const res = await fetch(`/api/projects/milestones?id=${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Fase eliminada'); fetchMilestones(); }
    else toast.error('Error al eliminar');
  }

  async function changeStatus(id: string, status: string) {
    const res = await fetch('/api/projects/milestones', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) fetchMilestones();
    else toast.error('Error al actualizar');
  }

  async function changeProjectStatus(status: string) {
    const res = await fetch('/api/projects', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: projectId, status }),
    });
    if (res.ok) { fetchProject(); toast.success('Estado actualizado'); }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
    </div>
  );
  if (!project) return null;

  const totalTasks = project.tasks?.length ?? 0;
  const doneTasks  = project.tasks?.filter(t => ['completed','approved'].includes(t.status)).length ?? 0;
  const msProgress = milestones.length > 0
    ? Math.round(milestones.reduce((a, m) => a + m.progress, 0) / milestones.length)
    : totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const msCompleted = milestones.filter(m => m.status === 'completed').length;

  const tabs = [
    { id: 'milestones' as const, label: 'Fases',  count: milestones.length },
    { id: 'tasks'      as const, label: 'Tareas', count: totalTasks },
    { id: 'team'       as const, label: 'Equipo', count: project.assignedUsers.length },
  ];

  return (
    <div className="flex flex-col gap-0 min-h-full">

      {/* ── Header ── */}
      <div className="px-4 sm:px-6 pt-5 pb-4 border-b border-[var(--wl-border-subtle)]"
        style={{ background: 'linear-gradient(180deg, rgba(139,92,246,0.05) 0%, transparent 100%)' }}>
        {/* Breadcrumb */}
        <button onClick={() => router.push('/dashboard/projects')}
          className="flex items-center gap-1.5 text-[12px] text-white/30 hover:text-[var(--wl-text-secondary)] transition-colors mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          Proyectos
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            {/* Color dot */}
            <div className="mt-1 h-3 w-3 rounded-full shrink-0" style={{ background: project.color }} />
            <div className="min-w-0">
              <h1 className="text-[20px] sm:text-[24px] font-bold text-white leading-tight truncate">
                {project.name}
              </h1>
              {project.client && (
                <p className="text-[13px] text-[var(--wl-text-muted)] mt-0.5">{project.client.name}</p>
              )}
              {project.description && (
                <p className="text-[13px] text-white/35 mt-1.5 line-clamp-2">{project.description}</p>
              )}
            </div>
          </div>

          {/* Status badge + acciones */}
          <div className="flex items-center gap-2 shrink-0">
            {isManager && (
              <select value={project.status} onChange={e => changeProjectStatus(e.target.value)}
                className="rounded-xl bg-white/[0.04] border border-[var(--wl-border)] px-2.5 py-1.5 text-[12px] text-[var(--wl-text-secondary)] outline-none focus:border-violet-500/40 [color-scheme:dark]">
                <option value="active">Activo</option>
                <option value="paused">Pausado</option>
                <option value="completed">Completado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            )}
          </div>
        </div>

        {/* Métricas rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            { icon: BarChart3,    label: 'Progreso',  value: `${msProgress}%`,    color: project.color },
            { icon: Flag,         label: 'Fases',     value: `${msCompleted}/${milestones.length}`, color: '#a78bfa' },
            { icon: CheckCircle2, label: 'Tareas',    value: `${doneTasks}/${totalTasks}`, color: '#4ade80' },
            { icon: Calendar,     label: 'Deadline',  value: project.endDate
                ? new Date(project.endDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
                : '—',
              color: '#fb923c' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-[var(--wl-border-subtle)] bg-white/[0.02] px-3 py-3 flex items-center gap-2.5">
              <s.icon className="w-4 h-4 shrink-0" style={{ color: s.color }} />
              <div className="min-w-0">
                <p className="text-[10px] text-white/30 uppercase tracking-wider">{s.label}</p>
                <p className="text-[15px] font-semibold text-white">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Progress bar global */}
        <div className="mt-4">
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div className="h-full rounded-full"
              style={{ background: project.color }}
              initial={{ width: 0 }}
              animate={{ width: `${msProgress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }} />
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-[var(--wl-border-subtle)] px-4 sm:px-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-1 py-3 mr-6 text-[13px] font-medium border-b-2 -mb-px transition-all ${
              activeTab === t.id
                ? 'border-violet-500 text-white'
                : 'border-transparent text-white/35 hover:text-[var(--wl-text-secondary)]'
            }`}>
            {t.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              activeTab === t.id ? 'bg-violet-500/20 text-violet-300' : 'bg-white/[0.06] text-white/30'
            }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Contenido ── */}
      <div className="flex-1 px-4 sm:px-6 py-5">

        {/* TAB: Fases/Milestones */}
        {activeTab === 'milestones' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] text-white/30">{milestones.length} fase{milestones.length !== 1 ? 's' : ''} del proyecto</p>
              {isManager && (
                <button onClick={() => { setEditMs(null); setMsModal(true); }}
                  className="flex items-center gap-1.5 rounded-xl bg-violet-600/80 hover:bg-violet-600 px-3 py-2 text-[12px] font-medium text-white transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                  Agregar fase
                </button>
              )}
            </div>

            {milestones.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-white/20">
                <Target className="w-10 h-10 opacity-40" />
                <p className="text-[14px]">Sin fases definidas</p>
                {isManager && (
                  <button onClick={() => { setEditMs(null); setMsModal(true); }}
                    className="text-[13px] text-violet-400 hover:text-violet-300 transition-colors">
                    Crear primera fase →
                  </button>
                )}
              </div>
            ) : (
              milestones.map((m, i) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}>
                  <MilestoneCard
                    milestone={m}
                    color={project.color}
                    isManager={isManager}
                    onEdit={() => { setEditMs(m); setMsModal(true); }}
                    onDelete={() => deleteMs(m.id)}
                    onStatusChange={changeStatus}
                  />
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* TAB: Tareas */}
        {activeTab === 'tasks' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] text-white/30">{totalTasks} tareas vinculadas al proyecto</p>
            </div>
            {(project.tasks ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-white/20">
                <CheckCircle2 className="w-10 h-10 opacity-40" />
                <p className="text-[14px]">Sin tareas en este proyecto</p>
                <p className="text-[12px] text-white/15">Asigna el projectId al crear tareas desde el kanban</p>
              </div>
            ) : (project.tasks ?? []).map(task => {
              const tc = TASK_STATUS_COLOR[task.status] || '#94a3b8';
              return (
                <div key={task.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-[var(--wl-border-subtle)] bg-white/[0.02] hover:bg-[var(--wl-hover)] transition-colors">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: tc }} />
                  <span className="flex-1 text-[13px] text-white/75 truncate">{task.title}</span>
                  <div className="flex -space-x-1.5 shrink-0">
                    {task.assignedUsers.slice(0, 3).map(au => (
                      <Avatar key={au.user.id} name={au.user.name} color={au.user.color} image={au.user.image} size={22} />
                    ))}
                  </div>
                  {task.dueDate && (
                    <span className="text-[11px] text-white/25 shrink-0">
                      {new Date(task.dueDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TAB: Equipo */}
        {activeTab === 'team' && (
          <div className="space-y-2">
            <p className="text-[12px] text-white/30 mb-3">{project.assignedUsers.length} miembros asignados</p>
            {project.assignedUsers.map(({ user }) => (
              <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--wl-border-subtle)] bg-white/[0.02]">
                <Avatar name={user.name} color={user.color} image={user.image} size={36} />
                <div>
                  <p className="text-[13px] font-medium text-[var(--wl-text-secondary)]">{user.name}</p>
                  <p className="text-[11px] text-white/30">{user.role}</p>
                </div>
              </div>
            ))}
            {project.assignedUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-white/20 gap-2">
                <Users className="w-10 h-10 opacity-40" />
                <p className="text-[14px]">Sin equipo asignado</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Milestone Modal ── */}
      <AnimatePresence>
        {msModal && (
          <MilestoneModal
            open={msModal}
            onClose={() => { setMsModal(false); setEditMs(null); }}
            onSaved={fetchMilestones}
            projectId={projectId}
            milestone={editMs}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
