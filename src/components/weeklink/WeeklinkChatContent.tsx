'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Send, SmilePlus, Reply, ListPlus, Pin, MoreHorizontal, Plus, Smile, Paperclip, Sparkles, Mic, AtSign, Slash } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { bus, RT_EVENTS } from '@/lib/event-bus';
import type { ChatMessage } from '@/lib/types';

const QUICK_EMOJIS = ['👍','🔥','💜','✅','😂','🎉'];

function getInitials(name: string | null, email: string) {
  return (name || email).split(/[\s@]/)[0].slice(0, 2).toUpperCase();
}

function renderMessage(text: string) {
  return text.split(/(@\w+)/g).map((part, i) =>
    part.startsWith('@')
      ? <span key={i} style={{ background: 'rgba(139,92,246,0.15)', color: '#b794f6', borderRadius: 4, padding: '0 4px', fontWeight: 500 }}>{part}</span>
      : part
  );
}

export function WeeklinkChatContent({
  room = 'TEAM',
  title = 'general',
  onOpenThread,
  accentColor = '#8B5CF6',
}: {
  room?: string;
  title?: string;
  subtitle?: string;
  onOpenThread?: (msg: ChatMessage) => void;
  accentColor?: string;
}) {
  const { data: session } = useSession();
  const myId = (session?.user as any)?.id;
  const isAdmin = ['ADMIN', 'PROJECT_MANAGER'].includes((session?.user as any)?.role ?? '');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showEmoji, setShowEmoji] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat?room=${encodeURIComponent(room)}`);
      if (res.ok) {
        const d = await res.json();
        setMessages(d.messages || []);
      }
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
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, room }),
      });
      if (!res.ok) { toast.error('Error al enviar'); setInput(text); }
    } catch { toast.error('Error'); setInput(text); }
    finally { setSending(false); }
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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: '#07070A' }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}
        className="custom-scrollbar">
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 4, width: '30%', marginBottom: 8 }} />
                  <div style={{ height: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 4, width: '60%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, paddingTop: 80 }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, background: `${accentColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>💬</div>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No hay mensajes. ¡Sé el primero!</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isMe = msg.userId === myId;
          const isSame = idx > 0 && messages[idx - 1].userId === msg.userId;
          const initials = getInitials(msg.user?.name ?? null, msg.user?.email ?? '');
          const color = (msg.user as any)?.color || accentColor;
          const reactions = (msg.reactions || []).reduce((acc: any[], r: any) => {
            const ex = acc.find((x: any) => x.emoji === r.emoji);
            if (ex) { ex.count++; if (r.userId === myId) ex.mine = true; }
            else acc.push({ emoji: r.emoji, count: 1, mine: r.userId === myId });
            return acc;
          }, []);

          return (
            <div key={msg.id} style={{ marginTop: isSame ? 2 : 20 }}>
              <div className="group" style={{ position: 'relative', display: 'flex', gap: 12, padding: '2px 8px', borderRadius: 12, transition: 'background 150ms' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                {/* Hover actions */}
                <div className="opacity-0 group-hover:opacity-100" style={{
                  position: 'absolute', top: -14, right: 8, zIndex: 10,
                  display: 'flex', alignItems: 'center', gap: 2,
                  background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, padding: '2px 4px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                  transition: 'opacity 150ms',
                }}>
                  {[
                    { icon: SmilePlus, action: () => setShowEmoji(showEmoji === msg.id ? null : msg.id), title: 'Reaccionar' },
                    { icon: Reply, action: () => onOpenThread?.(msg), title: 'Hilo' },
                    { icon: ListPlus, action: () => {}, title: 'Tarea' },
                    { icon: Pin, action: () => {}, title: 'Fijar' },
                    { icon: MoreHorizontal, action: () => {}, title: 'Más' },
                  ].map(({ icon: Icon, action, title }, i) => (
                    <button key={i} onClick={action} title={title} style={{
                      width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 6, color: 'rgba(255,255,255,0.4)', background: 'transparent', border: 'none', cursor: 'pointer',
                      transition: 'background 120ms, color 120ms',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLButtonElement).style.color = 'white'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)'; }}>
                      <Icon size={15} strokeWidth={1.75} />
                    </button>
                  ))}
                </div>

                {/* Emoji picker */}
                {showEmoji === msg.id && (
                  <div style={{ position: 'absolute', top: -52, right: 8, zIndex: 20, display: 'flex', gap: 4,
                    background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '6px 8px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
                    {QUICK_EMOJIS.map(e => (
                      <button key={e} onClick={() => handleReaction(msg.id, e)}
                        style={{ fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 6, transition: 'transform 120ms' }}
                        onMouseEnter={ev => (ev.currentTarget.style.transform = 'scale(1.3)')}
                        onMouseLeave={ev => (ev.currentTarget.style.transform = 'scale(1)')}>
                        {e}
                      </button>
                    ))}
                  </div>
                )}

                {/* Avatar */}
                {isSame ? (
                  <div style={{ width: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <span className="opacity-0 group-hover:opacity-100" style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', transition: 'opacity 150ms' }}>
                      {new Date(msg.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                    background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 600, color: 'white', overflow: 'hidden' }}>
                    {(msg.user as any)?.image
                      ? <img src={(msg.user as any).image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : initials}
                  </div>
                )}

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {!isSame && (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'rgba(255,255,255,0.95)' }}>
                        {(msg.user as any)?.name || (msg.user as any)?.email}
                        {isMe && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 400, color: accentColor }}>tú</span>}
                      </span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                        {new Date(msg.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                  <p style={{ fontSize: 13.5, lineHeight: 1.55, color: 'rgba(255,255,255,0.78)', wordBreak: 'break-word' }}>
                    {renderMessage(msg.message)}
                  </p>
                  {reactions.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                      {reactions.map((r: any, i: number) => (
                        <button key={i} onClick={() => handleReaction(msg.id, r.emoji)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, height: 26, padding: '0 8px',
                            borderRadius: 999, border: `1px solid ${r.mine ? `${accentColor}44` : 'rgba(255,255,255,0.08)'}`,
                            background: r.mine ? `${accentColor}18` : 'rgba(255,255,255,0.03)',
                            fontSize: 12, color: r.mine ? 'white' : 'rgba(255,255,255,0.6)',
                            cursor: 'pointer', transition: 'all 120ms' }}>
                          <span>{r.emoji}</span>
                          <span style={{ fontWeight: 600 }}>{r.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {typingUsers.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px 0', color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
            <span style={{ display: 'flex', gap: 3 }}>
              {[0,1,2].map(i => (
                <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.3)',
                  animation: 'bounce 1.2s infinite', animationDelay: `${i*0.15}s` }} />
              ))}
            </span>
            {typingUsers[0]} está escribiendo…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div style={{ padding: '8px 16px 16px', background: '#07070A', flexShrink: 0 }}>
        <form onSubmit={handleSend}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 18, padding: '6px 8px', transition: 'border-color 200ms' }}
            onFocus={() => {}} onBlur={() => {}}>
            {[
              { icon: Plus, label: 'Añadir' },
              { icon: Smile, label: 'Emoji' },
              { icon: AtSign, label: 'Mencionar' },
              { icon: Slash, label: 'Comandos' },
              { icon: Paperclip, label: 'Adjuntar' },
            ].map(({ icon: Icon, label }) => (
              <button key={label} type="button" title={label} style={{
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 8, color: 'rgba(255,255,255,0.35)', background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLButtonElement).style.color = 'white'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)'; }}>
                <Icon size={18} strokeWidth={1.75} />
              </button>
            ))}
            <input value={input} onChange={e => setInput(e.target.value)}
              placeholder={`Escribe en #${title}…`}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontSize: 13.5, color: 'white', padding: '0 8px' }} />
            <button type="button" title="AI" style={{
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 8, color: accentColor, background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
              <Sparkles size={18} strokeWidth={1.75} />
            </button>
            <button type="button" title="Voz" style={{
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 8, color: 'rgba(255,255,255,0.35)', background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
              <Mic size={18} strokeWidth={1.75} />
            </button>
            <button type="submit" disabled={!input.trim() || sending} title="Enviar" style={{
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 8, background: input.trim() ? accentColor : 'rgba(255,255,255,0.1)',
              color: 'white', border: 'none', cursor: input.trim() ? 'pointer' : 'default', flexShrink: 0,
              transition: 'background 200ms', boxShadow: input.trim() ? `0 0 16px ${accentColor}44` : 'none' }}>
              <Send size={18} strokeWidth={1.75} />
            </button>
          </div>
          <p style={{ marginTop: 6, paddingLeft: 8, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
            Enter para enviar · @ para mencionar · / para comandos
          </p>
        </form>
      </div>
    </div>
  );
}
