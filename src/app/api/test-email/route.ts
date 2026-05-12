import { transporter } from "@/lib/mailer";

/**
 * GET /api/test-email — verifies SMTP (Gmail) credentials.
 * Runs verify() per request (not at module scope). Protect in production if exposed.
 */
export async function GET() {
  if (
    !process.env.EMAIL_SERVER_USER?.trim() ||
    !process.env.EMAIL_SERVER_PASSWORD?.trim()
  ) {
    return Response.json(
      {
        ok: false,
        error:
          "Faltan EMAIL_SERVER_USER y/o EMAIL_SERVER_PASSWORD (usa contraseña de aplicación de Gmail).",
      },
      { status: 400 }
    );
  }

  try {
    await transporter.verify();

    return Response.json({
      ok: true,
      message: "SMTP funcionando correctamente",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return Response.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
