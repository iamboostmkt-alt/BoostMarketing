'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Trash2, MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { ActivityComment } from '@/lib/types';

const POLL_MS  = 5_000;
const MAX_LEN  = 1000;

interface ActivityCommentThreadProps {
  activityId:      string;
  currentUserId:   string;
  currentUserRole: string;
}

function relativeTime(iso: string) {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60_000) return 'ahora';
    if (diff < 86_400_000) {
      return formatDistanceToNow(d, { addSuffix: true, locale: es });
    }
    return format(d, "d MMM · HH:mm", { locale: es });
  } catch { return ''; }
}

function initials(name: string | null, email: string) {
  return (name || email).split(/[\s@]/).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function ActivityCommentThread({
  activityId,
  currentUserId,
  currentUserRole,
}: ActivityCommentThreadProps) {
  const [comments,  setComments]  = useState<ActivityComment[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [sending,   setSending]   = useState(false);
  const [message,   setMessage]   = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);
  const isFirstLoad = useRef(true);

  const fetchComments = useCallback(async (silent = false) => {
    try {
      const res = await fetch(`/api/activity-comments?activityId=${activityId}`);
      if (!res.ok) return;
      const data = await res.json();
      setComments((prev) => {
        const next = data.comments ?? [];
        // Only auto-scroll on new messages
        if (!silent && next.length !== prev.length) {
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
        return next;
      });
    } catch { /* silent */ } finally {
      if (!silent) setLoading(false);
    }
  }, [activityId]);

  // Initial fetch + scroll
  useEffect(() => {
    setLoading(true);
    setComments([]);
    isFirstLoad.current = true;
    fetchComments().then(() => {
      isFirstLoad.current = false;
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' }), 80);
    });
  }, [activityId, fetchComments]);

  // 5s polling
  useEffect(() => {
    const id = setInterval(() => fetchComments(true), POLL_MS);
    return () => clearInterval(id);
  }, [fetchComments]);

  async function handleSend() {
    const text = message.trim();
    if (!text) return;
    if (text.length > MAX_LEN) { toast.error(`Máximo ${MAX_LEN} caracteres`); return; }

    setSending(true);
    try {
      const res = await fetch('/api/activity-comments', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ activityId, message: text }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Error al enviar');
      }
      setMessage('');
      await fetchComments();
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      inputRef.current?.focus();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al enviar el comentario');
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/activity-comments?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Error al eliminar');
      }
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeletingId(null);
    }
  }

  const canDelete = (comment: ActivityComment) =>
    comment.userId === currentUserId || currentUserRole === 'ADMIN';

  return (
    <div className="flex flex-col" style={{ minHeight: 0 }}>
      {/* Section label */}
      <div className="flex items-center gap-2 px-1 pb-2 border-b border-white/[0.06]">
        <MessageSquare className="w-3.5 h-3.5 text-brand-light shrink-0" />
        <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
          Comentarios
        </span>
        {!loading && comments.length > 0 && (
          <span className="ml-auto text-[10px] text-white/25">{comments.length}</span>
        )}
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-3 space-y-3" style={{ maxHeight: 260 }}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-brand-light/60 animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <MessageSquare className="w-8 h-8 text-white/10" />
            <p className="text-xs text-white/25">
              Sin comentarios. ¡Sé el primero en escribir!
            </p>
          </div>
        ) : (
          comments.map((c) => {
            const isOwn = c.userId === currentUserId;
            return (
              <div key={c.id} className={`flex gap-2.5 group ${isOwn ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                  <AvatarImage src={c.user.image ?? undefined} />
                  <AvatarFallback
                    className="text-[9px] font-semibold"
                    style={{
                      backgroundColor: (c.user.color || '#7c3aed') + '33',
                      color:            c.user.color || '#7c3aed',
                    }}
                  >
                    {initials(c.user.name, c.user.email)}
                  </AvatarFallback>
                </Avatar>

                {/* Bubble */}
                <div className={`flex flex-col gap-1 max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] text-white/35 ${isOwn ? 'order-last' : ''}`}>
                      {c.user.name || c.user.email}
                    </span>
                    <span className="text-[9px] text-white/20">{relativeTime(c.createdAt)}</span>
                  </div>
                  <div className={`relative rounded-xl px-3 py-2 text-sm leading-relaxed ${
                    isOwn
                      ? 'bg-brand/25 text-white rounded-tr-sm'
                      : 'bg-white/[0.06] text-white/80 rounded-tl-sm'
                  }`}>
                    <p className="whitespace-pre-wrap break-words">{c.message}</p>

                    {/* Delete button — appears on hover */}
                    {canDelete(c) && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={deletingId === c.id}
                        className={`absolute -top-2 ${isOwn ? '-left-2' : '-right-2'} w-5 h-5 rounded-full bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 disabled:opacity-50`}
                      >
                        {deletingId === c.id
                          ? <Loader2 className="w-2.5 h-2.5 text-white animate-spin" />
                          : <Trash2  className="w-2.5 h-2.5 text-white" />
                        }
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="pt-3 border-t border-white/[0.06] flex gap-2 items-end">
        <textarea
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un comentario… (Enter para enviar)"
          maxLength={MAX_LEN}
          rows={2}
          disabled={sending}
          className="flex-1 resize-none rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/20 px-3 py-2 focus:outline-none focus:border-brand/50 focus:bg-white/[0.06] transition-colors disabled:opacity-50"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={sending || !message.trim()}
          className="h-10 w-10 shrink-0 bg-brand hover:bg-brand-dark text-white disabled:opacity-40"
        >
          {sending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Send     className="w-4 h-4" />
          }
        </Button>
      </div>
      {message.length > MAX_LEN * 0.85 && (
        <p className={`text-[10px] mt-1 text-right ${message.length >= MAX_LEN ? 'text-red-400' : 'text-white/25'}`}>
          {message.length}/{MAX_LEN}
        </p>
      )}
    </div>
  );
}
