import { NextRequest, NextResponse } from "next/server";
import { MeetingCreateSchema, MeetingUpdateSchema, validateBody } from "@/lib/schemas";
import { rateLimit } from "@/lib/security/rate-limit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendMail, templateNuevaReunion } from "@/lib/mailer";

const MANAGER_ROLES = ["ADMIN", "PROJECT_MANAGER"];

const include = {
  assignedUsers: { include: { user: { select: { id: true, name: true, email: true, color: true, image: true } } } },
} as const;

async function requireManager() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !MANAGER_ROLES.includes(session.user.role as string)) return null;
  return session;
}

export async function GET(req: NextRequest) {
  const session = await requireManager();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const where: Record<string, unknown> = { email: { contains: "@internal.boost" } };
  if (status) where.status = status;
  const meetings = await db.appointment.findMany({ where, orderBy: { date: "asc" }, include });
  return NextResponse.json({ meetings });
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { limit: 20, windowMs: 60_000, identifier: "meeting-post" });
  if (!rl.success) return rl.response;
  const session = await requireManager();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const rawBody = await req.json();
  const validation = validateBody(MeetingCreateSchema, rawBody);
  if (!validation.success) return NextResponse.json({ error: validation.error }, { status: 400 });
  const { name, date, notes, meetUrl, assignedUserIds, status } = validation.data;
  const parsed = new Date(date);
  // Auto-asignar al creador
  const creatorId = (session.user as any).id;
  const allMeetingIds = [...new Set([creatorId, ...(assignedUserIds ?? [])])] as string[];
  const meeting = await db.appointment.create({
    data: {
      name: name.trim(),
      email: "internal@internal.boost",
      phone: "",
      date: parsed,
      notes: (notes ?? "").trim(),
      meetUrl: (meetUrl ?? "").trim(),
      status: (status as string) || "pending",
      assignedUsers: { create: allMeetingIds.map((uid: string) => ({ userId: uid })) },
    },
    include,
  });
  // Notificar a asignados
  if ((assignedUserIds?.length ?? 0) > 0) {
    const dateStr = parsed.toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
    const team = await db.user.findMany({ where: { id: { in: assignedUserIds as string[] } }, select: { email: true, name: true } });
    for (const u of team) {
      if (u.email) sendMail(u.email, "Nueva reunion asignada - BoostMarketing", templateNuevaReunion(u.name || u.email, name.trim(), dateStr, (meetUrl ?? "").trim())).catch(console.error);
    }
  }
  return NextResponse.json({ meeting }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await requireManager();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { id, status, meetUrl, name, date, notes, assignedUserIds } = await req.json();
  if (!id) return NextResponse.json({ error: "id requerido." }, { status: 400 });
  const data: Record<string, unknown> = {};
  if (status  !== undefined) data.status  = status;
  if (meetUrl !== undefined) data.meetUrl = (meetUrl as string).trim();
  if (name    !== undefined) data.name    = (name as string).trim();
  if (notes   !== undefined) data.notes   = (notes as string).trim();
  if (date    !== undefined) { const p = new Date(date as string); if (!isNaN(p.getTime())) data.date = p; }
  if (assignedUserIds !== undefined) {
    await db.appointmentAssignedUser.deleteMany({ where: { appointmentId: id } });
    if ((assignedUserIds as string[]).length > 0) {
      await db.appointmentAssignedUser.createMany({
        data: (assignedUserIds as string[]).map((uid) => ({ appointmentId: id, userId: uid })),
        skipDuplicates: true,
      });
    }
  }
  const meeting = await db.appointment.update({ where: { id }, data, include });
  // Notificar a nuevos asignados
  if (assignedUserIds !== undefined && (assignedUserIds as string[]).length > 0) {
    const upd = await db.appointment.findUnique({ where: { id }, select: { name: true, date: true, meetUrl: true } });
    if (upd) {
      const dateStr = new Date(upd.date).toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
      const team = await db.user.findMany({ where: { id: { in: assignedUserIds as string[] } }, select: { email: true } });
      for (const u of team) {
        if (u.email) sendMail(u.email, "Reunion actualizada - BoostMarketing", templateNuevaReunion(u.email, upd.name, dateStr, upd.meetUrl || "")).catch(console.error);
      }
    }
  }
  return NextResponse.json({ meeting });
}

export async function DELETE(req: NextRequest) {
  const session = await requireManager();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido." }, { status: 400 });
  await db.appointment.delete({ where: { id } });
  return NextResponse.json({ success: true });
}