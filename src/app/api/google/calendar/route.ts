import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from '@/core/auth/require-workspace';
import { db } from '@/lib/db';

// POST /api/google/calendar — crear evento en Google Calendar y retornar Meet link
export async function POST(req: NextRequest) {
  const auth = await requireWorkspace();
  if (!auth.ok) return auth.response;
  const { userId } = auth.ctx;

  const { title, startTime, endTime, attendeeEmails = [], description = '' } = await req.json();

  if (!title || !startTime) {
    return NextResponse.json({ error: 'title y startTime son requeridos' }, { status: 400 });
  }

  try {
    // Obtener el account de Google del usuario actual
    const account = await db.account.findFirst({
      where: { userId, provider: 'google' },
      select: { access_token: true, refresh_token: true, expires_at: true },
    });

    if (!account?.access_token) {
      return NextResponse.json({
        error: 'No tienes Google Calendar conectado. Cierra sesión y vuelve a entrar con Google para habilitar esta función.',
        code: 'NO_GOOGLE_ACCOUNT',
      }, { status: 401 });
    }

    let accessToken = account.access_token;

    // Siempre refrescar si hay refresh_token (access_token expira cada hora)
    if (account.refresh_token) {
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id:     process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: account.refresh_token,
          grant_type:    'refresh_token',
        }),
      });
      const refreshData = await refreshRes.json();
      console.log('[Calendar] Refresh result:', refreshData.access_token ? 'OK' : refreshData.error);

      if (refreshData.access_token) {
        accessToken = refreshData.access_token;
        await db.account.updateMany({
          where: { userId, provider: 'google' },
          data: {
            access_token: refreshData.access_token,
            expires_at: Math.floor(Date.now() / 1000) + (refreshData.expires_in ?? 3600),
          },
        });
      } else {
        console.error('[Calendar] Refresh failed:', refreshData);
        return NextResponse.json({
          error: 'Error al refrescar token de Google: ' + (refreshData.error_description || refreshData.error || 'desconocido'),
          code: 'REFRESH_FAILED',
          details: refreshData,
        }, { status: 401 });
      }
    } else if (account.expires_at && Date.now() / 1000 > account.expires_at - 60) {
      return NextResponse.json({ error: 'Token expirado y sin refresh token. Cierra sesión y reconecta con Google.', code: 'TOKEN_EXPIRED' }, { status: 401 });
    }

    // Calcular endTime si no se provee (default: +1 hora)
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date(start.getTime() + 60 * 60 * 1000);

    // Log para debug
    console.log('[Calendar] Creando evento:', { title, startTime: start.toISOString(), attendeeEmails: attendeeEmails.length });

    // Crear evento en Google Calendar con Google Meet
    const eventBody = {
      summary: title,
      description,
      start: { dateTime: start.toISOString(), timeZone: 'America/Mexico_City' },
      end:   { dateTime: end.toISOString(),   timeZone: 'America/Mexico_City' },
      attendees: attendeeEmails.map((email: string) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `weeklink-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 15 },
        ],
      },
    };

    const calRes = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventBody),
      }
    );

    if (!calRes.ok) {
      const err = await calRes.json();
      console.error('Google Calendar API error:', JSON.stringify(err));
      
      if (calRes.status === 401) {
        return NextResponse.json({
          error: 'Token de Google expirado. Cierra sesión y vuelve a entrar con Google.',
          code: 'CALENDAR_UNAUTHORIZED',
        }, { status: 401 });
      }
      if (calRes.status === 403) {
        return NextResponse.json({
          error: 'Sin permisos de Calendar. Ve a Ajustes → cierra sesión → entra con Google y acepta el permiso de Calendar.',
          code: 'CALENDAR_PERMISSION',
        }, { status: 403 });
      }
      if (calRes.status === 400) {
        return NextResponse.json({
          error: 'Datos inválidos para crear el evento. Verifica fecha y título.',
          code: 'CALENDAR_BAD_REQUEST',
          details: err,
        }, { status: 400 });
      }
      return NextResponse.json({ 
        error: `Error ${calRes.status} de Google Calendar: ${err?.error?.message || 'Error desconocido'}`,
        details: err,
      }, { status: 500 });
    }

    const event = await calRes.json();
    const meetLink = event.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === 'video')?.uri ?? null;
    const eventLink = event.htmlLink ?? null;

    return NextResponse.json({
      ok: true,
      meetLink,      // https://meet.google.com/xxx-xxxx-xxx (real)
      eventLink,     // Link al evento en Google Calendar
      eventId: event.id,
    });

  } catch (error: any) {
    console.error('Google Calendar error:', error);
    return NextResponse.json({ error: 'Error interno al crear el evento' }, { status: 500 });
  }
}
