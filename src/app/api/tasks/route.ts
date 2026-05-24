import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAction } from "@/lib/audit";
import { normalizeTaskStatus } from "@/lib/task-status";
import {
  sendMail,
  templateNuevaTarea,
  templateCambioEstado,
  templateTareaCompletada,
  templateTareaEditada,
  templateEntregaListaParaRevisar,
} from "@/lib/mailer";
import { getBranding, type Branding } from "@/lib/branding";
import { getSessionUser } from "@/core/auth/get-session-user";
import { AccessControl } from "@/core/access/access-control";
import { TaskCreateSchema, TaskUpdateSchema, validateBody } from "@/lib/schemas";
import { rateLimit } from "@/lib/security/rate-limit";

const MANAGER_ROLES = ["ADMIN", "PROJECT_MANAGER"];

const userInclude = {
  select: { id: true, name: true, email: true, color: true, image: true },
};

function flattenTask(task: any) {
  if (!task) return task;
  return {
    ...task,
    assignedUsers: (task.assignedUsers ?? []).map((au: any) =>
      au.user ? { ...au.user } : au
    ),
  };
}
function flattenTasks(tasks: any[]) { return tasks.map(flattenTask); }

const clientInclude = {
  select: {
    id: true,
    name: true,
    company: true,
    assignedManagerId: true,
    assignedUsers: { select: { userId: true } },
  },
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // FASE 1: usar user context normalizado
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userId      = user.id;
  const workspaceId = (user as any).workspaceId as string | null;
  const role        = user.role;
  if (!workspaceId) return NextResponse.json({ error: 'Workspace no encontrado' }, { status: 400 });
  const isAdmin     = role === "ADMIN";
  const isPM      = role === "PROJECT_MANAGER";
  const isManager = isAdmin || isPM;
  const isClient  = role === "CLIENT";
  const scope     = req.nextUrl.searchParams.get("scope");

  if (scope === "mine") {
    let clientRecord: { id: string } | null = null;
    if (isClient) {
      clientRecord = await db.client.findFirst({
        where: { email: { equals: user.email, mode: "insensitive" } },
        select: { id: true },
      });
    }

    const tasks = await db.task.findMany({
      where: {
        archivedAt: null,
        ...(workspaceId && { workspaceId }),
        OR: [
          { userId },
          { assignedUserId: userId },
          { assignedUsers: { some: { userId } } },
          ...(isClient && clientRecord
            ? [{ clientId: clientRecord.id, visibility: "client_visible" }]
            : []),
        ],
      },
      include: {
        assignedUser:  userInclude,
        assignedUsers: { include: { user: userInclude } },
        client:        clientInclude,
      },
      orderBy: { createdAt: "desc" },
    });

    const flattened = flattenTasks(tasks);
    const filtered  = flattened.filter((t: any) => AccessControl.canViewTask(user, t));
    return NextResponse.json({ tasks: filtered });
  }

  if (scope === "clients-with-tasks") {
    let clientIds: string[] | null = null;
    if (!isAdmin) {
      const assignments = await db.clientAssignedUser.findMany({
        where: { userId },
        select: { clientId: true },
      });
      if (isPM) {
        const managed = await db.client.findMany({
          where: { assignedManagerId: userId },
          select: { id: true },
        });
        const allIds = new Set([
          ...assignments.map((a) => a.clientId),
          ...managed.map((c) => c.id),
        ]);
        clientIds = [...allIds];
      } else {
        clientIds = assignments.map((a) => a.clientId);
      }
      if (clientIds.length === 0) return NextResponse.json({ clients: [] });
    }

    const clients = await db.client.findMany({
      where: clientIds ? { id: { in: clientIds }, ...(workspaceId && { workspaceId }) } : { ...(workspaceId && { workspaceId }) },
      select: { id: true, name: true, company: true, assignedManagerId: true },
      orderBy: { name: "asc" },
    });

    const result = await Promise.all(
      clients.map(async (client) => {
        const taskWhere: any = {
          clientId: client.id,
          ...(isClient && { visibility: "client_visible" }),
        };
        if (!isAdmin && isPM) {
          taskWhere.userId = userId;
        } else if (!isAdmin && !isPM) {
          taskWhere.OR = [
            { assignedUserId: userId },
            { assignedUsers: { some: { userId } } },
          ];
        }
        const tasks = await db.task.findMany({
          where: taskWhere,
          include: {
            assignedUser:  userInclude,
            assignedUsers: { include: { user: userInclude } },
            client:        clientInclude,
          },
          orderBy: { createdAt: "desc" },
        });
        const flattened = flattenTasks(tasks);
        const filtered  = flattened.filter((t: any) => AccessControl.canViewTask(user, t));
        return { ...client, tasks: filtered };
      })
    );

    return NextResponse.json({ clients: result.filter((c) => c.tasks.length > 0) });
  }

  const parentId = req.nextUrl.searchParams.get("parentId");
  if (parentId) {
    const subtasks = await db.task.findMany({
      where: { parentTaskId: parentId, archivedAt: null },
      include: {
        assignedUser:  userInclude,
        assignedUsers: { include: { user: userInclude } },
        client:        clientInclude,
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ tasks: flattenTasks(subtasks) });
  }

  if (scope === "all" && isManager) {
    // ADMIN ve todo — PM solo ve tareas de sus clientes asignados
    let whereAll: any = { archivedAt: null, ...(workspaceId && { workspaceId }) };
    if (!isAdmin) {
      const managedClients = await db.client.findMany({
        where: { assignedManagerId: userId },
        select: { id: true },
      });
      const assignedClients = await db.clientAssignedUser.findMany({
        where: { userId },
        select: { clientId: true },
      });
      const allClientIds = [
        ...new Set([
          ...managedClients.map((c) => c.id),
          ...assignedClients.map((c) => c.clientId),
        ]),
      ];
      whereAll = {
        archivedAt: null,
        OR: [
          { userId },
          { assignedUserId: userId },
          { assignedUsers: { some: { userId } } },
          ...(allClientIds.length > 0 ? [{ clientId: { in: allClientIds } }] : []),
        ],
      };
    }
    const tasks = await db.task.findMany({
      where: whereAll,
      include: {
        assignedUser:  userInclude,
        assignedUsers: { include: { user: userInclude } },
        client:        clientInclude,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ tasks: flattenTasks(tasks) });
  }

  // Fallback — mismo comportamiento que antes
  const tasks = await db.task.findMany({
    where: isClient
      ? { assignedUserId: userId, archivedAt: null, ...(workspaceId && { workspaceId }) }
      : {
          archivedAt: null,
          ...(workspaceId && { workspaceId }),
          OR: [
            { userId },
            { assignedUserId: userId },
            { assignedUsers: { some: { userId } } },
          ],
        },
    include: {
      assignedUser:  userInclude,
      assignedUsers: { include: { user: userInclude } },
      client:        clientInclude,
    },
    orderBy: { createdAt: "desc" },
  });

  const flattened = flattenTasks(tasks as any[]);
  const filtered  = flattened.filter((t: any) => AccessControl.canViewTask(user, t));
  return NextResponse.json({ tasks: filtered });
}

async function getAssignedEmails(taskId: string): Promise<Set<string>> {
  const t = await db.task.findUnique({
    where: { id: taskId },
    include: {
      assignedUser:  { select: { email: true } },
      assignedUsers: { include: { user: { select: { email: true } } } },
    },
  });
  const emails = new Set<string>();
  if (t?.assignedUser?.email) emails.add(t.assignedUser.email);
  t?.assignedUsers?.forEach((au: any) => { if (au.user?.email) emails.add(au.user.email); });
  return emails;
}

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 30, windowMs: 60_000, identifier: 'tasks-post' });
  if (!rl.success) return rl.response;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userId      = session.user.id;
  const workspaceId = session.user.workspaceId as string | null;
  const isManager   = MANAGER_ROLES.includes(session.user.role as string);
  if (!workspaceId) return NextResponse.json({ error: 'Workspace no encontrado' }, { status: 400 });
  const rawBody     = await req.json();
  const validation = validateBody(TaskCreateSchema, rawBody);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const body = validation.data;
  const { title, description, priority, dueDate, assignedUserIds, clientId, visibility, references, type: taskType, parentTaskId, milestoneId } = body;
  const _assignedUserId = (body as any).assignedUserId;
  const assignedUserId = _assignedUserId || (Array.isArray(assignedUserIds) && assignedUserIds[0]) || null;

  if (!title) return NextResponse.json({ error: "Titulo requerido" }, { status: 400 });

  // Para subtareas: si assignedUserIds viene vacío, no forzar al creador
  const finalAssignedIds = isManager && Array.isArray(assignedUserIds) && assignedUserIds.length > 0
    ? [...new Set([userId, ...assignedUserIds])]
    : parentTaskId
      ? (Array.isArray(assignedUserIds) && assignedUserIds.length > 0 ? assignedUserIds : [userId])
      : [userId];

  // Clientes pueden crear tareas vinculadas a su propio clientId
  const isClient = session.user.role === 'CLIENT';
  let resolvedClientId = isManager ? (clientId || null) : null;
  if (isClient && clientId) resolvedClientId = clientId;

  // Si es subtarea, heredar clientId del padre si no se especificó
  if (parentTaskId && !resolvedClientId) {
    const parentTask = await db.task.findUnique({
      where: { id: parentTaskId },
      select: { clientId: true },
    });
    if (parentTask?.clientId) resolvedClientId = parentTask.clientId;
  }

  const resolvedVisibility = parentTaskId
    ? "internal"
    : isManager
      ? (visibility || "internal")
      : isClient ? "client_visible" : "internal";

  const task = await db.task.create({
    data: {
      userId,
      title,
      description: description || "",
      priority:    priority    || "medium",
      dueDate:     dueDate     ? new Date(dueDate) : null,
      startDate:   body.startDate ? new Date(body.startDate) : null,
      assignedUserId: isManager ? assignedUserId || null : null,
      clientId:       resolvedClientId,
      visibility:     resolvedVisibility,
      type:           parentTaskId ? 'internal_task' : (taskType || (resolvedVisibility === 'client_visible' ? 'deliverable' : 'internal_task')),
      isDeliverable:  parentTaskId ? false : (isClient ? true : (isManager && resolvedClientId ? true : false)),
      deliverableStatus: parentTaskId ? null : (isClient ? 'draft' : (isManager && resolvedClientId ? 'client_review' : null)),
      // REGLA 3: si tiene cliente asignado -> auto in_progress
      status: resolvedClientId && !parentTaskId ? 'in_progress' : 'pending',
      references:     Array.isArray(references) ? references : [],
      parentTaskId:   parentTaskId || null,
      milestoneId:    milestoneId  || null,
      ...(workspaceId && { workspaceId }),
      assignedUsers: { create: finalAssignedIds.map((uid: string) => ({ userId: uid })) },
    },
    include: { assignedUser: userInclude, assignedUsers: { include: { user: userInclude } }, client: clientInclude },
  });

  const dueDateStr = task.dueDate ? new Date(task.dueDate).toLocaleDateString("es-MX") : undefined;
  const branding = await getBranding();
  // Obtener asignados con nombre para personalizar email
  const assignedWithNames = [
    ...(task.assignedUser ? [{ email: task.assignedUser.email, name: task.assignedUser.name }] : []),
    ...(task.assignedUsers?.map((au: any) => ({ email: au.user?.email, name: au.user?.name })) ?? []),
  ].filter((u, i, arr) => u.email && arr.findIndex(x => x.email === u.email) === i);
  for (const u of assignedWithNames) {
    if (u.email) await sendMail(u.email, "Nueva tarea asignada - BoostMarketing", templateNuevaTarea(task.title, task.description ?? "", dueDateStr, branding, u.name ?? undefined));
  }

  await logAction({ userId, action: "TASK_CREATED", entity: "task", entityId: task.id, details: { title: task.title } });
  return NextResponse.json({ task: flattenTask(task) }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 60, windowMs: 60_000, identifier: 'tasks-put' });
  if (!rl.success) return rl.response;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userId      = session.user.id;
  const workspaceId = session.user.workspaceId as string | null;
  const userName    = session.user.name || "Un usuario";
  const isManager   = MANAGER_ROLES.includes(session.user.role as string);
  if (!workspaceId) return NextResponse.json({ error: 'Workspace no encontrado' }, { status: 400 });
  const rawBody    = await req.json();
  const validation = validateBody(TaskUpdateSchema, rawBody);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const body = validation.data;
  const { id, title, description, status, priority, dueDate, startDate, assignedUserId, assignedUserIds, clientId, visibility, references, milestoneId, phase, type: taskType } = body as any;

  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  const existing = await db.task.findUnique({
    where:   { id },
    include: {
      assignedUser:  userInclude,
      assignedUsers: { include: { user: userInclude } },
    },
  });
  if (!existing) return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });

  if (isManager && Array.isArray(assignedUserIds)) {
    const allIds = [...new Set([userId, ...assignedUserIds])];
    await db.taskAssignedUser.deleteMany({ where: { taskId: id } });
    if (allIds.length > 0) {
      const validUsers = await db.user.findMany({
        where: { id: { in: allIds } },
        select: { id: true },
      });
      const validIds = validUsers.map((u: { id: string }) => u.id);
      if (validIds.length > 0) {
        await db.taskAssignedUser.createMany({
          data: validIds.map((uid: string) => ({ taskId: id, userId: uid })),
          skipDuplicates: true,
        });
      }
    }
  }

  const task = await db.task.update({
    where: { id },
    data: {
      ...(title       !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(priority    !== undefined && { priority }),
      ...(dueDate     !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(startDate   !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(status      !== undefined && { status: normalizeTaskStatus(status) }),
      ...(isManager && assignedUserId !== undefined && { assignedUserId }),
      ...(isManager && clientId       !== undefined && { clientId }),
      ...(isManager && visibility !== undefined && { visibility }),
      ...(isManager && visibility === 'internal' && { isDeliverable: false, deliverableStatus: null }),
      ...(isManager && visibility === 'client_visible' && { isDeliverable: true }),
      ...(milestoneId !== undefined && { milestoneId: milestoneId || null }),
      ...(phase !== undefined && { phase }),
      ...(taskType !== undefined && { type: taskType }),
      ...(references !== undefined && { references: Array.isArray(references) ? references : [] }),
    },
    include: { assignedUser: userInclude, assignedUsers: { include: { user: userInclude } }, client: clientInclude },
  });

  // Log de cambio de status para deliverables
  if (task.isDeliverable && status && existing.status !== task.status) {
    await db.deliverableLog.create({
      data: {
        taskId: id,
        status: task.status,
        note: '',
        createdBy: userName,
      },
    }).catch(() => {});
  }

  if (status && existing.status !== task.status) {
    const notifyIds = new Set<string>();
    if (task.clientId) {
      const clientTeam = await db.client.findUnique({
        where: { id: task.clientId },
        include: { assignedUsers: { include: { user: true } }, assignedManager: true },
      });
      if (clientTeam?.assignedManager?.id) notifyIds.add(clientTeam.assignedManager.id);
      clientTeam?.assignedUsers?.forEach((au: any) => notifyIds.add(au.user.id));
    } else {
      if (task.assignedUser?.id) notifyIds.add(task.assignedUser.id);
      existing.assignedUsers?.forEach((au: any) => notifyIds.add(au.user.id));
    }
    notifyIds.delete(userId);
    for (const uid of notifyIds) {
      await db.notification.create({
        data: { userId: uid, message: `"${task.title}" cambio a estado: ${task.status}`, type: "task", link: "/dashboard/tasks" },
      });
    }
    const _branding = await getBranding();
    const _taskWithUsers = await db.task.findUnique({
      where: { id: task.id },
      include: {
        assignedUser:  { select: { email: true, name: true } },
        assignedUsers: { include: { user: { select: { email: true, name: true } } } },
      },
    });
    const _assignedUsers = [
      ...(_taskWithUsers?.assignedUser ? [{ email: _taskWithUsers.assignedUser.email, name: _taskWithUsers.assignedUser.name }] : []),
      ...(_taskWithUsers?.assignedUsers?.map((au: any) => ({ email: au.user?.email, name: au.user?.name })) ?? []),
    ].filter((u, i, arr) => u.email && arr.findIndex(x => x.email === u.email) === i);
    for (const u of _assignedUsers) {
      if (u.email) await sendMail(u.email, "Estado de tarea actualizado", templateCambioEstado(task.title, existing.status ?? "pending", task.status ?? "pending", _branding, u.name ?? undefined));
    }
    if (task.status === "completed") {
      for (const u of _assignedUsers) {
        if (u.email) getBranding().then(b => sendMail(u.email!, "Tarea completada - BoostMarketing", templateTareaCompletada(task.title, userName, b))).catch(console.error);
      }
    }

    // F1 — Notificación inmediata al pasar a internal_review
    if (task.status === "internal_review" && existing.status !== "internal_review") {
      // Buscar PM: 1) PM del cliente, 2) creador de la tarea si es manager, 3) primer ADMIN del workspace
      const clienteConPM = task.clientId
        ? await db.client.findUnique({
            where: { id: task.clientId },
            select: { assignedManagerId: true, assignedManager: { select: { id: true, email: true, name: true } } },
          })
        : null;

      let pm = clienteConPM?.assignedManager ?? null;

      // Fallback: si la tarea no tiene cliente, buscar el creador si es ADMIN o PM
      if (!pm && task.userId && task.userId !== userId) {
        const creator = await db.user.findUnique({
          where: { id: task.userId },
          select: { id: true, email: true, name: true, role: true },
        });
        if (creator && ["ADMIN", "PROJECT_MANAGER"].includes(creator.role)) {
          pm = creator;
        }
      }

      // Último fallback: primer ADMIN del workspace
      if (!pm) {
        const workspaceId = session.user.workspaceId as string | null;
        const admin = await db.user.findFirst({
          where: {
            role: "ADMIN",
            ...(workspaceId && { workspaceId }),
          },
          select: { id: true, email: true, name: true },
        });
        if (admin && admin.id !== userId) pm = admin;
      }
      if (pm) {
        await db.notification.create({
          data: {
            userId:  pm.id,
            message: `⏳ ${userName} terminó: "${task.title}" — lista para revisar`,
            type:    "task",
            read:    false,
            link:    "/dashboard/tasks",
          },
        });
        if (pm.email) {
          sendMail(pm.email, `⏳ Tarea lista para revisión: ${task.title}`,
            `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><meta name="color-scheme" content="light only"/></head>
            <body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f7" style="padding:32px 16px;"><tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">
                <tr><td bgcolor="#7c3aed" style="background:linear-gradient(135deg,#7c3aed,#9333ea);padding:28px 32px;text-align:center;">
                  <h1 style="margin:0;font-size:20px;color:#fff;font-weight:700;">BoostMarketing</h1>
                </td></tr>
                <tr><td style="padding:32px;background-color:#ffffff;color:#18181b;font-size:15px;line-height:1.6;">
                  <h2 style="color:#18181b;margin:0 0 12px;font-size:20px;">⏳ Tarea lista para revisión</h2>
                  <p style="color:#6b7280;"><strong style="color:#18181b;">${userName}</strong> marcó como terminada: <strong style="color:#18181b;">${task.title}</strong></p>
                  <div style="text-align:center;margin-top:24px;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ""}/dashboard/tasks" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Revisar ahora</a>
                  </div>
                </td></tr>
                <tr><td bgcolor="#f9fafb" style="background-color:#f9fafb;border-top:1px solid #e4e4e7;padding:16px 32px;text-align:center;">
                  <p style="margin:0;color:#9ca3af;font-size:12px;">BoostMarketing &copy; ${new Date().getFullYear()} &middot; Mensaje automático</p>
                </td></tr>
              </table></td></tr></table>
            </body></html>`
          ).catch(console.error);
        }
      }
    }

    // F1 — Notificar al equipo cuando PM aprueba o pide cambios
    if (
      (task.status === "completed" || task.status === "changes_requested") &&
      (existing.status === "internal_review")
    ) {
      const asignados = new Set<string>();
      if (existing.assignedUser?.id) asignados.add(existing.assignedUser.id);
      existing.assignedUsers?.forEach((au: any) => { if (au.user?.id) asignados.add(au.user.id); });
      asignados.delete(userId);

      const mensaje = task.status === "completed"
        ? `✅ Tu tarea "${task.title}" fue aprobada`
        : `🔄 Se pidieron cambios en "${task.title}"`;

      for (const uid of asignados) {
        await db.notification.create({
          data: { userId: uid, message: mensaje, type: "task", read: false, link: "/dashboard/tasks" },
        });
      }
      for (const u of _assignedUsers) {
        if (!u.email) continue;
        sendMail(
          u.email,
          task.status === "completed" ? `✅ Tarea aprobada: ${task.title}` : `🔄 Cambios solicitados: ${task.title}`,
          `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><meta name="color-scheme" content="light only"/></head>
          <body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f7" style="padding:32px 16px;"><tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">
              <tr><td bgcolor="#7c3aed" style="background:linear-gradient(135deg,#7c3aed,#9333ea);padding:28px 32px;text-align:center;">
                <h1 style="margin:0;font-size:20px;color:#fff;font-weight:700;">BoostMarketing</h1>
              </td></tr>
              <tr><td style="padding:32px;background-color:#ffffff;color:#18181b;font-size:15px;line-height:1.6;">
                <h2 style="color:#18181b;margin:0 0 12px;font-size:20px;">${task.status === "completed" ? "✅ Tarea aprobada" : "🔄 Se solicitaron cambios"}</h2>
                <p style="color:#6b7280;">La tarea <strong style="color:#18181b;">${task.title}</strong> ${task.status === "completed" ? "fue aprobada por el PM." : "requiere cambios según el PM."}</p>
                <div style="text-align:center;margin-top:24px;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ""}/dashboard/tasks" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Ver tarea</a>
                </div>
              </td></tr>
              <tr><td bgcolor="#f9fafb" style="background-color:#f9fafb;border-top:1px solid #e4e4e7;padding:16px 32px;text-align:center;">
                <p style="margin:0;color:#9ca3af;font-size:12px;">BoostMarketing &copy; ${new Date().getFullYear()} &middot; Mensaje automático</p>
              </td></tr>
            </table></td></tr></table>
          </body></html>`
        ).catch(console.error);
      }
    }

    return NextResponse.json({ task: flattenTask(task) });
  }

  if (isManager && assignedUserId && assignedUserId !== existing.assignedUserId) {
    const newAssignee = await db.user.findUnique({ where: { id: assignedUserId }, select: { id: true, email: true, name: true } });
    if (newAssignee && newAssignee.id !== userId) {
      await db.notification.create({
        data: { userId: newAssignee.id, message: `${userName} te asigno la tarea: "${task.title}"`, type: "task", link: "/dashboard/tasks" },
      });
      if (newAssignee.email) {
        getBranding().then(b => sendMail(newAssignee.email!, "Nueva tarea asignada", templateNuevaTarea(task.title, task.description ?? "", task.dueDate ? new Date(task.dueDate).toLocaleDateString("es-MX") : undefined, b, newAssignee.name ?? undefined))).catch(console.error);
      }
    }
  }

  const cambios: Array<{campo: string, antes: string, despues: string}> = [];
  if (title && title !== existing.title) cambios.push({ campo: "Titulo", antes: existing.title, despues: title });
  if (priority && priority !== existing.priority) cambios.push({ campo: "Prioridad", antes: existing.priority ?? "", despues: priority });
  if (dueDate !== undefined) {
    const antesStr   = existing.dueDate ? new Date(existing.dueDate).toLocaleDateString("es-MX") : "Sin fecha";
    const despuesStr = dueDate          ? new Date(dueDate).toLocaleDateString("es-MX")          : "Sin fecha";
    if (antesStr !== despuesStr) cambios.push({ campo: "Fecha limite", antes: antesStr, despues: despuesStr });
  }
  if (description && description !== existing.description) cambios.push({ campo: "Descripcion", antes: existing.description ?? "", despues: description });

  if (cambios.length > 0) {
    const notifyIds = new Set<string>();
    if (task.assignedUser?.id && task.assignedUser.id !== userId) notifyIds.add(task.assignedUser.id);
    existing.assignedUsers?.forEach((au: any) => { if (au.user.id !== userId) notifyIds.add(au.user.id); });
    for (const uid of notifyIds) {
      await db.notification.create({
        data: { userId: uid, message: `"${task.title}" fue editada por ${userName}`, type: "task", link: "/dashboard/tasks" },
      });
    }
    const emails = await getAssignedEmails(task.id);
    for (const email of emails) {
      getBranding().then(b => sendMail(email, "Tu tarea fue editada", templateTareaEditada(task.title, cambios, b))).catch(console.error);
    }
  }

  // Auto-recalcular progreso del milestone si la tarea está vinculada
  const taskMilestoneId = (task as any).milestoneId ?? (existing as any).milestoneId;
  if (taskMilestoneId && status !== undefined) {
    const linkedTasks = await db.task.findMany({
      where: { milestoneId: taskMilestoneId, archivedAt: null },
      select: { status: true, deliverableStatus: true },
    });
    if (linkedTasks.length > 0) {
      const completed = linkedTasks.filter((t: any) =>
        t.status === "completed" || t.status === "approved" || t.deliverableStatus === "approved"
      ).length;
      const progress = Math.round((completed / linkedTasks.length) * 100);
      await db.milestone.update({
        where: { id: taskMilestoneId },
        data: { progress, ...(progress === 100 && { status: "completed" }) },
      }).catch(() => {});
    }
  }

  // Auto-recalcular progreso del padre al completar subtarea
  const taskParentId = (existing as any).parentTaskId;
  if (taskParentId && status !== undefined) {
    try {
      const siblings = await db.task.findMany({
        where: { parentTaskId: taskParentId, archivedAt: null },
        select: { id: true, status: true },
      });
      if (siblings.length > 0) {
        const completedSiblings = siblings.filter((s: any) =>
          s.status === 'completed' || s.status === 'approved'
        ).length;
        const allDone = completedSiblings === siblings.length;
        // Si todas las subtareas están completadas, marcar padre como completado
        if (allDone) {
          // REGLA: si todas las subtareas done -> padre a internal_review (F1 flujo)
          const parentTask = await db.task.findUnique({
            where: { id: taskParentId },
            select: { status: true },
          });
          if (parentTask && !['completed', 'approved', 'internal_review'].includes(parentTask.status)) {
            await db.task.update({
              where: { id: taskParentId },
              data: { status: 'internal_review' },
            });
          }
        }
        // Notificación interna de progreso (opcional)
        console.log(`[SUBTASK] Parent ${taskParentId}: ${completedSiblings}/${siblings.length} subtasks done`);
      }
    } catch (e) {
      console.error('[SUBTASK PROGRESS]', e);
    }
  }

  await logAction({ userId, action: "TASK_UPDATED", entity: "task", entityId: task.id, details: { status: task.status, title: task.title } });
  return NextResponse.json({ task: flattenTask(task) });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const isManager = MANAGER_ROLES.includes(session.user.role as string);
  if (!isManager) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  // Borrar subtareas primero (con sus asignados)
  const subtasks = await db.task.findMany({
    where: { parentTaskId: id },
    select: { id: true },
  });
  if (subtasks.length > 0) {
    const subtaskIds = subtasks.map((s: { id: string }) => s.id);
    await db.taskAssignedUser.deleteMany({ where: { taskId: { in: subtaskIds } } });
    await db.task.deleteMany({ where: { parentTaskId: id } });
  }

  await db.taskAssignedUser.deleteMany({ where: { taskId: id } });
  await db.task.delete({ where: { id } });
  await logAction({ userId: session.user.id, action: "TASK_DELETED", entity: "task", entityId: id });
  return NextResponse.json({ success: true });
}
