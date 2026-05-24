import { NextRequest, NextResponse } from "next/server";
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from "@/lib/db";
import { logAction } from "@/lib/audit";
import { sendMail, templateBienvenida } from "@/lib/mailer";
import { getBranding } from "@/lib/branding";
import { ClientCreateSchema, ClientUpdateSchema, validateBody } from "@/lib/schemas";
import { rateLimit } from "@/lib/security/rate-limit";

const MANAGE_ROLES = ["ADMIN", "PROJECT_MANAGER", "SALES_REP"];

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
  const result = await requireWorkspace({ roles: ["ADMIN", "PROJECT_MANAGER", "SALES_REP"] });
  if (!result.ok) return result.response;
  const { userId, workspaceId, role } = result.ctx;

  const { searchParams } = new URL(req.url);
  const status  = searchParams.get("status");
  const segment = searchParams.get("segment");
  const search  = searchParams.get("search")?.trim() ?? "";

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

  const clients = raw.map((c) => formatClient(c as unknown as Record<string, unknown>));
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

  await logAction({ userId, action: "CLIENT_CREATED", entity: "client", entityId: client.id, details: { name: client.name } });

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
      action:   "DELETE_CLIENT",
      entity:   "Client",
      entityId: id,
      details:  JSON.stringify({ name: existing.name }),
    },
  });

  return NextResponse.json({ message: "Cliente eliminado" });
}
