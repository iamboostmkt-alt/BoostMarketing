'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Send, Smile, Plus, Paperclip, Sparkles, Mic, SmilePlus, Reply, ListPlus, Pin, MoreHorizontal, AtSign, Slash } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { bus, RT_EVENTS } from '@/lib/event-bus';
import type { ChatMessage } from '@/lib/types';
import { Avatar } from './avatar';

function Mention({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-[5px] bg-[#8B5CF6]/15 px-1 py-px font-medium text-[#b794f6]">
      {children}
    </span>
  );
}

function renderMessage(text: string) {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) =>
    part.startsWith('@') ? <Mention key={i}>{part}</Mention> : part
  );
}

function Reactions({ items, onToggle, messageId }: {
  items: { emoji: string; count: number; mine?: boolean }[];
  onToggle: (id: string, emoji: string) => void;
  messageId: string;
}) {
  if (!items?.length) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {items.map((r, i) => (
        <button key={i} onClick={() => onToggle(messageId, r.emoji)}
          className={`flex h-7 items-center gap-1.5 rounded-full border px-2 text-[12px] transition-colors ${
            r.mine
              ? 'border-[#8B5CF6]/40 bg-[#8B5CF6]/15 text-white'
              : 'border-white/[0.08] bg-white/[0.03] text-white/60 hover:border-white/10'
          }`}>
          <span>{r.emoji}</span>
          <span className="font-medium tabular-nums">{r.count}</span>
        </button>
      ))}
      <button className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-white/40 transition-colors hover:border-white/10 hover:text-white">
        <SmilePlus className="h-3.5 w-3.5" strokeWidth={1.75} />
      </button>
    </div>
  );
}

interface Props {
  room?: string;
  title?: string;
  subtitle?: string;
  onOpenThread?: (msg: ChatMessage) => void;
  accentColor?: string;
}

export function WeeklinkChatContent({
  room = 'TEAM',
  title = 'general',
  subtitle = 'Equipo interno',
  onOpenThread,
  accentColor = '#8B5CF6',
}: Props) {
  const { data: session } = useSession();
  const myId = (session?.user as any)?.id;
  const isAdmin = ['ADMIN', 'PROJECT_MANAGER'].includes((session?.user as any)?.role);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    const res = await fetch(`/api/chat?room=${encodeURIComponent(room)}`);
    if (res.ok) {
      const d = await res.json();
      setMessages(d.messages || []);
    }
    setLoading(false);
  }, [room]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return bus.on<{ message: ChatMessage; room: string }>(RT_EVENTS.MESSAGE_SENT, (payload) => {
      if (payload.room === room) {
        setMessages(prev => prev.some(m => m.id === payload.message.id) ? prev : [...prev, payload.message]);
      }
    });
  }, [room]);

  useEffect(() => {
    return bus.on<{ room: string; userName: string; typing: boolean }>('typing', (p) => {
      if (p.room !== room) return;
      setTypingUsers(prev => p.typing ? [...new Set([...prev, p.userName])] : prev.filter(u => u !== p.userName));
    });
  }, [room]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    const text = input.trim();
    setInput('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, room }),
      });
      if (!res.ok) { toast.error('Error al enviar'); setInput(text); }
    } catch { toast.error('Error de conexión'); setInput(text); }
    finally { setSending(false); }
  }

  async function handleReaction(msgId: string, emoji: string) {
    await fetch('/api/chat/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: msgId, emoji }),
    });
  }

  const getInitials = (name: string | null, email: string) =>
    (name || email).split(/[\s@]/)[0].slice(0, 2).toUpperCase();

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ background: 'red', minHeight: '200px' }}>
        <div className="space-y-3 w-full max-w-2xl px-8">
          {[1,2,3].map(i => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-white/[0.06]" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-white/[0.06] rounded w-32" />
                <div className="h-3 bg-white/[0.04] rounded w-64" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0" style={{ background: 'red', minHeight: '200px' }}>
      {/* WEEKLINK_V2 */}
      <div style={{ background: 'lime', border: '4px solid yellow', color: 'white', fontSize: '11px', padding: '2px 8px', textAlign: 'center' }}>✦ WeeklinkChat v2 activo</div>
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-0 custom-scrollbar"
        style={{ scrollbarWidth: 'thin' }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-20">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: `${accentColor}18` }}>
              <span className="text-2xl">💬</span>
            </div>
            <p className="text-[13px] text-white/30">No hay mensajes aún. ¡Sé el primero!</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isMe = msg.userId === myId;
          const isSame = idx > 0 && messages[idx - 1].userId === msg.userId;
          const initials = getInitials(msg.user?.name ?? null, msg.user?.email ?? '');
          const color = msg.user?.color || accentColor;

          return (
            <div key={msg.id} className={isSame ? 'mt-0.5' : 'mt-4'}>
              <div className="group relative -mx-2 rounded-xl px-2 transition-colors hover:bg-white/[0.02]"
                style={{ paddingTop: isSame ? '2px' : '8px', paddingBottom: '2px' }}>
                {/* Hover actions */}
                <div className="absolute -top-3 right-2 z-10 hidden items-center rounded-lg border border-white/[0.08] bg-[#1a1a2e] p-0.5 shadow-xl group-hover:flex"
                  style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                  {[
                    { icon: SmilePlus, label: 'Reaccionar', onClick: () => {} },
                    { icon: Reply, label: 'Hilo', onClick: () => onOpenThread?.(msg) },
                    { icon: ListPlus, label: 'Tarea', onClick: () => {} },
                    { icon: Pin, label: 'Fijar', onClick: () => {} },
                    { icon: MoreHorizontal, label: 'Más', onClick: () => {} },
                  ].map(({ icon: Icon, label, onClick }, i) => (
                    <button key={i} onClick={onClick} title={label}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white">
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  {isSame ? (
                    <div className="w-9 shrink-0 pt-0.5 text-right">
                      <span className="text-[10px] text-white/20 opacity-0 group-hover:opacity-100 transition-opacity leading-none">
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
                          {msg.user?.name || msg.user?.email}
                          {isMe && <span className="ml-1.5 text-[10px] font-normal" style={{ color: accentColor }}>tú</span>}
                        </span>
                        <span className="text-[11px] text-white/30">
                          {new Date(msg.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                    <p className="text-[13.5px] leading-[1.55] text-white/75">
                      {renderMessage(msg.message)}
                    </p>
                    {(msg.reactions?.length ?? 0) > 0 && (
                      <Reactions
                        items={(msg.reactions || []).reduce((acc: any[], r: any) => {
                          const ex = acc.find(x => x.emoji === r.emoji);
                          if (ex) { ex.count++; if (r.userId === myId) ex.mine = true; }
                          else acc.push({ emoji: r.emoji, count: 1, mine: r.userId === myId });
                          return acc;
                        }, [])}
                        onToggle={handleReaction}
                        messageId={msg.id}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing */}
        {typingUsers.length > 0 && (
          <div className="mt-3 flex items-center gap-2 px-2 text-[12px] text-white/35">
            <span className="flex gap-0.5">
              {[0,1,2].map(i => (
                <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/30"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </span>
            {typingUsers[0]} está escribiendo…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="px-4 pb-4 pt-2 shrink-0" style={{ background: 'red', minHeight: '200px' }}>
        <form onSubmit={handleSend}>
          <div className="rounded-[18px] border border-white/[0.06] px-2 py-2 transition-colors"
            style={{ background: 'rgba(255,255,255,0.03)' }}
            onFocus={() => {}} onBlur={() => {}}>
            <div className="flex items-center gap-1">
              {[
                { icon: Plus, label: 'Añadir' },
                { icon: Smile, label: 'Emoji' },
                { icon: AtSign, label: 'Mencionar' },
                { icon: Slash, label: 'Comandos' },
                { icon: Paperclip, label: 'Adjuntar' },
              ].map(({ icon: Icon, label }, i) => (
                <button key={i} type="button" aria-label={label}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white/35 transition-colors hover:bg-white/[0.06] hover:text-white">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </button>
              ))}
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={`Escribe en #${title}…`}
                className="min-w-0 flex-1 bg-transparent px-2 text-[13.5px] text-white placeholder:text-white/25 focus:outline-none"
              />
              <button type="button" aria-label="AI"
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[#8B5CF6]/10"
                style={{ color: accentColor }}>
                <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </button>
              <button type="button" aria-label="Voz"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/35 transition-colors hover:bg-white/[0.06] hover:text-white">
                <Mic className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </button>
              <button type="submit" disabled={!input.trim() || sending} aria-label="Enviar"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white transition-all disabled:opacity-30"
                style={{ background: accentColor, boxShadow: input.trim() ? `0 0 16px -2px ${accentColor}70` : 'none' }}>
                <Send className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </button>
            </div>
          </div>
          <p className="mt-1.5 px-2 text-[11px] text-white/20">
            Enter para enviar · @ para mencionar · / para comandos
          </p>
        </form>
      </div>
    </div>
  );
}
