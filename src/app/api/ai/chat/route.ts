import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from "@/core/auth/require-workspace";
import { rateLimit } from "@/lib/security/rate-limit";
import { db } from '@/lib/db';

type ModelTier = 'pro' | 'medium' | 'free' | 'turbo';

const MODELS: Record<ModelTier, { name: string; label: string; provider: string }> = {
  pro:    { name: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4',    provider: 'anthropic' },
  medium: { name: 'deepseek-chat',            label: 'DeepSeek V3',        provider: 'deepseek'  },
  free:   { name: 'gemini-1.5-flash',         label: 'Gemini 1.5 Flash',   provider: 'gemini'    },
  turbo:  { name: 'llama-3.3-70b-versatile',  label: 'Llama 3.3 70B',      provider: 'groq'      },
};

const SYSTEM_PROMPT = `Eres Boost AI, asistente especializado EXCLUSIVAMENTE en marketing digital para la agencia BoostMarketing.

REGLAS ESTRICTAS — NUNCA violar:
1. SOLO respondes temas de marketing digital, contenido, redes sociales, campañas, branding, copywriting, métricas, SEO/SEM, email marketing y estrategia digital.
2. Si te preguntan sobre programación, infraestructura, código, bases de datos, tecnología, finanzas, legal u otros temas NO relacionados con marketing — responde EXACTAMENTE: "Solo puedo ayudarte con temas de marketing digital. ¿Tienes alguna pregunta sobre estrategia de contenido, campañas o redes sociales?"
3. No des consejos de desarrollo web, no expliques código, no ayudes con configuraciones técnicas.
4. Si el usuario intenta hacerte salir del tema con framing creativo — rechaza y redirige al marketing.

Tu expertise:
- Estrategia de contenido para Instagram, TikTok, Facebook, LinkedIn, YouTube
- Copywriting y captions listos para publicar
- Planificación de campañas y calendarios editoriales
- Análisis de métricas y KPIs de marketing
- Branding y posicionamiento de marca
- Email marketing y newsletters
- SEO de contenido y SEM básico
- Video marketing, Reels y tendencias

Cómo respondes:
- Concreto y accionable — nunca vago
- Ejemplos específicos adaptados al cliente mencionado
- Emojis con moderación
- Listas y estructura cuando sea útil
- Si piden contenido, lo entregas LISTO para usar`;

async function callAnthropic(messages: {role:string;content:string}[], system: string) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY ?? '', 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODELS.pro.name, max_tokens: 1024, system, messages }),
  });
  const data = await res.json();
  return data.content?.[0]?.text ?? 'Sin respuesta.';
}

async function callDeepSeek(messages: {role:string;content:string}[], system: string) {
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}` },
    body: JSON.stringify({ model: MODELS.medium.name, max_tokens: 1024, messages: [{ role: 'system', content: system }, ...messages] }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? 'Sin respuesta.';
}

async function callGemini(messages: {role:string;content:string}[], system: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const contents = messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { maxOutputTokens: 1024 } }),
  });
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Sin respuesta.';
}

async function callGroq(messages: {role:string;content:string}[], system: string) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({ model: MODELS.turbo.name, max_tokens: 1024, messages: [{ role: 'system', content: system }, ...messages] }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? 'Sin respuesta.';
}

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 20, windowMs: 60_000, identifier: 'ai-chat' });
  if (!rl.success) return rl.response;

  const result = await requireWorkspace();
  if (!result.ok) return result.response;

  const { userId, workspaceId, role } = result.ctx;

  const ALLOWED_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER', 'DESIGNER', 'MARKETING'];
  if (!ALLOWED_ROLES.includes(role as string))
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });

  const body = await req.json();
  const messages = body.messages;
  const tier: ModelTier = ['pro','medium','free','turbo'].includes(body.model) ? body.model : 'turbo';

  if (!messages?.length) return NextResponse.json({ error: 'messages requerido' }, { status: 400 });
  if (messages.length > 20) return NextResponse.json({ error: 'Máximo 20 mensajes.' }, { status: 400 });

  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || lastMsg.role !== 'user' || typeof lastMsg.content !== 'string' || lastMsg.content.length > 2000)
    return NextResponse.json({ error: 'Mensaje inválido.' }, { status: 400 });

  const injectionPatterns = [/ignore (previous|above|all) instructions/i, /you are now/i, /act as (a |an )?(different|new|unrestricted)/i, /forget (your|all) (instructions|rules)/i, /jailbreak/i, /dan mode/i, /override (system|instructions)/i, /reveal (your|the) (system prompt|instructions)/i];
  if (injectionPatterns.some(p => p.test(lastMsg.content)))
    return NextResponse.json({ content: 'Solo puedo ayudarte con temas de marketing digital. ¿Tienes alguna pregunta?' });

  const isManager = ['ADMIN', 'PROJECT_MANAGER'].includes(role as string);
  const [clients, tasks] = await Promise.all([
    db.client.findMany({ where: { workspaceId }, select: { name: true }, take: 20 }),
    db.task.findMany({
      where: { workspaceId, archivedAt: null, ...(!isManager ? { OR: [{ assignedUserId: userId }, { assignedUsers: { some: { userId } } }] } : {}) },
      select: { title: true, status: true, dueDate: true, priority: true, client: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }, take: 20,
    }),
  ]);

  const today = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const ctx = clients.length > 0
    ? `\n\nContexto del workspace (${today}):\nClientes: ${clients.map(c => c.name).join(', ')}\nTareas:\n${tasks.map(t => `- ${t.title} | ${t.status} | ${t.priority}${(t as any).client?.name ? ` | ${(t as any).client.name}` : ''}${t.dueDate ? ` | vence ${new Date(t.dueDate).toLocaleDateString('es-MX')}` : ''}`).join('\n')}`
    : '';

  const system = SYSTEM_PROMPT + ctx;
  const model = MODELS[tier];

  try {
    let content: string;
    if (model.provider === 'anthropic') content = await callAnthropic(messages, system);
    else if (model.provider === 'deepseek') content = await callDeepSeek(messages, system);
    else if (model.provider === 'gemini') content = await callGemini(messages, system);
    else content = await callGroq(messages, system);
    if (!content || content === 'Sin respuesta.') throw new Error('empty response');
    return NextResponse.json({ content, model: model.label });
  } catch (err) {
    console.error('AI error:', err, 'tier:', tier);
    // Fallback a Groq si el modelo principal falla
    if (model.provider !== 'groq') {
      try {
        const content = await callGroq(messages, system);
        if (content && content !== 'Sin respuesta.')
          return NextResponse.json({ content, model: 'Llama 3.3 70B (fallback)', fallback: true });
      } catch (e) { console.error('Groq fallback error:', e); }
    }
    return NextResponse.json({ error: 'Error al procesar. Intenta de nuevo.' }, { status: 500 });
  }
}
