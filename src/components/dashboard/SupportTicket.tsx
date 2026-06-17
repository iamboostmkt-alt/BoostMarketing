'use client';
import { useState } from 'react';
import { LifeBuoy, Send, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';

const TICKET_TYPES = [
  { value: 'bug',         label: '🐛 Error técnico' },
  { value: 'acceso',      label: '🔐 Problema de acceso' },
  { value: 'facturacion', label: '💳 Facturación' },
  { value: 'sugerencia',  label: '💡 Sugerencia' },
  { value: 'otro',        label: '📋 Otro' },
];

interface SupportTicketProps {
  onClose?: () => void;
}

export default function SupportTicket({ onClose }: SupportTicketProps) {
  const [type,     setType]     = useState('bug');
  const [message,  setMessage]  = useState('');
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);

  async function handleSubmit() {
    if (!message.trim()) { toast.error('Escribe un mensaje'); return; }
    setSending(true);
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
    } catch {
      toast.error('Error al enviar. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  }

  if (sent) return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center gap-4">
      <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.12)' }}>
        <CheckCircle2 className="w-7 h-7 text-green-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-white/90">Ticket enviado</p>
        <p className="text-xs text-[var(--wl-text-muted)] mt-1">Notificamos el problema a soporte técnico.<br/>En breve recibirás respuesta.</p>
      </div>
      {onClose && (
        <button onClick={onClose} className="text-xs text-white/30 hover:text-[var(--wl-text-secondary)] transition-colors mt-2">
          Cerrar
        </button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-4 p-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.12)' }}>
            <LifeBuoy className="w-3.5 h-3.5 text-yellow-300" />
          </div>
          <div>
            <p className="text-sm font-medium text-white/90">Reportar problema</p>
            <p className="text-[11px] text-white/30">Te responderemos a la brevedad</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded text-white/20 hover:text-white/50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-[11px] text-[var(--wl-text-muted)] uppercase tracking-wider">Tipo de reporte</p>
        <div className="grid grid-cols-1 gap-1">
          {TICKET_TYPES.map(t => (
            <button key={t.value} onClick={() => setType(t.value)}
              className={`text-left px-3 py-2 rounded-lg text-xs transition-all ${
                type === t.value
                  ? 'text-white font-medium'
                  : 'text-[var(--wl-text-muted)] hover:text-[var(--wl-text-secondary)] hover:bg-[var(--wl-hover)]'
              }`}
              style={type === t.value ? { background: 'rgba(124,58,237,0.18)', border: '1px solid rgba(124,58,237,0.3)' } : { border: '1px solid transparent' }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-[11px] text-[var(--wl-text-muted)] uppercase tracking-wider">Describe el problema</p>
        <textarea style={{ fontSize: "16px" }}
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Describe el problema con el mayor detalle posible..."
          rows={4}
          maxLength={2000}
          className="w-full bg-white/[0.04] border border-[var(--wl-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--wl-text-secondary)] placeholder:text-white/20 resize-none focus:outline-none focus:border-violet-500/40 transition-colors"
        />
        <p className="text-[10px] text-white/20 text-right">{message.length}/2000</p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={sending || !message.trim()}
        className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-40"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}
      >
        <Send className="w-3.5 h-3.5" />
        {sending ? 'Enviando...' : 'Enviar ticket'}
      </button>
    </div>
  );
}
