import { NextRequest, NextResponse } from "next/server";
import { MANAGER_ROLES_EXT as MANAGER_ROLES } from '@/core/constants/roles';
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from "@/lib/db";
import { logAction } from "@/lib/audit";
import { sendMail, templateBienvenida } from "@/lib/mailer";
import { getBranding } from "@/lib/branding";
import { ClientCreateSchema, ClientUpdateSchema, validateBody } from "@/lib/schemas";
import { rateLimit } from "@/lib/security/rate-limit";



const clientSelect = {
  id: true,
  userId: true,
  assignedManagerId: true,
  name: true,
  email: true,
  company: true,
  phone: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  assignedManager: { select: { id: true, name: true, email: true, color: true, image: true } },
  assignedUsers: {
    include: {
      user: { select: { id: true, name: true, email: true, color: true, image: true } },
    },
  },
} as const;

async function syncClientAssignees(clientId: string, userIds: string[]) {
  await db.clientAssignedUser.deleteMany({ where: { clientId } });
  if (userIds.length === 0) return;
  await db.clientAssignedUser.createMany({
    data: userIds.map((userId) => ({ clientId, userId })),
    skipDuplicates: true,
  });
}

function flatClientAssignees(raw: { user: { id: string; name: string | null; email: string; color: string; image: string | null } }[]) {
  return raw.map((r) => r.user);
}

function formatClient(c: Record<string, unknown>) {
  const { assignedUsers, ...rest } = c;
  return {
    ...rest,
    assignedUsers: flatClientAssignees(
      (assignedUsers as { user: { id: string; name: string | null; email: string; color: string; image: string | null } }[]) ?? []
    ),
  };
}

export async function GET(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 60, windowMs: 60_000, identifier: 'clients-get' });
  if (!rl.success) return rl.response;
  const isSidebar = new URL(req.url).searchParams.get("sidebar") === "1";
  const result = await requireWorkspace({ roles: isSidebar ? ["ADMIN","PROJECT_MANAGER","SALES_REP","TEAM_MEMBER","DESIGNER","MARKETING"] as any : ["ADMIN","PROJECT_MANAGER","SALES_REP"] });
  if (!result.ok) return result.response;
  const { userId, workspaceId, role } = result.ctx;

  const { searchParams } = new URL(req.url);
  const status  = searchParams.get("status");
  const segment = searchParams.get("segment");
  const search  = searchParams.get("search")?.trim() ?? "";
  const sidebar = searchParams.get("sidebar") === "1";

  // Modo sidebar: devolver solo id, name, color para el nav
  if (sidebar) {
    const TEAM_ROLES = ['TEAM_MEMBER', 'DESIGNER', 'MARKETING'];
    const sidebarWhere: Record<string, unknown> = { workspaceId };
    if (role === 'PROJECT_MANAGER') {
      sidebarWhere.OR = [{ assignedManagerId: userId }, { assignedUsers: { some: { userId } } }];
    } else if (TEAM_ROLES.includes(role)) {
      sidebarWhere.assignedUsers = { some: { userId } };
    }
    // ADMIN y SALES_REP ven todos
    const sidebarClients = await db.client.findMany({
      where: sidebarWhere,
      select: { id: true, name: true, assignedManagerId: true, email: true,
        assignedManager: { select: { color: true } } },
      orderBy: { name: "asc" },
      take: 20,
    });

    // Buscar el userId del usuario CLIENT cuyo email coincide con cada cliente
    const emails = sidebarClients.map((c) => c.email).filter(Boolean);
    const portalUsers = emails.length > 0
      ? await db.user.findMany({
          where: { workspaceId, email: { in: emails }, role: "CLIENT" },
          select: { id: true, email: true },
        })
      : [];
    const portalUserMap = Object.fromEntries(portalUsers.map((u) => [u.email, u.id]));

    const clientsWithPortal = sidebarClients.map((c) => ({
      id: c.id,
      name: c.name,
      assignedManagerId: c.assignedManagerId,
      email: c.email,
      color: c.assignedManager?.color ?? '#8B5CF6',
      clientUserId: portalUserMap[c.email] ?? null,
    }));

    return NextResponse.json({ clients: clientsWithPortal });
  }

  const where: Record<string, unknown> = { workspaceId };

  if (role === "PROJECT_MANAGER") {
    where.OR = [{ assignedManagerId: userId }, { userId }];
  }

  if (role === "SALES_REP") {
    where.assignedUsers = { some: { userId } };
  }

  if (segment === "prospect") {
    where.status = "prospect";
  } else if (segment === "unassigned") {
    where.status            = { not: "prospect" };
    where.assignedManagerId = null;
  } else if (segment === "assigned") {
    where.assignedManagerId = { not: null };
  } else if (status && status !== "all") {
    where.status = status;
  }

  if (search) {
    const searchFilter = [
      { name:    { contains: search, mode: "insensitive" } },
      { email:   { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
    ];
    if (where.OR) {
      where.AND = [{ OR: where.OR }, { OR: searchFilter }];
      delete where.OR;
    } else {
      where.OR = searchFilter;
    }
  }

  const raw = await db.client.findMany({
    where,
    select: clientSelect,
    orderBy: { createdAt: "desc" },
  });

  const clientIds = raw.map((c) => c.id);
  const taskCounts = await db.task.groupBy({
    by: ["clientId"],
    where: { clientId: { in: clientIds }, deletedAt: null, archivedAt: null, status: { notIn: ["completed", "approved", "cancelled"] } },
    _count: { id: true },
  });
  const completedCounts = await db.task.groupBy({
    by: ["clientId"],
    where: { clientId: { in: clientIds }, deletedAt: null, archivedAt: null, status: { in: ["completed", "approved"] } },
    _count: { id: true },
  });
  const taskCountMap = Object.fromEntries(taskCounts.map((t: any) => [t.clientId, t._count.id]));
  const completedMap = Object.fromEntries(completedCounts.map((t: any) => [t.clientId, t._count.id]));
  const meetingCounts = await db.appointment.groupBy({
    by: ["clientId"],
    where: { clientId: { in: clientIds } },
    _count: { id: true },
  });
  const meetingCountMap = Object.fromEntries(meetingCounts.map((t: any) => [t.clientId, t._count.id]));
  const clients = raw.map((c) => {
    const total = taskCountMap[c.id] ?? 0;
    const completed = completedMap[c.id] ?? 0;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { ...formatClient(c as unknown as Record<string, unknown>), activeTasks: total, completedTasks: completed, progress, meetings: meetingCountMap[c.id] ?? 0 };
  });
  return NextResponse.json({ clients });
}

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 20, windowMs: 60_000, identifier: "clients-post" });
  if (!rl.success) return rl.response;
  const result = await requireWorkspace({ roles: ["ADMIN", "PROJECT_MANAGER", "SALES_REP"] });
  if (!result.ok) return result.response;
  const { userId, workspaceId, role } = result.ctx;

  const rawBody = await req.json();
  const validation = validateBody(ClientCreateSchema, rawBody);
  if (!validation.success) return NextResponse.json({ error: validation.error }, { status: 400 });
  const body = validation.data;
  const { name, email, company, phone, status, assignedManagerId } = body;
  const assignedUserIds = (rawBody as Record<string, unknown>).assignedUserIds;

  const resolvedManagerId = role === "ADMIN"
    ? (assignedManagerId || null)
    : userId;

  const client = await db.client.create({
    data: {
      userId,
      workspaceId,
      assignedManagerId: resolvedManagerId,
      name,
      email,
      company: company || "",
      phone:   phone   || "",
      status:  status  || "active",
    },
    select: clientSelect,
  });

  if (Array.isArray(assignedUserIds) && assignedUserIds.length > 0) {
    await syncClientAssignees(client.id, assignedUserIds as string[]);
  }

  await db.activityLog.create({
    data: {
      userId,
      workspaceId,
      action:   "CREATE_CLIENT",
      entity:   "Client",
      entityId: client.id,
      details:  JSON.stringify({ name: client.name, email: client.email }),
    },
  });

  if (resolvedManagerId) {
    try {
      const pm = await db.user.findFirst({
        where:  { id: resolvedManagerId },
        select: { email: true, name: true },
      });
      if (pm?.email) {
        const branding = await getBranding();
        await sendMail(
          pm.email,
          `Nuevo cliente asignado: ${name}`,
          templateBienvenida(`${pm.name || "PM"} — se te asignó el cliente ${name} (${email})`, branding)
        );
      }
    } catch (e) {
      console.error("[clients POST] email PM error:", e);
    }
  }

  await logAction({ userId, workspaceId, action: "CLIENT_CREATED", entity: "client", entityId: client.id, details: { name: client.name } });

  const fresh = await db.client.findFirst({ where: { id: client.id, workspaceId }, select: clientSelect });
  return NextResponse.json({ client: formatClient(fresh as unknown as Record<string, unknown>) }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 40, windowMs: 60_000, identifier: "clients-put" });
  if (!rl.success) return rl.response;
  const result = await requireWorkspace({ roles: ["ADMIN", "PROJECT_MANAGER", "SALES_REP"] });
  if (!result.ok) return result.response;
  const { userId, workspaceId, role } = result.ctx;

  const rawBody = await req.json();
  const validation = validateBody(ClientUpdateSchema, rawBody);
  if (!validation.success) return NextResponse.json({ error: validation.error }, { status: 400 });
  const body = validation.data;
  const { id, name, email, company, phone, status, assignedManagerId } = body;
  const assignedUserIds = (rawBody as Record<string, unknown>).assignedUserIds;

  if (!id) return NextResponse.json({ error: "El id es requerido" }, { status: 400 });

  const existing = await db.client.findFirst({ where: { id, workspaceId } });
  if (!existing) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  if (role === "PROJECT_MANAGER" && existing.userId !== userId && existing.assignedManagerId !== userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const updateData: Record<string, unknown> = {};
  if (name    !== undefined) updateData.name    = name;
  if (email   !== undefined) updateData.email   = email;
  if (company !== undefined) updateData.company = company;
  if (phone   !== undefined) updateData.phone   = phone;
  if (status  !== undefined) updateData.status  = status;
  if (assignedManagerId !== undefined && role === "ADMIN") {
    updateData.assignedManagerId = assignedManagerId || null;
  }

  const client = await db.client.update({
    where:  { id },
    data:   updateData,
    select: clientSelect,
  });

  if (Array.isArray(assignedUserIds)) {
    await syncClientAssignees(id, assignedUserIds as string[]);
  }

  await db.activityLog.create({
    data: {
      userId,
      workspaceId,
      action:   "UPDATE_CLIENT",
      entity:   "Client",
      entityId: client.id,
      details:  JSON.stringify(updateData),
    },
  });

  const fresh = await db.client.findFirst({ where: { id: client.id, workspaceId }, select: clientSelect });
  return NextResponse.json({ client: formatClient(fresh as unknown as Record<string, unknown>) });
}

export async function DELETE(req: NextRequest) {
  const result = await requireWorkspace({ roles: ["ADMIN", "PROJECT_MANAGER", "SALES_REP"] });
  if (!result.ok) return result.response;
  const { userId, workspaceId, role } = result.ctx;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "El id es requerido" }, { status: 400 });

  const existing = await db.client.findFirst({ where: { id, workspaceId } });
  if (!existing) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  if (role === "PROJECT_MANAGER" && existing.userId !== userId && existing.assignedManagerId !== userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  await db.client.delete({ where: { id } });

  await db.activityLog.create({
    data: {
      userId,
      workspaceId,
      action:   "DELETE_CLIENT",
      entity:   "Client",
      entityId: id,
      details:  JSON.stringify({ name: existing.name }),
    },
  });

  return NextResponse.json({ message: "Cliente eliminado" });
}
