/**
 * Lógica de respuesta selectiva para Boosti en modo grupal.
 * 
 * Boosti responde cuando:
 * 1. Mención directa: @boosti, @ai, @ia
 * 2. Pregunta directa (termina en ?)
 * 3. Mensaje sustancial (>8 palabras) en sesión activa
 * 4. Comandos: /ai, /ia
 * 
 * Boosti NO responde cuando:
 * - Mensaje muy corto (<5 palabras sin ?)
 * - Respuesta social: "ok", "sí", "entendido", "gracias", etc.
 * - El mensaje es del propio bot (evitar loops)
 * - La sesión es individual y el mensaje no es del activador
 */

const SOCIAL_RESPONSES = new Set([
  'ok','okay','sí','si','no','claro','entendido','perfecto','gracias',
  'de acuerdo','listo','dale','va','👍','👌','✅','jaja','jajaja','haha',
  'exacto','bueno','bien','genial','excelente','eso','ya','mm','hmm',
  'lo vi','lo veo','ah ok','ah sí','ah si','ok ok','sip','nop',
]);

export function shouldBoostiRespond(params: {
  message:     string;
  senderId:    string;
  sessionMode: 'individual' | 'group';
  activatedBy: string; // userId que activó la sesión
  myBotId:     string; // 'ai'
}): { respond: boolean; reason: string } {
  const { message, senderId, sessionMode, activatedBy, myBotId } = params;
  const text  = message.trim().toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);

  // Nunca responder mensajes propios
  if (senderId === myBotId) return { respond: false, reason: 'propio bot' };

  // Siempre responder a menciones directas
  if (/^@(boosti|ai|ia|boostai|asistente)\b/i.test(message))
    return { respond: true, reason: 'mención directa' };

  // Siempre responder a comandos /ai /ia
  if (message.startsWith('/ai ') || message.startsWith('/ia '))
    return { respond: true, reason: 'comando' };

  // Modo individual: solo responder al activador
  if (sessionMode === 'individual' && senderId !== activatedBy)
    return { respond: false, reason: 'sesión individual — otro usuario' };

  // Ignorar respuestas sociales cortas
  const normalized = text.replace(/[!?.¿¡]/g, '').trim();
  if (SOCIAL_RESPONSES.has(normalized) || words.length <= 3)
    return { respond: false, reason: 'mensaje muy corto o social' };

  // Responder a preguntas
  if (message.endsWith('?') || message.includes('¿'))
    return { respond: true, reason: 'pregunta detectada' };

  // En modo grupal: responder a mensajes sustanciales (>8 palabras)
  if (sessionMode === 'group' && words.length > 8)
    return { respond: true, reason: 'mensaje sustancial en sesión grupal' };

  // En modo individual: responder a cualquier mensaje del activador
  if (sessionMode === 'individual' && senderId === activatedBy && words.length > 3)
    return { respond: true, reason: 'sesión individual activa' };

  return { respond: false, reason: 'no cumple criterios' };
}

/**
 * Construir historial de la IA desde mensajes del room
 * Para modo grupal: incluye todos los mensajes del room
 * Para modo individual: solo los mensajes del activador + respuestas de Boosti
 */
export function buildAiHistory(
  messages: Array<{ userId: string; message: string; isSystem?: boolean; systemName?: string }>,
  mode: 'individual' | 'group',
  activatedBy: string,
  maxMessages = 16
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const m of messages) {
    // Respuestas de Boosti → rol assistant
    if (m.isSystem && m.systemName === 'Weeklink' && m.message.startsWith('✨')) {
      const clean = m.message.replace(/^✨ \*\*(AI|Boosti):\*\* /, '').trim();
      if (clean) history.push({ role: 'assistant', content: clean });
      continue;
    }
    // En modo individual: solo mensajes del activador
    if (mode === 'individual' && m.userId !== activatedBy) continue;
    // Excluir mensajes del sistema (bots, notificaciones)
    if (m.isSystem) continue;
    // Mensajes normales del equipo
    const text = m.message.replace(/^\/ai\s+/i, '').replace(/^@boosti\s+/i, '').trim();
    if (text && text.length > 2) history.push({ role: 'user', content: text });
  }

  return history.slice(-maxMessages);
}
