import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from '@/core/auth/require-workspace';
import { rateLimit } from '@/lib/security/rate-limit';
import { db } from '@/lib/db';

// Días especiales próximos
function getSpecialDates(): string {
  const now = new Date();
  const upcoming: string[] = [];
  const specialDates: Record<string, string> = {
    '1-1':  'Año Nuevo — metas y propósitos',
    '2-14': 'San Valentín — amor, regalo, celebración',
    '3-8':  'Día de la Mujer — empoderar, visibilizar',
    '4-30': 'Día del Niño (MX) — familias, diversión',
    '5-1':  'Día del Trabajo — reconocer al equipo',
    '5-10': 'Día de las Madres (MX) — familia, regalo',
    '6-15': 'Día del Padre (MX) — padre, familia, celebración',
    '6-21': 'Inicio de verano — vacaciones, calor',
    '9-1':  'Regreso a clases — inicio de ciclo',
    '9-15': 'Independencia de México — patria, celebración',
    '10-31':'Halloween — disfraces, diversión',
    '11-20':'Buen Fin (MX) — descuentos, promociones',
    '12-12':'Virgen de Guadalupe (MX)',
    '12-24':'Nochebuena — familia, navidad',
    '12-25':'Navidad — celebración, regalos',
    '12-31':'Fin de año — reflexión, nuevo año',
  };
  for (let i = 0; i <= 15; i++) {
    const d = new Date(now.getTime() + i * 86400000);
    const key = (d.getMonth() + 1) + '-' + d.getDate();
    if (specialDates[key]) {
      upcoming.push('En ' + (i === 0 ? 'HOY' : i + ' días') + ': ' + specialDates[key]);
    }
  }
  return upcoming.length > 0 ? 'FECHAS ESPECIALES PRÓXIMAS:\n' + upcoming.join('\n') : '';
}

function buildPrompt(ctx: string): string {
  const specialDatesCtx = getSpecialDates();
  return 'Eres un estratega de marketing digital experto. Tienes acceso al contexto real de una cuenta de agencia. Genera sugerencias CONCRETAS y ACCIONABLES.\n\nCONTEXTO DE LA CUENTA:\n' + ctx + '\n\n' + (specialDatesCtx ? specialDatesCtx + '\n\nConsidera estas fechas para hacer sugerencias de contenido estacional y oportuno.\n\n' : '') + 'INSTRUCCIONES:\n- Genera exactamente 5 sugerencias de contenido o acciones de marketing\n- Cada sugerencia debe ser específica para ESTE cliente (usa su nombre, industria, tono)\n- Si hay fechas especiales próximas, incluye AL MENOS 1 sugerencia aprovechando esa fecha\n- Incluye: tipo de contenido, plataforma recomendada, y un ejemplo listo para usar\n- Sé creativo pero realista para una agencia pequeña\n- Responde SOLO en JSON con este formato exacto, sin texto adicional:\n{\n  "suggestions": [\n    {\n      "id": "1",\n      "type": "reel" | "post" | "story" | "email" | "campaign" | "copy" | "strategy",\n      "platform": "Instagram" | "TikTok" | "Facebook" | "LinkedIn" | "Email" | "General",\n      "title": "Título corto de la sugerencia",\n      "description": "Descripción de qué hacer y por qué",\n      "example": "Ejemplo concreto listo para usar (caption, asunto, guión, etc.)",\n      "urgency": "now" | "week" | "month"\n    }\n  ]\n}';
}

async function callGemini(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('No GEMINI_API_KEY');
  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + key,
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
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
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
      contextStr = 'Cliente: ' + client.name + (client.company ? ' (' + client.company + ')' : '') +
        '\nIndustria: ' + (aiCtx.industry || 'No especificada') +
        '\nNicho: ' + (aiCtx.niche || 'No especificado') +
        '\nAudiencia objetivo: ' + (aiCtx.audience || 'No especificada') +
        '\nTono de comunicación: ' + (aiCtx.tone || 'No especificado') +
        '\nObjetivos: ' + (aiCtx.goals || 'No especificados') +
        '\nNotas adicionales: ' + (aiCtx.notes || 'Ninguna') +
        '\n\nTareas recientes:\n' + (client.tasks.map(t => '- ' + t.title + ' [' + t.status + ']' + (t.dueDate ? ' — vence ' + new Date(t.dueDate).toLocaleDateString('es-MX') : '')).join('\n') || '- Sin tareas recientes') +
        '\n\nProyectos activos:\n' + (client.projects.map(p => '- ' + p.name).join('\n') || '- Sin proyectos activos') +
        (freeContext ? '\n\nContexto adicional: ' + freeContext : '');
    } else {
      contextStr = 'Cliente: No especificado\nContexto: ' + (freeContext || 'Agencia de marketing general');
    }

    const prompt = buildPrompt(contextStr);

    let raw = '';
    let providerUsed = 'gemini';
    try {
      raw = await callGemini(prompt);
      if (!raw || raw.length < 50) throw new Error('Respuesta vacía');
    } catch (e1) {
      console.error('Gemini failed:', e1);
      providerUsed = 'groq';
      try {
        raw = await callGroq(prompt);
      } catch (e2) {
        throw new Error('Ambos proveedores fallaron');
      }
    }

    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('La IA no devolvió JSON válido');

    let parsed: any;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error('Error al parsear respuesta de la IA');
    }

    const suggestions = parsed.suggestions || [];
    if (!Array.isArray(suggestions) || suggestions.length === 0) throw new Error('La IA no generó sugerencias');

    return NextResponse.json({ suggestions, clientId, provider: providerUsed });
  } catch (error: any) {
    console.error('AI suggest error:', error?.message || error);
    return NextResponse.json({ error: error?.message || 'Error al generar sugerencias' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const result = await requireWorkspace({ roles: ['ADMIN', 'PROJECT_MANAGER'] });
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;

  const body = await req.json();
  const { clientId, aiContext } = body;
  if (!clientId || !aiContext) return NextResponse.json({ error: 'clientId y aiContext requeridos' }, { status: 400 });

  try {
    const client = await db.client.findFirst({ where: { id: clientId, workspaceId } });
    if (!client) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    await db.client.update({ where: { id: clientId }, data: { aiContext } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al guardar contexto' }, { status: 500 });
  }
}
