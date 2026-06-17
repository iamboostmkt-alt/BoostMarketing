'use client';

// ─────────────────────────────────────────────────────────────────────────────
// src/components/dashboard/TemplateManagerModal.tsx
//
// Modal para que PM/ADMIN gestione templates de tareas
// Crear, editar, desactivar templates con subtareas
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import {
  Sparkles, Plus, Pencil, Trash2, ChevronDown, ChevronUp,
  X, Loader2, LayoutGrid,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Subtask {
  title:       string;
  description: string;
  visibility:  string;
}

interface TaskTemplate {
  id:           string;
  title:        string;
  description:  string;
  category:     string;
  priority:     string;
  visibility:   string;
  estimatedDays: number;
  subtasks:     Subtask[];
  isActive:     boolean;
  createdAt:    string;
}

// ── Constantes ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'reel',     label: 'Reel' },
  { value: 'campaign', label: 'Campaña' },
  { value: 'branding', label: 'Branding' },
  { value: 'design',   label: 'Diseño' },
  { value: 'content',  label: 'Contenido' },
  { value: 'general',  label: 'General' },
];

const PRIORITIES = [
  { value: 'urgent', label: 'Urgente' },
  { value: 'high',   label: 'Alta' },
  { value: 'medium', label: 'Media' },
  { value: 'low',    label: 'Baja' },
];

const VISIBILITIES = [
  { value: 'client_visible', label: 'Visible al cliente' },
  { value: 'internal',       label: 'Interno' },
];

const CATEGORY_COLORS: Record<string, string> = {
  reel:     'bg-purple-500/15 text-purple-300 border-purple-500/20',
  campaign: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  branding: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  design:    'bg-pink-500/15 text-pink-300 border-pink-500/20',
  content:  'bg-teal-500/15 text-teal-300 border-teal-500/20',
  general:  'bg-white/[0.06] text-white/50 border-white/[0.10]',
};

// ── Form vacío ────────────────────────────────────────────────────────────────

function emptyForm() {
  return {
    title:        '',
    description:  '',
    category:     'general',
    priority:     'medium',
    visibility:   'client_visible',
    estimatedDays: 0,
    subtasks:     [] as Subtask[],
  };
}

// ── TemplateForm ──────────────────────────────────────────────────────────────

interface TemplateFormProps {
  initial?:   Partial<TaskTemplate>;
  onSave:     () => void;
  onCancel:   () => void;
}

function TemplateForm({ initial, onSave, onCancel }: TemplateFormProps) {
  const [form,    setForm]    = useState({ ...emptyForm(), ...initial });
  const [saving,  setSaving]  = useState(false);
  const [newSub,  setNewSub]  = useState('');

  function addSubtask() {
    if (!newSub.trim()) return;
    setForm(f => ({ ...f, subtasks: [...f.subtasks, { title: newSub.trim(), description: '', visibility: 'internal' }] }));
    setNewSub('');
  }

  function removeSubtask(i: number) {
    setForm(f => ({ ...f, subtasks: f.subtasks.filter((_, idx) => idx !== i) }));
  }

  async function handleSave() {
    if (!form.title.trim()) { toast.error('El título es requerido'); return; }
    setSaving(true);
    try {
      const isEdit = !!(initial as any)?.id;
      const res = await fetch('/api/task-templates', {
        method:  isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...(isEdit ? { id: (initial as any).id } : {}), ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      toast.success(isEdit ? 'Template actualizado' : 'Template creado');
      onSave();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Título */}
      <div className="space-y-1.5">
        <Label className="text-white/70 text-xs">Título *</Label>
        <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="ej. Reel de producto"
          className="bg-white/[0.04] border-white/[0.08] text-white focus-visible:ring-brand" />
      </div>

      {/* Descripción */}
      <div className="space-y-1.5">
        <Label className="text-white/70 text-xs">Descripción</Label>
        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          rows={2} placeholder="Descripción del template..."
          className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand resize-none placeholder:text-white/25" />
      </div>

      {/* Categoría + Prioridad */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-white/70 text-xs">Categoría</Label>
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand">
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-white/70 text-xs">Prioridad</Label>
          <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
            className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand">
            {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {/* Visibilidad + Días estimados */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-white/70 text-xs">Visibilidad</Label>
          <select value={form.visibility} onChange={e => setForm(f => ({ ...f, visibility: e.target.value }))}
            className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand">
            {VISIBILITIES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-white/70 text-xs">Días estimados</Label>
          <Input type="number" min={0} value={form.estimatedDays}
            onChange={e => setForm(f => ({ ...f, estimatedDays: parseInt(e.target.value) || 0 }))}
            className="bg-white/[0.04] border-white/[0.08] text-white focus-visible:ring-brand" />
        </div>
      </div>

      {/* Subtareas */}
      <div className="space-y-2">
        <Label className="text-white/70 text-xs">Subtareas del template</Label>
        {form.subtasks.map((sub, i) => (
          <div key={i} className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-3 py-2">
            <span className="text-xs text-white/70 flex-1">{sub.title}</span>
            <button type="button" onClick={() => removeSubtask(i)}
              className="text-white/20 hover:text-red-400 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <Input value={newSub} onChange={e => setNewSub(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(); }}}
            placeholder="Nueva subtarea..."
            className="bg-white/[0.04] border-white/[0.08] text-white text-sm focus-visible:ring-brand placeholder:text-white/25" />
          <Button type="button" variant="outline" onClick={addSubtask} size="sm"
            className="border-white/[0.08] text-white/60 hover:text-white shrink-0">
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Botones */}
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel}
          className="flex-1 border-white/[0.08] text-white/60 hover:text-white">
          Cancelar
        </Button>
        <Button type="button" disabled={saving} onClick={handleSave}
          className="flex-1 bg-brand hover:bg-brand-dark text-white">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (initial as any)?.id ? 'Guardar cambios' : 'Crear template'}
        </Button>
      </div>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────

interface TemplateManagerModalProps {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
}

export default function TemplateManagerModal({ open, onOpenChange }: TemplateManagerModalProps) {
  const [templates,    setTemplates]    = useState<TaskTemplate[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [view,         setView]         = useState<'list' | 'create' | 'edit'>('list');
  const [editing,      setEditing]      = useState<TaskTemplate | null>(null);
  const [expandedId,   setExpandedId]   = useState<string | null>(null);
  const [filterCat,    setFilterCat]    = useState('all');

  async function fetchTemplates() {
    setLoading(true);
    try {
      const res  = await fetch('/api/task-templates');
      const data = await res.json();
      setTemplates(data.templates ?? []);
    } catch { toast.error('Error al cargar templates'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (open) { fetchTemplates(); setView('list'); setEditing(null); }
  }, [open]);

  async function handleDeactivate(id: string) {
    if (!confirm('¿Desactivar este template?')) return;
    try {
      const res = await fetch(`/api/task-templates?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al desactivar');
      toast.success('Template desactivado');
      fetchTemplates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  }

  const filtered = filterCat === 'all'
    ? templates
    : templates.filter(t => t.category === filterCat);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#15151c] border-white/[0.08] text-white max-w-xl max-h-[85vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-white">
              <Sparkles className="w-4 h-4 text-brand-light" />
              {view === 'list' ? 'Templates de tareas' : view === 'create' ? 'Nuevo template' : 'Editar template'}
            </DialogTitle>
            {view === 'list' && (
              <Button size="sm" onClick={() => setView('create')}
                className="bg-brand hover:bg-brand-dark text-white gap-1.5 text-xs h-8">
                <Plus className="w-3.5 h-3.5" />
                Nuevo
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4">
          {view !== 'list' ? (
            <TemplateForm
              initial={view === 'edit' && editing ? editing : undefined}
              onSave={() => { fetchTemplates(); setView('list'); setEditing(null); }}
              onCancel={() => { setView('list'); setEditing(null); }}
            />
          ) : (
            <div className="space-y-4">
              {/* Filtro categorías */}
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => setFilterCat('all')}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${filterCat === 'all' ? 'bg-brand/20 border-brand/40 text-brand-light' : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white'}`}>
                  Todos
                </button>
                {CATEGORIES.map(c => (
                  <button key={c.value} onClick={() => setFilterCat(c.value)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${filterCat === c.value ? 'bg-brand/20 border-brand/40 text-brand-light' : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white'}`}>
                    {c.label}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-white/30" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <LayoutGrid className="w-10 h-10 text-white/15" />
                  <p className="text-white/40 text-sm">No hay templates aún.</p>
                  <Button size="sm" onClick={() => setView('create')}
                    className="bg-brand hover:bg-brand-dark text-white gap-1.5 text-xs">
                    <Plus className="w-3.5 h-3.5" />
                    Crear el primero
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map(tpl => (
                    <div key={tpl.id} className="glass-card rounded-xl overflow-hidden">
                      {/* Header */}
                      <div className="p-3.5 flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-white">{tpl.title}</p>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${CATEGORY_COLORS[tpl.category] ?? CATEGORY_COLORS.general}`}>
                              {CATEGORIES.find(c => c.value === tpl.category)?.label ?? tpl.category}
                            </span>
                            {tpl.estimatedDays > 0 && (
                              <span className="text-[10px] text-white/30">{tpl.estimatedDays}d</span>
                            )}
                          </div>
                          {tpl.description && (
                            <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{tpl.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => setExpandedId(expandedId === tpl.id ? null : tpl.id)}
                            className="p-1.5 rounded-md text-white/20 hover:text-white hover:bg-white/[0.06] transition-colors">
                            {expandedId === tpl.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => { setEditing(tpl); setView('edit'); }}
                            className="p-1.5 rounded-md text-white/20 hover:text-white hover:bg-white/[0.06] transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeactivate(tpl.id)}
                            className="p-1.5 rounded-md text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Expandido — subtareas */}
                      {expandedId === tpl.id && (
                        <div className="px-3.5 pb-3.5 border-t border-white/[0.06] pt-3 space-y-2">
                          <div className="flex items-center gap-4 text-[11px] text-white/35 flex-wrap">
                            <span>Prioridad: <span className="text-white/60">{PRIORITIES.find(p => p.value === tpl.priority)?.label}</span></span>
                            <span>Visibilidad: <span className="text-white/60">{VISIBILITIES.find(v => v.value === tpl.visibility)?.label}</span></span>
                          </div>
                          {(tpl.subtasks ?? []).length > 0 && (
                            <div className="space-y-1">
                              <p className="text-[11px] text-white/30 uppercase tracking-wider font-medium">Subtareas</p>
                              {(tpl.subtasks ?? []).map((sub, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs text-white/50">
                                  <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                                  {sub.title}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
