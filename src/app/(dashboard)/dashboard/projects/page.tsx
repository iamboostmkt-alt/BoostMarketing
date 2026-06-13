'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Plus, Calendar, Users, ChevronRight, LayoutGrid, List, Search, FolderOpen, Clock, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

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
  assignedUsers: { user: { id: string; name: string; color: string; image?: string } }[];
  milestones: { id: string; title: string; status: string; date: string; progress: number }[];
  _count: { tasks: number; milestones: number };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  active:    { label: 'Activo',    color: '#4ade80', bg: 'rgba(74,222,128,0.1)',   icon: Circle       },
  paused:    { label: 'Pausado',   color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   icon: Clock        },
  completed: { label: 'Completo',  color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', icon: CheckCircle2 },
  cancelled: { label: 'Cancelado', color: '#f87171', bg: 'rgba(248,113,113,0.1)', icon: AlertCircle  },
};

function Avatar({ name, color, image, size = 28 }: { name: string; color: string; image?: string | null; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  if (image) return <img src={image} alt={name} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  return (
    <div className="rounded-full flex items-center justify-center shrink-0 text-white font-semibold"
      style={{ width: size, height: size, background: color || '#8B5CF6', fontSize: size * 0.35 }}>
      {initials}
    </div>
  );
}

function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const router = useRouter();
  const status = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.active;
  const StatusIcon = status.icon;
  const progress = project.milestones.length > 0
    ? Math.round(project.milestones.reduce((a, m) => a + m.progress, 0) / project.milestones.length)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={() => router.push('/dashboard/projects/' + project.id)}
      className="glass-card rounded-2xl p-5 cursor-pointer transition-all hover:ring-1"
      style={{ '--tw-ring-color': project.color + '40' } as any}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl shrink-0 flex items-center justify-center text-lg"
            style={{ background: project.color + '22', border: `1px solid ${project.color}44` }}>
            📁
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-white/90 leading-tight">{project.name}</h3>
            {project.client && (
              <p className="text-[11px] text-white/40 mt-0.5">{project.client.name}</p>
            )}
          </div>
        </div>
        <span className="shrink-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{ background: status.bg, color: status.color }}>
          <StatusIcon className="w-2.5 h-2.5" />
          {status.label}
        </span>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-[12px] text-white/40 mb-4 line-clamp-2">{project.description}</p>
      )}

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-white/40">Progreso</span>
          <span className="text-[11px] font-medium" style={{ color: project.color }}>{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: project.color }} />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4 text-[11px] text-white/40">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          {project._count.tasks} tareas
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {project._count.milestones} fases
        </span>
        {project.endDate && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(project.endDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>

      {/* Team */}
      <div className="flex items-center justify-between">
        <div className="flex -space-x-1.5">
          {project.assignedUsers.slice(0, 4).map(({ user }) => (
            <div key={user.id} className="ring-2 ring-[#0F1117] rounded-full" title={user.name}>
              <Avatar name={user.name} color={user.color} image={user.image} size={22} />
            </div>
          ))}
          {project.assignedUsers.length > 4 && (
            <div className="ring-2 ring-[#0F1117] rounded-full flex items-center justify-center bg-white/10 text-[9px] text-white/60"
              style={{ width: 22, height: 22 }}>
              +{project.assignedUsers.length - 4}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={e => { e.stopPropagation(); onClick(); }}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-white/20 hover:text-white/60 hover:bg-white/[0.06] transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <ChevronRight className="w-4 h-4 text-white/20" />
        </div>
      </div>
    </motion.div>
  );
}

// Modal de crear/editar proyecto
function ProjectModal({ open, onClose, onSaved, project }: {
  open: boolean; onClose: () => void; onSaved: () => void; project?: Project | null;
}) {
  const [name,        setName]        = useState(project?.name        ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [color,       setColor]       = useState(project?.color       ?? '#8B5CF6');
  const [startDate,   setStartDate]   = useState(project?.startDate   ? project.startDate.slice(0,10) : '');
  const [endDate,     setEndDate]     = useState(project?.endDate     ? project.endDate.slice(0,10)   : '');
  const [budget,      setBudget]      = useState(project?.budget?.toString() ?? '');
  const [clients,     setClients]     = useState<any[]>([]);
  const [team,        setTeam]        = useState<any[]>([]);
  const [clientId,    setClientId]    = useState(project?.client?.id ?? '');
  const [teamIds,     setTeamIds]     = useState<string[]>(project?.assignedUsers.map(au => au.user.id) ?? []);
  const [loading,     setLoading]     = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch('/api/clients').then(r => r.json()).then(d => setClients(d.clients ?? []));
    fetch('/api/team-members').then(r => r.json()).then(d => setTeam((d.users ?? []).filter((u: any) => u.role !== 'CLIENT' && u.role !== 'UNASSIGNED')));
  }, [open]);

  useEffect(() => {
    if (project) {
      setName(project.name); setDescription(project.description); setColor(project.color);
      setStartDate(project.startDate ? project.startDate.slice(0,10) : '');
      setEndDate(project.endDate ? project.endDate.slice(0,10) : '');
      setBudget(project.budget?.toString() ?? '');
      setClientId(project.client?.id ?? '');
      setTeamIds(project.assignedUsers.map(au => au.user.id));
    }
  }, [project]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error('El nombre es requerido'); return; }
    setLoading(true);
    try {
      const body = {
        ...(project ? { id: project.id } : {}),
        name: name.trim(), description, color,
        startDate: startDate || undefined, endDate: endDate || undefined,
        budget: budget ? parseFloat(budget) : undefined,
        clientId: clientId || undefined,
        assignedUserIds: teamIds,
      };
      const res = await fetch('/api/projects', {
        method: project ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success(project ? 'Proyecto actualizado' : 'Proyecto creado');
      onSaved(); onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;
  const COLORS = ['#8B5CF6','#3B82F6','#10B981','#F59E0B','#EF4444','#EC4899','#06B6D4','#84CC16'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-card rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <h2 className="text-[16px] font-semibold text-white">{project ? 'Editar proyecto' : 'Nuevo proyecto'}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Nombre */}
          <div>
            <label className="text-[12px] text-white/50 mb-1.5 block">Nombre *</label>
            <input value={name} onChange={e => setName(e.target.value)} required
              placeholder="Ej. Campaña Chamoy Fin de Año"
              className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500/50" />
          </div>
          {/* Descripción */}
          <div>
            <label className="text-[12px] text-white/50 mb-1.5 block">Descripción</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              placeholder="¿De qué trata este proyecto?"
              className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500/50 resize-none" />
          </div>
          {/* Color */}
          <div>
            <label className="text-[12px] text-white/50 mb-1.5 block">Color</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full transition-transform"
                  style={{ background: c, transform: color === c ? 'scale(1.25)' : 'scale(1)', outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }} />
              ))}
            </div>
          </div>
          {/* Cliente */}
          <div>
            <label className="text-[12px] text-white/50 mb-1.5 block">Cliente (opcional)</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)}
              className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50">
              <option value="">Sin cliente (proyecto interno)</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] text-white/50 mb-1.5 block">Inicio</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50" />
            </div>
            <div>
              <label className="text-[12px] text-white/50 mb-1.5 block">Fin</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50" />
            </div>
          </div>
          {/* Presupuesto */}
          <div>
            <label className="text-[12px] text-white/50 mb-1.5 block">Presupuesto (opcional)</label>
            <input type="number" value={budget} onChange={e => setBudget(e.target.value)} min="0" step="0.01"
              placeholder="0.00"
              className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500/50" />
          </div>
          {/* Equipo */}
          <div>
            <label className="text-[12px] text-white/50 mb-1.5 block">Equipo asignado</label>
            <div className="max-h-40 overflow-y-auto space-y-1 rounded-xl bg-white/[0.02] border border-white/[0.06] p-2">
              {team.map(u => (
                <label key={u.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] cursor-pointer">
                  <input type="checkbox" checked={teamIds.includes(u.id)} onChange={e => {
                    setTeamIds(prev => e.target.checked ? [...prev, u.id] : prev.filter(id => id !== u.id));
                  }} className="rounded accent-violet-500" />
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: u.color || '#8B5CF6' }}>
                    {u.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                  </div>
                  <span className="text-[13px] text-white/70">{u.name}</span>
                  <span className="ml-auto text-[10px] text-white/30">{u.role}</span>
                </label>
              ))}
              {team.length === 0 && <p className="text-[12px] text-white/30 text-center py-2">Sin miembros de equipo</p>}
            </div>
          </div>
          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-white/[0.08] py-2.5 text-sm text-white/60 hover:text-white/80 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition-colors disabled:opacity-50">
              {loading ? 'Guardando...' : project ? 'Guardar cambios' : 'Crear proyecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role ?? '';
  const isManager = ['ADMIN', 'PROJECT_MANAGER'].includes(role);

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState<string>('all');
  const [view,     setView]     = useState<'grid' | 'list'>('grid');
  const [creating, setCreating] = useState(false);
  const [editing,  setEditing]  = useState<Project | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) { const d = await res.json(); setProjects(d.projects ?? []); }
    } catch { toast.error('Error al cargar proyectos'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const filtered = projects.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.client?.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || p.status === filter;
    return matchSearch && matchFilter;
  });

  const stats = {
    total:    projects.length,
    active:   projects.filter(p => p.status === 'active').length,
    completed: projects.filter(p => p.status === 'completed').length,
    paused:   projects.filter(p => p.status === 'paused').length,
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-white">Proyectos</h1>
          <p className="text-[13px] text-white/40 mt-0.5">{stats.active} activos · {stats.completed} completados</p>
        </div>
        {isManager && (
          <button onClick={() => setCreating(true)}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition-colors"
            style={{ boxShadow: '0 4px 15px rgba(139,92,246,0.3)' }}>
            <Plus className="w-4 h-4" />
            Nuevo proyecto
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total,     color: '#8B5CF6' },
          { label: 'Activos', value: stats.active,  color: '#4ade80' },
          { label: 'Pausados', value: stats.paused, color: '#fbbf24' },
          { label: 'Completados', value: stats.completed, color: '#a78bfa' },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-xl p-4">
            <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1">{s.label}</p>
            <p className="text-[24px] font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar proyectos..."
            className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500/50" />
        </div>
        <div className="flex gap-1.5">
          {['all','active','paused','completed','cancelled'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-2 rounded-xl text-[12px] font-medium transition-colors ${filter === s ? 'bg-violet-600 text-white' : 'bg-white/[0.04] text-white/50 hover:text-white/80'}`}>
              {s === 'all' ? 'Todos' : STATUS_CONFIG[s]?.label ?? s}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-white/[0.04] rounded-xl p-1">
          <button onClick={() => setView('grid')} className={`p-1.5 rounded-lg ${view === 'grid' ? 'bg-white/10' : ''}`}>
            <LayoutGrid className="w-3.5 h-3.5 text-white/60" />
          </button>
          <button onClick={() => setView('list')} className={`p-1.5 rounded-lg ${view === 'list' ? 'bg-white/10' : ''}`}>
            <List className="w-3.5 h-3.5 text-white/60" />
          </button>
        </div>
      </div>

      {/* Grid/List de proyectos */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="glass-card rounded-2xl h-48 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/25 gap-3">
          <FolderOpen className="w-12 h-12 opacity-40" />
          <p className="text-[15px]">{search ? 'Sin resultados' : 'No hay proyectos aún'}</p>
          {isManager && !search && (
            <button onClick={() => setCreating(true)}
              className="mt-2 text-[13px] text-violet-400 hover:text-violet-300 transition-colors">
              Crear el primer proyecto →
            </button>
          )}
        </div>
      ) : (
        <div className={view === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
          : 'flex flex-col gap-3'}>
          {filtered.map(p => (
            <ProjectCard key={p.id} project={p} onClick={() => setEditing(p)} />
          ))}
        </div>
      )}

      {/* Modales */}
      <ProjectModal open={creating} onClose={() => setCreating(false)} onSaved={fetchProjects} />
      <ProjectModal open={!!editing} onClose={() => setEditing(null)} onSaved={fetchProjects} project={editing} />
    </div>
  );
}
