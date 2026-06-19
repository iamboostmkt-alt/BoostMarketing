'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, CheckCircle2, Circle, ArrowRight, Sparkles } from 'lucide-react';
import { getStepsForRole, getChecklistForRole, TutorialStep, ChecklistItem } from './tutorialSteps';

interface TutorialOverlayProps {
  userId: string;
  role: string;
  onComplete?: () => void;
}

function getTutorialKey(userId: string) {
  return `wl_tutorial_done_${userId}`;
}
function getChecklistKey(userId: string) {
  return `wl_checklist_${userId}`;
}

export function useTutorial(userId: string, role: string) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!userId || !role) return;
    const done = localStorage.getItem(getTutorialKey(userId));
    if (!done) setShow(true);
  }, [userId, role]);

  const reset = useCallback(() => {
    if (userId) {
      localStorage.removeItem(getTutorialKey(userId));
      localStorage.removeItem(getChecklistKey(userId));
      setShow(true);
    }
  }, [userId]);

  const dismiss = useCallback(() => {
    if (userId) localStorage.setItem(getTutorialKey(userId), '1');
    setShow(false);
  }, [userId]);

  return { show, dismiss, reset };
}

// ─── Spotlight helper ──────────────────────────────────────
function getElementRect(target: string): DOMRect | null {
  const el = document.querySelector(`[data-tutorial="${target}"]`);
  if (!el) return null;
  return el.getBoundingClientRect();
}

// ─── TutorialOverlay ──────────────────────────────────────
export function TutorialOverlay({ userId, role, onComplete }: TutorialOverlayProps) {
  const { show, dismiss } = useTutorial(userId, role);
  const [phase, setPhase] = useState<'spotlight' | 'checklist'>('spotlight');
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [animIn, setAnimIn] = useState(false);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  const steps = getStepsForRole(role);
  const items = getChecklistForRole(role);
  const step = steps[stepIdx];

  // Cargar checklist guardado
  useEffect(() => {
    if (!userId) return;
    try {
      const saved = localStorage.getItem(getChecklistKey(userId));
      if (saved) setChecklist(JSON.parse(saved));
    } catch { /* */ }
  }, [userId]);

  // Medir el elemento target — abrir sidebar en móvil si es necesario
  useEffect(() => {
    if (phase !== 'spotlight' || !step) return;
    setAnimIn(false);

    const measure = () => {
      const r = getElementRect(step.target);
      setRect(r);
      requestAnimationFrame(() => setAnimIn(true));
    };

    const isMobile = window.innerWidth < 1024;
    const isNavTarget = step.target.startsWith('nav-') || step.target === 'sidebar-nav';

    if (isMobile && isNavTarget) {
      window.dispatchEvent(new CustomEvent('wl:open-sidebar'));
      // Intentar varias veces hasta encontrar el elemento
      let attempts = 0;
      const tryMeasure = () => {
        attempts++;
        const r = getElementRect(step.target);
        if (r && r.width > 0) {
          setRect(r);
          requestAnimationFrame(() => setAnimIn(true));
        } else if (attempts < 8) {
          setTimeout(tryMeasure, 150);
        } else {
          // Si no lo encuentra, mostrar tooltip centrado
          setRect(null);
          requestAnimationFrame(() => setAnimIn(true));
        }
      };
      const t = setTimeout(tryMeasure, 400);
      window.addEventListener('resize', tryMeasure);
      return () => { clearTimeout(t); window.removeEventListener('resize', tryMeasure); };
    }

    // Desktop o paso no nav — medir directo
    const r = getElementRect(step.target);
    if (r && r.width > 0) {
      setRect(r);
    } else {
      setRect(null); // tooltip centrado si no hay elemento
    }
    requestAnimationFrame(() => setAnimIn(true));
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [phase, stepIdx, step]);

  const saveChecklist = (next: Record<string, boolean>) => {
    setChecklist(next);
    localStorage.setItem(getChecklistKey(userId), JSON.stringify(next));
  };

  const toggleItem = (id: string) => {
    saveChecklist({ ...checklist, [id]: !checklist[id] });
  };

  const goNext = () => {
    if (stepIdx < steps.length - 1) {
      setStepIdx(i => i + 1);
    } else {
      setPhase('checklist');
    }
  };

  const goPrev = () => {
    if (stepIdx > 0) setStepIdx(i => i - 1);
  };

  const handleComplete = () => {
    dismiss();
    onComplete?.();
  };

  if (!show) return null;

  const PAD = 10; // spotlight padding

  // ─── FASE SPOTLIGHT ────────────────────────────────────
  if (phase === 'spotlight') {
    const hasTarget = !!rect;

    // Tooltip posición
    const tooltipW = typeof window !== 'undefined' && window.innerWidth < 640
      ? Math.min(300, window.innerWidth - 32)
      : 300;
    const tooltipH = 160;
    let tooltipStyle: React.CSSProperties = {};

    if (rect && step) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isMobile = vw < 640;
      const cx = rect.left + rect.width / 2;

      // En móvil o cuando el elemento está fuera de la zona visible → centrar siempre
      const isOffscreen = rect.top < 50 || rect.top > vh - 50;
      if (isMobile || isOffscreen) {
        tooltipStyle = {
          left: Math.max(8, (vw - Math.min(tooltipW, vw - 16)) / 2),
          top: Math.max(80, (vh - tooltipH) / 2 - 40),
        };
      } else if (step.placement === 'right') {
        tooltipStyle = {
          left: Math.min(rect.right + PAD + 12, vw - tooltipW - 8),
          top: Math.max(70, Math.min(rect.top, vh - tooltipH - 8)),
        };
      } else if (step.placement === 'left') {
        tooltipStyle = {
          left: Math.max(8, rect.left - tooltipW - 12),
          top: Math.max(70, Math.min(rect.top, vh - tooltipH - 8)),
        };
      } else if (step.placement === 'bottom') {
        tooltipStyle = {
          left: Math.max(8, Math.min(cx - tooltipW / 2, vw - tooltipW - 8)),
          top: Math.min(rect.bottom + 12, vh - tooltipH - 8),
        };
      } else if (step.placement === 'top') {
        tooltipStyle = {
          left: Math.max(8, Math.min(cx - tooltipW / 2, vw - tooltipW - 8)),
          top: Math.max(70, rect.top - tooltipH - 12),
        };
      } else {
        tooltipStyle = {
          left: Math.max(8, (vw - tooltipW) / 2),
          top: Math.max(70, (vh - tooltipH) / 2),
        };
      }
    } else {
      // Sin target — centrar
      tooltipStyle = {
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    return (
      <div className="fixed inset-0 z-[99998]" style={{ pointerEvents: 'all' }}>
        {/* Overlay con hueco para el elemento */}
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: 'none' }}
        >
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              {rect && (
                <rect
                  x={rect.left - PAD}
                  y={rect.top - PAD}
                  width={rect.width + PAD * 2}
                  height={rect.height + PAD * 2}
                  rx={10}
                  fill="black"
                  style={{ transition: 'x 0.35s ease, y 0.35s ease, width 0.35s ease, height 0.35s ease' }}
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.72)"
            mask="url(#spotlight-mask)"
          />
          {/* Borde de spotlight + halo */}
          {rect && (
            <>
              <rect
                x={rect.left - PAD - 5}
                y={rect.top - PAD - 5}
                width={rect.width + PAD * 2 + 10}
                height={rect.height + PAD * 2 + 10}
                rx={14}
                fill="none"
                stroke="rgba(139,92,246,0.2)"
                strokeWidth={3}
              />
              <rect
                x={rect.left - PAD}
                y={rect.top - PAD}
                width={rect.width + PAD * 2}
                height={rect.height + PAD * 2}
                rx={10}
                fill="none"
                stroke="rgba(139,92,246,0.85)"
                strokeWidth={2}
                strokeDasharray="0"
              />
            </>
          )}
        </svg>

        {/* Tooltip flotante */}
        {step && (
          <div
            className="absolute z-10"
            style={{
              width: tooltipW,
              ...tooltipStyle,
              opacity: animIn ? 1 : 0,
              transform: animIn
                ? (tooltipStyle.transform ?? 'translateY(0)')
                : `${tooltipStyle.transform ?? ''} translateY(6px)`,
              transition: 'opacity 0.2s ease, transform 0.2s ease',
            }}
          >
            <div
              className="rounded-2xl p-4 shadow-2xl"
              style={{
                background: 'var(--wl-elevated)',
                border: '1px solid rgba(139,92,246,0.25)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 20px 40px rgba(0,0,0,0.6)',
              }}
            >
              {/* Step counter */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-medium text-violet-400 uppercase tracking-wider">
                  Paso {stepIdx + 1} de {steps.length}
                </span>
                <button
                  onClick={handleComplete}
                  className="text-[var(--wl-text-placeholder)] hover:text-[var(--wl-text-secondary)] transition-colors p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-[14px] font-semibold text-[var(--wl-text-primary)] mb-1">{step.title}</p>
              <p className="text-[12px] text-[var(--wl-text-primary)]/55 leading-relaxed mb-4">{step.description}</p>

              {/* Dots + nav */}
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {steps.map((_, i) => (
                    <div
                      key={i}
                      className="rounded-full transition-all duration-200"
                      style={{
                        width: i === stepIdx ? 16 : 6,
                        height: 6,
                        background: i === stepIdx ? '#8B5CF6' : 'rgba(255,255,255,0.15)',
                      }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  {stepIdx > 0 && (
                    <button
                      onClick={goPrev}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] text-[var(--wl-text-muted)] hover:text-[var(--wl-text-primary)] transition-colors"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={goNext}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[var(--wl-text-primary)] transition-all active:scale-95"
                    style={{ background: '#7C3AED' }}
                  >
                    {stepIdx === steps.length - 1 ? (
                      <>Ver checklist <ArrowRight className="w-3.5 h-3.5" /></>
                    ) : (
                      <>Siguiente <ChevronRight className="w-3.5 h-3.5" /></>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Click en overlay → saltar */}
        <div
          className="absolute inset-0"
          onClick={handleComplete}
          style={{ zIndex: -1 }}
        />
      </div>
    );
  }

  // ─── FASE CHECKLIST ────────────────────────────────────
  const completedCount = items.filter(i => checklist[i.id]).length;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{
          background: 'var(--wl-surface)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 30px 80px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header */}
        <div
          className="px-6 pt-6 pb-5"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(91,33,182,0.08) 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)' }}
              >
                <Sparkles className="w-4.5 h-4.5 text-violet-400" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[var(--wl-text-primary)]">¡Ya estás listo!</p>
                <p className="text-[11px] text-[var(--wl-text-muted)]">Completa estos pasos para empezar</p>
              </div>
            </div>
            <button onClick={handleComplete} className="text-[var(--wl-text-placeholder)] hover:text-[var(--wl-text-secondary)] transition-colors mt-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[11px] text-[var(--wl-text-muted)]">Progreso</span>
              <span className="text-[11px] font-medium text-violet-400">
                {completedCount}/{items.length}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--wl-hover)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(completedCount / items.length) * 100}%`,
                  background: 'linear-gradient(90deg, #7C3AED, #A78BFA)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Checklist items */}
        <div className="divide-y divide-white/[0.04] max-h-[55vh] overflow-y-auto">
          {items.map((item) => {
            const done = !!checklist[item.id];
            return (
              <button
                key={item.id}
                onClick={() => {
                  toggleItem(item.id);
                  if (item.path) {
                    handleComplete();
                    window.location.href = item.path;
                  }
                }}
                className="w-full flex items-center gap-3.5 px-5 py-3.5 text-left transition-colors active:bg-[var(--wl-hover)] hover:bg-[var(--wl-hover)]"
              >
                <span className="text-xl shrink-0">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-medium transition-colors ${done ? 'text-[var(--wl-text-placeholder)] line-through' : 'text-[var(--wl-text-primary)]'}`}>
                    {item.label}
                  </p>
                  <p className="text-[11px] text-[var(--wl-text-placeholder)] truncate">{item.description}</p>
                </div>
                {done
                  ? <CheckCircle2 className="w-4.5 h-4.5 text-violet-400 shrink-0" />
                  : <Circle className="w-4.5 h-4.5 text-[var(--wl-text-placeholder)] shrink-0" />
                }
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[var(--wl-border-subtle)]">
          <button
            onClick={handleComplete}
            className="w-full py-3 rounded-xl text-[13px] font-medium text-[var(--wl-text-primary)] transition-all active:scale-[0.98]"
            style={{ background: '#7C3AED' }}
          >
            {completedCount === items.length ? '🎉 ¡Todo listo! Empezar' : 'Explorar por mi cuenta'}
          </button>
          <p className="text-center text-[10px] text-[var(--wl-text-placeholder)] mt-2">
            Puedes ver este tutorial de nuevo en Configuración
          </p>
        </div>
      </div>
    </div>
  );
}
