"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { useSession } from "next-auth/react";
import { bus, RT_EVENTS } from "@/lib/event-bus";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Bell, CheckSquare, Users, UserCircle, Info, Calendar, Check, Activity, MessageSquare, AtSign, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Notification {
  id: string;
  userId: string;
  message: string;
  type: string;
  read: boolean;
  link: string | null;
  createdAt: string;
}

const typeIcons: Record<string, React.ElementType> = {
  task:             CheckSquare,
  contact:          Users,
  client:           UserCircle,
  appointment:      Calendar,
  welcome:          Bell,
  info:             Info,
  activity:         Activity,
  activity_comment: MessageSquare,
  mention:          AtSign,
};

const typeColors: Record<string, string> = {
  task:             "text-[#38BDF8]",
  contact:          "text-brand-light",
  client:           "text-green-400",
  appointment:      "text-orange-400",
  welcome:          "text-brand-light",
  info:             "text-amber-400",
  activity:         "text-purple-400",
  activity_comment: "text-sky-400",
  mention:          "text-pink-400",
};

export function NotificationsDropdown() {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [open,          setOpen]          = useState(false);
  const fetchingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch("/api/notifications", { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // silent fail
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  useEffect(() => {
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  useEffect(() => {
    return bus.on(RT_EVENTS.NOTIFICATION_NEW, () => fetchNotifications());
  }, [fetchNotifications]);

  // Supabase Realtime
  useEffect(() => {
    if (!userId) return;
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    const channel = supabase
      .channel('notifications-' + userId)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: 'user_id=eq.' + userId,
        },
        () => { fetchNotifications(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchNotifications]);



  // Cerrar al click fuera
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch { /* silent */ }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch { /* silent */ }
  };

  const deleteRead = async () => {
    try {
      const res = await fetch("/api/notifications", { method: "DELETE" });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => !n.read));
      }
    } catch { /* silent */ }
  };

  const handleClick = (notification: Notification) => {
    if (!notification.read) markAsRead(notification.id);
    if (notification.link) {
      setOpen(false);
      router.push(notification.link);
    }
  };

  const [activeTab, setActiveTab] = useState<'all'|'mentions'|'tasks'|'system'>('all');

  const tabs = [
    { id: 'all' as const,      label: 'Todo',      count: unreadCount },
    { id: 'mentions' as const, label: 'Menciones', count: notifications.filter(n => !n.read && n.type === 'mention').length },
    { id: 'tasks' as const,    label: 'Tareas',    count: notifications.filter(n => !n.read && n.type === 'task').length },
    { id: 'system' as const,   label: 'Sistema',   count: notifications.filter(n => !n.read && ['welcome','info','lead'].includes(n.type)).length },
  ];

  const filtered = notifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'mentions') return n.type === 'mention';
    if (activeTab === 'tasks') return n.type === 'task';
    if (activeTab === 'system') return ['welcome','info','lead','file'].includes(n.type);
    return true;
  });

  const typeEmoji: Record<string, string> = {
    task: '✅', mention: '💬', meeting: '📅', appointment: '🎥',
    lead: '🎯', welcome: '👋', info: 'ℹ️', file: '📎',
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button type="button" onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-0.5 rounded-full text-[9px] font-bold text-white"
            style={{ background: '#8B5CF6', boxShadow: '0 0 8px rgba(139,92,246,0.5)' }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-[9999] overflow-hidden rounded-2xl border border-white/[0.06] shadow-2xl"
          style={{ width: 380, background: '#0F1117', boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 20px 60px rgba(0,0,0,0.6)' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <span className="text-[15px] font-semibold text-white/90">Notificaciones</span>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button type="button" onClick={markAllAsRead}
                  className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.05] transition-colors" title="Marcar todo como leído">
                  <Check className="w-3.5 h-3.5" />
                </button>
              )}
              {notifications.some(n => n.read) && (
                <button type="button" onClick={deleteRead}
                  className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-white/[0.05] transition-colors" title="Limpiar leídas">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-4 pb-3 border-b border-white/[0.05]">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === tab.id ? 'text-white' : 'text-white/40 hover:text-white/70'
                }`}
                style={activeTab === tab.id ? { background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' } : { border: '1px solid transparent' }}>
                {tab.label}
                {tab.count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${activeTab === tab.id ? 'bg-violet-500/30 text-violet-200' : 'bg-white/[0.08] text-white/40'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* List */}
          <ScrollArea className="max-h-80">
            {loading ? (
              <div className="space-y-1 p-2">
                {[1,2,3].map(i => (
                  <div key={i} className="flex items-start gap-3 px-3 py-3">
                    <div className="w-9 h-9 rounded-full bg-white/[0.06] animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-3 bg-white/[0.06] rounded animate-pulse w-4/5" />
                      <div className="h-2.5 bg-white/[0.04] rounded animate-pulse w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Bell className="w-8 h-8 text-white/15" />
                <p className="text-sm text-white/30">Sin notificaciones</p>
              </div>
            ) : (
              <div className="py-1">
                {filtered.map((n, idx) => {
                  const emoji = typeEmoji[n.type] || 'ℹ️';
                  const timeAgo = formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: es });
                  const isLast = idx === filtered.length - 1;
                  return (
                    <button key={n.id} type="button" onClick={() => handleClick(n)}
                      className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-all group ${!n.read ? '' : 'opacity-60'}`}
                      style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      {/* Avatar/emoji */}
                      <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-base"
                        style={{ background: n.read ? 'rgba(255,255,255,0.05)' : 'rgba(139,92,246,0.12)' }}>
                        {emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] leading-snug ${n.read ? 'text-white/50' : 'text-white/88'}`}>
                          {n.message}
                        </p>
                        <p className="text-[11px] text-white/30 mt-1">{timeAgo}</p>
                      </div>
                      {/* Dot no leído */}
                      {!n.read && (
                        <div className="mt-1.5 w-2 h-2 rounded-full shrink-0"
                          style={{ background: '#8B5CF6', boxShadow: '0 0 6px rgba(139,92,246,0.6)' }} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-white/[0.05]">
            <button type="button" onClick={() => { setOpen(false); router.push('/dashboard'); }}
              className="w-full text-[12px] text-white/30 hover:text-violet-400 transition-colors text-center">
              Ver todas las notificaciones →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
