import { sendMail, isSmtpConfigured } from "@/lib/mailer";

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
      ok: result,
      message: result ? "Email enviado correctamente" : "Error enviando email",
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: "Error interno SMTP",
      },
      { status: 500 }
    );
  }
}