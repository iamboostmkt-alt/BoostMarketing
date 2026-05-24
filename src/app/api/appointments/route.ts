import { NextRequest, NextResponse } from "next/server";
import { AppointmentCreateSchema, validateBody } from "@/lib/schemas";
import { rateLimit } from "@/lib/security/rate-limit";
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from "@/lib/db";
import {
  sendMail,
  templateNuevaCita,
  templateVideollamadaConfirmada,
  templateCitaCancelada,
} from "@/lib/mailer";

const appointmentInclude = {
  assignedUsers: {
    include: {
      user: {
        select: { id: true, name: true, email: true, color: true, image: true },
      },
    },
  },
} as const;

// POST: crear cita publica (sin auth) — workspaceId via primer admin
export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 20, windowMs: 60_000, identifier: "appt-post" });
  if (!rl.success) return rl.response;

  const rawBody = await req.json();
  const validation = validateBody(AppointmentCreateSchema, rawBody);
  if (!validation.success) return NextResponse.json({ error: validation.error }, { status: 400 });
  const { name, email, phone, date, notes, assignedUserIds, meetUrl } = validation.data;

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: "Fecha no valida." }, { status: 400 });
  }

  const emailNorm = email.trim().toLowerCase();
  const nameTrim  = name.trim();

  // Intentar obtener sesion para auto-asignar al creador
  const authResult = await requireWorkspace();
  const creatorId   = authResult.ok ? authResult.ctx.userId    : null;
  const sessionWsId = authResult.ok ? authResult.ctx.workspaceId : null;

  const allAssignedIds = [...new Set([
    ...(creatorId ? [creatorId] : []),
    ...(assignedUserIds ?? []),
  ])] as string[];

  // Obtener primer admin para flujos publicos
  const firstAdmin = await db.user.findFirst({
    where: { role: { in: ["ADMIN", "PROJECT_MANAGER"] } },
    select: { id: true, workspaceId: true },
  });

  const workspaceId = sessionWsId ?? firstAdmin?.workspaceId ?? null;

  const matchingClient = await db.client.findFirst({
    where: { email: { equals: emailNorm, mode: "insensitive" } },
    select: { id: true },
  });

  const appointment = await db.appointment.create({
    data: {
      name:     nameTrim,
      email:    emailNorm,
      phone:    (phone ?? "").trim(),
      date:     parsedDate,
      notes:    (notes ?? "").trim(),
      meetUrl:  (meetUrl ?? "").trim(),
      status:   "pending",
      clientId: matchingClient?.id ?? null,
      ...(workspaceId && { workspaceId }),
      ...(allAssignedIds.length > 0 && {
        assignedUsers: {
          create: allAssignedIds.map((uid) => ({ userId: uid })),
        },
      }),
    },
    include: appointmentInclude,
  });

  const dateStr = parsedDate.toLocaleDateString("es-MX", {
    weekday: "long", year: "numeric", month: "long",
    day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const isPublic = !authResult.ok;
  if (firstAdmin && isPublic) {
    const existingContact = await db.contact.findFirst({ where: { email: emailNorm } });
    if (!existingContact) {
      await db.contact.create({
        data: {
          userId:      firstAdmin.id,
          workspaceId: firstAdmin.workspaceId,
          name:        nameTrim,
          email:       emailNorm,
          phone:       (phone ?? "").trim(),
          status:      "prospect",
          company:     "",
          notes:       notes?.trim() || "",
        },
      });
    }

    try {
      await db.activity.create({
        data: {
          title:           "Videollamada con " + nameTrim + " (Prospecto)",
          description:     notes?.trim() || "Cita agendada via web. Email: " + emailNorm,
          status:          "pending",
          priority:        "high",
          startDate:       parsedDate,
          endDate:         new Date(parsedDate.getTime() + 60 * 60 * 1000),
          createdByUserId: firstAdmin.id,
          assignedUserId:  firstAdmin.id,
        },
      });
    } catch (actErr) {
      console.error("[appointments] Error creando actividad:", actErr);
    }
  }

  const notifyUsers = await db.user.findMany({
    where: {
      role: { in: ["ADMIN", "SALES_REP", "PROJECT_MANAGER"] },
      ...(workspaceId && { workspaceId }),
    },
    select: { id: true, email: true },
  });

  if (notifyUsers.length > 0) {
    await db.notification.createMany({
      data: notifyUsers.map((u) => ({
        userId:  u.id,
        message: "Nuevo prospecto: " + nameTrim + " agendo videollamada para el " + dateStr,
        type:    "appointment",
        link:    "/dashboard/calendar",
      })),
    });
    for (const u of notifyUsers) {
      if (u.email) {
        sendMail(
          u.email,
          "Nuevo prospecto: " + nameTrim,
          templateNuevaCita(nameTrim, emailNorm, dateStr, notes ?? undefined)
        ).catch(console.error);
      }
    }
  }

  sendMail(
    emailNorm,
    "Tu videollamada fue agendada - BoostMarketing",
    templateVideollamadaConfirmada(nameTrim, dateStr)
  ).catch(console.error);

  return NextResponse.json({ appointment }, { status: 201 });
}

// GET: listar citas (managers)
export async function GET(req: NextRequest) {
  const result = await requireWorkspace({ roles: ["ADMIN", "PROJECT_MANAGER", "SALES_REP"] });
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;

  const { searchParams } = new URL(req.url);
  const status   = searchParams.get("status");
  const upcoming = searchParams.get("upcoming");

  const where: Record<string, unknown> = {
    workspaceId,
    NOT: { email: { endsWith: "@internal.boost" } },
  };
  if (status) where.status = status;
  if (upcoming === "1") where.date = { gte: new Date() };

  const appointments = await db.appointment.findMany({
    where,
    orderBy: { date: "asc" },
    include: appointmentInclude,
  });
  return NextResponse.json({ appointments });
}

// PATCH: editar cita
export async function PATCH(req: NextRequest) {
  const result = await requireWorkspace({ roles: ["ADMIN", "PROJECT_MANAGER", "SALES_REP"] });
  if (!result.ok) return result.response;
  const { userId, workspaceId } = result.ctx;

  const body = await req.json();
  const { id, status, meetUrl, name, email, phone, date, notes, assignedUserIds } = body;

  if (!id) return NextResponse.json({ error: "id es requerido." }, { status: 400 });

  const existing = await db.appointment.findFirst({ where: { id, workspaceId } });
  if (!existing) return NextResponse.json({ error: "Cita no encontrada." }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  if (status  !== undefined) updateData.status  = status;
  if (meetUrl !== undefined) updateData.meetUrl = (meetUrl as string).trim();
  if (name    !== undefined) updateData.name    = (name as string).trim();
  if (email   !== undefined) updateData.email   = (email as string).trim().toLowerCase();
  if (phone   !== undefined) updateData.phone   = (phone as string).trim();
  if (notes   !== undefined) updateData.notes   = (notes as string).trim();
  if (date    !== undefined) {
    const parsed = new Date(date as string);
    if (!isNaN(parsed.getTime())) updateData.date = parsed;
  }

  if (assignedUserIds !== undefined) {
    const allPatchIds = [...new Set([userId, ...(assignedUserIds as string[])])];
    await db.appointmentAssignedUser.deleteMany({ where: { appointmentId: id } });
    if (allPatchIds.length > 0) {
      await db.appointmentAssignedUser.createMany({
        data: allPatchIds.map((uid) => ({ appointmentId: id, userId: uid })),
        skipDuplicates: true,
      });
    }
  }

  const appointment = await db.appointment.update({
    where:   { id },
    data:    updateData,
    include: appointmentInclude,
  });

  const dateStr = existing.date.toLocaleDateString("es-MX", {
    weekday: "long", year: "numeric", month: "long",
    day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  if (assignedUserIds !== undefined && (assignedUserIds as string[]).length > 0) {
    const assignedTeam = await db.user.findMany({
      where:  { id: { in: assignedUserIds as string[] } },
      select: { id: true, email: true, name: true },
    });
    for (const u of assignedTeam) {
      if (u.email) {
        sendMail(
          u.email,
          "Nueva videollamada asignada - BoostMarketing",
          templateVideollamadaConfirmada(existing.name, dateStr, existing.meetUrl || "")
        ).catch(console.error);
      }
    }
  }

  if (status === "confirmed") {
    sendMail(
      existing.email,
      "Tu videollamada fue confirmada - BoostMarketing",
      templateVideollamadaConfirmada(existing.name, dateStr, meetUrl)
    ).catch(console.error);
  }

  if (status === "cancelled") {
    sendMail(
      existing.email,
      "Tu cita fue cancelada - BoostMarketing",
      templateCitaCancelada(existing.name, dateStr)
    ).catch(console.error);
  }

  return NextResponse.json({ appointment });
}

// DELETE: eliminar cita
export async function DELETE(req: NextRequest) {
  const result = await requireWorkspace({ roles: ["ADMIN", "PROJECT_MANAGER", "SALES_REP"] });
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido." }, { status: 400 });

  const existing = await db.appointment.findFirst({ where: { id, workspaceId } });
  if (!existing) return NextResponse.json({ error: "Cita no encontrada." }, { status: 404 });

  await db.appointment.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
