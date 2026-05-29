'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Hash, Lock, LifeBuoy, Briefcase, ChevronDown, Plus,
  Search, Sparkles, Bell, HelpCircle, X, Menu,
  Pin, Users, MoreHorizontal, SmilePlus, Reply,
  ListPlus, Send, Smile, Paperclip, AtSign, Slash, Mic,
  CheckCheck, Video, Folder
} from 'lucide-react';
import { bus, RT_EVENTS } from '@/lib/event-bus';
import { Avatar } from '@/components/weeklink/avatar';
import { VideoCard, PdfCard, TaskCard, ArchiveCard } from '@/components/weeklink/chat-cards';
import SupportTicket from '@/components/dashboard/SupportTicket';
import type { ChatMessage } from '@/lib/types';

const QUICK_EMOJIS = ['👍','🔥','💜','✅','😂','🎉'];

function getInitials(name: string | null, email: string) {
  return (name || email).split(/[\s@]/)[0].slice(0, 2).toUpperCase();
}

function renderMessage(text: string) {
  return text.split(/(@\w+)/g).map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="rounded-[5px] bg-primary/15 px-1 py-px font-medium text-[#b794f6]">{part}</span>
      : part
  );
}

// ─── Channel List ──────────────────────────────────────────────────────────────
function ChannelList({
  activeId, setActiveId, rooms, clients, members, myId, unreads,
}: {
  activeId: string;
  setActiveId: (id: string) => void;
  rooms: { id: string; name: string; icon: string; subtitle?: string; locked?: boolean }[];
  clients: { id: string; name: string; color?: string }[];
  members: { id: string; name: string | null; email: string; color?: string; image?: string | null }[];
  myId: string;
  unreads: Record<string, number>;
}) {
  const [openClients, setOpenClients] = useState(true);
  const [openDMs, setOpenDMs] = useState(true);

  return (
    <div className="flex h-full w-[244px] shrink-0 flex-col border-r border-white/[0.05] bg-card">
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-4">
        {/* Internal channels */}
        <div className="flex items-center justify-between px-2 pb-1 pt-4">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/40">Canales</span>
          <Plus className="h-3.5 w-3.5 text-white/30 cursor-pointer hover:text-white/60" strokeWidth={2} />
        </div>
        <ul className="flex flex-col gap-0.5">
          {rooms.map(r => {
            const isActive = activeId === r.id;
            const unread = unreads[r.id] || 0;
            const Icon = r.locked ? Lock : r.icon === 'support' ? LifeBuoy : r.icon === 'projects' ? Briefcase : Hash;
            return (
              <li key={r.id}>
                <button onClick={() => setActiveId(r.id)}
                  className={`flex h-9 w-full items-center gap-2 rounded-[10px] px-2.5 text-[13px] transition-colors ${
                    isActive ? 'bg-primary/[0.12] font-medium text-white' : 'text-white/55 hover:bg-white/[0.03] hover:text-white'
                  }`}>
                  {isActive && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary shadow-[0_0_8px_rgba(139,92,246,0.8)]" />}
                  <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-white/35'}`} strokeWidth={1.75} />
                  <span className="flex-1 truncate text-left">{r.name}</span>
                  {unread > 0 && (
                    <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-white shadow-[0_0_8px_rgba(139,92,246,0.5)]">
                      {unread}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Clients */}
        <div className="flex items-center justify-between px-2 pb-1 pt-4">
          <button onClick={() => setOpenClients(!openClients)}
            className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.08em] text-white/40 hover:text-white/60">
            <ChevronDown className={`h-3 w-3 transition-transform ${openClients ? '' : '-rotate-90'}`} strokeWidth={2} />
            Cuentas ({clients.length})
          </button>
        </div>
        {openClients && (
          <ul className="flex flex-col gap-0.5">
            {clients.map(c => {
              const isActive = activeId === c.id;
              const unread = unreads[c.id] || 0;
              return (
                <li key={c.id}>
                  <button onClick={() => setActiveId(c.id)}
                    className={`flex h-9 w-full items-center gap-2 rounded-[10px] px-2 text-[13px] transition-colors ${
                      isActive ? 'bg-primary/[0.12] font-medium text-white' : 'text-white/55 hover:bg-white/[0.03] hover:text-white'
                    }`}>
                    <Avatar initials={(c.name || 'C').slice(0,2).toUpperCase()} color={c.color || '#8b5cf6'} size={20} />
                    <span className="flex-1 truncate text-left">{c.name}</span>
                    {unread > 0 && (
                      <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-white">
                        {unread}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Direct Messages */}
        <div className="flex items-center justify-between px-2 pb-1 pt-4">
          <button onClick={() => setOpenDMs(!openDMs)}
            className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.08em] text-white/40 hover:text-white/60">
            <ChevronDown className={`h-3 w-3 transition-transform ${openDMs ? '' : '-rotate-90'}`} strokeWidth={2} />
            Mensajes directos
          </button>
          <Plus className="h-3.5 w-3.5 text-white/30 cursor-pointer hover:text-white/60" strokeWidth={2} />
        </div>
        {openDMs && (
          <ul className="flex flex-col gap-0.5 max-h-[216px] overflow-y-auto scrollbar-thin">
            {members.filter(m => m.id !== myId).map(m => {
              const dmId = [myId, m.id].sort().join('_DM_');
              const isActive = activeId === dmId;
              const unread = unreads[dmId] || 0;
              const initials = ((m.name || m.email) || 'U').split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase();
              return (
                <li key={m.id}>
                  <button onClick={() => setActiveId(dmId)}
                    className={`flex h-9 w-full items-center gap-2 rounded-[10px] px-2 text-[13px] transition-colors ${
                      isActive ? 'bg-primary/[0.12] font-medium text-white' : 'text-white/55 hover:bg-white/[0.03] hover:text-white'
                    }`}>
                    <div className="relative shrink-0">
                      <Avatar initials={initials} color={m.color || '#8b5cf6'} size={20} />
                      <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-card bg-emerald-400" />
                    </div>
                    <span className="flex-1 truncate text-left">{m.name || m.email}</span>
                    {unread > 0 && (
                      <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-white">
                        {unread}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Apps */}
        <div className="px-2 pb-1 pt-4">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/40">Apps</span>
        </div>
        <ul className="flex flex-col gap-0.5">
          {[
            { id: 'tasks', label: 'Tareas', Icon: CheckCheck },
            { id: 'meetings', label: 'Reuniones', Icon: Video },
            { id: 'files', label: 'Archivos', Icon: Folder },
            { id: 'ai', label: 'AI Assistant', Icon: Sparkles },
          ].map(({ id, label, Icon }) => (
            <li key={id}>
              <button className="flex h-9 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-[13px] text-white/40 transition-colors hover:bg-white/[0.03] hover:text-white/70">
                <Icon className={`h-4 w-4 ${id === 'ai' ? 'text-primary' : 'text-white/30'}`} strokeWidth={1.75} />
                <span>{label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Main Chat ─────────────────────────────────────────────────────────────────
function ChatMain({
  room, title, accentColor, onOpenThread, dmUser,
}: {
  room: string;
  title: string;
  accentColor: string;
  onOpenThread: (msg: ChatMessage) => void;
  dmUser?: { id: string; name: string | null; email: string; color?: string } | null;
}) {
  const { data: session } = useSession();
  const myId = (session?.user as any)?.id;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'messages'|'files'|'pinned'|'tasks'>('messages');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat?room=${encodeURIComponent(room)}`);
      if (res.ok) { const d = await res.json(); setMessages(d.messages || []); }
    } catch {}
    setLoading(false);
  }, [room]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    return bus.on<{ message: ChatMessage; room: string }>(RT_EVENTS.MESSAGE_SENT, (p) => {
      if (p.room === room)
        setMessages(prev => prev.some(m => m.id === p.message.id) ? prev : [...prev, p.message]);
    });
  }, [room]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    const text = input.trim();
    setInput('');
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, room }),
      });
    } catch {}
    setSending(false);
  }

  async function handleReaction(msgId: string, emoji: string) {
    setShowEmoji(null);
    await fetch('/api/chat/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: msgId, emoji }),
    }).catch(() => {});
  }

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-background">
      {/* Channel header */}
      <header className="shrink-0 border-b border-white/[0.05]">
        {dmUser && (
          <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.04] bg-white/[0.01]">
            <div className="relative shrink-0">
              <Avatar initials={((dmUser.name || dmUser.email) || 'U').split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase()} color={dmUser.color || '#8b5cf6'} size={36} />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-400" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-white/95">{dmUser.name || dmUser.email}</p>
              <p className="text-[11px] text-white/30">@{(dmUser.email || '').split('@')[0]} · <span className="text-emerald-400">En línea</span></p>
            </div>
          </div>
        )}
        <div className="flex h-[52px] items-center gap-3 px-5">
          <div className="flex items-center gap-2">
            {dmUser ? (
              <span className="text-[13px] font-medium text-white/40">@</span>
            ) : (
              <Hash className="h-4 w-4 text-white/40" strokeWidth={1.75} />
            )}
            <h1 className="text-[15px] font-semibold tracking-tight">{title}</h1>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-white/35 transition-colors hover:bg-white/[0.04] hover:text-white">
              <Users className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-white/35 transition-colors hover:bg-white/[0.04] hover:text-white">
              <Pin className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-white/35 transition-colors hover:bg-white/[0.04] hover:text-white">
              <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex items-center gap-0 px-4">
          {(['messages','files','pinned','tasks'] as const).map(tab => {
            const labels: Record<string, string> = { messages: 'Messages', files: 'Files', pinned: 'Pinned', tasks: 'Tasks' };
            const isActive = activeTab === tab;
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`relative flex h-9 items-center gap-1.5 px-3 text-[13px] transition-colors ${
                  isActive ? 'text-white' : 'text-white/35 hover:text-white/60'
                }`}>
                {labels[tab]}
                {tab === 'tasks' && (
                  <span className="flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-white/[0.08] px-1 text-[10px] font-medium text-white/50">3</span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-3">
        {loading && (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-white/[0.06] shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 bg-white/[0.06] rounded w-32" />
                  <div className="h-3 bg-white/[0.04] rounded w-64" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-20">
            <span className="text-4xl">💬</span>
            <p className="text-[13px] text-white/30">No hay mensajes aún. ¡Sé el primero!</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isMe = msg.userId === myId;
          const msgDate = new Date(msg.createdAt);
          const prevDate = idx > 0 ? new Date(messages[idx - 1].createdAt) : null;
          const isNewDay = !prevDate || msgDate.toDateString() !== prevDate.toDateString();
          const today = new Date();
          const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
          const dayLabel = msgDate.toDateString() === today.toDateString() ? 'Hoy'
            : msgDate.toDateString() === yesterday.toDateString() ? 'Ayer'
            : msgDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
          const isSame = idx > 0 && messages[idx - 1].userId === msg.userId && !isNewDay;
          const color = (msg.user as any)?.color || accentColor;
          const initials = getInitials((msg.user as any)?.name ?? null, (msg.user as any)?.email ?? '');
          const reactions = (msg.reactions || []).reduce((acc: any[], r: any) => {
            const ex = acc.find((x: any) => x.emoji === r.emoji);
            if (ex) { ex.count++; if (r.userId === myId) ex.mine = true; }
            else acc.push({ emoji: r.emoji, count: 1, mine: r.userId === myId });
            return acc;
          }, []);

          return (
            <div key={msg.id}>
              {isNewDay && (
                <div className="flex items-center gap-3 my-4 px-2">
                  <div className="flex-1 h-px bg-white/[0.05]" />
                  <span className="text-[11px] font-medium text-white/30 px-2">{dayLabel}</span>
                  <div className="flex-1 h-px bg-white/[0.05]" />
                </div>
              )}
            <div className={isSame ? 'mt-0.5' : 'mt-4'}>
              <div className="group relative -mx-2 rounded-xl px-2 transition-colors hover:bg-white/[0.02]"
                style={{ paddingTop: isSame ? '1px' : '8px', paddingBottom: '1px' }}>
                {/* Hover actions */}
                <div className="absolute -top-3 right-2 z-10 hidden items-center rounded-lg border border-white/[0.08] bg-popover p-0.5 shadow-xl group-hover:flex">
                  {[
                    { Icon: SmilePlus, fn: () => setShowEmoji(showEmoji === msg.id ? null : msg.id) },
                    { Icon: Reply, fn: () => onOpenThread(msg) },
                    { Icon: ListPlus, fn: () => {} },
                    { Icon: Pin, fn: () => {} },
                    { Icon: MoreHorizontal, fn: () => {} },
                  ].map(({ Icon, fn }, i) => (
                    <button key={i} onClick={fn}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white">
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  ))}
                </div>

                {/* Emoji picker */}
                {showEmoji === msg.id && (
                  <div className="absolute -top-12 right-2 z-20 flex gap-1 rounded-xl border border-white/[0.08] bg-popover p-2 shadow-2xl">
                    {QUICK_EMOJIS.map(e => (
                      <button key={e} onClick={() => handleReaction(msg.id, e)}
                        className="text-lg p-1 rounded-lg hover:bg-white/[0.06] transition-all hover:scale-125">
                        {e}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  {isSame ? (
                    <div className="w-9 shrink-0 pt-0.5 text-right">
                      <span className="text-[10px] text-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
                        {new Date(msg.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ) : (
                    <Avatar initials={initials} color={color} size={36} className="mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    {!isSame && (
                      <div className="mb-0.5 flex items-baseline gap-2">
                        <span className="text-[13.5px] font-semibold leading-none text-white/95">
                          {(msg.user as any)?.name || (msg.user as any)?.email}
                          {isMe && <span className="ml-1.5 text-[10px] font-normal" style={{ color: accentColor }}>tú</span>}
                        </span>
                        <span className="text-[11px] text-white/30">
                          {new Date(msg.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                    <div className="text-[13.5px] leading-[1.55] text-white/75">
                      {renderMessage(msg.message)}
                    </div>
                    {/* Inline file/task cards */}
                    {msg.fileUrl && msg.fileType?.startsWith('video') && (
                      <div className="mt-2">
                        <VideoCard thumb={msg.fileUrl} name={msg.fileName || 'Video'} meta={msg.fileType} />
                      </div>
                    )}
                    {msg.fileUrl && msg.fileType === 'application/pdf' && (
                      <div className="mt-2">
                        <PdfCard name={msg.fileName || 'Documento'} meta="PDF" />
                      </div>
                    )}
                    {msg.fileUrl && msg.fileType && !msg.fileType.startsWith('video') && msg.fileType !== 'application/pdf' && msg.fileType.startsWith('image') && (
                      <div className="mt-2">
                        <img src={msg.fileUrl} alt={msg.fileName || 'imagen'} className="max-w-[320px] rounded-xl border border-white/[0.08]" />
                      </div>
                    )}
                    {msg.fileUrl && msg.fileType && !msg.fileType.startsWith('video') && msg.fileType !== 'application/pdf' && !msg.fileType.startsWith('image') && (
                      <div className="mt-2">
                        <ArchiveCard name={msg.fileName || 'Archivo'} meta={msg.fileType} />
                      </div>
                    )}
                    {msg.taskId && (
                      <div className="mt-2">
                        <TaskCard title="Tarea vinculada" status="En progreso" due="Pendiente" assignee="--" />
                      </div>
                    )}
                    {reactions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {reactions.map((r: any, i: number) => (
                          <button key={i} onClick={() => handleReaction(msg.id, r.emoji)}
                            className={`flex h-7 items-center gap-1.5 rounded-full border px-2 text-[12px] transition-colors ${
                              r.mine ? 'border-primary/40 bg-primary/15 text-white' : 'border-white/[0.08] bg-white/[0.03] text-white/60 hover:border-white/10'
                            }`}>
                            <span>{r.emoji}</span>
                            <span className="font-medium tabular-nums">{r.count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="flex gap-[3px] items-center">
              {[0,1,2].map(i => (
                <span key={i} className="block h-[6px] w-[6px] rounded-full bg-primary/60"
                  style={{ animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
            <span className="text-[12px] text-white/35">
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'está' : 'están'} escribiendo…
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="px-4 pb-4 pt-1">
        <form onSubmit={handleSend}>
          <div className="rounded-[18px] border border-white/[0.06] bg-white/[0.03] px-2 py-2 transition-colors focus-within:border-primary/40">
            <div className="flex items-center gap-1">
              {[Plus, Smile, AtSign, Slash, Paperclip].map((Icon, i) => (
                <button key={i} type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white/35 transition-colors hover:bg-white/[0.06] hover:text-white">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </button>
              ))}
              <input value={input} onChange={e => setInput(e.target.value)}
                placeholder={`Escribe en #${title}…`}
                className="min-w-0 flex-1 bg-transparent px-2 text-[13.5px] text-white placeholder:text-white/25 focus:outline-none" />
              <button type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-primary transition-colors hover:bg-primary/[0.1]">
                <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </button>
              <button type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/35 transition-colors hover:bg-white/[0.06] hover:text-white">
                <Mic className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </button>
              <button type="submit" disabled={!input.trim() || sending}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white transition-all hover:bg-primary/90 disabled:opacity-30"
                style={{ boxShadow: input.trim() ? `0 0 16px -2px ${accentColor}70` : 'none' }}>
                <Send className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </button>
            </div>
          </div>
          <p className="mt-1 px-2 text-[11px] text-white/20">Enter para enviar · @ para mencionar · / para comandos</p>
        </form>
      </div>
    </section>
  );
}

// ─── Thread Panel ──────────────────────────────────────────────────────────────
function ThreadPanel({ msg, onClose, accentColor }: { msg: ChatMessage; onClose: () => void; accentColor: string }) {
  const color = (msg.user as any)?.color || accentColor;
  const initials = getInitials((msg.user as any)?.name ?? null, (msg.user as any)?.email ?? '');
  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-l border-white/[0.05] bg-[#11131a]">
      <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-white/[0.05] px-5">
        <h2 className="text-[15px] font-semibold tracking-tight">Hilo</h2>
        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/35 transition-colors hover:bg-white/[0.04] hover:text-white">
          <X className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
        {/* Original message */}
        <div className="flex gap-3 pb-4 border-b border-white/[0.05]">
          <Avatar initials={initials} color={color} size={36} className="shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-[13.5px] font-semibold text-white/95">{(msg.user as any)?.name || 'Usuario'}</span>
              <span className="text-[11px] text-white/30">
                {new Date(msg.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-[13.5px] leading-[1.55] text-white/75">{msg.message}</p>
          </div>
        </div>
        <p className="text-[11px] text-white/25 text-center py-6">Los hilos estarán disponibles próximamente 🧵</p>
      </div>
      <div className="px-4 pb-4 pt-1">
        <div className="flex items-center gap-2 rounded-[14px] border border-white/[0.06] bg-white/[0.03] px-3 py-2">
          <input placeholder="Responder en hilo…"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-white placeholder:text-white/25 focus:outline-none" />
          <button className="text-primary"><Send className="h-4 w-4" strokeWidth={1.75} /></button>
        </div>
      </div>
    </aside>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ChatWithChannels() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role ?? '';
  const [activeId, setActiveId] = useState('TEAM');
  const [threadMsg, setThreadMsg] = useState<ChatMessage | null>(null);
  const [accentColor] = useState('#8B5CF6');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreads, setUnreads] = useState<Record<string, number>>({});
  const [clients, setClients] = useState<{ id: string; name: string; color?: string }[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string | null; email: string; color?: string; image?: string | null }[]>([]);

  // Fetch unreads
  useEffect(() => {
    fetch('/api/chat/unread').then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.unreads) setUnreads(d.unreads); }).catch(() => {});
  }, []);

  // Fetch clients
  useEffect(() => {
    if (['CLIENT'].includes(role)) return;
    fetch('/api/clients?sidebar=1').then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.clients) setClients(d.clients); }).catch(() => {});
  }, [role]);
  // Fetch workspace members for DMs
  useEffect(() => {
    fetch('/api/workspace/members?limit=20').then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.members) setMembers(d.members); }).catch(() => {});
  }, []);

  // Listen for new messages → update unreads
  useEffect(() => {
    return bus.on<{ room: string }>(RT_EVENTS.MESSAGE_SENT, (p) => {
      if (p.room !== activeId) {
        setUnreads(prev => ({ ...prev, [p.room]: (prev[p.room] || 0) + 1 }));
      }
    });
  }, [activeId]);

  // Clear unread when switching
  const handleSetActive = (id: string) => {
    setActiveId(id);
    setUnreads(prev => ({ ...prev, [id]: 0 }));
    setThreadMsg(null);
    setMobileOpen(false);
  };

  const isSupport = activeId === 'SUPPORT' && !['ADMIN'].includes(role);

  const rooms = [
    { id: 'TEAM',     name: 'general',   icon: 'hash',     subtitle: 'Equipo interno' },
    { id: 'SUPPORT',  name: 'soporte',   icon: 'support',  subtitle: 'Atención a clientes' },
    { id: 'PROJECTS', name: 'proyectos', icon: 'projects', subtitle: 'Discusión de proyectos' },
    { id: 'PRIVATE',  name: 'privado',   icon: 'hash',     locked: true, subtitle: 'Admin y Project Managers' },
  ].filter(r => {
    if (r.locked && !['ADMIN', 'PROJECT_MANAGER'].includes(role)) return false;
    return true;
  });

  const activeRoom = rooms.find(r => r.id === activeId) || clients.find(c => c.id === activeId);
  const activeDmUser = activeId.includes('_DM_') ? members.find(m => activeId.includes(m.id) && m.id !== (session?.user as any)?.id) ?? null : null;
  const activeTitle = activeDmUser ? (activeDmUser.name || activeDmUser.email) : ((activeRoom as any)?.name || activeId.toLowerCase());

  const channelList = (
    <ChannelList
      activeId={activeId}
      setActiveId={handleSetActive}
      rooms={rooms}
      clients={clients}
      members={members}
      myId={(session?.user as any)?.id ?? ''}
      unreads={unreads}
    />
  );

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* Channel list desktop */}
      <div className="hidden md:flex">{channelList}</div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10">
            <button className="absolute top-3 right-3 text-white/40 hover:text-white z-10" onClick={() => setMobileOpen(false)}>
              <X className="w-4 h-4" />
            </button>
            {channelList}
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05] shrink-0 md:hidden bg-card">
          <button onClick={() => setMobileOpen(true)} className="text-white/50 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <p className="text-sm font-semibold text-white">#{activeTitle}</p>
        </div>

        {isSupport ? (
          <div className="flex-1 overflow-y-auto p-4 bg-background">
            <SupportTicket onClose={() => handleSetActive('TEAM')} />
          </div>
        ) : (
          <ChatMain
            key={activeId}
            room={activeId}
            title={activeTitle}
            accentColor={accentColor}
            onOpenThread={(msg) => setThreadMsg(msg)}
            dmUser={activeDmUser}
          />
        )}
      </div>

      {/* Thread panel */}
      {threadMsg && (
        <div className="hidden lg:flex">
          <ThreadPanel msg={threadMsg} onClose={() => setThreadMsg(null)} accentColor={accentColor} />
        </div>
      )}
    </div>
  );
}
