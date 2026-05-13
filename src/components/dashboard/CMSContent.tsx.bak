'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  Settings2, FolderOpen, MessageSquareQuote, Users,
  Plus, Pencil, Trash2, Eye, EyeOff, Loader2,
  RefreshCw, AlertTriangle, ExternalLink, Upload, X,
} from 'lucide-react';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import type { SiteSettings, PortfolioItem, Testimonial, TeamMember } from '@/lib/types';

// ── helpers ────────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-white/70">{label}</Label>
      {children}
    </div>
  );
}

const inputCls = 'bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus-visible:ring-brand';
const areaCls  = `${inputCls} resize-none`;

// ── Image uploader component ───────────────────────────────────────────────────

type ImageUploaderProps = {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
};

function ImageUploader({ value, onChange, folder = 'team', label = 'Foto' }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', folder);
      const res = await fetch('/api/cms/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onChange(data.url);
      toast.success('Imagen subida correctamente.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al subir la imagen.');
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm text-white/70">{label}</Label>
      {value ? (
        <div className="relative w-full h-36 rounded-lg overflow-hidden border border-white/[0.08] bg-white/[0.03] group">
          <Image src={value} alt="preview" fill className="object-cover" unoptimized />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button type="button" size="sm" variant="outline" className="border-white/30 text-white bg-white/10 hover:bg-white/20 gap-1.5 text-xs h-7"
              onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Cambiar
            </Button>
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:bg-red-400/20"
              onClick={() => onChange('')} disabled={uploading}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="w-full h-28 rounded-lg border-2 border-dashed border-white/[0.10] bg-white/[0.02] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand/50 hover:bg-white/[0.04] transition-colors"
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {uploading
            ? <Loader2 className="h-6 w-6 text-brand animate-spin" />
            : <>
                <Upload className="h-5 w-5 text-white/30" />
                <p className="text-xs text-white/30">Arrastra o haz clic para subir</p>
                <p className="text-[10px] text-white/20">JPG, PNG, WebP · máx 5 MB</p>
              </>}
        </div>
      )}
      {/* Also allow pasting a URL manually */}
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls + ' text-xs'}
        placeholder="O pega una URL de imagen..."
      />
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
    </div>
  );
}

// ── Settings tab ───────────────────────────────────────────────────────────────

function SettingsTab() {
  const [form, setForm] = useState<Partial<SiteSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/cms/settings')
      .then((r) => r.json())
      .then((d) => setForm(d.settings ?? {}))
      .catch(() => toast.error('Error al cargar configuración'))
      .finally(() => setLoading(false));
  }, []);

  function set(k: keyof SiteSettings, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/cms/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm(data.settings);
      toast.success('Configuración guardada.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre de la agencia">
          <Input value={form.agencyName ?? ''} onChange={(e) => set('agencyName', e.target.value)} className={inputCls} placeholder="BoostMarketing" />
        </Field>
        <Field label="URL del logo">
          <Input value={form.logoUrl ?? ''} onChange={(e) => set('logoUrl', e.target.value)} className={inputCls} placeholder="https://cdn.../logo.png" />
        </Field>
      </div>

      <Field label="Título principal (Hero)">
        <Input value={form.heroTitle ?? ''} onChange={(e) => set('heroTitle', e.target.value)} className={inputCls} placeholder="Escala tu marca con contenido y automatización" />
      </Field>

      <Field label="Subtítulo (Hero)">
        <Textarea value={form.heroSubtitle ?? ''} onChange={(e) => set('heroSubtitle', e.target.value)} className={areaCls} rows={3} placeholder="Impulsamos tu presencia digital..." />
      </Field>

      <div className="border-t border-white/[0.06] pt-4">
        <p className="text-sm font-medium text-white/70 mb-4">Contacto</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email de contacto">
            <Input value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} className={inputCls} placeholder="hola@tuagencia.com" type="email" />
          </Field>
          <Field label="Teléfono">
            <Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} className={inputCls} placeholder="+52 55 1234 5678" />
          </Field>
        </div>
      </div>

      <div className="border-t border-white/[0.06] pt-4">
        <p className="text-sm font-medium text-white/70 mb-4">Redes sociales</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {(['instagram', 'facebook', 'tiktok', 'linkedin', 'whatsapp'] as const).map((net) => (
            <Field key={net} label={net.charAt(0).toUpperCase() + net.slice(1)}>
              <Input value={(form as Record<string, string>)[net] ?? ''} onChange={(e) => set(net, e.target.value)} className={inputCls} placeholder={net === 'whatsapp' ? '+52 55 1234 5678' : `https://${net}.com/...`} />
            </Field>
          ))}
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="bg-brand hover:bg-brand-dark text-white w-full sm:w-auto">
        {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando…</> : 'Guardar cambios'}
      </Button>
    </div>
  );
}

// ── Portfolio tab ──────────────────────────────────────────────────────────────

type PortfolioFormData = Omit<PortfolioItem, 'id' | 'createdAt' | 'updatedAt'>;

const emptyPortfolio: PortfolioFormData = {
  title: '', description: '', imageUrl: '', tags: '', projectUrl: '', order: 0, active: true,
};

function PortfolioTab() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<PortfolioItem | null>(null);
  const [form, setForm] = useState<PortfolioFormData>(emptyPortfolio);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PortfolioItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cms/portfolio');
      const data = await res.json();
      setItems(data.items ?? []);
    } catch { toast.error('Error al cargar portafolio'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  function openCreate() { setEditItem(null); setForm(emptyPortfolio); setFormOpen(true); }
  function openEdit(item: PortfolioItem) {
    setEditItem(item);
    setForm({ title: item.title, description: item.description, imageUrl: item.imageUrl, tags: item.tags, projectUrl: item.projectUrl, order: item.order, active: item.active });
    setFormOpen(true);
  }

  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = editItem ? { id: editItem.id, ...form } : form;
      const res = await fetch('/api/cms/portfolio', {
        method: editItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(editItem ? 'Proyecto actualizado.' : 'Proyecto creado.');
      setFormOpen(false);
      fetchItems();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar.');
    } finally { setSaving(false); }
  }

  async function deleteItem() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/cms/portfolio?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success('Proyecto eliminado.');
      setDeleteTarget(null);
      fetchItems();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error.'); }
    finally { setDeleting(false); }
  }

  async function toggleActive(item: PortfolioItem) {
    try {
      await fetch('/api/cms/portfolio', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, active: !item.active }) });
      fetchItems();
    } catch { toast.error('Error al actualizar.'); }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-white/50">{items.length} proyecto{items.length !== 1 ? 's' : ''}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchItems} className="h-8 w-8 border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.06]"><RefreshCw className="h-3.5 w-3.5" /></Button>
          <Button size="sm" onClick={openCreate} className="bg-brand hover:bg-brand-dark text-white gap-1.5 h-8 px-3 text-xs"><Plus className="h-3.5 w-3.5" />Nuevo</Button>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-white/[0.06]">
            <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase">Proyecto</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase hidden md:table-cell">Tags</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase">Visible</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-white/40 uppercase">Acciones</th>
          </tr></thead>
          <tbody className="divide-y divide-white/[0.04]">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}><td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td><td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-24" /></td><td className="px-4 py-3"><Skeleton className="h-4 w-8" /></td><td className="px-4 py-3"><Skeleton className="h-7 w-16 ml-auto" /></td></tr>
                ))
              : items.length === 0
              ? <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-white/30">No hay proyectos. Crea el primero.</td></tr>
              : items.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white truncate max-w-[180px]">{item.title}</p>
                      {item.imageUrl && <a href={item.imageUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-brand-light/70 hover:text-brand-light flex items-center gap-0.5 mt-0.5"><ExternalLink className="h-2.5 w-2.5" />Ver imagen</a>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-xs text-white/40 truncate max-w-[160px]">{item.tags || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(item)} className={`text-xs font-medium ${item.active ? 'text-green-400' : 'text-white/30'} hover:opacity-80 transition-opacity flex items-center gap-1`}>
                        {item.active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        {item.active ? 'Sí' : 'No'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/30 hover:text-white hover:bg-white/[0.06]" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/30 hover:text-red-400 hover:bg-red-400/10" onClick={() => setDeleteTarget(item)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Form dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="bg-[#15151c] border-white/[0.08] text-white max-w-lg w-full">
          <DialogHeader><DialogTitle>{editItem ? 'Editar Proyecto' : 'Nuevo Proyecto'}</DialogTitle></DialogHeader>
          <form onSubmit={saveItem} className="space-y-4 pt-1">
            <Field label="Título *"><Input required value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className={inputCls} placeholder="Nombre del proyecto" /></Field>
            <Field label="Descripción"><Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className={areaCls} rows={3} placeholder="Breve descripción del proyecto..." /></Field>
            <div className="grid grid-cols-2 gap-3">
              <ImageUploader
                value={form.imageUrl}
                onChange={(url) => setForm((p) => ({ ...p, imageUrl: url }))}
                folder="portfolio"
                label="Imagen del proyecto"
              />
              <Field label="URL proyecto"><Input value={form.projectUrl} onChange={(e) => setForm((p) => ({ ...p, projectUrl: e.target.value }))} className={inputCls} placeholder="https://..." /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tags (separados por coma)"><Input value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} className={inputCls} placeholder="SEO, Branding" /></Field>
              <Field label="Orden"><Input type="number" value={form.order} onChange={(e) => setForm((p) => ({ ...p, order: Number(e.target.value) }))} className={inputCls} /></Field>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="pf-active" checked={form.active} onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))} className="accent-brand" />
              <label htmlFor="pf-active" className="text-sm text-white/70">Visible en el sitio</label>
            </div>
            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)} className="flex-1 border-white/[0.08] text-white/70 hover:text-white">Cancelar</Button>
              <Button type="submit" disabled={saving} className="flex-1 bg-brand hover:bg-brand-dark text-white">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editItem ? 'Guardar' : 'Crear'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-[#15151c] border-white/[0.06] text-white">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-red-400/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-400" /></div>
              <AlertDialogTitle className="text-white">¿Eliminar proyecto?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-white/50">Se eliminará &ldquo;{deleteTarget?.title}&rdquo;. Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/[0.04] border-white/[0.08] text-white/70 hover:text-white">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteItem} disabled={deleting} className="bg-red-500 hover:bg-red-600 text-white">{deleting ? 'Eliminando…' : 'Eliminar'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Testimonials tab ───────────────────────────────────────────────────────────

type TestimonialFormData = Omit<Testimonial, 'id' | 'createdAt' | 'updatedAt'>;

const emptyTestimonial: TestimonialFormData = {
  name: '', role: '', company: '', text: '', imageUrl: '', rating: 5, active: true, order: 0,
};

function TestimonialsTab() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Testimonial | null>(null);
  const [form, setForm] = useState<TestimonialFormData>(emptyTestimonial);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Testimonial | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cms/testimonials');
      const data = await res.json();
      setItems(data.items ?? []);
    } catch { toast.error('Error al cargar testimonios'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  function openCreate() { setEditItem(null); setForm(emptyTestimonial); setFormOpen(true); }
  function openEdit(item: Testimonial) {
    setEditItem(item);
    setForm({ name: item.name, role: item.role, company: item.company, text: item.text, imageUrl: item.imageUrl, rating: item.rating, active: item.active, order: item.order });
    setFormOpen(true);
  }

  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = editItem ? { id: editItem.id, ...form } : form;
      const res = await fetch('/api/cms/testimonials', {
        method: editItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(editItem ? 'Testimonio actualizado.' : 'Testimonio creado.');
      setFormOpen(false);
      fetchItems();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar.');
    } finally { setSaving(false); }
  }

  async function deleteItem() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/cms/testimonials?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success('Testimonio eliminado.');
      setDeleteTarget(null);
      fetchItems();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error.'); }
    finally { setDeleting(false); }
  }

  async function toggleActive(item: Testimonial) {
    try {
      await fetch('/api/cms/testimonials', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, active: !item.active }) });
      fetchItems();
    } catch { toast.error('Error al actualizar.'); }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-white/50">{items.length} testimonio{items.length !== 1 ? 's' : ''}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchItems} className="h-8 w-8 border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.06]"><RefreshCw className="h-3.5 w-3.5" /></Button>
          <Button size="sm" onClick={openCreate} className="bg-brand hover:bg-brand-dark text-white gap-1.5 h-8 px-3 text-xs"><Plus className="h-3.5 w-3.5" />Nuevo</Button>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-white/[0.06]">
            <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase">Cliente</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase hidden md:table-cell">Testimonio</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase">Visible</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-white/40 uppercase">Acciones</th>
          </tr></thead>
          <tbody className="divide-y divide-white/[0.04]">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}><td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td><td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-48" /></td><td className="px-4 py-3"><Skeleton className="h-4 w-8" /></td><td className="px-4 py-3"><Skeleton className="h-7 w-16 ml-auto" /></td></tr>
                ))
              : items.length === 0
              ? <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-white/30">No hay testimonios. Crea el primero.</td></tr>
              : items.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{item.name}</p>
                      <p className="text-xs text-white/40">{[item.role, item.company].filter(Boolean).join(' · ')}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-xs text-white/40 truncate max-w-xs">{item.text}</p>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(item)} className={`text-xs font-medium ${item.active ? 'text-green-400' : 'text-white/30'} hover:opacity-80 flex items-center gap-1`}>
                        {item.active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        {item.active ? 'Sí' : 'No'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/30 hover:text-white hover:bg-white/[0.06]" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/30 hover:text-red-400 hover:bg-red-400/10" onClick={() => setDeleteTarget(item)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Form dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="bg-[#15151c] border-white/[0.08] text-white max-w-lg w-full">
          <DialogHeader><DialogTitle>{editItem ? 'Editar Testimonio' : 'Nuevo Testimonio'}</DialogTitle></DialogHeader>
          <form onSubmit={saveItem} className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre *"><Input required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={inputCls} placeholder="María García" /></Field>
              <Field label="Cargo"><Input value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} className={inputCls} placeholder="CEO" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Empresa"><Input value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} className={inputCls} placeholder="ModaStudio" /></Field>
              <Field label="Calificación (1-5)"><Input type="number" min={1} max={5} value={form.rating} onChange={(e) => setForm((p) => ({ ...p, rating: Number(e.target.value) }))} className={inputCls} /></Field>
            </div>
            <Field label="Testimonio *"><Textarea required value={form.text} onChange={(e) => setForm((p) => ({ ...p, text: e.target.value }))} className={areaCls} rows={3} placeholder="Lo que dice el cliente..." /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="URL foto (opcional)"><Input value={form.imageUrl} onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))} className={inputCls} placeholder="https://..." /></Field>
              <Field label="Orden"><Input type="number" value={form.order} onChange={(e) => setForm((p) => ({ ...p, order: Number(e.target.value) }))} className={inputCls} /></Field>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="tm-active" checked={form.active} onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))} className="accent-brand" />
              <label htmlFor="tm-active" className="text-sm text-white/70">Visible en el sitio</label>
            </div>
            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)} className="flex-1 border-white/[0.08] text-white/70 hover:text-white">Cancelar</Button>
              <Button type="submit" disabled={saving} className="flex-1 bg-brand hover:bg-brand-dark text-white">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editItem ? 'Guardar' : 'Crear'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-[#15151c] border-white/[0.06] text-white">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-red-400/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-400" /></div>
              <AlertDialogTitle className="text-white">¿Eliminar testimonio?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-white/50">Se eliminará el testimonio de &ldquo;{deleteTarget?.name}&rdquo;. Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/[0.04] border-white/[0.08] text-white/70 hover:text-white">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteItem} disabled={deleting} className="bg-red-500 hover:bg-red-600 text-white">{deleting ? 'Eliminando…' : 'Eliminar'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Team tab ───────────────────────────────────────────────────────────────────

type TeamFormData = Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'>;

const emptyTeam: TeamFormData = {
  name: '', role: '', imageUrl: '', quote: '', order: 0, isActive: true,
};

function TeamTab() {
  const [items, setItems] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<TeamMember | null>(null);
  const [form, setForm] = useState<TeamFormData>(emptyTeam);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cms/team');
      const data = await res.json();
      setItems(data.items ?? []);
    } catch { toast.error('Error al cargar equipo'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  function openCreate() { setEditItem(null); setForm(emptyTeam); setFormOpen(true); }
  function openEdit(item: TeamMember) {
    setEditItem(item);
    setForm({ name: item.name, role: item.role, imageUrl: item.imageUrl, quote: item.quote, order: item.order, isActive: item.isActive });
    setFormOpen(true);
  }

  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = editItem ? { id: editItem.id, ...form } : form;
      const res = await fetch('/api/cms/team', {
        method: editItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(editItem ? 'Miembro actualizado.' : 'Miembro creado.');
      setFormOpen(false);
      fetchItems();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar.');
    } finally { setSaving(false); }
  }

  async function deleteItem() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/cms/team?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success('Miembro eliminado.');
      setDeleteTarget(null);
      fetchItems();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error.'); }
    finally { setDeleting(false); }
  }

  async function toggleActive(item: TeamMember) {
    try {
      await fetch('/api/cms/team', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, isActive: !item.isActive }) });
      fetchItems();
    } catch { toast.error('Error al actualizar.'); }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-white/50">{items.length} miembro{items.length !== 1 ? 's' : ''}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchItems} className="h-8 w-8 border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.06]"><RefreshCw className="h-3.5 w-3.5" /></Button>
          <Button size="sm" onClick={openCreate} className="bg-brand hover:bg-brand-dark text-white gap-1.5 h-8 px-3 text-xs"><Plus className="h-3.5 w-3.5" />Nuevo</Button>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-white/[0.06]">
            <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase">Miembro</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase hidden md:table-cell">Cargo</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase">Visible</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-white/40 uppercase">Acciones</th>
          </tr></thead>
          <tbody className="divide-y divide-white/[0.04]">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}><td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td><td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-24" /></td><td className="px-4 py-3"><Skeleton className="h-4 w-8" /></td><td className="px-4 py-3"><Skeleton className="h-7 w-16 ml-auto" /></td></tr>
                ))
              : items.length === 0
              ? <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-white/30">No hay miembros. Crea el primero.</td></tr>
              : items.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white truncate max-w-[180px]">{item.name}</p>
                      {item.imageUrl && <a href={item.imageUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-brand-light/70 hover:text-brand-light flex items-center gap-0.5 mt-0.5"><ExternalLink className="h-2.5 w-2.5" />Ver foto</a>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-xs text-white/40 truncate max-w-[160px]">{item.role || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(item)} className={`text-xs font-medium ${item.isActive ? 'text-green-400' : 'text-white/30'} hover:opacity-80 transition-opacity flex items-center gap-1`}>
                        {item.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        {item.isActive ? 'Sí' : 'No'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/30 hover:text-white hover:bg-white/[0.06]" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/30 hover:text-red-400 hover:bg-red-400/10" onClick={() => setDeleteTarget(item)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Form dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="bg-[#15151c] border-white/[0.08] text-white max-w-lg w-full">
          <DialogHeader><DialogTitle>{editItem ? 'Editar Miembro' : 'Nuevo Miembro'}</DialogTitle></DialogHeader>
          <form onSubmit={saveItem} className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre *"><Input required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={inputCls} placeholder="Ana Martínez" /></Field>
              <Field label="Cargo"><Input value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} className={inputCls} placeholder="CEO & Fundadora" /></Field>
            </div>
            <ImageUploader
              value={form.imageUrl}
              onChange={(url) => setForm((p) => ({ ...p, imageUrl: url }))}
              folder="team"
              label="Foto del miembro"
            />
            <Field label="Frase / Cita"><Textarea value={form.quote} onChange={(e) => setForm((p) => ({ ...p, quote: e.target.value }))} className={areaCls} rows={2} placeholder="Una frase que los representa..." /></Field>
            <Field label="Orden"><Input type="number" value={form.order} onChange={(e) => setForm((p) => ({ ...p, order: Number(e.target.value) }))} className={inputCls} /></Field>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="tm2-active" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} className="accent-brand" />
              <label htmlFor="tm2-active" className="text-sm text-white/70">Visible en el carrusel</label>
            </div>
            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)} className="flex-1 border-white/[0.08] text-white/70 hover:text-white">Cancelar</Button>
              <Button type="submit" disabled={saving} className="flex-1 bg-brand hover:bg-brand-dark text-white">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editItem ? 'Guardar' : 'Crear'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-[#15151c] border-white/[0.06] text-white">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-red-400/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-400" /></div>
              <AlertDialogTitle className="text-white">¿Eliminar miembro?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-white/50">Se eliminará a &ldquo;{deleteTarget?.name}&rdquo; del carrusel. Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/[0.04] border-white/[0.08] text-white/70 hover:text-white">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteItem} disabled={deleting} className="bg-red-500 hover:bg-red-600 text-white">{deleting ? 'Eliminando…' : 'Eliminar'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Root export ────────────────────────────────────────────────────────────────

export default function CMSContent() {
  return (
    <Tabs defaultValue="settings" className="space-y-4">
      <TabsList className="bg-white/[0.04] border border-white/[0.06] flex-wrap h-auto gap-1 p-1">
        <TabsTrigger value="settings" className="data-[state=active]:bg-brand data-[state=active]:text-white text-white/50 gap-1.5">
          <Settings2 className="h-4 w-4" />
          Configuración
        </TabsTrigger>
        <TabsTrigger value="portfolio" className="data-[state=active]:bg-brand data-[state=active]:text-white text-white/50 gap-1.5">
          <FolderOpen className="h-4 w-4" />
          Portafolio
        </TabsTrigger>
        <TabsTrigger value="testimonials" className="data-[state=active]:bg-brand data-[state=active]:text-white text-white/50 gap-1.5">
          <MessageSquareQuote className="h-4 w-4" />
          Testimonios
        </TabsTrigger>
        <TabsTrigger value="team" className="data-[state=active]:bg-brand data-[state=active]:text-white text-white/50 gap-1.5">
          <Users className="h-4 w-4" />
          Equipo
        </TabsTrigger>
      </TabsList>

      <TabsContent value="settings" className="mt-0"><SettingsTab /></TabsContent>
      <TabsContent value="portfolio"  className="mt-0"><PortfolioTab /></TabsContent>
      <TabsContent value="testimonials" className="mt-0"><TestimonialsTab /></TabsContent>
      <TabsContent value="team" className="mt-0"><TeamTab /></TabsContent>
    </Tabs>
  );
}
