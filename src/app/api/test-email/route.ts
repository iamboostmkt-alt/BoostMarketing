import { sendMail, isSmtpConfigured } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!isSmtpConfigured()) {
      return Response.json(
        { ok: false, error: "SMTP no configurado" },
        { status: 500 }
      );
    }

    const result = await sendMail(
      "test@example.com",
      "Test Email SMTP",
      "<h1>SMTP OK desde Vercel</h1>"
    );

    return Response.json({
      ok: true,
      message: "Email enviado correctamente",
      result,
    });

  } catch (error: any) {
    console.error("🔥 TEST EMAIL REAL ERROR:");
    console.error(error); // 👈 CLAVE

    return Response.json(
      {
        ok: false,
        error: error?.message || "Error SMTP desconocido",
        code: error?.code,
        response: error?.response,
      },
      { status: 500 }
    );
  }
}