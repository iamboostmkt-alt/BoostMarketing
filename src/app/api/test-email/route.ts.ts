import { transporter } from "@/lib/mailer"

export async function GET() {
  try {
    await transporter.verify()

    return Response.json({
      ok: true,
      message: "SMTP funcionando correctamente 🚀",
    })
  } catch (error: any) {
    return Response.json({
      ok: false,
      error: error.message,
    })
  }
}