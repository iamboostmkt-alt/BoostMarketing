'use client';
import { useEffect, useState } from 'react';
import { Calendar, Video, Plus, Clock, User, ExternalLink } from 'lucide-react';

interface Meeting {
  id: string;
  name: string;
  email: string;
  date: string;
  notes: string;
  status: string;
  meetUrl?: string;
  meetingProvider: string;
  isInternal: boolean;
  assignedUsers?: { user: { name: string; email: string; color: string; image?: string } }[];
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pending:   { bg: 'rgba(226,232,240,0.12)', color: '#E2E8F0', label: 'Pendiente' },
  confirmed: { bg: 'rgba(56,189,248,0.15)',  color: '#38BDF8', label: 'Confirmada' },
  completed: { bg: 'rgba(34,197,94,0.15)',   color: '#22C55E', label: 'Completada' },
  cancelled: { bg: 'rgba(239,68,68,0.15)',   color: '#EF4444', label: 'Cancelada' },
};

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all'|'pending'|'confirmed'|'completed'>( 'all');

  useEffect(() => {
    fetch('/api/meetings')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.meetings) setMeetings(d.meetings); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? meetings : meetings.filter(m => m.status === filter);
  const upcoming = meetings.filter(m => new Date(m.date) > new Date() && m.status !== 'cancelled').length;

  return (
    <div className="min-h-full p-6 md:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Reuniones</h1>
          <p className="text-[13px] text-[var(--wl-text-muted)] mt-0.5">{upcoming} próximas reuniones</p>
        </div>
        <a href="/dashboard/calendar"
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-[13px] font-medium text-[var(--wl-text-primary)] hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" strokeWidth={2} />
          Nueva reunión
        </a>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex items-center gap-2">
        {(['all','pending','confirmed','completed'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
              filter === f ? 'bg-primary/15 text-primary' : 'text-[var(--wl-text-muted)] hover:text-[var(--wl-text-secondary)] hover:bg-[var(--wl-hover)]'
            }`}>
            {f === 'all' ? 'Todas' : STATUS_STYLE[f]?.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Calendar className="h-10 w-10 text-[var(--wl-text-placeholder)]" strokeWidth={1.5} />
          <p className="text-[13px] text-[var(--wl-text-placeholder)]">No hay reuniones</p>
          <a href="/dashboard/calendar" className="text-[12px] text-primary hover:underline">
            Ir al calendario →
          </a>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(m => {
            const date = new Date(m.date);
            const isPast = date < new Date();
            const style = STATUS_STYLE[m.status] ?? STATUS_STYLE.pending;
            return (
              <div key={m.id}
                className="rounded-2xl border border-[var(--wl-border)] bg-[var(--wl-hover)] p-4 hover:bg-[var(--wl-hover)] transition-colors">
                <div className="flex items-start gap-4">
                  {/* Fecha */}
                  <div className="shrink-0 flex flex-col items-center justify-center rounded-xl bg-[var(--wl-hover)] border border-[var(--wl-border)] w-14 h-14">
                    <span className="text-[11px] font-medium text-[var(--wl-text-muted)] uppercase">
                      {date.toLocaleDateString('es-MX', { month: 'short' })}
                    </span>
                    <span className="text-[20px] font-bold text-[var(--wl-text-primary)] leading-none">
                      {date.getDate()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[14px] font-semibold text-[var(--wl-text-primary)] truncate">{m.name}</h3>
                      <span className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium"
                        style={{ background: style.bg, color: style.color }}>
                        {style.label}
                      </span>
                      {m.isInternal && (
                        <span className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary/70">
                          Interna
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-[12px] text-[var(--wl-text-muted)]">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />
                        {date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {!m.isInternal && (
                        <span className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" strokeWidth={1.75} />
                          {m.email}
                        </span>
                      )}
                    </div>

                    {m.notes && (
                      <p className="mt-1.5 text-[12px] text-[var(--wl-text-placeholder)] line-clamp-1">{m.notes}</p>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="shrink-0 flex items-center gap-2">
                    {m.meetUrl && !isPast && (
                      <a href={m.meetUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-lg bg-primary/15 border border-primary/20 px-3 py-1.5 text-[12px] font-medium text-primary hover:bg-primary/25 transition-colors">
                        <Video className="h-3.5 w-3.5" strokeWidth={1.75} />
                        Unirse
                      </a>
                    )}
                    <a href="/dashboard/calendar"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--wl-text-placeholder)] hover:text-[var(--wl-text-primary)] hover:bg-[var(--wl-hover)] transition-colors">
                      <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
