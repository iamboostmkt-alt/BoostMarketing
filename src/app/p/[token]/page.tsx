'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  CheckCircle2, Clock, AlertCircle, Circle, PlayCircle,
  FileText, Download, Users, Calendar, ChevronRight,
  Loader2, AlertTriangle, ExternalLink, TrendingUp,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// ── Types ──────────────────────────────────────────────────
interface ProjectData {
  project: {
    id: string; name: string; description: string;
    status: string; color: string; progress: number;
    startDate: string | null; endDate: string | null;
    client: { name: string; company: string; logoUrl?: string } | null;
    milestones: Array<{ id: string; title: string; description: string; date: string; status: string; progress: number; type: string }>;
    tasks: Array<{ id: string; title: string; status: string; priority: string; dueDate: string | null }>;
    team: Array<{ id: string; name: string; image: string | null; role: string }>;
    files: Array<{ id: string; fileName: string; fileUrl: string; fileType: string; createdAt: string }>;
  };
  agency: { name: string; logo: string | null };
}

// ── Helpers ────────────────────────────────────────────────
const milestoneIcon = (status: string) => {
  switch (status) {
    case 'completed': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    case 'in_progress': return <PlayCircle className="w-5 h-5 text-blue-500" />;
    case 'review': return <Clock className="w-5 h-5 text-amber-500" />;
    case 'delayed': return <AlertCircle className="w-5 h-5 text-red-500" />;
    default: return <Circle className="w-5 h-5 text-gray-300" />;
  }
};

const milestoneLabel: Record<string, string> = {
  upcoming: 'Próximo', in_progress: 'En progreso',
  review: 'En revisión', completed: 'Completado', delayed: 'Retrasado',
};

const statusLabel: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: 'Pendiente',   color: '#6B7280', bg: '#F3F4F6' },
  in_progress: { label: 'En progreso', color: '#2563EB', bg: '#DBEAFE' },
  review:      { label: 'Revisión',    color: '#D97706', bg: '#FEF3C7' },
  completed:   { label: 'Completado',  color: '#059669', bg: '#D1FAE5' },
  approved:    { label: 'Aprobado',    color: '#059669', bg: '#D1FAE5' },
};

const ini = (name: string | null) =>
  (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

export default function ProjectPublicView() {
  const params  = useParams();
  const token   = params?.token as string;
  const [data,  setData]  = useState<ProjectData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab,   setTab]   = useState<'overview' | 'tasks' | 'files' | 'team'>('overview');

  useEffect(() => {
    if (!token) return;
    fetch(`/api/public/project?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError('No se pudo cargar el proyecto'));
  }, [token]);

  // ── Loading ──────────────────────────────────────────────
  if (!data && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F6F7FB' }}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#8B5CF6] animate-spin mx-auto mb-3" />
          <p className="text-[#6B7280] text-sm">Cargando proyecto...</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F6F7FB' }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-[#111827] text-xl font-bold mb-2">Enlace no disponible</h2>
          <p className="text-[#6B7280] text-sm">{error}</p>
          <p className="text-[#9CA3AF] text-xs mt-3">Si crees que esto es un error, contacta a tu agencia.</p>
        </div>
      </div>
    );
  }

  const { project, agency } = data!;
  const completedMilestones = project.milestones.filter(m => m.status === 'completed').length;

  return (
    <div className="min-h-screen" style={{ background: '#F6F7FB', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* ── TOP BAR ──────────────────────────────────────── */}
      <div className="sticky top-0 z-10 border-b" style={{ background: 'rgba(255,255,255,0.95)', borderColor: 'rgba(17,24,39,0.06)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Agency logo */}
          <div className="flex items-center gap-2.5">
            {agency.logo
              ? <img src={agency.logo} alt={agency.name} className="h-7 w-auto" style={{ maxWidth: 120 }} />
              : <span className="text-[15px] font-bold text-[#111827]">{agency.name}</span>
            }
          </div>
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(139,92,246,0.08)', color: '#7C3AED' }}>
            Portal de proyecto
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* ── HERO del proyecto ─────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-[20px] p-6 text-white overflow-hidden relative"
          style={{ background: `linear-gradient(135deg, ${project.color}dd, ${project.color}99)` }}>
          {/* Decoración */}
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
            style={{ background: 'white', transform: 'translate(30%, -30%)' }} />
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div>
                {project.client && (
                  <p className="text-white/70 text-[11px] font-medium uppercase tracking-widest mb-1">
                    {project.client.name}
                  </p>
                )}
                <h1 className="text-[24px] font-bold leading-tight text-white">{project.name}</h1>
                {project.description && (
                  <p className="text-white/70 text-[13px] mt-1.5 leading-relaxed">{project.description}</p>
                )}
              </div>
            </div>

            {/* Progreso */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/80 text-[12px] font-medium">Progreso general</span>
                <span className="text-white font-bold text-[18px]">{project.progress}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
                <motion.div className="h-full rounded-full bg-white"
                  initial={{ width: 0 }} animate={{ width: `${project.progress}%` }}
                  transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }} />
              </div>
              <div className="flex items-center justify-between mt-2 text-white/60 text-[11px]">
                {project.startDate && <span>Inicio: {new Date(project.startDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>}
                {project.endDate && <span>Entrega: {new Date(project.endDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── STATS rápidos ─────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Milestones', value: `${completedMilestones}/${project.milestones.length}`, icon: TrendingUp, color: '#8B5CF6' },
            { label: 'Tareas activas', value: project.tasks.filter(t => t.status === 'in_progress').length, icon: PlayCircle, color: '#3B82F6' },
            { label: 'Archivos', value: project.files.length, icon: FileText, color: '#10B981' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
              className="rounded-[16px] p-4 text-center" style={{ background: '#FFFFFF', border: '1px solid rgba(17,24,39,0.06)' }}>
              <s.icon className="w-5 h-5 mx-auto mb-1.5" style={{ color: s.color }} />
              <p className="text-[20px] font-bold text-[#111827]">{s.value}</p>
              <p className="text-[10px] text-[#6B7280] mt-0.5">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* ── TABS ──────────────────────────────────────── */}
        <div className="flex gap-1 p-1 rounded-[14px]" style={{ background: '#FFFFFF', border: '1px solid rgba(17,24,39,0.06)' }}>
          {([
            { id: 'overview', label: '📋 Avance' },
            { id: 'tasks',    label: '✅ Tareas' },
            { id: 'files',    label: '📁 Archivos' },
            { id: 'team',     label: '👥 Equipo' },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 py-2 rounded-[10px] text-[12px] font-medium transition-all"
              style={{
                background: tab === t.id ? project.color : 'transparent',
                color: tab === t.id ? '#FFFFFF' : '#6B7280',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── CONTENIDO POR TAB ─────────────────────────── */}

        {/* OVERVIEW — Milestones */}
        {tab === 'overview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-[20px] p-5 space-y-1" style={{ background: '#FFFFFF', border: '1px solid rgba(17,24,39,0.06)' }}>
            <h3 className="text-[14px] font-semibold text-[#111827] mb-4">Fases del proyecto</h3>
            {project.milestones.length === 0 ? (
              <p className="text-[13px] text-[#9CA3AF] py-4 text-center">Sin fases definidas aún</p>
            ) : (
              <div className="space-y-0">
                {project.milestones.map((m, i) => (
                  <div key={m.id} className="relative">
                    {/* Línea conectora */}
                    {i < project.milestones.length - 1 && (
                      <div className="absolute left-[9px] top-[28px] w-0.5 h-full -mb-1"
                        style={{ background: m.status === 'completed' ? '#D1FAE5' : 'rgba(17,24,39,0.08)' }} />
                    )}
                    <div className="flex gap-3 py-3">
                      <div className="shrink-0 mt-0.5">{milestoneIcon(m.status)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[13px] font-semibold text-[#111827]">{m.title}</p>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
                            style={{
                              background: m.status === 'completed' ? '#D1FAE5' : m.status === 'in_progress' ? '#DBEAFE' : m.status === 'delayed' ? '#FEE2E2' : '#F3F4F6',
                              color: m.status === 'completed' ? '#059669' : m.status === 'in_progress' ? '#2563EB' : m.status === 'delayed' ? '#DC2626' : '#6B7280',
                            }}>
                            {milestoneLabel[m.status] || m.status}
                          </span>
                        </div>
                        {m.description && <p className="text-[12px] text-[#6B7280] mt-0.5">{m.description}</p>}
                        <p className="text-[11px] text-[#9CA3AF] mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(m.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        {m.progress > 0 && m.status !== 'completed' && (
                          <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
                            <div className="h-full rounded-full" style={{ width: `${m.progress}%`, background: project.color }} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* TASKS */}
        {tab === 'tasks' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-[20px] p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(17,24,39,0.06)' }}>
            <h3 className="text-[14px] font-semibold text-[#111827] mb-4">
              Tareas del proyecto <span className="text-[#9CA3AF] font-normal text-[12px]">({project.tasks.length})</span>
            </h3>
            {project.tasks.length === 0 ? (
              <p className="text-[13px] text-[#9CA3AF] py-4 text-center">Sin tareas visibles aún</p>
            ) : (
              <div className="space-y-2">
                {project.tasks.map(t => {
                  const s = statusLabel[t.status] || { label: t.status, color: '#6B7280', bg: '#F3F4F6' };
                  return (
                    <div key={t.id} className="flex items-center gap-3 p-3 rounded-[12px]"
                      style={{ background: '#F9FAFB' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#111827] truncate">{t.title}</p>
                        {t.dueDate && (
                          <p className="text-[11px] text-[#9CA3AF] mt-0.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(t.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: s.bg, color: s.color }}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* FILES */}
        {tab === 'files' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-[20px] p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(17,24,39,0.06)' }}>
            <h3 className="text-[14px] font-semibold text-[#111827] mb-4">Archivos del proyecto</h3>
            {project.files.length === 0 ? (
              <p className="text-[13px] text-[#9CA3AF] py-4 text-center">Sin archivos compartidos aún</p>
            ) : (
              <div className="space-y-2">
                {project.files.map(f => (
                  <a key={f.id} href={f.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-[12px] hover:bg-[#F9FAFB] transition-all group"
                    style={{ border: '1px solid rgba(17,24,39,0.06)' }}>
                    <div className="w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(139,92,246,0.08)' }}>
                      <FileText className="w-4 h-4 text-[#8B5CF6]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#111827] truncate">{f.fileName}</p>
                      <p className="text-[11px] text-[#9CA3AF]">
                        {new Date(f.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <Download className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#7C3AED] transition-colors shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* TEAM */}
        {tab === 'team' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-[20px] p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(17,24,39,0.06)' }}>
            <h3 className="text-[14px] font-semibold text-[#111827] mb-4">Equipo asignado</h3>
            {project.team.length === 0 ? (
              <p className="text-[13px] text-[#9CA3AF] py-4 text-center">Sin equipo asignado</p>
            ) : (
              <div className="space-y-3">
                {project.team.map(member => (
                  <div key={member.id} className="flex items-center gap-3 p-3 rounded-[12px]"
                    style={{ background: '#F9FAFB' }}>
                    <Avatar className="h-10 w-10 rounded-full overflow-hidden shrink-0">
                      <AvatarImage src={member.image || undefined} />
                      <AvatarFallback className="text-sm font-semibold"
                        style={{ background: 'rgba(139,92,246,0.12)', color: '#7C3AED' }}>
                        {ini(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-[13px] font-semibold text-[#111827]">{member.name}</p>
                      {member.role && <p className="text-[11px] text-[#6B7280]">{member.role}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-[11px] text-[#D1D5DB]">
            Proyecto compartido por <strong className="text-[#9CA3AF]">{agency.name}</strong> · Powered by Weeklink
          </p>
        </div>
      </div>
    </div>
  );
}
