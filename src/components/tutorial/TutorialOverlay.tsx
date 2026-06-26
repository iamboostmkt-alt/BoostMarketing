'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getStepsForRole, getChecklistForRole } from './tutorialSteps';

// ─── Keys ───────────────────────────────────────────────────
function getTutorialKey(userId: string) { return `wl_tutorial_done_${userId}`; }
function getChecklistKey(userId: string) { return `wl_tutorial_checklist_${userId}`; }

// ─── Hook ───────────────────────────────────────────────────
export function useTutorial(userId: string, role: string) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!userId || !role) return;
    const localDone = localStorage.getItem(getTutorialKey(userId));
    if (localDone) return;
    fetch('/api/user/profile')
      .then(r => r.json())
      .then(data => {
        if (data?.user?.tutorialDone) {
          localStorage.setItem(getTutorialKey(userId), '1');
        } else {
          setShow(true);
        }
      })
      .catch(() => setShow(true));
  }, [userId, role]);

  const reset = useCallback(() => {
    if (userId) {
      localStorage.removeItem(getTutorialKey(userId));
      localStorage.removeItem(getChecklistKey(userId));
      fetch('/api/user/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tutorialDone: false }) }).catch(() => {});
      setShow(true);
    }
  }, [userId]);

  const dismiss = useCallback(() => {
    if (userId) {
      localStorage.setItem(getTutorialKey(userId), '1');
      fetch('/api/user/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tutorialDone: true }) }).catch(() => {});
    }
    setShow(false);
  }, [userId]);

  return { show, dismiss, reset };
}

// ─── Iconos por paso ────────────────────────────────────────
const STEP_VISUALS: Record<string, { emoji: string; color: string; bg: string }> = {
  sidebar:   { emoji: '🏠', color: '#7C3AED', bg: 'rgba(124,58,237,0.15)' },
  clients:   { emoji: '🏢', color: '#2563EB', bg: 'rgba(37,99,235,0.15)' },
  tasks:     { emoji: '✅', color: '#059669', bg: 'rgba(5,150,105,0.15)' },
  chat:      { emoji: '💬', color: '#7C3AED', bg: 'rgba(124,58,237,0.15)' },
  team:      { emoji: '👥', color: '#0891B2', bg: 'rgba(8,145,178,0.15)' },
  settings:  { emoji: '⚙️', color: '#64748B', bg: 'rgba(100,116,139,0.15)' },
  calendar:  { emoji: '📅', color: '#D97706', bg: 'rgba(217,119,6,0.15)' },
  ai:        { emoji: '✨', color: '#7C3AED', bg: 'rgba(124,58,237,0.15)' },
  projects:  { emoji: '📁', color: '#059669', bg: 'rgba(5,150,105,0.15)' },
  portal:    { emoji: '🔗', color: '#2563EB', bg: 'rgba(37,99,235,0.15)' },
};

// ─── TutorialOverlay ────────────────────────────────────────
export function TutorialOverlay({ userId, role, onComplete }: {
  userId: string; role: string; onComplete?: () => void;
}) {
  const { show, dismiss } = useTutorial(userId, role);
  const [stepIdx, setStepIdx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const router = useRouter();

  const steps = getStepsForRole(role);
  const step = steps[stepIdx];
  const isLast = stepIdx === steps.length - 1;
  const visual = STEP_VISUALS[step?.id] || { emoji: '💡', color: '#7C3AED', bg: 'rgba(124,58,237,0.15)' };

  const next = () => {
    if (animating) return;
    if (isLast) {
      dismiss();
      onComplete?.();
      return;
    }
    setAnimating(true);
    setTimeout(() => {
      setStepIdx(i => i + 1);
      setAnimating(false);
    }, 200);
  };

  const prev = () => {
    if (animating || stepIdx === 0) return;
    setAnimating(true);
    setTimeout(() => {
      setStepIdx(i => i - 1);
      setAnimating(false);
    }, 200);
  };

  if (!show || !step) return null;

  return (
    <>
      {/* Overlay oscuro semitransparente */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 99998,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(2px)',
        }}
        onClick={dismiss}
      />

      {/* Card estilo Kueski — bottom sheet en móvil, centrado en desktop */}
      <div
        style={{
          position: 'fixed', zIndex: 99999,
          left: 0, right: 0, bottom: 0,
          padding: '0 0 env(safe-area-inset-bottom, 0px)',
          display: 'flex', flexDirection: 'column',
          animation: 'wl-slide-up 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          background: '#13131A',
          borderRadius: '24px 24px 0 0',
          padding: '28px 24px 32px',
          maxWidth: 480,
          margin: '0 auto',
          width: '100%',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderBottom: 'none',
        }}>
          {/* Handle */}
          <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 100, margin: '0 auto 24px' }} />

          {/* X cerrar */}
          <button
            onClick={dismiss}
            style={{ position: 'absolute', top: 20, right: 20, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>
            ✕
          </button>

          {/* Ícono grande */}
          <div style={{
            width: 80, height: 80, borderRadius: 22,
            background: visual.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, marginBottom: 20,
            border: `1px solid ${visual.color}30`,
          }}>
            {visual.emoji}
          </div>

          {/* Paso X de Y */}
          <p style={{ fontSize: 12, fontWeight: 600, color: visual.color, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>
            PASO {stepIdx + 1} DE {steps.length}
          </p>

          {/* Título */}
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#FFFFFF', margin: '0 0 12px', lineHeight: 1.2 }}>
            {step.title}
          </h2>

          {/* Descripción */}
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', margin: '0 0 28px', lineHeight: 1.6 }}>
            {step.description}
          </p>

          {/* Dots */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 24, justifyContent: 'center' }}>
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStepIdx(i)}
                style={{
                  width: i === stepIdx ? 24 : 8,
                  height: 8,
                  borderRadius: 100,
                  background: i === stepIdx ? visual.color : 'rgba(255,255,255,0.2)',
                  border: 'none', cursor: 'pointer',
                  transition: 'all 0.2s',
                  padding: 0,
                }}
              />
            ))}
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: 12 }}>
            {stepIdx > 0 && (
              <button
                onClick={prev}
                style={{
                  flex: 1, height: 52, borderRadius: 14,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 16, fontWeight: 600, cursor: 'pointer',
                }}>
                ← Anterior
              </button>
            )}
            <button
              onClick={next}
              style={{
                flex: stepIdx > 0 ? 2 : 1,
                height: 52, borderRadius: 14,
                background: isLast
                  ? 'linear-gradient(135deg, #059669, #047857)'
                  : `linear-gradient(135deg, ${visual.color}, #5B21B6)`,
                border: 'none',
                color: '#FFFFFF',
                fontSize: 16, fontWeight: 700, cursor: 'pointer',
                letterSpacing: '-0.01em',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              {isLast ? '¡Entendido! →' : 'Siguiente →'}
            </button>
          </div>

          {/* Omitir — solo visible en primeros pasos */}
          {!isLast && stepIdx < 2 && (
            <button
              onClick={dismiss}
              style={{ display: 'block', width: '100%', marginTop: 14, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 13, cursor: 'pointer', textAlign: 'center' }}>
              Omitir tutorial
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes wl-slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}
