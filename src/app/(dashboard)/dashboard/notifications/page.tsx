'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bell, Check, Trash2, ArrowLeft, CheckSquare, Calendar, Users, MessageSquare, AtSign, Info } from 'lucide-react';

interface Notification {
  id: string;
  message: string;
  type: string;
  read: boolean;
  link: string | null;
  createdAt: string;
  actorName?: string | null;
  actorImage?: string | null;
}

const typeEmoji: Record<string, string> = {
  task: '✅', mention: '@', meeting: '📅', appointment: '🎥',
  lead: '🎯', welcome: '👋', info: 'ℹ️', file: '📎',
  message: '💬', invite: '✉️',
};

const typeLabel: Record<string, string> = {
  task: 'Tarea', mention: 'Mención', meeting: 'Reunión',
  appointment: 'Videollamada', lead: 'Prospecto', welcome: 'Bienvenida',
  info: 'Sistema', file: 'Archivo', message: 'Mensaje', invite: 'Invitación',
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'task' | 'message' | 'system'>('all');

  const fetchAll = useCallback(async () => {
    const res = await fetch('/api/notifications?limit=100');
    if (res.ok) {
      const d = await res.json();
      setNotifications(d.notifications || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // NO auto-marcar al entrar — el usuario debe hacer clic o usar el botón

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  };

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteRead = async () => {
    await fetch('/api/notifications', { method: 'DELETE' });
    setNotifications(prev => prev.filter(n => !n.read));
  };

  const filtered = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    if (filter === 'task') return n.type === 'task';
    if (filter === 'message') return ['mention','message'].includes(n.type);
    if (filter === 'system') return ['welcome','info','invite','file'].includes(n.type);
    return true;
  });

  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => { setUnreadCount(notifications.filter(n => !n.read).length); }, [notifications]);

  const filters = [
    { id: 'all' as const,     label: 'Todas',      count: notifications.length },
    { id: 'unread' as const,  label: 'Sin leer',   count: unreadCount },
    { id: 'task' as const,    label: 'Tareas',     count: notifications.filter(n => n.type === 'task').length },
    { id: 'message' as const, label: 'Mensajes',   count: notifications.filter(n => ['mention','message'].includes(n.type)).length },
    { id: 'system' as const,  label: 'Sistema',    count: notifications.filter(n => ['welcome','info','invite','file'].includes(n.type)).length },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()}
          className="flex items-center justify-center w-9 h-9 rounded-xl border border-white/[0.06] text-white/40 hover:text-white hover:bg-white/[0.04] transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-[20px] font-semibold text-white">Notificaciones</h1>
          {unreadCount > 0 && (
            <p className="text-[12px] text-white/40">{unreadCount} sin leer</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] text-[12px] text-white/40 hover:text-violet-400 hover:border-violet-500/20 transition-colors">
              <Check className="w-3.5 h-3.5" />
              Marcar todo leído
            </button>
          )}
          {notifications.some(n => n.read) && (
            <button onClick={deleteRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] text-[12px] text-white/40 hover:text-red-400 hover:border-red-500/20 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-none">
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all ${
              filter === f.id
                ? 'text-white'
                : 'text-white/40 hover:text-white/70 border border-white/[0.06]'
            }`}
            style={filter === f.id ? { background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)', color: '#fff' } : {}}>
            {f.label}
            {f.count > 0 && (
              <span className={`rounded-full px-1.5 text-[10px] font-bold ${filter === f.id ? 'bg-violet-500/30 text-violet-200' : 'bg-white/[0.08] text-white/40'}`}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.03] animate-pulse">
              <div className="w-10 h-10 rounded-full bg-white/[0.06] shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-white/[0.06] rounded w-3/4" />
                <div className="h-2.5 bg-white/[0.04] rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center">
            <Bell className="w-8 h-8 text-white/20" />
          </div>
          <p className="text-[15px] font-medium text-white/40">Sin notificaciones</p>
          <p className="text-[13px] text-white/25">Las notificaciones aparecerán aquí</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map(n => {
            const emoji = typeEmoji[n.type] || 'ℹ️';
            const label = typeLabel[n.type] || 'Aviso';
            const timeAgo = formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: es });
            return (
              <button key={n.id} type="button"
                onClick={() => {
                  markRead(n.id);
                  if (n.link) router.push(n.link);
                }}
                className={`w-full flex items-start gap-3.5 p-4 rounded-2xl text-left transition-all border ${
                  !n.read
                    ? 'border-violet-500/15 bg-violet-500/[0.05] hover:bg-violet-500/[0.08]'
                    : 'border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04] opacity-70'
                }`}>
                {/* Avatar */}
                <div className="relative w-10 h-10 shrink-0">
                  {n.actorImage ? (
                    <>
                      <img src={n.actorImage} alt={n.actorName || ''} className="w-10 h-10 rounded-full object-cover" />
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px]"
                        style={{ background: '#0F1117', border: '1.5px solid rgba(255,255,255,0.08)' }}>
                        {emoji}
                      </span>
                    </>
                  ) : n.actorName ? (
                    <>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-semibold text-white"
                        style={{ background: !n.read ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.10)' }}>
                        {n.actorName.split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase()}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px]"
                        style={{ background: '#0F1117', border: '1.5px solid rgba(255,255,255,0.08)' }}>
                        {emoji}
                      </span>
                    </>
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-[16px]"
                      style={{ background: !n.read ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.05)' }}>
                      {emoji}
                    </div>
                  )}
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: !n.read ? '#a78bfa' : 'rgba(255,255,255,0.3)' }}>
                      {label}
                    </span>
                    {!n.read && (
                      <span className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: '#8B5CF6', boxShadow: '0 0 6px rgba(139,92,246,0.6)' }} />
                    )}
                  </div>
                  <p className={`text-[13px] leading-snug ${!n.read ? 'text-white/90' : 'text-white/55'}`}>
                    {n.message}
                  </p>
                  <p className="text-[11px] text-white/30 mt-1.5 flex items-center gap-1.5">
                    <span>{new Date(n.createdAt).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    <span className="text-white/15">·</span>
                    <span>{new Date(n.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-white/15">·</span>
                    <span>{timeAgo}</span>
                  </p>
                </div>

                {/* Flecha si tiene link */}
                {n.link && (
                  <div className="text-white/20 mt-1 shrink-0">
                    <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
