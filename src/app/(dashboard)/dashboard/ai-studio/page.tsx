'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Sparkles, ChevronDown, RefreshCw, Save, Loader2,
  Instagram, Mail, Zap, Target, BookOpen, TrendingUp,
  Copy, Check, Clock, CalendarDays, Megaphone, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Tipos ───────────────────────────────────────────────────
interface AiContext {
  industry: string;
  niche: string;
  audience: string;
  tone: string;
  goals: string;
  notes: string;
}

interface Suggestion {
  id: string;
  type: 'reel' | 'post' | 'story' | 'email' | 'campaign' | 'copy' | 'strategy';
  platform: string;
  title: string;
  description: string;
  example: string;
  urgency: 'now' | 'week' | 'month';
}

interface Client {
  id: string;
  name: string;
  company: string;
  aiContext: AiContext | null;
}

// ── Helpers visuales ────────────────────────────────────────
const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  reel:     { icon: Zap,         color: '#EC4899', bg: '#EC489910', label: 'Reel' },
  post:     { icon: Instagram,   color: '#8B5CF6', bg: '#8B5CF610', label: 'Post' },
  story:    { icon: BookOpen,    color: '#3B82F6', bg: '#3B82F610', label: 'Story' },
  email:    { icon: Mail,        color: '#10B981', bg: '#10B98110', label: 'Email' },
  campaign: { icon: Megaphone,   color: '#F59E0B', bg: '#F59E0B10', label: 'Campaña' },
  copy:     { icon: BookOpen,    color: '#6366F1', bg: '#6366F110', label: 'Copy' },
  strategy: { icon: TrendingUp,  color: '#14B8A6', bg: '#14B8A610', label: 'Estrategia' },
};

const URGENCY_CONFIG = {
  now:   { label: 'Para hoy',       color: '#EF4444', bg: '#EF444410' },
  week:  { label: 'Esta semana',    color: '#F59E0B', bg: '#F59E0B10' },
  month: { label: 'Este mes',       color: '#10B981', bg: '#10B98110' },
};

const TONE_OPTIONS = ['Profesional', 'Cercano y amigable', 'Inspirador', 'Humorístico', 'Educativo', 'Empoderador', 'Minimalista'];
const INDUSTRY_OPTIONS = ['Fitness / Gym', 'Salud y bienestar', 'Moda y ropa', 'Restaurantes / Food', 'Tecnología', 'Educación', 'Inmobiliaria', 'Belleza y estética', 'Turismo / Viajes', 'E-commerce', 'Servicios profesionales', 'Entretenimiento', 'Otro'];

// ── Componente SuggestionCard ───────────────────────────────
function SuggestionCard({ s, index }: { s: Suggestion; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const cfg = TYPE_CONFIG[s.type] || TYPE_CONFIG.post;
  const urg = URGENCY_CONFIG[s.urgency] || URGENCY_CONFIG.week;
  const Icon = cfg.icon;

  const handleCopy = () => {
    navigator.clipboard.writeText(s.example);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className="rounded-[18px] overflow-hidden"
      style={{ background: 'var(--wl-surface)', border: '1px solid var(--wl-border)' }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-[var(--wl-hover)] transition-colors"
      >
        {/* Tipo */}
        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
          style={{ background: cfg.bg }}>
          <Icon className="w-4 h-4" style={{ color: cfg.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: cfg.bg, color: cfg.color }}>
              {cfg.label}
            </span>
            <span className="text-[11px] font-medium"
              style={{ color: 'var(--wl-text-muted)' }}>{s.platform}</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full ml-auto"
              style={{ background: urg.bg, color: urg.color }}>
              {urg.label}
            </span>
          </div>
          <p className="text-[14px] font-semibold truncate" style={{ color: 'var(--wl-text-primary)' }}>
            {s.title}
          </p>
        </div>

        <ChevronDown
          className="w-4 h-4 shrink-0 transition-transform"
          style={{ color: 'var(--wl-text-muted)', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* Expandido */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid var(--wl-border)' }}>
              {/* Descripción */}
              <div className="pt-3">
                <p className="text-[12px] font-medium mb-1" style={{ color: 'var(--wl-text-muted)' }}>¿Qué hacer?</p>
                <p className="text-[13px] leading-relaxed" style={{ color: 'var(--wl-text-secondary)' }}>
                  {s.description}
                </p>
              </div>

              {/* Ejemplo */}
              <div className="rounded-[12px] p-3 relative" style={{ background: 'var(--wl-elevated)', border: '1px solid var(--wl-border)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold" style={{ color: '#8B5CF6' }}>✨ Ejemplo listo para usar</p>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-[6px] transition-all"
                    style={{ background: copied ? '#10B98115' : 'var(--wl-hover)', color: copied ? '#10B981' : 'var(--wl-text-muted)' }}
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <p className="text-[12px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--wl-text-primary)' }}>
                  {s.example}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Componente ContextForm ──────────────────────────────────
function ContextForm({
  ctx, onChange, onSave, saving,
}: {
  ctx: AiContext;
  onChange: (key: keyof AiContext, val: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const field = (label: string, key: keyof AiContext, placeholder: string, rows?: number) => (
    <div>
      <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--wl-text-muted)' }}>
        {label}
      </label>
      {rows ? (
        <textarea
          value={ctx[key]}
          onChange={e => onChange(key, e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full rounded-[10px] px-3 py-2 text-[13px] resize-none outline-none transition-all"
          style={{
            background: 'var(--wl-elevated)', border: '1px solid var(--wl-border)',
            color: 'var(--wl-text-primary)',
          }}
        />
      ) : (
        <input
          type="text"
          value={ctx[key]}
          onChange={e => onChange(key, e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-[10px] px-3 py-2 text-[13px] outline-none transition-all"
          style={{
            background: 'var(--wl-elevated)', border: '1px solid var(--wl-border)',
            color: 'var(--wl-text-primary)',
          }}
        />
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Industria — select */}
      <div>
        <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--wl-text-muted)' }}>
          Industria / Giro
        </label>
        <select
          value={ctx.industry}
          onChange={e => onChange('industry', e.target.value)}
          className="w-full rounded-[10px] px-3 py-2 text-[13px] outline-none"
          style={{ background: 'var(--wl-elevated)', border: '1px solid var(--wl-border)', color: 'var(--wl-text-primary)' }}
        >
          <option value="">Seleccionar...</option>
          {INDUSTRY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      {field('Nicho específico', 'niche', 'Ej: Gym para mujeres 25-40 años en CDMX')}
      {field('Audiencia objetivo', 'audience', 'Ej: Mujeres 25-40 años, buscan salud y comunidad')}

      {/* Tono — select */}
      <div>
        <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--wl-text-muted)' }}>
          Tono de comunicación
        </label>
        <select
          value={ctx.tone}
          onChange={e => onChange('tone', e.target.value)}
          className="w-full rounded-[10px] px-3 py-2 text-[13px] outline-none"
          style={{ background: 'var(--wl-elevated)', border: '1px solid var(--wl-border)', color: 'var(--wl-text-primary)' }}
        >
          <option value="">Seleccionar...</option>
          {TONE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      {field('Objetivos', 'goals', 'Ej: Aumentar seguidores, generar leads, vender membresías', 2)}
      {field('Notas adicionales', 'notes', 'Ej: Tiene promoción de verano, evitar comparaciones con competencia...', 2)}

      <button
        onClick={onSave}
        disabled={saving}
        className="w-full py-2 rounded-[10px] text-[13px] font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        {saving ? 'Guardando...' : 'Guardar contexto'}
      </button>
    </div>
  );
}

// ── Página Principal ────────────────────────────────────────
export default function AiStudioPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role as string | undefined;
  const canEdit = ['ADMIN', 'PROJECT_MANAGER'].includes(userRole || '');

  const [clients, setClients]           = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [freeContext, setFreeContext]   = useState('');
  const [aiCtx, setAiCtx]              = useState<AiContext>({ industry: '', niche: '', audience: '', tone: '', goals: '', notes: '' });
  const [suggestions, setSuggestions]  = useState<Suggestion[]>([]);
  const [loading, setLoading]          = useState(false);
  const [saving, setSaving]            = useState(false);
  const [showContextForm, setShowContextForm] = useState(false);
  const [loadingClients, setLoadingClients] = useState(true);
  const [error, setError]              = useState('');

  // Cargar clientes
  useEffect(() => {
    fetch('/api/clients?limit=50')
      .then(r => r.json())
      .then(d => setClients(d.clients || []))
      .catch(() => {})
      .finally(() => setLoadingClients(false));
  }, []);

  // Al seleccionar cliente, cargar su contexto
  useEffect(() => {
    if (!selectedClient) return;
    const ctx = (selectedClient.aiContext as AiContext | null) || { industry: '', niche: '', audience: '', tone: '', goals: '', notes: '' };
    setAiCtx(ctx);
    setSuggestions([]);
    setError('');
  }, [selectedClient]);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setSuggestions([]);
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient?.id || null,
          freeContext: freeContext || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status} al generar sugerencias`);
      if (!data.suggestions || data.suggestions.length === 0) {
        throw new Error('La IA no devolvió sugerencias. Intenta de nuevo.');
      }
      setSuggestions(data.suggestions || []);
    } catch (e: any) {
      setError(e.message || 'Error al conectar con la IA');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContext = async () => {
    if (!selectedClient) return;
    setSaving(true);
    try {
      await fetch('/api/ai/suggest', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClient.id, aiContext: aiCtx }),
      });
      // Actualizar el cliente en la lista local
      setClients(prev => prev.map(c =>
        c.id === selectedClient.id ? { ...c, aiContext: aiCtx } : c
      ));
      setSelectedClient(prev => prev ? { ...prev, aiContext: aiCtx } : prev);
    } catch {}
    finally { setSaving(false); }
  };

  const hasContext = aiCtx.industry || aiCtx.niche || aiCtx.goals;

  return (
    <div className="wl-dashboard-bg min-h-full px-4 sm:px-6 lg:px-8 py-6">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-[14px] flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(124,58,237,0.25))', border: '1px solid rgba(139,92,246,0.2)' }}>
          <Sparkles className="w-5 h-5 text-[#8B5CF6]" />
        </div>
        <div>
          <h1 className="text-[20px] font-bold" style={{ color: 'var(--wl-text-primary)' }}>AI Studio</h1>
          <p className="text-[13px]" style={{ color: 'var(--wl-text-muted)' }}>Sugerencias de contenido generadas con el contexto real de tu cuenta</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Panel izquierdo: config ── */}
        <div className="lg:col-span-1 space-y-4">

          {/* Selector de cliente */}
          <div className="rounded-[18px] p-4" style={{ background: 'var(--wl-surface)', border: '1px solid var(--wl-border)' }}>
            <p className="text-[13px] font-semibold mb-3" style={{ color: 'var(--wl-text-primary)' }}>
              1. Selecciona una cuenta
            </p>

            {loadingClients ? (
              <div className="space-y-2">
                {[1,2,3].map(i => (
                  <div key={i} className="h-10 rounded-[10px] animate-pulse" style={{ background: 'var(--wl-elevated)' }} />
                ))}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                {/* Opción: sin cliente específico */}
                <button
                  onClick={() => { setSelectedClient(null); setSuggestions([]); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-left transition-all"
                  style={{
                    background: !selectedClient ? 'rgba(139,92,246,0.12)' : 'var(--wl-elevated)',
                    border: !selectedClient ? '1px solid rgba(139,92,246,0.25)' : '1px solid transparent',
                  }}
                >
                  <div className="w-7 h-7 rounded-[7px] flex items-center justify-center text-[12px]"
                    style={{ background: 'rgba(139,92,246,0.15)' }}>
                    ✨
                  </div>
                  <span className="text-[13px] font-medium" style={{ color: !selectedClient ? '#8B5CF6' : 'var(--wl-text-secondary)' }}>
                    General (sin cuenta)
                  </span>
                </button>

                {clients.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedClient(c)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-left transition-all"
                    style={{
                      background: selectedClient?.id === c.id ? 'rgba(139,92,246,0.12)' : 'var(--wl-elevated)',
                      border: selectedClient?.id === c.id ? '1px solid rgba(139,92,246,0.25)' : '1px solid transparent',
                    }}
                  >
                    <div className="w-7 h-7 rounded-[7px] flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                      style={{ background: '#7C3AED' }}>
                      {c.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate"
                        style={{ color: selectedClient?.id === c.id ? '#8B5CF6' : 'var(--wl-text-primary)' }}>
                        {c.name}
                      </p>
                      {c.aiContext?.industry && (
                        <p className="text-[10px] truncate" style={{ color: 'var(--wl-text-muted)' }}>
                          {c.aiContext.industry}
                        </p>
                      )}
                    </div>
                    {c.aiContext?.industry && (
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#10B981' }} title="Tiene contexto IA" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Contexto adicional (sin cliente) o botón editar contexto */}
          {!selectedClient ? (
            <div className="rounded-[18px] p-4" style={{ background: 'var(--wl-surface)', border: '1px solid var(--wl-border)' }}>
              <p className="text-[13px] font-semibold mb-2" style={{ color: 'var(--wl-text-primary)' }}>
                2. Describe el contexto
              </p>
              <textarea
                value={freeContext}
                onChange={e => setFreeContext(e.target.value)}
                placeholder="Ej: Gym femenino en CDMX, tono motivacional, audiencia 25-40 años, queremos ideas para temporada de verano..."
                rows={5}
                className="w-full rounded-[10px] px-3 py-2 text-[13px] resize-none outline-none"
                style={{ background: 'var(--wl-elevated)', border: '1px solid var(--wl-border)', color: 'var(--wl-text-primary)' }}
              />
            </div>
          ) : (
            canEdit && (
              <div className="rounded-[18px] overflow-hidden" style={{ background: 'var(--wl-surface)', border: '1px solid var(--wl-border)' }}>
                <button
                  onClick={() => setShowContextForm(!showContextForm)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--wl-hover)] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4" style={{ color: hasContext ? '#10B981' : '#8B5CF6' }} />
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--wl-text-primary)' }}>
                      Contexto de la cuenta
                    </span>
                    {hasContext && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: '#10B98115', color: '#10B981' }}>Configurado</span>
                    )}
                  </div>
                  <ChevronDown className="w-4 h-4 transition-transform"
                    style={{ color: 'var(--wl-text-muted)', transform: showContextForm ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                </button>

                <AnimatePresence>
                  {showContextForm && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                    >
                      <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--wl-border)' }}>
                        <div className="pt-3">
                          <ContextForm
                            ctx={aiCtx}
                            onChange={(k, v) => setAiCtx(prev => ({ ...prev, [k]: v }))}
                            onSave={handleSaveContext}
                            saving={saving}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          )}

          {/* Botón generar */}
          <button
            onClick={handleGenerate}
            disabled={loading || (!selectedClient && !freeContext.trim())}
            className="w-full py-3 rounded-[14px] text-[14px] font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', boxShadow: '0 4px 16px rgba(124,58,237,0.30)' }}
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</>
              : <><Sparkles className="w-4 h-4" /> Generar sugerencias</>
            }
          </button>

          {selectedClient && !hasContext && canEdit && (
            <p className="text-[11px] text-center" style={{ color: 'var(--wl-text-muted)' }}>
              💡 Configura el contexto de la cuenta para sugerencias más precisas
            </p>
          )}
        </div>

        {/* ── Panel derecho: sugerencias ── */}
        <div className="lg:col-span-2">
          {/* Estado vacío inicial */}
          {!loading && suggestions.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-[20px] flex items-center justify-center mb-4"
                style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.12)' }}>
                <Sparkles className="w-8 h-8 text-[#8B5CF6]" style={{ opacity: 0.5 }} />
              </div>
              <p className="text-[15px] font-semibold mb-1" style={{ color: 'var(--wl-text-primary)' }}>
                Listo para generar ideas
              </p>
              <p className="text-[13px] max-w-[300px]" style={{ color: 'var(--wl-text-muted)' }}>
                {selectedClient
                  ? `Seleccionaste "${selectedClient.name}". Pulsa Generar para obtener 5 sugerencias de contenido.`
                  : 'Selecciona una cuenta o escribe el contexto y pulsa Generar.'
                }
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-[14px] p-4 flex items-start gap-3"
              style={{ background: '#EF444410', border: '1px solid #EF444430' }}>
              <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-[13px] text-red-400">{error}</p>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="rounded-[18px] p-4 animate-pulse" style={{ background: 'var(--wl-surface)', border: '1px solid var(--wl-border)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-[10px]" style={{ background: 'var(--wl-elevated)' }} />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 rounded w-24" style={{ background: 'var(--wl-elevated)' }} />
                      <div className="h-4 rounded w-48" style={{ background: 'var(--wl-elevated)' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sugerencias */}
          {!loading && suggestions.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[15px] font-bold" style={{ color: 'var(--wl-text-primary)' }}>
                    {suggestions.length} sugerencias para{' '}
                    <span style={{ color: '#8B5CF6' }}>
                      {selectedClient?.name || 'tu agencia'}
                    </span>
                  </p>
                  <p className="text-[12px]" style={{ color: 'var(--wl-text-muted)' }}>
                    Haz clic en cada tarjeta para ver el ejemplo listo para usar
                  </p>
                </div>
                <button
                  onClick={handleGenerate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-medium transition-all"
                  style={{ background: 'var(--wl-elevated)', border: '1px solid var(--wl-border)', color: 'var(--wl-text-muted)' }}
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Regenerar
                </button>
              </div>

              <div className="space-y-3">
                {suggestions.map((s, i) => (
                  <SuggestionCard key={s.id || i} s={s} index={i} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
