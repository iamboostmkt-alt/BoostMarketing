'use client';

import { useEffect, useState, useCallback } from 'react';
import { bus, RT_EVENTS } from '@/lib/event-bus';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bell, CheckSquare, Users, UserCircle, Info, Calendar, Check, ExternalLink, Activity, MessageSquare, AtSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  task: CheckSquare,
  contact: Users,
  client: UserCircle,
  appointment: Calendar,
  welcome: Bell,
  info: Info,
  activity: Activity,
  activity_comment: MessageSquare,
  mention: AtSign,
};

const typeColors: Record<string, string> = {
  task: 'text-cyan-400',
  contact: 'text-brand-light',
  client: 'text-green-400',
  appointment: 'text-orange-400',
  welcome: 'text-brand-light',
  info: 'text-amber-400',
  activity: 'text-purple-400',
  activity_comment: 'text-sky-400',
  mention: 'text-pink-400',
};

export function NotificationsDropdown() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || data || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Live updates — re-fetch when a notification is created for any user
  // (the API already filters by session, so this is safe)
  useEffect(() => {
    return bus.on(RT_EVENTS.NOTIFICATION_NEW, () => {
      fetchNotifications();
    });
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      // silent fail
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch {
      // silent fail
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-white/60 hover:text-white hover:bg-white/[0.06]"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-80 bg-[#15151c] border-white/[0.06] text-white"
        align="end"
        forceMount
      >
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificaciones</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-0.5 px-2 text-xs text-brand-light hover:text-brand-light hover:bg-white/[0.06]"
              onClick={markAllAsRead}
            >
              <Check className="w-3 h-3 mr-1" />
              Marcar todas
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/[0.06]" />
        <ScrollArea className="max-h-72">
          <DropdownMenuGroup>
            {loading ? (
              <div className="space-y-2 px-1.5 py-2">
                {Array.from({ length: 3 }).map((_, i) => (
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
              notifications.map((notification) => {
                const Icon = typeIcons[notification.type] || Info;
                const color = typeColors[notification.type] || 'text-white/40';

                return (
                  <DropdownMenuItem
                    key={notification.id}
                    className={`flex items-start gap-3 p-3 cursor-pointer focus:bg-white/[0.04] ${
                      !notification.read ? 'bg-white/[0.02]' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="mt-0.5">
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm leading-snug ${
                          notification.read ? 'text-white/50' : 'text-white/90'
                        }`}
                      >
                        {notification.message}
                      </p>
                      <p className="text-xs text-white/30 mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="mt-1.5 w-2 h-2 rounded-full bg-brand shrink-0" />
                    )}
                  </DropdownMenuItem>
                );
              })
            )}
          </DropdownMenuGroup>
        </ScrollArea>
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator className="bg-white/[0.06]" />
            <DropdownMenuItem
              className="text-center justify-center text-brand-light text-sm cursor-pointer focus:bg-white/[0.04] focus:text-brand-light"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Ver todas
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
