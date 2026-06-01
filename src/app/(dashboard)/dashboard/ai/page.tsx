'use client';
import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Send, Sparkles, RotateCcw, ChevronDown } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'Propón una estrategia de contenido para Instagram esta semana',
  '¿Qué tareas están pendientes o atrasadas?',
  'Redacta 3 ideas de captions para redes sociales',
  'Dame un plan de contenido para los próximos 7 días',
  'Sugiere mejoras para aumentar el engagement',
  'Analiza qué tipo de contenido funciona mejor en marketing digital',
];

export default function AIAssistantPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      if (data.content) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Hubo un error. Intenta de nuevo.' }]);
    }
    setLoading(false);
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 border-b border-white/[0.05] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
            <Sparkles className="h-4.5 w-4.5 text-primary" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight">AI Marketing Assistant</h1>
            <p className="text-[11px] text-white/35">Especialista en estrategia y contenido digital</p>
          </div>
          {messages.length > 0 && (
            <button onClick={() => setMessages([])}
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-1.5 text-[12px] text-white/40 hover:text-white/70 transition-colors">
              <RotateCcw className="h-3 w-3" strokeWidth={1.75} />
              Nueva conversación
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 max-w-xl mx-auto">
            <div className="text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-4">
                <Sparkles className="h-7 w-7 text-primary" strokeWidth={1.5} />
              </div>
              <h2 className="text-[18px] font-semibold mb-2">¿En qué puedo ayudarte hoy?</h2>
              <p className="text-[13px] text-white/40 leading-relaxed">
                Soy tu asistente especializado en marketing digital. Puedo ayudarte con estrategias, contenido, análisis y más.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => sendMessage(s)}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left text-[12px] text-white/50 hover:border-primary/30 hover:bg-primary/[0.04] hover:text-white/80 transition-all">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto flex flex-col gap-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="h-7 w-7 shrink-0 flex items-center justify-center rounded-lg bg-primary/15 mt-0.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-primary/20 text-white rounded-tr-sm'
                    : 'bg-white/[0.04] border border-white/[0.06] text-white/85 rounded-tl-sm'
                }`}>
                  {m.content}
                </div>
                {m.role === 'user' && (
                  <div className="h-7 w-7 shrink-0 flex items-center justify-center rounded-lg bg-white/[0.08] mt-0.5 text-[11px] font-semibold text-white/60">
                    {((session?.user?.name || session?.user?.email || 'U')[0]).toUpperCase()}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="h-7 w-7 shrink-0 flex items-center justify-center rounded-lg bg-primary/15">
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
      <div className="shrink-0 border-t border-white/[0.05] px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3 items-end rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 focus-within:border-primary/40 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
              }}
              placeholder="Escribe tu pregunta o solicitud..."
              rows={1}
              className="flex-1 bg-transparent text-[13.5px] text-white placeholder:text-white/25 focus:outline-none resize-none"
              style={{ maxHeight: '120px', overflowY: 'auto' }}
            />
            <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-white disabled:opacity-30 transition-all hover:bg-primary/90"
              style={{ boxShadow: input.trim() ? '0 0 16px -2px rgba(139,92,246,0.5)' : 'none' }}>
              <Send className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
          <p className="mt-1.5 text-center text-[11px] text-white/20">Enter para enviar · Shift+Enter para nueva línea</p>
        </div>
      </div>
    </div>
  );
}
