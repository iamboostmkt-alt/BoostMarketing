'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Send, SmilePlus, Reply, ListPlus, Pin, MoreHorizontal, Plus, Smile, Paperclip, Sparkles, Mic, AtSign, Slash } from 'lucide-react';

const QUICK_EMOJIS = ['👍','🔥','💜','✅','😂','🎉'];

function getInitials(name: string | null, email: string) {
  return (name || email).split(/[\s@]/)[0].slice(0, 2).toUpperCase();
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
  onOpenThread?: (msg: any) => void;
  accentColor?: string;
}) {
  const { data: session } = useSession();
  const myId = (session?.user as any)?.id;
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Polling simple cada 5s en lugar de realtime (más seguro)
  useEffect(() => {
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

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
      await fetchMessages();
    } catch {}
    setSending(false);
  }

  async function handleReaction(msgId: string, emoji: string) {
    setShowEmoji(null);
    try {
      await fetch('/api/chat/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: msgId, emoji }),
      });
      await fetchMessages();
    } catch {}
  }

  const C = {
    bg: '#07070A',
    surface: '#141824',
    border: 'rgba(255,255,255,0.06)',
    text: 'rgba(255,255,255,0.80)',
    muted: 'rgba(255,255,255,0.35)',
    dim: 'rgba(255,255,255,0.20)',
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: C.bg }}>
      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 4, width: '25%', marginBottom: 8 }} />
                  <div style={{ height: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 4, width: '55%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60, gap: 8 }}>
            <span style={{ fontSize: 32 }}>💬</span>
            <p style={{ color: C.muted, fontSize: 13 }}>No hay mensajes aún</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isMe = msg.userId === myId;
          const isSame = idx > 0 && messages[idx - 1].userId === msg.userId;
          const color = msg.user?.color || accentColor;
          const initials = getInitials(msg.user?.name ?? null, msg.user?.email ?? '');
          const reactions = (msg.reactions || []).reduce((acc: any[], r: any) => {
            const ex = acc.find((x: any) => x.emoji === r.emoji);
            if (ex) { ex.count++; if (r.userId === myId) ex.mine = true; }
            else acc.push({ emoji: r.emoji, count: 1, mine: r.userId === myId });
            return acc;
          }, []);

          return (
            <div key={msg.id} style={{ marginTop: isSame ? 2 : 20 }}>
              <div style={{ position: 'relative', display: 'flex', gap: 12, padding: '2px 8px', borderRadius: 12 }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)';
                  const actions = (e.currentTarget as HTMLDivElement).querySelector('.hover-actions') as HTMLElement;
                  if (actions) actions.style.opacity = '1';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                  const actions = (e.currentTarget as HTMLDivElement).querySelector('.hover-actions') as HTMLElement;
                  if (actions) actions.style.opacity = '0';
                }}>

                {/* Hover actions */}
                <div className="hover-actions" style={{
                  position: 'absolute', top: -14, right: 8, zIndex: 10, opacity: 0,
                  display: 'flex', alignItems: 'center', gap: 2,
                  background: '#1a1a2e', border: `1px solid ${C.border}`,
                  borderRadius: 10, padding: '2px 4px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                  transition: 'opacity 150ms',
                }}>
                  {[
                    { Icon: SmilePlus, fn: () => setShowEmoji(showEmoji === msg.id ? null : msg.id) },
                    { Icon: Reply, fn: () => onOpenThread?.(msg) },
                    { Icon: ListPlus, fn: () => {} },
                    { Icon: Pin, fn: () => {} },
                    { Icon: MoreHorizontal, fn: () => {} },
                  ].map(({ Icon, fn }, i) => (
                    <button key={i} onClick={fn} style={{
                      width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 6, color: C.muted, background: 'transparent', border: 'none', cursor: 'pointer',
                    }}>
                      <Icon size={15} strokeWidth={1.75} />
                    </button>
                  ))}
                </div>

                {/* Emoji picker */}
                {showEmoji === msg.id && (
                  <div style={{
                    position: 'absolute', top: -50, right: 8, zIndex: 20,
                    display: 'flex', gap: 4, background: '#1a1a2e',
                    border: `1px solid ${C.border}`, borderRadius: 12, padding: '6px 8px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                  }}>
                    {QUICK_EMOJIS.map(e => (
                      <button key={e} onClick={() => handleReaction(msg.id, e)}
                        style={{ fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 6 }}>
                        {e}
                      </button>
                    ))}
                  </div>
                )}

                {/* Avatar */}
                {isSame ? (
                  <div style={{ width: 36, flexShrink: 0 }} />
                ) : (
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                    background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 600, color: 'white', overflow: 'hidden',
                  }}>
                    {msg.user?.image
                      ? <img src={msg.user.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      : initials}
                  </div>
                )}

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {!isSame && (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'rgba(255,255,255,0.95)' }}>
                        {msg.user?.name || msg.user?.email}
                        {isMe && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 400, color: accentColor }}>tú</span>}
                      </span>
                      <span style={{ fontSize: 11, color: C.dim }}>
                        {new Date(msg.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                  <p style={{ fontSize: 13.5, lineHeight: 1.55, color: C.text, wordBreak: 'break-word', margin: 0 }}>
                    {msg.message}
                  </p>
                  {reactions.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                      {reactions.map((r: any, i: number) => (
                        <button key={i} onClick={() => handleReaction(msg.id, r.emoji)} style={{
                          display: 'flex', alignItems: 'center', gap: 4, height: 26, padding: '0 8px',
                          borderRadius: 999, border: `1px solid ${r.mine ? accentColor + '44' : C.border}`,
                          background: r.mine ? accentColor + '18' : 'rgba(255,255,255,0.03)',
                          fontSize: 12, color: r.mine ? 'white' : C.muted, cursor: 'pointer',
                        }}>
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
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div style={{ padding: '8px 16px 16px', flexShrink: 0, borderTop: `1px solid ${C.border}` }}>
        <form onSubmit={handleSend}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`,
            borderRadius: 18, padding: '6px 8px',
          }}>
            {[Plus, Smile, AtSign, Slash, Paperclip].map((Icon, i) => (
              <button key={i} type="button" style={{
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 8, color: C.muted, background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0,
              }}>
                <Icon size={18} strokeWidth={1.75} />
              </button>
            ))}
            <input value={input} onChange={e => setInput(e.target.value)}
              placeholder={`Escribe en #${title}…`}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13.5, color: 'white', padding: '0 8px' }} />
            <button type="button" style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, color: accentColor, background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
              <Sparkles size={18} strokeWidth={1.75} />
            </button>
            <button type="button" style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, color: C.muted, background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
              <Mic size={18} strokeWidth={1.75} />
            </button>
            <button type="submit" disabled={!input.trim() || sending} style={{
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 8, background: input.trim() ? accentColor : 'rgba(255,255,255,0.1)',
              color: 'white', border: 'none', cursor: 'pointer', flexShrink: 0,
              boxShadow: input.trim() ? `0 0 16px ${accentColor}44` : 'none',
            }}>
              <Send size={18} strokeWidth={1.75} />
            </button>
          </div>
          <p style={{ marginTop: 4, paddingLeft: 8, fontSize: 11, color: C.dim }}>
            Enter para enviar · @ para mencionar
          </p>
        </form>
      </div>
    </div>
  );
}
