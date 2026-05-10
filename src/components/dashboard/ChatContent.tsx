'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Send, Trash2, MessageSquare, Smile } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ChatMessage, ChatReaction } from '@/lib/types';

// ── Constants ──────────────────────────────────────────────────────────────────

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '✅', '👀', '🎉', '😮', '🙌', '💯'];

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(name: string | null, email: string): string {
  if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return email.slice(0, 2).toUpperCase();
}

// Parse message text and return JSX with @mentions highlighted
function renderMessage(text: string) {
  const parts = text.split(/(@\S+)/g);
  return parts.map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="text-brand-light font-medium">{part}</span>
      : <span key={i}>{part}</span>
  );
}

// Group reactions by emoji → count + who reacted
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
    <div className="absolute bottom-full right-0 mb-2 flex gap-1 bg-[#1c1c26] border border-white/[0.08] rounded-xl p-2 shadow-xl z-50">
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

// ── Message reactions bar ──────────────────────────────────────────────────────

function ReactionBar({
  messageId,
  reactions,
  myId,
  onToggle,
}: {
  messageId: string;
  reactions: ChatReaction[];
  myId: string;
  onToggle: (messageId: string, emoji: string) => void;
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
                : 'bg-white/[0.05] border border-white/[0.08] text-white/60 hover:bg-white/[0.08]'
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

// ── Main component ─────────────────────────────────────────────────────────────

interface ChatContentProps {
  room?: string; // "TEAM" (default) or a clientId
  title?: string;
  subtitle?: string;
}

export default function ChatContent({
  room = 'TEAM',
  title = 'Chat del Equipo',
  subtitle = 'Solo para el equipo interno · actualiza cada 5s',
}: ChatContentProps) {
  const { data: session } = useSession();
  const myId    = (session?.user as { id?: string })?.id ?? '';
  const isAdmin = session?.user?.role === 'ADMIN';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState('');
  const [sending, setSending]   = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const bottomRef     = useRef<HTMLDivElement>(null);
  const inputRef      = useRef<HTMLInputElement>(null);
  const prevLengthRef = useRef(0);
  const emojiRef      = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res  = await fetch(`/api/chat?room=${encodeURIComponent(room)}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch {
      // silent — polling retries
    }
  }, [room]);

  useEffect(() => {
    fetchMessages();
    const id = setInterval(fetchMessages, 5_000);
    return () => clearInterval(id);
  }, [fetchMessages]);

  useEffect(() => {
    if (messages.length > prevLengthRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevLengthRef.current = messages.length;
  }, [messages]);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!emojiOpen) return;
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setEmojiOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [emojiOpen]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: text, room }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setInput('');
      await fetchMessages();
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
      // Optimistic update → re-fetch to get server truth
      await fetchMessages();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al reaccionar.');
    }
  }

  function handleEmojiInsert(emoji: string) {
    setInput((prev) => prev + emoji);
    setEmojiOpen(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as unknown as React.FormEvent);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-h-[780px]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-white/[0.06] mb-4 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-brand/20 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-brand-light" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white">{title}</h1>
          <p className="text-xs text-white/40">{subtitle}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-white/20" />
            </div>
            <p className="text-white/40 text-sm">
              No hay mensajes aún.<br />¡Sé el primero en escribir!
            </p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isMe   = msg.userId === myId;
          const isSame = idx > 0 && messages[idx - 1].userId === msg.userId;

          return (
            <div key={msg.id} className={isSame ? 'mt-0.5' : 'mt-3'}>
              <div className={`flex items-start gap-3 group px-2 py-1 rounded-lg hover:bg-white/[0.03] transition-colors`}>
                {/* Avatar */}
                {!isSame ? (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5 overflow-hidden"
                    style={{ backgroundColor: msg.user.color || '#7c3aed' }}
                  >
                    {msg.user.image
                      ? <img src={msg.user.image} alt="" className="w-full h-full object-cover" />
                      : getInitials(msg.user.name, msg.user.email)}
                  </div>
                ) : (
                  <div className="w-8 shrink-0" />
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {!isSame && (
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-white truncate">
                        {msg.user.name || msg.user.email}
                        {isMe && <span className="text-brand-light ml-1 font-normal text-xs">(tú)</span>}
                      </span>
                      <span className="text-[11px] text-white/30 shrink-0">
                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: es })}
                      </span>
                    </div>
                  )}
                  <p className="text-sm text-white/80 break-words leading-relaxed">
                    {renderMessage(msg.message)}
                  </p>
                </div>

                {/* Actions — reaction picker + delete */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 self-start mt-0.5">
                  <div className="relative" ref={emojiRef}>
                    <button
                      type="button"
                      onClick={() => setEmojiOpen((o) => !o)}
                      className="p-1 rounded text-white/20 hover:text-white/70 hover:bg-white/[0.08]"
                      title="Reaccionar"
                    >
                      <Smile className="w-3.5 h-3.5" />
                    </button>
                    {/* Per-message inline picker */}
                    <div className="absolute bottom-full right-0 mb-1 hidden group-hover:flex gap-1 bg-[#1c1c26] border border-white/[0.08] rounded-xl p-1.5 shadow-xl z-50 flex-wrap max-w-[200px]">
                      {QUICK_EMOJIS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => handleReaction(msg.id, e)}
                          className="text-base hover:scale-125 transition-transform p-0.5"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                  {(isMe || isAdmin) && (
                    <button
                      type="button"
                      onClick={() => handleDelete(msg.id)}
                      className="p-1 rounded text-white/20 hover:text-red-400 hover:bg-red-400/10"
                      title="Eliminar mensaje"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Reactions */}
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

      {/* Input */}
      <form onSubmit={handleSend} className="mt-4 shrink-0">
        <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2 focus-within:border-brand/50 transition-colors">
          {/* Emoji button */}
          <div className="relative" ref={emojiRef}>
            <button
              type="button"
              onClick={() => setEmojiOpen((o) => !o)}
              className="text-white/30 hover:text-white/70 transition-colors p-0.5"
              title="Insertar emoji"
            >
              <Smile className="w-4 h-4" />
            </button>
            {emojiOpen && <EmojiPicker onSelect={handleEmojiInsert} />}
          </div>

          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje... usa @nombre para mencionar"
            maxLength={2000}
            disabled={sending}
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
        <p className="text-[11px] text-white/20 mt-1.5 ml-1">
          Enter para enviar · @nombre para mencionar · @all para todos
        </p>
      </form>
    </div>
  );
}
