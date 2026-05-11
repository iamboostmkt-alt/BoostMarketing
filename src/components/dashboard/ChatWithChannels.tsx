'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Hash, LifeBuoy, Users as UsersIcon, Briefcase, Lock, ChevronDown, ChevronRight, Building2 } from 'lucide-react';
import ChatContent from '@/components/dashboard/ChatContent';

type ChannelType = 'TEAM' | 'SUPPORT' | 'PROJECT' | 'PRIVATE' | 'CLIENT';

interface Channel {
  id:       string;            // The room key used by ChatContent
  type:     ChannelType;
  label:    string;
  hint?:    string;
  icon:     React.ElementType;
  iconBg:   string;
  iconText: string;
}

interface ClientOption {
  id:      string;
  name:    string;
  company: string;
}

const BASE_CHANNELS: Channel[] = [
  { id: 'TEAM',    type: 'TEAM',    label: 'general',  hint: 'Equipo interno',         icon: Hash,      iconBg: 'bg-cyan-400/15',   iconText: 'text-cyan-300' },
  { id: 'SUPPORT', type: 'SUPPORT', label: 'soporte',  hint: 'Atención a clientes',    icon: LifeBuoy,  iconBg: 'bg-amber-400/15',  iconText: 'text-amber-300' },
  { id: 'PROJECT', type: 'PROJECT', label: 'proyectos', hint: 'Discusión de proyectos', icon: Briefcase, iconBg: 'bg-purple-400/15', iconText: 'text-purple-300' },
  { id: 'PRIVATE', type: 'PRIVATE', label: 'privado',  hint: 'Solo administración',    icon: Lock,      iconBg: 'bg-red-400/15',    iconText: 'text-red-300' },
];

export default function ChatWithChannels() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const [activeId,    setActiveId]    = useState<string>('TEAM');
  const [clients,     setClients]     = useState<ClientOption[]>([]);
  const [showClients, setShowClients] = useState(true);

  // Hide PRIVATE channel for non-admins
  const channels = BASE_CHANNELS.filter((c) => c.type !== 'PRIVATE' || isAdmin);

  useEffect(() => {
    fetch('/api/clients')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setClients(d?.clients ?? []))
      .catch(() => {});
  }, []);

  const activeBase = channels.find((c) => c.id === activeId);
  const activeClient = !activeBase ? clients.find((c) => c.id === activeId) : null;

  const activeTitle    = activeBase?.label
    ? `# ${activeBase.label}`
    : activeClient
      ? `# ${activeClient.name}`
      : '# chat';
  const activeSubtitle = activeBase?.hint
    ?? (activeClient ? `Cliente · ${activeClient.company || activeClient.name}` : '');

  return (
    <div className="flex h-[calc(100vh-7rem)] max-h-[820px] bg-[#0e0e14] rounded-2xl border border-white/[0.06] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-white/[0.06] bg-[#0a0a10] flex flex-col">
        <div className="px-4 py-4 border-b border-white/[0.06]">
          <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Canales</p>
          <p className="text-[11px] text-white/30 mt-0.5">Espacios del equipo</p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
          {/* Base channels */}
          <div className="px-2 space-y-0.5">
            {channels.map((ch) => {
              const Icon  = ch.icon;
              const isActive = ch.id === activeId;
              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveId(ch.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-left ${
                    isActive
                      ? 'bg-brand/20 text-white'
                      : 'text-white/55 hover:bg-white/[0.04] hover:text-white/80'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${ch.iconBg}`}>
                    <Icon className={`w-3.5 h-3.5 ${ch.iconText}`} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ch.label}</p>
                    {ch.hint && (
                      <p className="text-[10px] text-white/35 truncate">{ch.hint}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Client rooms */}
          {clients.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowClients((p) => !p)}
                className="w-full flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-semibold text-white/40 uppercase tracking-wider hover:text-white/70 transition-colors"
              >
                {showClients
                  ? <ChevronDown className="w-3 h-3" />
                  : <ChevronRight className="w-3 h-3" />
                }
                Clientes ({clients.length})
              </button>
              {showClients && (
                <div className="px-2 space-y-0.5 mt-1">
                  {clients.map((c) => {
                    const isActive = c.id === activeId;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setActiveId(c.id)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-left ${
                          isActive
                            ? 'bg-brand/20 text-white'
                            : 'text-white/55 hover:bg-white/[0.04] hover:text-white/80'
                        }`}
                      >
                        <span className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-emerald-400/15">
                          <Building2 className="w-3.5 h-3.5 text-emerald-300" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{c.name}</p>
                          {c.company && (
                            <p className="text-[10px] text-white/35 truncate">{c.company}</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-white/[0.06] text-[10px] text-white/25 flex items-center gap-1.5">
          <UsersIcon className="w-3 h-3" />
          Mensajes en tiempo real
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 px-5 py-4 overflow-hidden">
        <ChatContent
          key={activeId}
          room={activeId}
          title={activeTitle}
          subtitle={activeSubtitle}
        />
      </main>
    </div>
  );
}
