import { NextResponse } from "next/server";
import { sendMail, templateNuevaTarea } from "@/lib/mailer";
import { getBranding } from "@/lib/branding";

export async function GET() {
  const branding = await getBranding();
  await sendMail(
    "iamboostmkt@gmail.com",
    "Prueba correo nueva tarea - BoostMarketing",
    templateNuevaTarea(
      "Tarea de prueba B5",
      "Esta es una tarea de prueba para verificar que los correos llegan correctamente.",
      "31/05/2025",
      branding
    )
  );
  return NextResponse.json({ ok: true, msg: "Correo enviado a iamboostmkt@gmail.com" });
}
