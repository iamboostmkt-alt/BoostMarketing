'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { bus, RT_EVENTS } from '@/lib/event-bus';
import { useSession } from 'next-auth/react';

// Toasts ricos para eventos importantes del sistema
export function ActivityToastListener() {
  const { data: session } = useSession();
  const myId = (session?.user as any)?.id;

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    // Tarea actualizada — solo si me afecta
    unsubs.push(bus.on(RT_EVENTS.TASK_UPDATED, (payload: any) => {
      if (!payload?.task) return;
      const t = payload.task;
      // Solo mostrar si soy asignado o PM
      if (t.status === 'completed' || t.status === 'approved') {
        toast.custom((toastId) => (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.08] shadow-2xl"
            style={{ background: '#0F1117', minWidth: 320, maxWidth: 400 }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
              style={{ background: 'rgba(34,197,94,0.12)' }}>
              ✅
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white/90">Tarea completada</p>
              <p className="text-[12px] text-white/50 truncate">{t.title}</p>
            </div>
            <button onClick={() => toast.dismiss(toastId)}
              className="text-white/20 hover:text-white/50 transition-colors text-lg leading-none">×</button>
          </div>
        ), { duration: 4000 });
      }
      if (t.status === 'changes_requested') {
        toast.custom((toastId) => (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.08] shadow-2xl"
            style={{ background: '#0F1117', minWidth: 320, maxWidth: 400 }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
              style={{ background: 'rgba(234,179,8,0.12)' }}>
              💬
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white/90">Cambios solicitados</p>
              <p className="text-[12px] text-white/50 truncate">{t.title}</p>
            </div>
            <button onClick={() => toast.dismiss(toastId)}
              className="text-white/20 hover:text-white/50 transition-colors text-lg leading-none">×</button>
          </div>
        ), { duration: 4000 });
      }
    }));

    // Tarea creada y asignada a mí
    unsubs.push(bus.on(RT_EVENTS.TASK_CREATED, (payload: any) => {
      if (!payload?.task) return;
      const t = payload.task;
      if (t.assignedUserId !== myId) return;
      toast.custom((toastId) => (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.08] shadow-2xl"
          style={{ background: '#0F1117', minWidth: 320, maxWidth: 400 }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
            style={{ background: 'rgba(139,92,246,0.12)' }}>
            📌
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white/90">Nueva tarea asignada</p>
            <p className="text-[12px] text-white/50 truncate">{t.title}</p>
          </div>
          <button onClick={() => toast.dismiss(toastId)}
            className="text-white/20 hover:text-white/50 transition-colors text-lg leading-none">×</button>
        </div>
      ), { duration: 5000 });
    }));

    // Mensaje nuevo en chat — solo si no estoy en ese canal
    unsubs.push(bus.on(RT_EVENTS.MESSAGE_SENT, (payload: any) => {
      if (!payload?.message || !payload?.room) return;
      const msg = payload.message;
      if (msg.userId === myId) return; // no mostrar mis propios mensajes
      // Solo mostrar si hay menciones a mí
      const myName = session?.user?.name?.toLowerCase() || '';
      const mentioned = myName && msg.message.toLowerCase().includes(`@${myName.split(' ')[0]}`);
      if (!mentioned) return;
      toast.custom((toastId) => (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.08] shadow-2xl"
          style={{ background: '#0F1117', minWidth: 320, maxWidth: 400 }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: (msg.user?.color || '#8B5CF6') + '22', color: msg.user?.color || '#8B5CF6' }}>
            {(msg.user?.name || '?')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white/90">
              {msg.user?.name || 'Alguien'} te mencionó
            </p>
            <p className="text-[12px] text-white/50 truncate">{msg.message}</p>
          </div>
          <button onClick={() => toast.dismiss(toastId)}
            className="text-white/20 hover:text-white/50 transition-colors text-lg leading-none">×</button>
        </div>
      ), { duration: 5000 });
    }));

    // Notificación nueva — toast para notifs importantes
    unsubs.push(bus.on(RT_EVENTS.NOTIFICATION_NEW, (payload: any) => {
      if (!payload?.userId || payload.userId !== myId) return;
    }));

    return () => unsubs.forEach(u => u());
  }, [myId, session?.user?.name]);

  return null;
}
