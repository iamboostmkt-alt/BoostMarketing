import { NextRequest, NextResponse } from "next/server";
import { sendMail, isSmtpConfigured, templateBienvenida, templateRecordatorioVideollamada, templateNuevaTarea } from "@/lib/mailer";
import { getBranding } from "@/lib/branding";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const to = searchParams.get("to");
  const template = searchParams.get("template") || "bienvenida";

  if (!to) {
    return NextResponse.json({ error: "Parametro 'to' requerido. Ej: /api/test-email?to=tu@email.com&template=bienvenida" }, { status: 400 });
  }
  if (!isSmtpConfigured()) {
    return NextResponse.json({ error: "SMTP no configurado." }, { status: 503 });
  }

  const branding = await getBranding();

  let html = '';
  let subject = '';

  if (template === 'bienvenida') {
    subject = `👋 Bienvenido - ${branding.brandName}`;
    html = templateBienvenida('Esteban', branding);
  } else if (template === 'videollamada') {
    subject = `⏰ Recordatorio de videollamada - ${branding.brandName}`;
    html = templateRecordatorioVideollamada({ name: 'Esteban', dateStr: 'Jueves 15 de mayo, 3:00 PM', meetUrl: 'https://meet.google.com/abc-defg-hij', minutesBefore: 60 }, branding);
  } else if (template === 'tarea') {
    subject = `📌 Nueva tarea asignada - ${branding.brandName}`;
    html = templateNuevaTarea('Diseño landing page', 'Crear landing page para campaña de verano', 'Viernes 16 de mayo', branding);
  } else {
    subject = `Test email - ${branding.brandName}`;
    html = templateBienvenida('Usuario', branding);
  }

  await sendMail(to, subject, html);
  return NextResponse.json({ ok: true, message: `Email '${template}' enviado a ${to}`, branding });
}
