import { NextResponse } from "next/server";
import { sendEmail, welcomeHtml } from "@/lib/resend";

export const dynamic = 'force-dynamic';

export async function GET() {
  await sendEmail({
    to: "iamboostmkt@gmail.com",
    subject: "Prueba bienvenida - BoostMarketing",
    html: welcomeHtml({
      userName: "Esteban",
      appUrl: "https://boostmarketingboost.com",
    }),
  });
  return NextResponse.json({ ok: true, msg: "Correo bienvenida enviado" });
}
