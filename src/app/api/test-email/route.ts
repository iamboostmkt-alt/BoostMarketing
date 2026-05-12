import { NextRequest, NextResponse } from "next/server";
import { sendMail, isSmtpConfigured } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const to = searchParams.get("to");

  if (!to) {
    return NextResponse.json({ error: "Parametro 'to' requerido. Ej: /api/test-email?to=tu@email.com" }, { status: 400 });
  }

  if (!isSmtpConfigured()) {
    return NextResponse.json({ error: "SMTP no configurado. Revisa SMTP_USER y SMTP_PASS en variables de entorno." }, { status: 503 });
  }

  await sendMail(
    to,
    "Test email - BoostMarketing",
    `<div style="font-family:Arial,sans-serif;padding:24px;max-width:500px">
      <h2 style="color:#7c3aed">Correo de prueba</h2>
      <p>Si recibes este mensaje, el sistema de emails esta funcionando correctamente.</p>
      <p style="color:#6b7280;font-size:13px">Enviado: ${new Date().toLocaleString("es-MX")}</p>
    </div>`
  );

  return NextResponse.json({ ok: true, message: `Email enviado a ${to}` });
}
