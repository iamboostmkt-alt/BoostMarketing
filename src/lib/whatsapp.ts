/**
 * WhatsApp Business API (Meta Cloud API)
 * Documentación: https://developers.facebook.com/docs/whatsapp/cloud-api
 * 
 * Variables de entorno necesarias en Vercel:
 *   WHATSAPP_TOKEN        — Token de acceso permanente de Meta
 *   WHATSAPP_PHONE_ID     — Phone Number ID del número de WA Business
 *   WHATSAPP_VERIFY_TOKEN — Token para verificar el webhook de Meta
 */

const WA_API_URL = 'https://graph.facebook.com/v19.0';

interface WASendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

// ── Limpiar número: quitar todo excepto dígitos y agregar 52 si es MX ──
function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // Si ya tiene código de país (52 para MX)
  if (digits.startsWith('52') && digits.length === 12) return digits;
  // Si es número local de 10 dígitos
  if (digits.length === 10) return `52${digits}`;
  return digits;
}

// ── Enviar mensaje de texto simple ──
export async function sendWhatsAppMessage(
  to: string,
  message: string
): Promise<WASendResult> {
  const token    = process.env.WHATSAPP_TOKEN;
  const phoneId  = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneId) {
    console.warn('[WhatsApp] No configurado — WHATSAPP_TOKEN y WHATSAPP_PHONE_ID requeridos');
    return { ok: false, error: 'WhatsApp no configurado' };
  }

  const phone = formatPhone(to);
  if (phone.length < 10) {
    return { ok: false, error: 'Número de teléfono inválido' };
  }

  try {
    const res = await fetch(`${WA_API_URL}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'text',
        text: {
          preview_url: true,
          body: message,
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[WhatsApp] Error API:', data);
      return { ok: false, error: data?.error?.message || 'Error al enviar' };
    }

    return { ok: true, messageId: data?.messages?.[0]?.id };
  } catch (err: any) {
    console.error('[WhatsApp] Error de red:', err.message);
    return { ok: false, error: err.message };
  }
}

// ── Templates de mensajes ──

export function msgTareaAsignada(params: {
  userName: string;
  taskTitle: string;
  dueDate?: string;
  appUrl: string;
}) {
  const { userName, taskTitle, dueDate, appUrl } = params;
  const due = dueDate ? `\n📅 Vence: ${new Date(dueDate).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}` : '';
  return `¡Hola ${userName}! 👋

✅ *Te acaban de asignar una tarea en Weeklink*

📋 *${taskTitle}*${due}

Revísala y comienza cuando puedas:
${appUrl}/dashboard/tasks

_Weeklink — Plataforma de tu agencia_`;
}

export function msgTareaAprobada(params: {
  userName: string;
  taskTitle: string;
  appUrl: string;
}) {
  return `¡Hola ${params.userName}! 🎉

✅ *Tu entrega fue aprobada*

📋 *${params.taskTitle}*

¡Excelente trabajo! Sigue así 💪
${params.appUrl}/dashboard/tasks

_Weeklink_`;
}

export function msgCambiosRequeridos(params: {
  userName: string;
  taskTitle: string;
  appUrl: string;
}) {
  return `¡Hola ${params.userName}! 

🔄 *Se solicitaron cambios en tu entrega*

📋 *${params.taskTitle}*

Revisa los comentarios y actualiza:
${params.appUrl}/dashboard/tasks

_Weeklink_`;
}

export function msgNuevaReunion(params: {
  userName: string;
  meetingTitle: string;
  date: string;
  time: string;
  meetUrl?: string;
  appUrl: string;
}) {
  const { userName, meetingTitle, date, time, meetUrl, appUrl } = params;
  const meetLine = meetUrl ? `\n🎥 Google Meet: ${meetUrl}` : '';
  return `¡Hola ${userName}! 📅

📆 *Nueva reunión agendada*

📋 *${meetingTitle}*
🗓️ ${date} a las ${time}${meetLine}

Ver detalles:
${appUrl}/dashboard/calendar

_Weeklink_`;
}

export function msgRecordatorioReunion(params: {
  userName: string;
  meetingTitle: string;
  minutesLeft: number;
  meetUrl?: string;
}) {
  const { userName, meetingTitle, minutesLeft, meetUrl } = params;
  const meetLine = meetUrl ? `\n🎥 ${meetUrl}` : '';
  const tiempo = minutesLeft >= 60
    ? `en ${Math.floor(minutesLeft / 60)} hora${Math.floor(minutesLeft / 60) > 1 ? 's' : ''}`
    : `en ${minutesLeft} minutos`;
  return `⏰ *Recordatorio — ${userName}*

Tu reunión *"${meetingTitle}"* comienza ${tiempo}.${meetLine}

_Weeklink_`;
}

// ── Enviar notificación a múltiples usuarios ──
export async function notifyUsersWhatsApp(
  users: Array<{ name?: string | null; phone?: string | null }>,
  messageBuilder: (userName: string) => string
): Promise<void> {
  const usersWithPhone = users.filter(u => u.phone?.trim());
  if (usersWithPhone.length === 0) return;

  await Promise.allSettled(
    usersWithPhone.map(u =>
      sendWhatsAppMessage(u.phone!, messageBuilder(u.name?.split(' ')[0] || 'equipo'))
    )
  );
}
