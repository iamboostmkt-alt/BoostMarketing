'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Send, Trash2, MessageSquare, Smile, Users, Plus, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ChatMessage, ChatReaction } from '@/lib/types';
import { bus, RT_EVENTS } from '@/lib/event-bus';

// ── Constants ──────────────────────────────────────────────────────────────────

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '✅', '👀', '🎉', '😮', '🙌', '💯'];

interface TeamUser {
  id:    string;
  name:  string | null;
  email: string;
  color: string;
  role:  string;
}

// Special broadcast targets
const SPECIAL_MENTIONS: TeamUser[] = [
  { id: '__all__',   name: 'todos',   email: '', color: '#f59e0b', role: 'BROADCAST' },
  { id: '__team__',  name: 'equipo',  email: '', color: '#06b6d4', role: 'TEAM'      },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(name: string | null, email: string): string {
  if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return email.slice(0, 2).toUpperCase();
}

function renderMessage(text: string) {
  const parts = text.split(/(@\S+)/g);
  return parts.map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="text-brand-light font-medium bg-brand/10 rounded px-0.5">{part}</span>
      : <span key={i}>{part}</span>
  );
}

function groupReactions(reactions: ChatReaction[] = []) {
  const map = new Map<string, { count: number; users: string[] }>();
  for (const r of reactions) {
    const entry = map.get(r.emoji) ?? { count: 0, users: [] };
    entry.count += 1;
    entry.users.push(r.user.name ?? '?');
    map.set(r.emoji, entry);
  }
  return [...map.entries()];
}

// ── Emoji picker ───────────────────────────────────────────────────────────────

function EmojiPicker({ onSelect }: { onSelect: (e: string) => void }) {
  return (
    <div className="absolute bottom-full right-0 mb-2 flex gap-1 bg-[#1c1c26] border border-[var(--wl-border)] rounded-xl p-2 shadow-xl z-50">
      {QUICK_EMOJIS.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => onSelect(e)}
          className="text-lg hover:scale-125 transition-transform p-0.5"
        >
          {e}
        </button>
      ))}
    </div>
  );
}

// ── Reaction bar ───────────────────────────────────────────────────────────────

function ReactionBar({
  messageId, reactions, myId, onToggle,
}: {
  messageId: string;
  reactions:  ChatReaction[];
  myId:       string;
  onToggle:   (messageId: string, emoji: string) => void;
}) {
  const groups = groupReactions(reactions);
  if (groups.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1.5 ml-11">
      {groups.map(([emoji, { count, users }]) => {
        const iMine = reactions.some((r) => r.emoji === emoji && r.userId === myId);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onToggle(messageId, emoji)}
            title={users.join(', ')}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors
              ${iMine
                ? 'bg-brand/30 border border-brand/50 text-white'
                : 'bg-white/[0.05] border border-[var(--wl-border)] text-[var(--wl-text-secondary)] hover:bg-white/[0.08]'
              }`}
          >
            {emoji}
            <span className="font-medium">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Mention dropdown ───────────────────────────────────────────────────────────

function MentionDropdown({
  items,
  selectedIndex,
  onSelect,
}: {
  items:         TeamUser[];
  selectedIndex: number;
  onSelect:      (user: TeamUser) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  return (
    <div
      ref={listRef}
      className="absolute bottom-full left-0 right-0 mb-1 bg-[#1c1c26] border border-white/[0.10] rounded-xl shadow-2xl z-50 overflow-hidden max-h-48 overflow-y-auto"
    >
      {items.map((user, i) => {
        const label = user.name || user.email;
        const isSpecial = user.id.startsWith('__');
        return (
          <button
            key={user.id}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onSelect(user); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
              i === selectedIndex
                ? 'bg-brand/25 text-white'
                : 'text-[var(--wl-text-secondary)] hover:bg-white/[0.05] hover:text-white'
            }`}
          >
            {isSpecial ? (
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-base shrink-0"
                style={{ backgroundColor: user.color + '22', border: `1px solid ${user.color}44` }}
              >
                {user.id === '__all__' ? '📢' : '👥'}
              </span>
            ) : (
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                style={{ backgroundColor: user.color + '33', color: user.color }}
              >
                {getInitials(user.name, user.email)}
              </span>
            )}
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium block truncate">@{label}</span>
              {!isSpecial && (
                <span className="text-[10px] text-white/30">{user.role.toLowerCase()}</span>
              )}
            </div>
            {isSpecial && (
              <span className="text-[10px] text-white/30 shrink-0">
                {user.id === '__all__' ? 'todos' : 'equipo'}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface ChatContentProps {
  room?:        string;
  portalMode?:  boolean;
  title?:       string;
  subtitle?:    string;
  onOpenThread?: (msg: ChatMessage) => void;
  accentColor?:  string;
}

export default function ChatContent({
  room         = 'TEAM',
  portalMode   = false,
  title        = 'Chat del Equipo',
  subtitle     = 'Solo para el equipo interno · tiempo real',
  onOpenThread,
  accentColor  = '#8B5CF6',
}: ChatContentProps) {
  const { data: session } = useSession();
  const myId    = (session?.user as { id?: string })?.id ?? '';
  const isAdmin = session?.user?.role === 'ADMIN';

  const [messages,    setMessages]    = useState<ChatMessage[]>([]);
  const [input,       setInput]       = useState('');
  const [sending,     setSending]     = useState(false);
  const [emojiOpen,   setEmojiOpen]   = useState(false);
  const [teamUsers,   setTeamUsers]   = useState<TeamUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [taskMsg,     setTaskMsg]     = useState<string | null>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // @mention state
  const [mentionQuery,  setMentionQuery]  = useState<string | null>(null);
  const [mentionIndex,  setMentionIndex]  = useState(0);

  const bottomRef       = useRef<HTMLDivElement>(null);
  const inputRef        = useRef<HTMLInputElement>(null);
  const prevLengthRef   = useRef(0);
  const emojiRef        = useRef<HTMLDivElement>(null);
  const scrollRef       = useRef<HTMLDivElement>(null);
  const firstUnreadRef  = useRef<HTMLDivElement>(null);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [initialScroll, setInitialScroll] = useState(false);

  // ── Fetch team users for @mention picker ─────────────────────────────────
  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.users) {
          setTeamUsers(
            (d.users as TeamUser[]).filter((u) => u.role !== 'CLIENT')
          );
        }
      })
      .catch(() => {});
  }, []);

  // ── Filtered mention list ─────────────────────────────────────────────────
  const filteredMentions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    const specials = SPECIAL_MENTIONS.filter(
      (s) => s.name!.startsWith(q) || q === ''
    );
    const users = teamUsers.filter((u) =>
      (u.name?.toLowerCase().includes(q)) || u.email.toLowerCase().includes(q)
    );
    return [...specials, ...users].slice(0, 8);
  }, [mentionQuery, teamUsers]);

  // ── Messages ──────────────────────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    try {
      const res  = await fetch(`/api/chat?room=${encodeURIComponent(room)}${portalMode ? '&portalMode=1' : ''}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch { /* silent */ }
  }, [room]);

  useEffect(() => {
    setInitialScroll(false);
    setUnreadCount(0);
    fetch('/api/chat/unread')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.unreads?.[room]) setUnreadCount(d.unreads[room]); });
  }, [room]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  useEffect(() => {
    return bus.on<{ message: ChatMessage; room: string }>(RT_EVENTS.MESSAGE_SENT, (payload) => {
      if (payload.room !== room) {
        // Actualizar badge en ChatWithChannels via evento custom
        window.dispatchEvent(new CustomEvent('chat:unread', { detail: { room: payload.room } }));
        return;
      }
      setMessages((prev) => {
        if (prev.some((m) => m.id === payload.message.id)) return prev;
        return [...prev, payload.message];
      });
    });
  }, [room]);

  // Escuchar typing de otros
  useEffect(() => {
    return bus.on<{ room: string; typing: boolean; name: string }>(RT_EVENTS.PRESENCE_UPDATED, (payload) => {
      if (payload.room !== room) return;
      setTypingUsers(prev =>
        payload.typing
          ? prev.includes(payload.name) ? prev : [...prev, payload.name]
          : prev.filter(n => n !== payload.name)
      );
    });
  }, [room]);

  // Scroll al primer no leído al cargar — luego scroll al fondo en mensajes nuevos
  useEffect(() => {
    if (messages.length === 0) return;
    if (!initialScroll) {
      setInitialScroll(true);
      if (unreadCount > 0 && firstUnreadRef.current) {
        firstUnreadRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        bottomRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
      }
      return;
    }
    if (messages.length > prevLengthRef.current) {
      const el = scrollRef.current;
      const atBottom = el ? el.scrollHeight - el.scrollTop - el.clientHeight < 120 : true;
      if (atBottom) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevLengthRef.current = messages.length;
  }, [messages, initialScroll, unreadCount]);

  useEffect(() => {
    if (!emojiOpen) return;
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setEmojiOpen(false);
      }
    };
    document.addEventListener('mousedown', handler as EventListener);
    document.addEventListener('touchstart', handler as EventListener, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handler as EventListener);
      document.removeEventListener('touchstart', handler as EventListener);
    };
  }, [emojiOpen]);

  // ── @mention detection ────────────────────────────────────────────────────
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value  = e.target.value;
    setInput(value);

    // Emitir "está escribiendo" via Supabase Realtime (otros usuarios)
    fetch('/api/chat/typing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room, typing: true }) }).catch(() => {});
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      fetch('/api/chat/typing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room, typing: false }) }).catch(() => {});
    }, 2000);

    const cursor = e.target.selectionStart ?? value.length;
    const before = value.slice(0, cursor);
    const match  = before.match(/@(\w*)$/);

    if (match) {
      setMentionQuery(match[1]);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  }

  function insertMention(user: TeamUser) {
    const cursor = inputRef.current?.selectionStart ?? input.length;
    const before = input.slice(0, cursor);
    const after  = input.slice(cursor);
    const label  = user.id === '__all__' ? 'all' : (user.name ?? user.email).replace(/\s+/g, '');
    const newBefore = before.replace(/@\w*$/, `@${label} `);
    setInput(newBefore + after);
    setMentionQuery(null);
    setTimeout(() => {
      inputRef.current?.focus();
      const pos = newBefore.length;
      inputRef.current?.setSelectionRange(pos, pos);
    }, 0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (mentionQuery !== null && filteredMentions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((i) => Math.min(i + 1, filteredMentions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredMentions[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as unknown as React.FormEvent);
    }
  }

  // ── Send / delete / react ─────────────────────────────────────────────────
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setMentionQuery(null);
    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: text, room }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const { message: newMsg } = await res.json();
      setInput('');
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al enviar.');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/chat?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar.');
    }
  }

  async function handleReaction(messageId: string, emoji: string) {
    try {
      const res = await fetch('/api/chat/reactions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messageId, emoji }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await fetchMessages();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al reaccionar.');
    }
  }

  function handleEmojiInsert(emoji: string) {
    setInput((prev) => prev + emoji);
    setEmojiOpen(false);
    setMentionQuery(null);
    inputRef.current?.focus();
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)] md:h-[calc(100vh-10rem)] md:max-h-[780px] w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 md:pb-4 border-b border-[var(--wl-border)] mb-3 md:mb-4 shrink-0 px-1">
        <div className="w-9 h-9 rounded-xl bg-brand/20 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-brand-light" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white">{title}</h1>
          <p className="text-xs text-[var(--wl-text-muted)]">{subtitle}</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar min-h-0 px-2 py-4" style={{ background: 'var(--wl-bg)' }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-white/20" />
            </div>
            <p className="text-[var(--wl-text-muted)] text-sm">
              No hay mensajes aún.<br />¡Sé el primero en escribir!
            </p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const firstUnreadIdx = unreadCount > 0 ? messages.length - unreadCount : -1;
          const isFirstUnread = idx === firstUnreadIdx;
          const isMe   = msg.userId === myId;
          const isSame = idx > 0 && messages[idx - 1].userId === msg.userId;

          return (
            <div key={msg.id} className={isSame ? 'mt-0.5' : 'mt-5'}>
              {isFirstUnread && (
                <div ref={firstUnreadRef} className="flex items-center gap-2 my-3 px-1">
                  <div className="flex-1 h-px bg-violet-500/30" />
                  <span className="text-[10px] font-medium text-violet-400/70 whitespace-nowrap">
                    {unreadCount} mensaje{unreadCount !== 1 ? 's' : ''} nuevo{unreadCount !== 1 ? 's' : ''}
                  </span>
                  <div className="flex-1 h-px bg-violet-500/30" />
                </div>
              )}
              <div className="flex items-start gap-3 group px-3 py-0.5 rounded-xl transition-all duration-150 relative"
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                style={{ background: 'transparent' }}>
                {/* Hover actions flotantes */}
                <div className="absolute right-3 -top-3.5 opacity-0 group-hover:opacity-100 transition-all duration-150 z-10 flex items-center gap-0.5 rounded-lg border border-[var(--wl-border)] px-1 py-0.5"
                  style={{ background: 'var(--wl-elevated)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                  <button type="button" onClick={() => { const el = document.getElementById(`epicker-${msg.id}`); el?.click(); }}
                    className="p-1.5 rounded-md text-[var(--wl-text-muted)] hover:text-white hover:bg-[var(--wl-hover)] transition-colors" title="Reaccionar">
                    <Smile className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => onOpenThread?.(msg)}
                    className="p-1.5 rounded-md text-[var(--wl-text-muted)] hover:text-white hover:bg-[var(--wl-hover)] transition-colors" title="Ver hilo">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => setTaskMsg(msg.message)}
                    className="p-1.5 rounded-md text-[var(--wl-text-muted)] hover:text-white hover:bg-[var(--wl-hover)] transition-colors" title="Crear tarea">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  {(isMe || isAdmin) && (
                    <button type="button" onClick={() => handleDelete(msg.id)}
                      className="p-1.5 rounded-md text-[var(--wl-text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Eliminar">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {!isSame ? (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5 overflow-hidden ring-1 ring-white/[0.06]"
                    style={{ backgroundColor: msg.user.color || '#7c3aed' }}>
                    {msg.user.image
                      ? <img src={msg.user.image} alt="" className="w-full h-full object-cover" />
                      : getInitials(msg.user.name, msg.user.email)}
                  </div>
                ) : (
                  <div className="w-8 shrink-0 flex items-center justify-center">
                    <span className="text-[10px] text-white/15 opacity-0 group-hover:opacity-100 transition-opacity leading-none">
                      {new Date(msg.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {!isSame && (
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-[13px] font-semibold text-white/95 tracking-[-0.01em]">
                        {msg.user.name || msg.user.email}
                        {isMe && <span className="ml-1.5 text-[10px] font-normal" style={{ color: accentColor }}>tú</span>}
                      </span>
                      <span className="text-[11px] text-white/25">
                        {new Date(msg.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                  <p className="text-[13.5px] text-[var(--wl-text-secondary)] break-words leading-[1.55] font-[400]">
                    {renderMessage(msg.message)}
                  </p>
                </div>
                {/* Emoji picker inline */}
                <div className="relative hidden" id={`epicker-${msg.id}`}>
                  <button type="button" className="p-1 rounded text-white/20">
                    <Smile className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {(msg.reactions?.length ?? 0) > 0 && (
                <ReactionBar
                  messageId={msg.id}
                  reactions={msg.reactions ?? []}
                  myId={myId}
                  onToggle={handleReaction}
                />
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Indicador está escribiendo */}
      {typingUsers.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-1 text-[11px] text-white/35 italic shrink-0">
          <div className="flex gap-0.5 items-end">
            {[0,1,2].map(i => (
              <span key={i} className="w-1 h-1 rounded-full bg-white/30 animate-bounce"
                style={{ animationDelay: `${i*0.15}s` }} />
            ))}
          </div>
          {typingUsers.length === 1
            ? `${typingUsers[0]} está escribiendo...`
            : `${typingUsers.slice(0,-1).join(', ')} y ${typingUsers.at(-1)} están escribiendo...`}
        </div>
      )}

      {/* Modal crear tarea desde mensaje */}
      {taskMsg && (
        <div className="mx-3 mb-2 p-3 rounded-xl border border-violet-500/30 shrink-0" style={{ background: 'rgba(124,58,237,0.08)' }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-violet-300 flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5" />Crear tarea
            </span>
            <button onClick={() => setTaskMsg(null)} className="text-white/30 hover:text-[var(--wl-text-secondary)] text-xs">✕</button>
          </div>
          <p className="text-[11px] text-white/50 mb-2 line-clamp-2">"{taskMsg}"</p>
          <div className="flex gap-2">
            <button onClick={async () => {
              try {
                const res = await fetch('/api/tasks', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ title: taskMsg.slice(0,100), description: `Desde chat:\n${taskMsg}`, status: 'pending', priority: 'medium', visibility: 'internal', workspaceId: (session?.user as any)?.workspaceId }),
                });
                if (res.ok) { toast.success('Tarea creada ✓'); setTaskMsg(null); }
                else toast.error('Error al crear tarea');
              } catch { toast.error('Error'); }
            }} className="flex-1 py-1.5 rounded-lg text-white text-[11px] font-medium" style={{ background: '#7c3aed' }}>
              Crear tarea
            </button>
            <button onClick={() => setTaskMsg(null)} className="px-3 py-1.5 rounded-lg text-[var(--wl-text-muted)] text-[11px] border border-[var(--wl-border)] hover:text-white">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Input + @mention dropdown */}
          <form onSubmit={handleSend} className="shrink-0 pb-[env(safe-area-inset-bottom)] px-4 py-3 border-t border-[var(--wl-border-subtle)]" style={{ background: 'var(--wl-surface)' }}>
        <div className="relative">
          {/* @mention dropdown */}
          {mentionQuery !== null && filteredMentions.length > 0 && (
            <MentionDropdown
              items={filteredMentions}
              selectedIndex={mentionIndex}
              onSelect={insertMention}
            />
          )}

          <div className="flex items-center gap-2 bg-white/[0.04] border border-[var(--wl-border)] rounded-xl px-4 py-2 focus-within:border-brand/50 transition-colors">
            {/* Emoji insert button */}
            <div className="relative" ref={emojiRef}>
              <button
                type="button"
                onClick={() => setEmojiOpen((o) => !o)}
                className="text-white/30 hover:text-[var(--wl-text-secondary)] transition-colors p-0.5"
                title="Insertar emoji"
              >
                <Smile className="w-4 h-4" />
              </button>
              {emojiOpen && <EmojiPicker onSelect={handleEmojiInsert} />}
            </div>

            <input
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje… escribe @ para mencionar"
              maxLength={2000}
              disabled={sending}
              autoComplete="off"
              className="flex-1 bg-transparent text-white placeholder:text-white/25 text-sm outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="p-1.5 rounded-lg bg-brand hover:bg-brand-dark text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
            <p className="hidden md:flex text-[11px] text-white/20 mt-1.5 ml-1 items-center gap-3">
          <span>Enter para enviar</span>
          <span className="flex items-center gap-1">
            <Users className="w-2.5 h-2.5" />
            @ para mencionar · ↑↓ navegar · Tab/Enter seleccionar
          </span>
        </p>
      </form>
    </div>
  );
}
