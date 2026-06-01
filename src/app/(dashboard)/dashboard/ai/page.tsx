'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Send, Sparkles, Plus, Trash2, MessageSquare, ChevronLeft } from 'lucide-react';

type ModelTier = 'pro' | 'medium' | 'free' | 'turbo';
interface Message { role: 'user' | 'assistant'; content: string; }
interface AiSession { id: string; title: string; model: string; updatedAt: string; }

const MODEL_OPTIONS: { tier: ModelTier; label: string; badge: string; color: string }[] = [
  { tier: 'pro',    label: 'Claude Sonnet 4', badge: 'PRO',   color: '#8B5CF6' },
  { tier: 'medium', label: 'DeepSeek V3',      badge: 'MED',   color: '#3B82F6' },
  { tier: 'free',   label: 'Gemini 2.0 Flash', badge: 'FREE',  color: '#10B981' },
  { tier: 'turbo',  label: 'Llama 3.3 70B',    badge: 'TURBO', color: '#F59E0B' },
];

const SUGGESTIONS = [
  'Propón una estrategia de contenido para Instagram esta semana',
  '¿Qué tareas están pendientes o atrasadas?',
  'Redacta 3 captions para redes sociales',
  'Dame un plan de contenido para los próximos 7 días',
  'Sugiere mejoras para aumentar el engagement',
  'Analiza qué tipo de contenido funciona mejor',
];

export default function AIAssistantPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelTier>('turbo');
  const [usedModel, setUsedModel] = useState('');
  const [sessions, setSessions] = useState<AiSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/sessions');
      const data = await res.json();
      if (data.sessions) setSessions(data.sessions);
    } catch {} finally { setLoadingSessions(false); }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function loadSession(s: AiSession) {
    try {
      const res = await fetch(`/api/ai/sessions?id=${s.id}`);
      const data = await res.json();
      if (data.session?.messages) {
        setMessages(data.session.messages as Message[]);
        setSelectedModel(data.session.model as ModelTier);
      }
    } catch {}
    setCurrentSessionId(s.id);
    setUsedModel('');
  }

  async function saveSession(msgs: Message[], model: ModelTier, sessionId: string | null) {
    const title = msgs[0]?.content?.slice(0, 50) || 'Nueva conversación';
    if (sessionId) {
      await fetch('/api/ai/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sessionId, messages: msgs, model }),
      });
    } else {
      const res = await fetch('/api/ai/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, messages: msgs, model }),
      });
      const data = await res.json();
      if (data.session) {
        setCurrentSessionId(data.session.id);
        setSessions(prev => [data.session, ...prev]);
        return data.session.id;
      }
    }
    fetchSessions();
    return sessionId;
  }

  async function deleteSession(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/ai/sessions?id=${id}`, { method: 'DELETE' });
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) { setMessages([]); setCurrentSessionId(null); }
  }

  async function sendMessage(text?: string) {
    const userMsg = (text ?? input).trim();
    if (!userMsg || loading) return;
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, model: selectedModel }),
      });
      const data = await res.json();
      if (data.content) {
        const finalMessages: Message[] = [...newMessages, { role: 'assistant', content: data.content }];
        setMessages(finalMessages);
        setUsedModel(data.model ?? '');
        const sid = await saveSession(finalMessages, selectedModel, currentSessionId);
        if (sid && sid !== currentSessionId) setCurrentSessionId(sid);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Hubo un error. Intenta de nuevo.' }]);
    }
    setLoading(false);
  }

  function newConversation() {
    setMessages([]);
    setCurrentSessionId(null);
    setUsedModel('');
    setInput('');
  }

  const userInitial = ((session?.user?.name || session?.user?.email || 'U')[0]).toUpperCase();

  return (
    <div className="flex bg-background overflow-hidden" style={{ height: "100vh" }}>
      {/* Sidebar sesiones */}
      {showSidebar && (
        <div className="w-[220px] shrink-0 border-r border-white/[0.05] flex flex-col bg-[#0F1117]">
          <div className="flex items-center justify-between px-3 py-3 border-b border-white/[0.05]">
            <span className="text-[11px] font-medium uppercase tracking-wide text-white/40">Conversaciones</span>
            <button onClick={newConversation}
              className="flex h-6 w-6 items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors">
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2 flex flex-col gap-0.5">
            {loadingSessions ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-[11px] text-white/20 text-center py-6">Sin conversaciones</p>
            ) : sessions.map(s => (
              <button key={s.id} onClick={() => loadSession(s)}
                className={`group flex items-start gap-2 w-full rounded-xl px-2.5 py-2 text-left transition-colors ${
                  currentSessionId === s.id ? 'bg-primary/[0.12] text-white' : 'text-white/50 hover:bg-white/[0.03] hover:text-white/80'
                }`}>
                <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5 text-white/30" strokeWidth={1.75} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] truncate">{s.title}</p>
                  <p className="text-[9px] text-white/25 mt-0.5">
                    {new Date(s.updatedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <button onClick={(e) => deleteSession(s.id, e)}
                  className="opacity-0 group-hover:opacity-100 shrink-0 text-white/20 hover:text-red-400 transition-all">
                  <Trash2 className="h-3 w-3" strokeWidth={1.75} />
                </button>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <div className="shrink-0 border-b border-white/[0.05] px-5 h-[52px] flex items-center gap-3 sticky top-0 z-10 bg-background">
          <button onClick={() => setShowSidebar(p => !p)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors">
            <ChevronLeft className={`h-4 w-4 transition-transform ${showSidebar ? '' : 'rotate-180'}`} strokeWidth={1.75} />
          </button>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
            <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
          </div>
          <div>
            <span className="text-[14px] font-semibold">AI Marketing Assistant</span>
            <span className="ml-2 text-[11px] text-white/30">Especialista en estrategia y contenido digital</span>
          </div>
          {/* Model selector */}
          <div className="ml-auto flex items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
            {MODEL_OPTIONS.map(m => (
              <button key={m.tier} onClick={() => setSelectedModel(m.tier)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                  selectedModel === m.tier ? 'bg-white/[0.08] text-white' : 'text-white/30 hover:text-white/60'
                }`}>
                <span className="text-[9px] font-bold px-1 py-px rounded"
                  style={{ background: selectedModel === m.tier ? m.color + '25' : 'transparent', color: m.color }}>
                  {m.badge}
                </span>
                <span className="hidden lg:inline">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-5 max-w-xl mx-auto">
              <div className="text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-3">
                  <Sparkles className="h-6 w-6 text-primary" strokeWidth={1.5} />
                </div>
                <h2 className="text-[17px] font-semibold mb-1.5">¿En qué puedo ayudarte hoy?</h2>
                <p className="text-[12px] text-white/35 leading-relaxed">
                  Especialista en marketing digital con contexto de tus clientes y tareas.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => sendMessage(s)}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-left text-[12px] text-white/45 hover:border-primary/25 hover:bg-primary/[0.03] hover:text-white/75 transition-all">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto flex flex-col gap-4 pb-2">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className="h-8 w-8 shrink-0 flex items-center justify-center rounded-xl bg-primary/15 mt-0.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
                    </div>
                  )}
                  <div className="max-w-[78%]">
                    <div className={`rounded-2xl px-4 py-2.5 text-[13.5px] leading-[1.6] whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-primary/[0.18] text-white rounded-tr-sm'
                        : 'bg-white/[0.04] border border-white/[0.06] text-white/85 rounded-tl-sm'
                    }`}>
                      {m.content}
                    </div>
                    {m.role === 'assistant' && i === messages.length - 1 && usedModel && (
                      <p className="mt-1 text-[10px] text-white/20 px-1">{usedModel}</p>
                    )}
                  </div>
                  {m.role === 'user' && (
                    <div className="h-8 w-8 shrink-0 flex items-center justify-center rounded-xl bg-white/[0.06] mt-0.5 text-[12px] font-semibold text-white/50">
                      {userInitial}
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="h-8 w-8 shrink-0 flex items-center justify-center rounded-xl bg-primary/15">
                    <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" strokeWidth={1.75} />
                  </div>
                  <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1.5 items-center">
                      {[0,1,2].map(i => (
                        <span key={i} className="block h-1.5 w-1.5 rounded-full bg-primary/60"
                          style={{ animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t border-white/[0.05] px-5 py-3">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2 items-end rounded-[18px] border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 focus-within:border-primary/40 transition-colors">
              <textarea ref={inputRef} value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Escribe tu pregunta o solicitud..."
                rows={1}
                className="flex-1 bg-transparent text-[13.5px] text-white placeholder:text-white/25 focus:outline-none resize-none"
                style={{ maxHeight: '100px', overflowY: 'auto' }}
              />
              <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-white disabled:opacity-30 transition-all hover:bg-primary/90"
                style={{ boxShadow: input.trim() ? '0 0 14px -2px rgba(139,92,246,0.5)' : 'none' }}>
                <Send className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-white/20">Enter para enviar · Shift+Enter nueva línea</p>
          </div>
        </div>
      </div>
    </div>
  );
}
