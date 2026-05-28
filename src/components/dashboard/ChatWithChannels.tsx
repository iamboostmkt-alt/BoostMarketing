'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Hash, LifeBuoy, Briefcase, Lock, ChevronDown, ChevronRight, Menu, X, MessageSquare, Pin, FileText, CheckSquare, Palette } from 'lucide-react';
import type { ChatMessage } from '@/lib/types';
import ChatContent from '@/components/dashboard/ChatContent';
import SupportTicket from '@/components/dashboard/SupportTicket';
import { bus, RT_EVENTS } from '@/lib/event-bus';

interface ClientOption { id: string; name: string; company: string; }

const BASE_CHANNELS = [
  { id: 'TEAM',    label: 'general',   hint: 'Equipo interno',           icon: Hash,      iconBg: 'rgba(34,211,238,0.12)',  iconColor: '#67e8f9' },
  { id: 'SUPPORT', label: 'soporte',   hint: 'Atención a clientes',      icon: LifeBuoy,  iconBg: 'rgba(251,191,36,0.12)',  iconColor: '#fcd34d' },
  { id: 'PROJECT', label: 'proyectos', hint: 'Discusión de proyectos',   icon: Briefcase, iconBg: 'rgba(167,139,250,0.12)', iconColor: '#c4b5fd' },
  { id: 'PRIVATE', label: 'privado',   hint: 'Admin y Project Managers', icon: Lock,      iconBg: 'rgba(248,113,113,0.12)', iconColor: '#fca5a5', private: true },
];

export default function ChatWithChannels() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const canPrivate = role === 'ADMIN' || role === 'PROJECT_MANAGER';

  const [activeId,     setActiveId]     = useState('TEAM');
  const [threadMsg,    setThreadMsg]    = useState<ChatMessage | null>(null);
  const [accentColor,  setAccentColor]  = useState('#8B5CF6');
  const ACCENT_COLORS = [
    { label: 'Morado',   value: '#8B5CF6' },
    { label: 'Azul',     value: '#3B82F6' },
    { label: 'Cyan',     value: '#06B6D4' },
    { label: 'Verde',    value: '#10B981' },
    { label: 'Rosa',     value: '#EC4899' },
    { label: 'Naranja',  value: '#F97316' },
  ];
  const [showColors,   setShowColors]   = useState(false);
  const [clients,      setClients]      = useState<ClientOption[]>([]);
  const [showClients,  setShowClients]  = useState(true);
  const [showChannels, setShowChannels] = useState(true);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [unreads,      setUnreads]      = useState<Record<string, number>>({});

  useEffect(() => {
    // Solo managers pueden ver clientes en el chat
    if (canPrivate) {
      fetch('/api/clients?limit=50').then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.clients) setClients(d.clients); });
    }
    fetch('/api/chat/unread').then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.unreads) setUnreads(d.unreads); });

    // Escuchar badges en tiempo real desde ChatContent
    const handleUnread = (e: Event) => {
      const room = (e as CustomEvent).detail?.room;
      if (room) setUnreads(prev => ({ ...prev, [room]: (prev[room] || 0) + 1 }));
    };
    window.addEventListener('chat:unread', handleUnread);
    const isSupport = activeId === 'SUPPORT' && !['ADMIN'].includes(role ?? '');

  return () => window.removeEventListener('chat:unread', handleUnread);
  }, [canPrivate]);

  useEffect(() => {
    const handler = (data: any) => {
      if (data?.room && data.room !== activeId)
        setUnreads(prev => ({ ...prev, [data.room]: (prev[data.room] || 0) + 1 }));
    };
    const unsub = bus.on(RT_EVENTS.MESSAGE_SENT, handler);
    const isSupport = activeId === 'SUPPORT' && !['ADMIN'].includes(role ?? '');

  return () => unsub();
  }, [activeId]);

  const selectChannel = (id: string) => {
    setActiveId(id);
    setMobileOpen(false);
    if (unreads[id]) {
      setUnreads(prev => ({ ...prev, [id]: 0 }));
      fetch('/api/chat/unread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: id }),
      }).catch(() => undefined);
    }
  };

  const activeChannel = BASE_CHANNELS.find(c => c.id === activeId);
  const activeClient  = clients.find(c => c.id === activeId);
  const activeTitle   = activeChannel ? `# ${activeChannel.label}` : (activeClient?.name || activeId);
  const activeSubtitle = activeChannel?.hint || activeClient?.company || '';
  const totalUnread   = Object.values(unreads).reduce((a, b) => a + b, 0);

  const ChannelItem = ({ id, label, hint, icon: Icon, iconBg, iconColor, unread, isActive }: any) => (
    <button
      onClick={() => selectChannel(id)}
      className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-all text-left mb-0.5 ${
        isActive ? 'text-white' : 'text-white/45 hover:text-white/80 hover:bg-white/[0.03]'
      }`}
      style={isActive ? { background: 'rgba(124,58,237,0.18)' } : undefined}
    >
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: iconBg }}>
        <Icon className="w-3.5 h-3.5" style={{ color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium truncate">{label}</p>
        {hint && !isActive && <p className="text-[10px] text-white/25 truncate">{hint}</p>}
      </div>
      {unread > 0 && (
        <span className="shrink-0 h-5 min-w-5 flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
          style={{ background: '#7c3aed' }}>
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  );

  const Sidebar = () => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-white/[0.06] shrink-0 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white/90">Mensajes</p>
          <p className="text-[11px] text-white/30">Tiempo real</p>
        </div>
        {totalUnread > 0 && (
          <span className="h-5 min-w-5 flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
            style={{ background: '#7c3aed' }}>
            {totalUnread}
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 py-3 space-y-4">
        {/* Canales */}
        <div>
          <button onClick={() => setShowChannels(v => !v)}
            className="w-full flex items-center gap-1 px-1 mb-1.5 text-[10px] font-semibold text-white/30 uppercase tracking-widest hover:text-white/50 transition-colors">
            {showChannels ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Canales
          </button>
          {showChannels && BASE_CHANNELS
            .filter(c => !c.private || canPrivate)
            .map(ch => (
              <ChannelItem key={ch.id} {...ch} unread={unreads[ch.id] || 0} isActive={activeId === ch.id} />
            ))
          }
        </div>

        {/* Clientes */}
        {clients.length > 0 && (
          <div>
            <button onClick={() => setShowClients(v => !v)}
              className="w-full flex items-center gap-1 px-1 mb-1.5 text-[10px] font-semibold text-white/30 uppercase tracking-widest hover:text-white/50 transition-colors">
              {showClients ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Clientes ({clients.length})
            </button>
            {showClients && clients.map(c => (
              <button key={c.id} onClick={() => selectChannel(c.id)}
                className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-all text-left mb-0.5 ${
                  activeId === c.id ? 'text-white' : 'text-white/45 hover:text-white/80 hover:bg-white/[0.03]'
                }`}
                style={activeId === c.id ? { background: 'rgba(124,58,237,0.18)' } : undefined}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-bold"
                  style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa' }}>
                  {(c.name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate">{c.name}</p>
                  {c.company && <p className="text-[10px] text-white/25 truncate">{c.company}</p>}
                </div>
                {(unreads[c.id] || 0) > 0 && (
                  <span className="h-5 min-w-5 flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
                    style={{ background: '#7c3aed' }}>
                    {unreads[c.id]}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </nav>
    </div>
  );

  const isSupport = activeId === 'SUPPORT' && !['ADMIN'].includes(role ?? '');

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col shrink-0 border-r border-white/[0.06]"
        style={{ width: 220, background: '#0a0a0f' }}>
        <Sidebar />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 flex flex-col border-r border-white/[0.06]" style={{ background: '#0a0a0f' }}>
            <button className="absolute top-3 right-3 text-white/40 hover:text-white z-10"
              onClick={() => setMobileOpen(false)}>
              <X className="w-4 h-4" />
            </button>
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Panel de mensajes */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header mobile */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] shrink-0 md:hidden"
          style={{ background: '#0a0a0f' }}>
          <button onClick={() => setMobileOpen(true)} className="text-white/50 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <p className="text-sm font-semibold text-white">{activeTitle}</p>
            {activeSubtitle && <p className="text-[11px] text-white/35">{activeSubtitle}</p>}
          </div>
        </div>

        {isSupport ? (
          <div className="flex-1 overflow-y-auto p-4">
            <SupportTicket onClose={() => setActiveId('TEAM')} />
          </div>
        ) : (
          <ChatContent key={activeId} room={activeId} title={activeTitle} subtitle={activeSubtitle} />
        )}
      </div>
    </div>
  );
}
