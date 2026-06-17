'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, RefreshCw, XCircle, MessageSquare } from 'lucide-react';

interface DeliverableLog {
  id: string;
  status: string;
  note: string;
  createdBy: string;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  pending:     { label: 'Creada',           icon: Clock,         color: 'text-yellow-400' },
  in_progress: { label: 'En producción',    icon: RefreshCw,     color: 'text-blue-400' },
  review:      { label: 'En revisión',      icon: Clock,         color: 'text-purple-400' },
  completed:   { label: 'Completada',       icon: CheckCircle2,  color: 'text-green-400' },
  approved:    { label: 'Aprobada',         icon: CheckCircle2,  color: 'text-green-400' },
  rejected:    { label: 'Rechazada',        icon: XCircle,       color: 'text-red-400' },
  changes:     { label: 'Cambios solicit.', icon: MessageSquare, color: 'text-orange-400' },
  cancelled:   { label: 'Cancelada',        icon: XCircle,       color: 'text-red-400' },
};

export function DeliverableHistory({ taskId }: { taskId: string }) {
  const [logs, setLogs] = useState<DeliverableLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/deliverable-logs?taskId=' + taskId)
      .then(r => r.json())
      .then(d => setLogs(d.logs ?? []))
      .finally(() => setLoading(false));
  }, [taskId]);

  if (loading) return <div className="text-xs text-white/30 py-2">Cargando historial...</div>;
  if (logs.length === 0) return <div className="text-xs text-white/30 py-2">Sin historial aún.</div>;

  return (
    <div className="space-y-2 mt-3">
      <p className="text-[11px] font-medium text-[var(--wl-text-muted)] uppercase tracking-wider">Historial</p>
      <div className="relative">
        <div className="absolute left-2.5 top-2 bottom-2 w-px bg-white/[0.06]" />
        <div className="space-y-2">
          {logs.map((log) => {
            const cfg = statusConfig[log.status] || { label: log.status, icon: Clock, color: 'text-[var(--wl-text-muted)]' };
            const Icon = cfg.icon;
            return (
              <div key={log.id} className="flex items-start gap-3 pl-1">
                <div className="relative z-10 mt-0.5 shrink-0">
                  <div className="w-4 h-4 rounded-full bg-white/[0.04] border border-[var(--wl-border)] flex items-center justify-center">
                    <Icon className={`w-2.5 h-2.5 ${cfg.color}`} />
                  </div>
                </div>
                <div className="flex-1 pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                    <span className="text-[10px] text-white/25">
                      {new Date(log.createdAt).toLocaleDateString('es-MX', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                    </span>
                  </div>
                  {log.note && <p className="text-xs text-[var(--wl-text-muted)] mt-0.5">{log.note}</p>}
                  {log.createdBy && <p className="text-[10px] text-white/25 mt-0.5">{log.createdBy}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
