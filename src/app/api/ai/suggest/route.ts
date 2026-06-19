import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from '@/core/auth/require-workspace';
import { rateLimit } from '@/lib/security/rate-limit';
import { db } from '@/lib/db';

// POST /api/ai/suggest
// Recibe clientId (opcional) y genera sugerencias de contenido/acción con contexto real

const SUGGESTION_PROMPT = (ctx: string) => `Eres un estratega de marketing digital experto. Tienes acceso al contexto real de una cuenta de agencia. Genera sugerencias CONCRETAS y ACCIONABLES.

CONTEXTO DE LA CUENTA:
${ctx}

INSTRUCCIONES:
- Genera exactamente 5 sugerencias de contenido o acciones de marketing
- Cada sugerencia debe ser específica para ESTE cliente (usa su nombre, industria, tono)
- Incluye: tipo de contenido, plataforma recomendada, y un ejemplo listo para usar
- Sé creativo pero realista para una agencia pequeña
- Responde SOLO en JSON con este formato exacto, sin texto adicional:
{
  "suggestions": [
    {
      "id": "1",
      "type": "reel" | "post" | "story" | "email" | "campaign" | "copy" | "strategy",
      "platform": "Instagram" | "TikTok" | "Facebook" | "LinkedIn" | "Email" | "General",
      "title": "Título corto de la sugerencia",
      "description": "Descripción de qué hacer y por qué",
      "example": "Ejemplo concreto listo para usar (caption, asunto, guión, etc.)",
      "urgency": "now" | "week" | "month"
    }
  ]
}`;

async function callGemini(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('No GEMINI_API_KEY');
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 1500 },
      }),
    }
  );
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function callGroq(prompt: string): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('No GROQ_API_KEY');
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1500,
      temperature: 0.8,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 20, windowMs: 60_000, identifier: 'ai-suggest' });
  if (!rl.success) return rl.response;

  const result = await requireWorkspace({ roles: ['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER', 'DESIGNER', 'MARKETING'] });
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;

  const body = await req.json();
  const { clientId, freeContext } = body;

  try {
    let contextStr = '';

    if (clientId) {
      // Cargar datos reales del cliente
      const client = await db.client.findFirst({
        where: { id: clientId, workspaceId },
        select: {
          name: true,
          company: true,
          aiContext: true,
          tasks: {
            where: { status: { in: ['pending', 'in_progress', 'completed'] } },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: { title: true, status: true, dueDate: true },
          },
          projects: {
            where: { status: 'active' },
            take: 3,
            select: { name: true, status: true },
          },
          appointments: {
            where: { date: { gte: new Date() } },
            take: 2,
            orderBy: { date: 'asc' },
            select: { name: true, date: true },
          },
        },
      });

      if (!client) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });

      const aiCtx = (client.aiContext as any) || {};
      contextStr = `
Cliente: ${client.name}${client.company ? ` (${client.company})` : ''}
Industria: ${aiCtx.industry || 'No especificada'}
Nicho: ${aiCtx.niche || 'No especificado'}
Audiencia objetivo: ${aiCtx.audience || 'No especificada'}
Tono de comunicación: ${aiCtx.tone || 'No especificado'}
Objetivos: ${aiCtx.goals || 'No especificados'}
Notas adicionales: ${aiCtx.notes || 'Ninguna'}

Tareas recientes:
${client.tasks.map(t => `- ${t.title} [${t.status}]${t.dueDate ? ` — vence ${new Date(t.dueDate).toLocaleDateString('es-MX')}` : ''}`).join('\n') || '- Sin tareas recientes'}

Proyectos activos:
${client.projects.map(p => `- ${p.name}`).join('\n') || '- Sin proyectos activos'}

Próximas reuniones:
${client.appointments.map(a => `- ${a.name} — ${new Date(a.date).toLocaleDateString('es-MX')}`).join('\n') || '- Sin reuniones próximas'}
${freeContext ? `\nContexto adicional del usuario: ${freeContext}` : ''}`;
    } else {
      // Sin cliente específico — usar contexto libre
      contextStr = `
Cliente: No especificado
Contexto libre proporcionado por el usuario: ${freeContext || 'Agencia de marketing general'}
Industria: No especificada
Genera sugerencias generales de marketing digital pero útiles y accionables.`;
    }

    const prompt = SUGGESTION_PROMPT(contextStr);

    // Intentar Gemini primero, fallback a Groq
    let raw = '';
    let providerUsed = 'gemini';
    try {
      raw = await callGemini(prompt);
      if (!raw || raw.length < 50) throw new Error('Respuesta vacía de Gemini');
    } catch (e1) {
      console.error('Gemini failed, trying Groq:', e1);
      providerUsed = 'groq';
      try {
        raw = await callGroq(prompt);
      } catch (e2) {
        console.error('Groq also failed:', e2);
        throw new Error('Ambos proveedores de IA fallaron');
      }
    }

    console.log('AI raw response preview:', raw?.slice(0, 200));

    // Limpiar markdown fences si los hay
    let cleaned = raw
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    // Extraer el objeto JSON
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in:', cleaned.slice(0, 500));
      throw new Error('La IA no devolvió JSON válido');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr, 'Raw:', jsonMatch[0].slice(0, 300));
      throw new Error('Error al parsear respuesta de la IA');
    }

    const suggestions = parsed.suggestions || [];
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      throw new Error('La IA no generó sugerencias');
    }

    return NextResponse.json({ suggestions, clientId, provider: providerUsed });
  } catch (error: any) {
    console.error('AI suggest error:', error?.message || error);
    return NextResponse.json({ error: error?.message || 'Error al generar sugerencias' }, { status: 500 });
  }
}

// PATCH /api/ai/suggest — guardar contexto de IA para un cliente
export async function PATCH(req: NextRequest) {
  const result = await requireWorkspace({ roles: ['ADMIN', 'PROJECT_MANAGER'] });
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;

  const body = await req.json();
  const { clientId, aiContext } = body;

  if (!clientId || !aiContext) {
    return NextResponse.json({ error: 'clientId y aiContext requeridos' }, { status: 400 });
  }

  try {
    const client = await db.client.findFirst({ where: { id: clientId, workspaceId } });
    if (!client) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });

    await db.client.update({
      where: { id: clientId },
      data: { aiContext },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('AI context save error:', error);
    return NextResponse.json({ error: 'Error al guardar contexto' }, { status: 500 });
  }
}
