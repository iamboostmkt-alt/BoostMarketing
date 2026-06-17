'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, Copy, Check, Trash2, Eye, EyeOff, Plus, X, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface Token {
  id: string; token: string; label: string; active: boolean;
  viewCount: number; lastViewAt: string | null; expiresAt: string | null; createdAt: string;
}

interface Props {
  projectId: string;
  projectName: string;
}

export function ProjectShareButton({ projectId, projectName }: Props) {
  const [open,   setOpen]   = useState(false);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied,  setCopied] = useState<string | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  async function loadTokens() {
    const r = await fetch(`/api/project-tokens?projectId=${projectId}`);
    const d = await r.json();
    setTokens(d.tokens || []);
  }

  useEffect(() => { if (open) loadTokens(); }, [open]);

  async function createToken() {
    setLoading(true);
    const r = await fetch('/api/project-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, label: 'Enlace cliente' }),
    });
    const d = await r.json();
    if (d.token) {
      setTokens(prev => [d.token, ...prev]);
      toast.success('Enlace creado');
    }
    setLoading(false);
  }

  async function toggleToken(id: string, active: boolean) {
    await fetch('/api/project-tokens', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: !active }),
    });
    setTokens(prev => prev.map(t => t.id === id ? { ...t, active: !active } : t));
  }

  async function deleteToken(id: string) {
    await fetch(`/api/project-tokens?id=${id}`, { method: 'DELETE' });
    setTokens(prev => prev.filter(t => t.id !== id));
    toast.success('Enlace eliminado');
  }

  function copyLink(token: string) {
    const url = `${baseUrl}/p/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(token);
      toast.success('Enlace copiado');
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all border"
        style={{ background: 'rgba(139,92,246,0.08)', borderColor: 'rgba(139,92,246,0.20)', color: '#8B5CF6' }}>
        <Link2 className="w-3.5 h-3.5" />
        Compartir
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: 'rgba(0,0,0,0.6)' }}>
            <motion.div
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full sm:max-w-md rounded-t-[24px] sm:rounded-[20px] overflow-hidden"
              style={{ background: '#0F1117', border: '1px solid rgba(255,255,255,0.06)', maxHeight: '90dvh', overflowY: 'auto' }}>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(139,92,246,0.15)' }}>
                    <Link2 className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-white">Compartir proyecto</p>
                    <p className="text-[11px] text-white/40">{projectName}</p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white/60 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Info */}
                <div className="rounded-xl p-3 text-[12px] text-violet-300/80 leading-relaxed"
                  style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}>
                  Genera un enlace para que tu cliente vea el avance del proyecto sin necesidad de registrarse.
                  Pueden ver milestones, tareas visibles, archivos y el equipo asignado.
                </div>

                {/* Lista de tokens */}
                {tokens.length > 0 && (
                  <div className="space-y-2">
                    {tokens.map(t => (
                      <div key={t.id} className="rounded-[14px] p-3.5"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${t.active ? 'bg-emerald-500' : 'bg-white/20'}`} />
                            <span className="text-[12px] font-medium text-white/80">{t.label}</span>
                            {t.viewCount > 0 && (
                              <span className="text-[10px] text-white/30">{t.viewCount} vista{t.viewCount > 1 ? 's' : ''}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => toggleToken(t.id, t.active)} title={t.active ? 'Desactivar' : 'Activar'}
                              className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-all">
                              {t.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => deleteToken(t.id)} title="Eliminar enlace"
                              className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <div className="flex-1 rounded-lg px-2.5 py-1.5 text-[11px] font-mono truncate"
                            style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.35)' }}>
                            {baseUrl}/p/{t.token}
                          </div>
                          <button onClick={() => copyLink(t.token)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all shrink-0"
                            style={{ background: copied === t.token ? 'rgba(16,185,129,0.12)' : 'rgba(139,92,246,0.12)', color: copied === t.token ? '#10B981' : '#a78bfa' }}>
                            {copied === t.token ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copied === t.token ? 'Copiado' : 'Copiar'}
                          </button>
                          <a href={`/p/${t.token}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-center w-8 rounded-lg transition-all"
                            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.30)' }}
                            title="Abrir vista del cliente">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>

                        {t.expiresAt && (
                          <p className="text-[10px] text-white/25 mt-1.5">
                            Expira: {new Date(t.expiresAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Botón crear nuevo */}
                <button onClick={createToken} disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-[14px] text-[13px] font-semibold text-white transition-all disabled:opacity-50"
                  style={{ background: 'rgba(139,92,246,0.15)', border: '1px dashed rgba(139,92,246,0.30)' }}>
                  <Plus className="w-4 h-4 text-violet-400" />
                  {loading ? 'Generando...' : tokens.length === 0 ? 'Generar enlace para cliente' : 'Generar otro enlace'}
                </button>

                {tokens.length === 0 && (
                  <p className="text-center text-[11px] text-white/25">
                    El cliente podrá ver el proyecto sin necesidad de crear una cuenta.
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
