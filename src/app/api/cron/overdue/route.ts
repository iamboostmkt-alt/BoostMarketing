import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendMail, templateTareaVencida } from "@/lib/mailer";

export const dynamic = "force-dynamic";

// Vercel cron: cada dia a las 9am
// vercel.json: { "path": "/api/cron/overdue", "schedule": "0 9 * * *" }

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const ahora = new Date();

  const tareasVencidas = await db.task.findMany({
    where: {
      dueDate:   { lt: ahora },
      status:    { notIn: ["completed", "cancelled"] },
      deletedAt: null,
      assignedUser: { isNot: null },
    },
    include: {
      assignedUser: { select: { email: true, name: true } },
    },
  });

  let enviados = 0;

  for (const tarea of tareasVencidas) {
    if (!tarea.assignedUser?.email || !tarea.dueDate) continue;

    const dueDateStr = new Date(tarea.dueDate).toLocaleDateString("es-MX", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    await sendMail(
      tarea.assignedUser.email,
      `🚨 Tarea vencida: "${tarea.title}"`,
      templateTareaVencida(tarea.title, dueDateStr)
    );
    enviados++;
  }

  return NextResponse.json({
    ok: true,
    timestamp: ahora.toISOString(),
    tareasVencidas: tareasVencidas.length,
    emailsEnviados: enviados,
  });
}
