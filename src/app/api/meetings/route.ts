import { NextRequest, NextResponse } from "next/server";
import { MeetingCreateSchema, MeetingUpdateSchema, validateBody } from "@/lib/schemas";
import { rateLimit } from "@/lib/security/rate-limit";
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from "@/lib/db";
import { sendMail, templateNuevaReunion } from "@/lib/mailer";
import { getBranding } from "@/lib/branding";
import { broadcastRealtime } from '@/lib/realtime-server';

const include = {
  assignedUsers: { include: { user: { select: { id: true, name: true, email: true, color: true, image: true } } } },
} as const;

export async function GET(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 60, windowMs: 60_000, identifier: 'meetings-get' });
  if (!rl.success) return rl.response;
  const result = await requireWorkspace({ roles: ["ADMIN", "PROJECT_MANAGER"] });
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const where: Record<string, unknown> = { workspaceId };
  if (status) where.status = status;
  const meetings = await db.appointment.findMany({ where, orderBy: { date: "asc" }, include });
  return NextResponse.json({ meetings });
}

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 20, windowMs: 60_000, identifier: "meeting-post" });
  if (!rl.success) return rl.response;
  const result = await requireWorkspace({ roles: ["ADMIN", "PROJECT_MANAGER"] });
  if (!result.ok) return result.response;
  const { userId, workspaceId } = result.ctx;
  const rawBody = await req.json();
  const validation = validateBody(MeetingCreateSchema, rawBody);
  if (!validation.success) return NextResponse.json({ error: validation.error }, { status: 400 });
  const { name, date, notes, meetUrl, assignedUserIds, status } = validation.data;
  const parsed = new Date(date);
  const allMeetingIds = [...new Set([userId, ...(assignedUserIds ?? [])])] as string[];
  const meeting = await db.appointment.create({
    data: {
      name: name.trim(),
      email: "internal@internal.boost",
      phone: "",
      date: parsed,
      notes: (notes ?? "").trim(),
      meetUrl: (meetUrl ?? "").trim(),
      status: (status as string) || "pending",
      workspaceId,
      assignedUsers: { create: allMeetingIds.map((uid: string) => ({ userId: uid })) },
    },
    include,
  });
  if ((assignedUserIds?.length ?? 0) > 0) {
    const dateStr = parsed.toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
    const team = await db.user.findMany({ where: { id: { in: assignedUserIds as string[] } }, select: { email: true, name: true } });
    for (const u of team) {
      if (u.email) getBranding().then(b => sendMail(u.email!, "Nueva reunion asignada - BoostMarketing", templateNuevaReunion(u.name || u.email!, name.trim(), dateStr, (meetUrl ?? "").trim(), b))).catch(console.error);
    }
  }
  // Broadcast MEETING_SCHEDULED para toasts en tiempo real (non-blocking)
  broadcastRealtime('meeting.scheduled', {
    meeting: { id: meeting.id, title: name.trim(), date: parsed.toISOString() },
    scheduledBy: result.ctx.name || result.ctx.email,
    assignedUserIds: allMeetingIds,
  }).catch(() => {});
  return NextResponse.json({ meeting }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const result = await requireWorkspace({ roles: ["ADMIN", "PROJECT_MANAGER"] });
  if (!result.ok) return result.response;
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
  if (assignedUserIds !== undefined && (assignedUserIds as string[]).length > 0) {
    const upd = await db.appointment.findFirst({ where: { id }, select: { name: true, date: true, meetUrl: true } });
    if (upd) {
      const dateStr = new Date(upd.date).toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
      const team = await db.user.findMany({ where: { id: { in: assignedUserIds as string[] } }, select: { email: true, name: true } });
      for (const u of team) {
        if (u.email) getBranding().then(b => sendMail(u.email!, "Reunion actualizada - BoostMarketing", templateNuevaReunion(u.name || u.email!, upd.name, dateStr, upd.meetUrl || "", b))).catch(console.error);
      }
    }
  }
  return NextResponse.json({ meeting });
}

export async function DELETE(req: NextRequest) {
  const result = await requireWorkspace({ roles: ["ADMIN", "PROJECT_MANAGER"] });
  if (!result.ok) return result.response;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido." }, { status: 400 });
  await db.appointment.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
