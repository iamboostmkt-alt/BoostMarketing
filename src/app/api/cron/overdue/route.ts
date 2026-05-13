import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/resend";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const ahora = new Date();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "https://boostmarketingboost.com";

  const tareasVencidas = await db.task.findMany({
    where: {
      dueDate:   { lt: ahora },
      status:    { notIn: ["completed", "cancelled"] },
      deletedAt: null,
      assignedUser: { isNot: null },
    },
    include: {
      assignedUser: { select: { id: true, email: true, name: true } },
    },
  });

  // Agrupar por usuario
  const porUsuario = new Map<string, { email: string; name: string; count: number; tareas: typeof tareasVencidas }>();
  for (const t of tareasVencidas) {
    if (!t.assignedUser?.email) continue;
    const uid = t.assignedUser.id;
    if (!porUsuario.has(uid)) {
      porUsuario.set(uid, { email: t.assignedUser.email, name: t.assignedUser.name ?? "Usuario", count: 0, tareas: [] });
    }
    porUsuario.get(uid)!.tareas.push(t);
    porUsuario.get(uid)!.count++;
  }

  let enviados = 0;
  for (const [, usuario] of porUsuario) {
    const lista = usuario.tareas.slice(0, 3).map(t => {
      const d = t.dueDate ? new Date(t.dueDate).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : "";
      return `<li style="margin:4px 0;color:#e5e5e5">${t.title}${d ? ` <span style="color:#888">(venció ${d})</span>` : ""}</li>`;
    }).join("");
    const extra = usuario.count > 3 ? `<li style="color:#888">+${usuario.count - 3} más...</li>` : "";

    await sendEmail({
      to: usuario.email,
      subject: `🚨 Tienes ${usuario.count} tarea${usuario.count > 1 ? "s" : ""} vencida${usuario.count > 1 ? "s" : ""} - BoostMarketing`,
      html: `<div style="font-family:-apple-system,sans-serif;max-width:520px;margin:0 auto;background:#0b0b0f;color:#e5e5e5;border-radius:12px;overflow:hidden">
        <div style="background:#ef4444;padding:24px 32px"><h1 style="margin:0;font-size:20px;color:#fff">BoostMarketing</h1></div>
        <div style="padding:32px">
          <p style="color:#a0a0b0;margin-top:0">Hola, <strong style="color:#e5e5e5">${usuario.name}</strong></p>
          <h2 style="color:#fff;margin:8px 0">Tareas vencidas</h2>
          <p style="color:#a0a0b0">Tienes <strong style="color:#ef4444">${usuario.count} tarea${usuario.count > 1 ? "s" : ""}</strong> que requieren atención:</p>
          <ul style="padding-left:20px;margin:16px 0">${lista}${extra}</ul>
          <a href="${appUrl}/dashboard/tasks" style="display:inline-block;background:#ef4444;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Ver tareas</a>
        </div>
      </div>`,
    });
    enviados++;
  }

  return NextResponse.json({
    ok: true,
    timestamp: ahora.toISOString(),
    tareasVencidas: tareasVencidas.length,
    emailsEnviados: enviados,
  });
}