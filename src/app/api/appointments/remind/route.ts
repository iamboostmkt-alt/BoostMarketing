import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireWorkspace } from '@/core/auth/require-workspace';
import { sendMail, templateRecordatorioVideollamada } from '@/lib/mailer';
import { getBranding } from '@/lib/branding';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export async function POST(req: NextRequest) {
  try {
    const result = await requireWorkspace({ roles: ['ADMIN', 'PROJECT_MANAGER'] });
    if (!result.ok) return result.response;

    const { appointmentId } = await req.json();
    if (!appointmentId) return NextResponse.json({ error: 'appointmentId requerido' }, { status: 400 });

    const apt = await db.appointment.findFirst({ where: { id: appointmentId, workspaceId: result.ctx.workspaceId } });
    if (!apt) return NextResponse.json({ error: 'Reunion no encontrada' }, { status: 404 });

    const branding  = await getBranding();
    const dateStr   = format(new Date(apt.date), "d 'de' MMMM yyyy 'a las' HH:mm", { locale: es });
    const minutesBefore = Math.round((new Date(apt.date).getTime() - Date.now()) / 60000);

    await sendMail(
      apt.email,
      `Recordatorio de reunión — ${apt.name}`,
      templateRecordatorioVideollamada({
        name:          apt.name,
        dateStr,
        meetUrl:       apt.meetUrl ?? '',
        minutesBefore: minutesBefore > 0 ? minutesBefore : 0,
      }, branding)
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[appointments/remind]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
