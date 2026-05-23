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
  const userId = (session?.user as any)?.id;
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

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-md text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#15151c] border border-white/[0.06] rounded-xl shadow-2xl z-[9999] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <span className="text-sm font-semibold text-white">Notificaciones</span>
            <div className="flex gap-1">
              {unreadCount > 0 && (
                <button type="button" onClick={markAllAsRead}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-brand-light hover:bg-white/[0.06] transition-colors">
                  <Check className="w-3 h-3" />
                  Leer todas
                </button>
              )}
              {notifications.some(n => n.read) && (
                <button type="button" onClick={deleteRead}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-white/30 hover:text-red-400 hover:bg-white/[0.06] transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <ScrollArea className="max-h-72">
            {loading ? (
              <div className="space-y-2 px-3 py-3">
                {[1,2,3].map(i => (
                  <div key={i} className="flex items-start gap-3 p-2">
                    <div className="w-4 h-4 rounded bg-white/[0.06] animate-pulse mt-0.5" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-white/[0.06] rounded animate-pulse w-4/5" />
                      <div className="h-2.5 bg-white/[0.04] rounded animate-pulse w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bell className="w-8 h-8 text-white/20 mb-2" />
                <p className="text-sm text-white/40">No hay notificaciones</p>
              </div>
            ) : (
              <div className="py-1">
                {notifications.map(notification => {
                  const Icon  = typeIcons[notification.type] || Info;
                  const color = typeColors[notification.type] || "text-white/40";
                  return (
                    <button key={notification.id} type="button"
                      onClick={() => handleClick(notification)}
                      className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors text-left ${!notification.read ? "bg-white/[0.02]" : ""}`}>
                      <div className="mt-0.5 shrink-0">
                        <Icon className={`w-4 h-4 ${color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${notification.read ? "text-white/50" : "text-white/90"}`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-white/30 mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: es })}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="mt-1.5 w-2 h-2 rounded-full bg-brand shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
