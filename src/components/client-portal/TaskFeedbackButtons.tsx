'use client';

// ─────────────────────────────────────────────────────────────────────────────
// src/components/client-portal/TaskFeedbackButtons.tsx
//
// Botones de feedback del cliente: Aprobar / Solicitar cambios / Rechazar
// Solo se muestran cuando deliverableStatus === 'client_review'
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { CheckCircle2, MessageSquare, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface TaskFeedbackButtonsProps {
  taskId:            string;
  taskTitle:         string;
  deliverableStatus: string | null | undefined;
  onSuccess:         () => void;
}

type FeedbackType = 'approved' | 'changes_requested' | 'rejected';

export default function TaskFeedbackButtons({
  taskId,
  taskTitle,
  deliverableStatus,
  onSuccess,
}: TaskFeedbackButtonsProps) {
  const [sending,       setSending]       = useState(false);
  const [activeType,    setActiveType]    = useState<FeedbackType | null>(null);
  const [showMessage,   setShowMessage]   = useState(false);
  const [message,       setMessage]       = useState('');
  const [pendingType,   setPendingType]   = useState<FeedbackType | null>(null);

  // Solo mostrar si está en client_review
  if (deliverableStatus !== 'client_review') return null;

  async function submitFeedback(type: FeedbackType, msg: string) {
    setSending(true);
    setActiveType(type);
    try {
      const res = await fetch('/api/tasks/feedback', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ taskId, type, message: msg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar feedback');

      const labels: Record<FeedbackType, string> = {
        approved:          '✅ Entrega aprobada',
        changes_requested: '📝 Cambios solicitados al equipo',
        rejected:          '❌ Entrega rechazada',
      };
      toast.success(labels[type]);
      setShowMessage(false);
      setMessage('');
      setPendingType(null);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al enviar');
    } finally {
      setSending(false);
      setActiveType(null);
    }
  }

  function handleClick(type: FeedbackType) {
    if (type === 'approved') {
      submitFeedback('approved', '');
      return;
    }
    // changes_requested y rejected piden mensaje opcional
    setPendingType(type);
    setShowMessage(true);
    setMessage('');
  }

  function handleCancel() {
    setShowMessage(false);
    setPendingType(null);
    setMessage('');
  }

  return (
    <div className="mt-3 pt-3 border-t border-[var(--wl-border)] space-y-2" onClick={e => e.stopPropagation()}>
      <p className="text-[10px] text-[var(--wl-text-muted)] uppercase tracking-wider font-medium">
        Tu opinión sobre esta entrega
      </p>

      {!showMessage ? (
        <div className="flex gap-2 flex-wrap">
          {/* Aprobar */}
          <button
            type="button"
            disabled={sending}
            onClick={() => handleClick('approved')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              bg-green-500/15 hover:bg-green-500/25 border border-green-500/25 text-green-300
              hover:text-green-200 transition-colors disabled:opacity-50"
          >
            {sending && activeType === 'approved'
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <CheckCircle2 className="w-3.5 h-3.5" />
            }
            Aprobar
          </button>

          {/* Solicitar cambios */}
          <button
            type="button"
            disabled={sending}
            onClick={() => handleClick('changes_requested')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/25 text-amber-300
              hover:text-amber-200 transition-colors disabled:opacity-50"
          >
            {sending && activeType === 'changes_requested'
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <MessageSquare className="w-3.5 h-3.5" />
            }
            Solicitar cambios
          </button>

          {/* Rechazar */}
          <button
            type="button"
            disabled={sending}
            onClick={() => handleClick('rejected')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              bg-red-500/15 hover:bg-red-500/25 border border-red-500/20 text-red-300
              hover:text-red-200 transition-colors disabled:opacity-50"
          >
            {sending && activeType === 'rejected'
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <XCircle className="w-3.5 h-3.5" />
            }
            Rechazar
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-[var(--wl-text-muted)]">
            {pendingType === 'changes_requested' ? '¿Qué cambios necesitas?' : '¿Por qué rechazas esta entrega?'}
            <span className="text-[var(--wl-text-placeholder)] ml-1">(opcional)</span>
          </p>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={2}
            placeholder="Escribe tu comentario..."
            className="w-full rounded-lg bg-[var(--wl-hover)] border border-[var(--wl-border)] text-[var(--wl-text-primary)] text-xs
              px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand resize-none
              placeholder:text-[var(--wl-text-placeholder)]"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={sending}
              onClick={() => submitFeedback(pendingType!, message)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                transition-colors disabled:opacity-50
                ${pendingType === 'changes_requested'
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300'
                  : 'bg-red-500/20 hover:bg-red-500/30 border border-red-500/25 text-red-300'
                }`}
            >
              {sending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : pendingType === 'changes_requested'
                  ? <MessageSquare className="w-3.5 h-3.5" />
                  : <XCircle className="w-3.5 h-3.5" />
              }
              {sending ? 'Enviando...' : 'Confirmar'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-1.5 rounded-lg text-xs text-[var(--wl-text-muted)] hover:text-[var(--wl-text-primary)]
                hover:bg-[var(--wl-hover)] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
