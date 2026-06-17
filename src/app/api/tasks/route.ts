import { NextRequest, NextResponse } from "next/server";
import { broadcastRealtime } from "@/lib/realtime-server";
import { MANAGER_ROLES , hasRole } from '@/core/constants/roles';
import { requireWorkspace } from "@/core/auth/require-workspace";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAction } from "@/lib/audit";
import { createNotification, createNotifications } from "@/lib/notifications";
import { sendChatBotMessage, buildMentions } from "@/lib/chat-bot";
import { normalizeTaskStatus } from "@/lib/task-status";
import {
  sendMail,
  templateNuevaTarea,
  templateCambioEstado,
  templateTareaCompletada,
  templateTareaEditada,
  templateTareaEnRevision,
  templateTareaListaRevisionPM,
} from "@/lib/mailer";
import { getBranding, type Branding } from "@/lib/branding";
import { AccessControl } from "@/core/access/access-control";
import { TaskCreateSchema, TaskUpdateSchema, validateBody } from "@/lib/schemas";
import { rateLimit } from "@/lib/security/rate-limit";



const userInclude = {
  select: { id: true, name: true, email: true, color: true, image: true, role: true },
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
  const rl = await rateLimit(req, { limit: 60, windowMs: 60_000, identifier: 'tasks-get' });
  if (!rl.success) return rl.response;
  const resultGet = await requireWorkspace();
  if (!resultGet.ok) return resultGet.response;

  const userId      = resultGet.ctx.userId;
  const workspaceId = resultGet.ctx.workspaceId;
  const role        = resultGet.ctx.role;
  const user        = { ...resultGet.ctx, id: resultGet.ctx.userId };
  const isAdmin     = role === "ADMIN";
  const isPM      = role === "PROJECT_MANAGER";
  const isManager = isAdmin || isPM;
  const isClient  = role === "CLIENT";
  const scope     = req.nextUrl.searchParams.get("scope");
  const filterClientId = req.nextUrl.searchParams.get("clientId") ?? undefined;

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
        workspaceId,
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
      where: clientIds ? { id: { in: clientIds }, workspaceId } : { workspaceId },
      select: { id: true, name: true, company: true, assignedManagerId: true },
      orderBy: { name: "asc" },
    });

    // Query única para todas las tareas de todos los clientes — evita N+1
    const allClientIds = clients.map((c) => c.id);
    const taskWhere: any = {
      clientId: { in: allClientIds },
      workspaceId,
      archivedAt: null,
      deletedAt: null,
      // Solo tareas activas en vista de clientes — mejora performance
      status: { notIn: ["completed", "approved", "cancelled"] },
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

    const allTasks = await db.task.findMany({
      where: taskWhere,
      include: {
        assignedUser:  userInclude,
        assignedUsers: { include: { user: userInclude } },
        client:        clientInclude,
      },
      orderBy: { createdAt: "desc" },
    });

    const flatAll = flattenTasks(allTasks);
    const filteredAll = flatAll.filter((t: any) => AccessControl.canViewTask(user, t));

    // Agrupar en memoria por clientId
    const tasksByClient = new Map<string, any[]>();
    for (const t of filteredAll) {
      const cid = t.clientId as string;
      if (!tasksByClient.has(cid)) tasksByClient.set(cid, []);
      tasksByClient.get(cid)!.push(t);
    }

    // BUG-01 fix: siempre incluir todos los clientes aunque no tengan tareas activas
    // El PM necesita ver el cliente para poder agregar nuevas tareas
    const result = clients
      .map((client) => ({ ...client, tasks: tasksByClient.get(client.id) ?? [] }));

    return NextResponse.json({ clients: result });
  }

  const parentId = req.nextUrl.searchParams.get("parentId");
  const searchQ  = req.nextUrl.searchParams.get("search") || '';
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

  if (scope === "review" && isManager) {
    // TASK-R-01: tareas en revision para PM — internal_review + client_review
    const reviewWhere: any = {
      archivedAt: null,
      workspaceId,
      status: { in: ["internal_review", "client_review"] },
      ...(filterClientId && { clientId: filterClientId }),
    };
    if (!isAdmin) {
      const managedClients = await db.client.findMany({
        where: { assignedManagerId: userId }, select: { id: true },
      });
      const assignedClients = await db.clientAssignedUser.findMany({
        where: { userId }, select: { clientId: true },
      });
      const allClientIds = [...new Set([
        ...managedClients.map((c) => c.id),
        ...assignedClients.map((c) => c.clientId),
      ])];
      reviewWhere.OR = [
        { userId },
        { assignedUserId: userId },
        { assignedUsers: { some: { userId } } },
        ...(allClientIds.length > 0 ? [{ clientId: { in: allClientIds } }] : []),
      ];
    }
    const reviewTasks = await db.task.findMany({
      where: reviewWhere,
      include: {
        assignedUser:  userInclude,
        assignedUsers: { include: { user: userInclude } },
        client:        clientInclude,
      },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ tasks: flattenTasks(reviewTasks) });
  }
  if (scope === "all" && isManager) {
    // Paginación cursor-based — límite 50 por página
    const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;
    const limit  = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "50"), 100);

    // ADMIN ve todo — PM solo ve tareas de sus clientes asignados
    let whereAll: any = { archivedAt: null, workspaceId, ...(filterClientId && { clientId: filterClientId }) };
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
      const isTeamMember = !['ADMIN', 'PROJECT_MANAGER'].includes(role as string);
      if (isTeamMember) {
        // TEAM: solo tareas asignadas a ellos + que pertenezcan a cliente asignado
        whereAll = {
          archivedAt: null,
          workspaceId,
          clientId: allClientIds.length > 0 ? { in: allClientIds } : { not: null },
          AND: [
            {
              OR: [
                { assignedUserId: userId },
                { assignedUsers: { some: { userId } } },
              ],
            },
            ...(filterClientId ? [] : [{ clientId: { not: null } }]),
          ],
        };
      } else {
        // PM: tareas de sus clientes (asignado o manager) + sus propias
        whereAll = {
          archivedAt: null,
          workspaceId,
          OR: [
            { userId },
            { assignedUserId: userId },
            { assignedUsers: { some: { userId } } },
            ...(allClientIds.length > 0 ? [{ clientId: { in: allClientIds } }] : []),
          ],
        };
      }
    }
    const tasks = await db.task.findMany({
      where: whereAll,
      take:   limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      include: {
        assignedUser:  userInclude,
        assignedUsers: { include: { user: userInclude } },
        client:        clientInclude,
      },
      orderBy: { createdAt: "desc" },
    });
    const hasMore   = tasks.length > limit;
    const page      = hasMore ? tasks.slice(0, limit) : tasks;
    const nextCursor = hasMore ? page[page.length - 1].id : null;
    return NextResponse.json({ tasks: flattenTasks(page), nextCursor, hasMore });
  }

  // Búsqueda global por texto
  if (searchQ && searchQ.length >= 2) {
    const searchTasks = await db.task.findMany({
      where: {
        workspaceId, deletedAt: null, archivedAt: null,
        title: { contains: searchQ, mode: 'insensitive' },
      },
      take: 20,
      include: { assignedUser: userInclude, assignedUsers: { include: { user: userInclude } }, client: clientInclude },
      orderBy: { createdAt: 'desc' },
    });
    const flat = flattenTasks(searchTasks as any[]).filter((t: any) => AccessControl.canViewTask(user, t));
    return NextResponse.json({ tasks: flat });
  }

  // Fallback — aplica filterClientId si viene en query
  const tasks = await db.task.findMany({
    where: isClient
      ? { assignedUserId: userId, archivedAt: null, workspaceId }
      : {
          archivedAt: null,
          workspaceId,
          ...(filterClientId && { clientId: filterClientId }),
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
  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { userId, workspaceId, role } = result.ctx;
  const isManager   = hasRole(result.ctx.role as string, MANAGER_ROLES);
  // workspaceId garantizado por requireWorkspace
  const rawBody     = await req.json();
  const validation = validateBody(TaskCreateSchema, rawBody);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.issues?.[0]?.message ?? 'Datos inválidos' }, { status: 400 });
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
  const isClient = result.ctx.role === 'CLIENT';
  let resolvedClientId = isManager ? (clientId || null) : null;
  if (isClient && clientId) resolvedClientId = clientId;

  // Si es subtarea, heredar clientId y workspaceId del padre si no se especificó
  let resolvedWorkspaceId = workspaceId;
  if (parentTaskId) {
    const parentTask = await db.task.findUnique({
      where: { id: parentTaskId },
      select: { clientId: true, workspaceId: true },
    });
    if (parentTask?.clientId && !resolvedClientId) resolvedClientId = parentTask.clientId;
    if (parentTask?.workspaceId) resolvedWorkspaceId = parentTask.workspaceId;
  }

  const resolvedVisibility = parentTaskId
    ? "internal"
    : isManager
      ? (visibility || "internal")
      : isClient ? "client_visible" : "internal";

  // S-121 fix: si visibility=internal, limpiar clientId para evitar exposición en portal cliente
  // Una tarea interna nunca debe aparecer vinculada a un cliente en el portal
  if (resolvedVisibility === 'internal' && resolvedClientId) {
    // Solo limpiar clientId si NO hay un parentTaskId que lo heredó (subtareas internas pueden tener clientId)
    if (!parentTaskId) {
      resolvedClientId = null;
    }
  }

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
      status: 'pending',
      references:     Array.isArray(references) ? references : [],
      parentTaskId:   parentTaskId || null,
      milestoneId:    milestoneId  || null,
      workspaceId: resolvedWorkspaceId,
      assignedUsers: { create: finalAssignedIds.map((uid: string) => ({ userId: uid })) },
    },
    include: { assignedUser: userInclude, assignedUsers: { include: { user: userInclude } }, client: clientInclude },
  });

  const dueDateStr = task.dueDate ? new Date(task.dueDate).toLocaleDateString("es-MX") : undefined;
  const branding = await getBranding();
  // Obtener asignados con nombre para personalizar email
  // Incluir assignedUser (campo directo) Y assignedUsers (tabla TaskUser)
  const assignedWithNames = [
    ...(task.assignedUser ? [{ email: task.assignedUser.email, name: task.assignedUser.name }] : []),
    ...(task.assignedUsers?.map((au: any) => ({ email: au.user?.email, name: au.user?.name })) ?? []),
  ].filter((u, i, arr) => u.email && arr.findIndex(x => x.email === u.email) === i);
  for (const u of assignedWithNames) {
    if (u.email) await sendMail(u.email, "Nueva tarea asignada - BoostMarketing", templateNuevaTarea(task.title, task.description ?? "", dueDateStr, branding, u.name || u.email?.split("@")[0] || undefined));
  }

  await logAction({
    userId, workspaceId,
    action: parentTaskId ? "SUBTASK_CREATED" : "TASK_CREATED",
    entity: "task",
    entityId: task.id,
    details: { title: task.title, ...(parentTaskId ? { parentTaskId } : {}) },
  });
  // Broadcast para toasts en tiempo real (non-blocking)
  broadcastRealtime('task.created', { task: flattenTask(task as any) }).catch(() => {});

  // Mensaje bot en chat: room del cliente o DM personal a asignados (non-blocking)
  try {
    const _assignedIds: string[] = [];
    if (task.assignedUserId) _assignedIds.push(task.assignedUserId);
    (task.assignedUsers ?? []).forEach((au: any) => { if (au.userId || au.user?.id) _assignedIds.push(au.userId ?? au.user.id); });
    const _uniqueIds = [...new Set(_assignedIds)].filter(id => id !== userId);
    if (_uniqueIds.length > 0 || task.clientId) {
      const _users = _uniqueIds.length > 0
        ? await db.user.findMany({ where: { id: { in: _uniqueIds } }, select: { id: true, name: true, email: true, role: true } })
        : [];
      const _mentions = buildMentions(_users);
      const _chatMsg  = _mentions
        ? `📌 Nueva tarea asignada a ${_mentions}: **${task.title}**`
        : `📌 Nueva tarea: **${task.title}**`;
      sendChatBotMessage({
        workspaceId, message: _chatMsg,
        clientId: task.clientId ?? null,
        assignedUserIds: _uniqueIds,
        senderId: userId, isInternal: true,
        visibility: task.visibility ?? 'internal',
      }).catch(() => {});
    }
  } catch { /* non-critical */ }

  return NextResponse.json({ task: flattenTask(task) }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 60, windowMs: 60_000, identifier: 'tasks-put' });
  if (!rl.success) return rl.response;
  const result = await requireWorkspace();
  if (!result.ok) return result.response;

  const userId      = result.ctx.userId;
  const workspaceId = result.ctx.workspaceId;
  const userName    = result.ctx.name || "Un usuario";
  const isManager   = hasRole(result.ctx.role as string, MANAGER_ROLES);
  // Obtener imagen del actor para notificaciones
  const _actorUser  = await db.user.findFirst({ where: { id: userId }, select: { image: true, color: true } });
  const userImage   = _actorUser?.image ?? null;
  if (!workspaceId) return NextResponse.json({ error: 'Workspace no encontrado' }, { status: 400 });
  const rawBody    = await req.json();
  const validation = validateBody(TaskUpdateSchema, rawBody);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.issues?.[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }
  const body = validation.data;
  const { id, title, description, status, priority, dueDate, startDate, assignedUserId, assignedUserIds, clientId, visibility, references, milestoneId, phase, type: taskType } = body as any;

  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  const existing = await db.task.findFirst({
    where:   { id, workspaceId },
    include: {
      assignedUser:  userInclude,
      assignedUsers: { include: { user: userInclude } },
    },
  });
  if (!existing) return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });

  // ROL-03: control de acceso al editar tareas
  const role = result.ctx.role as string;

  // Detectar si es solo cambio de status (drag, botón completar, aprobar) — permitido para asignados
  const bodyKeys = Object.keys(body as object);
  const isStatusOnlyChange = bodyKeys.length <= 3 &&
    bodyKeys.every(k => ['status','deliverableStatus','isDeliverable','id'].includes(k));

  // PM: puede editar cualquier tarea de su workspace (cambio status libre)
  // Solo restringir edición completa de tareas con clientId ajeno
  if (role === 'PROJECT_MANAGER' && existing.clientId && !isStatusOnlyChange) {
    const clientAccess = await db.client.findFirst({
      where: {
        id: existing.clientId,
        workspaceId,
        OR: [
          { assignedManagerId: userId },
          { assignedUsers: { some: { userId } } },
        ],
      },
      select: { id: true },
    });
    if (!clientAccess) {
      return NextResponse.json({ error: 'Sin acceso a este cliente' }, { status: 403 });
    }
  }

  // TEAM_MEMBER: puede cambiar status de tareas asignadas, pero editar solo las que creó
  if (['TEAM_MEMBER','DESIGNER','MARKETING'].includes(role) && !isStatusOnlyChange) {
    const isCreator  = existing.userId === userId;
    const assignedIds = (existing.assignedUsers ?? []).map((au: any) => au.userId ?? au.user?.id);
    const isAssigned  = assignedIds.includes(userId);
    if (!isCreator && !isAssigned) {
      return NextResponse.json({ error: 'No tienes permiso para editar esta tarea' }, { status: 403 });
    }
  }

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
      ...(isManager && visibility === 'internal' && { isDeliverable: false, deliverableStatus: null, clientId: null }),
      ...(isManager && visibility === 'client_visible' && { isDeliverable: true }),
      ...(milestoneId !== undefined && { milestoneId: milestoneId || null }),
      ...(phase !== undefined && { phase }),
      ...(taskType !== undefined && { type: taskType }),
      ...(references !== undefined && { references: Array.isArray(references) ? references : [] }),
    },
    include: { assignedUser: userInclude, assignedUsers: { include: { user: userInclude } }, client: clientInclude },
  });

  // BUG-01 fix: propagar completed/approved a subtareas pendientes de revisión
  if (status && ["completed", "approved"].includes(normalizeTaskStatus(status)) && existing.status !== normalizeTaskStatus(status)) {
    const subtasks = await db.task.findMany({
      where: {
        parentTaskId: id,
        workspaceId,
        archivedAt: null,
        status: { notIn: ["completed", "approved", "cancelled"] },
      },
      select: { id: true },
    });
    if (subtasks.length > 0) {
      await db.task.updateMany({
        where: { id: { in: subtasks.map((s: { id: string }) => s.id) } },
        data: { status: normalizeTaskStatus(status) },
      });
    }
  }

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
      const clientTeam = await db.client.findFirst({
        where: { id: task.clientId, workspaceId },
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
      await createNotification({ userId: uid, workspaceId, message: `"${task.title}" cambió a estado: ${task.status}`, type: "task", actorId: userId, actorName: userName, actorImage: userImage ?? undefined });
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
    // Correos por cambio de estado — cada caso tiene su template específico
    // skip: approved y completed tienen su propio flujo abajo
    // skip: internal_review tiene su propio flujo abajo (con templates personalizados para member y PM)
    const skipCambioEstado = task.status === "approved" || task.status === "completed" || task.status === "internal_review";
    if (!skipCambioEstado) {
      for (const u of _assignedUsers) {
        if (u.email) await sendMail(u.email, "Estado de tarea actualizado", templateCambioEstado(task.title, existing.status ?? "pending", task.status ?? "pending", _branding, u.name || u.email?.split("@")[0] || undefined));
      }
    }
    if (task.status === "completed") {
      for (const u of _assignedUsers) {
        if (u.email) getBranding().then(b => sendMail(u.email!, "Tarea completada - BoostMarketing", templateTareaCompletada(task.title, userName, b))).catch(console.error);
      }
      // Notificar al PM que su equipo completó la tarea
      const clienteCompleted = task.clientId
        ? await db.client.findUnique({ where: { id: task.clientId }, select: { assignedManager: { select: { id: true, email: true, name: true } } } })
        : null;
      const pmCompleted = clienteCompleted?.assignedManager;
      if (pmCompleted?.email && !_assignedUsers.find((u: any) => u.id === pmCompleted.id)) {
        getBranding().then(b => sendMail(
          pmCompleted.email!,
          `✅ Tu equipo completó: ${task.title}`,
          templateTareaCompletada(task.title, userName, b)
        )).catch(() => {});
        await db.notification.create({
          data: { userId: pmCompleted.id, workspaceId: existing.workspaceId, message: `✅ ${userName} completó: "${task.title}"`, type: 'task', read: false, link: '/dashboard/tasks', actorId: userId, actorName: userName, actorImage: userImage }
        }).catch(() => {});
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
        // workspaceId ya disponible desde requireWorkspace
        const admin = await db.user.findFirst({
          where: {
            role: "ADMIN",
            workspaceId,
          },
          select: { id: true, email: true, name: true },
        });
        if (admin && admin.id !== userId) pm = admin;
      }
      if (pm) {
        await createNotification({
          userId: pm.id, workspaceId, message: `⏳ ${userName} terminó: "${task.title}" — lista para revisar`, type: "task", actorId: userId, actorName: userName, actorImage: userImage ?? undefined,
        });
        if (pm.email) {
          // Correo específico al PM con plantilla de "lista para revisar"
          getBranding().then(b => sendMail(
            pm.email!,
            `⏳ Tarea lista para revisión: ${task.title}`,
            templateTareaListaRevisionPM(task.title, userName, pm.name || pm.email?.split("@")[0] || "tu equipo", b)
          )).catch(console.error);
        }
        // Correo al member que entregó la tarea — confirma que está en revisión
        for (const u of _assignedUsers) {
          if (!u.email) continue;
          getBranding().then(b => sendMail(
            u.email!,
            `🎉 Tu tarea está en revisión: ${task.title}`,
            templateTareaEnRevision(task.title, u.name || u.email?.split("@")[0] || "Hola", pm?.name || "tu PM", b)
          )).catch(console.error);
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
        await createNotification({ userId: uid, workspaceId, message: mensaje, type: "task" });
      }
      for (const u of _assignedUsers) {
        if (!u.email) continue;
        getBranding().then(b => sendMail(
          u.email!,
          task.status === "completed" ? `✅ Tarea aprobada: ${task.title}` : `🔄 Cambios solicitados: ${task.title}`,
          templateCambioEstado(task.title, existing.status, task.status, b, u.name || u.email?.split("@")[0] || undefined)
        )).catch(console.error);
      }
    }

    return NextResponse.json({ task: flattenTask(task) });
  }

  if (isManager && assignedUserId && assignedUserId !== existing.assignedUserId) {
    const newAssignee = await db.user.findUnique({ where: { id: assignedUserId }, select: { id: true, email: true, name: true } });
    if (newAssignee && newAssignee.id !== userId) {
      await createNotification({ userId: newAssignee.id, workspaceId, message: `${userName} te asignó la tarea: "${task.title}"`, type: "task", actorId: userId, actorName: userName, actorImage: userImage ?? undefined });
      if (newAssignee.email) {
        getBranding().then(b => sendMail(newAssignee.email!, "Nueva tarea asignada", templateNuevaTarea(task.title, task.description ?? "", task.dueDate ? new Date(task.dueDate).toLocaleDateString("es-MX") : undefined, b, newAssignee.name || newAssignee.email?.split("@")[0] || undefined))).catch(console.error);
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
      await createNotification({ userId: uid, workspaceId, message: `"${task.title}" fue editada por ${userName}`, type: "task", actorId: userId, actorName: userName, actorImage: userImage ?? undefined });
    }
    const emails = await getAssignedEmails(task.id);
    for (const email of emails) {
      getBranding().then(b => sendMail(email, "Tu tarea fue editada", templateTareaEditada(task.title, cambios, b))).catch(console.error);
    }
  }

  // Auto-recalcular progreso del milestone si la tarea está vinculada
  const taskMilestoneId = (task as unknown as { milestoneId?: string }).milestoneId ?? existing.milestoneId;
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
  const taskParentId = existing.parentTaskId;
  if (taskParentId && status !== undefined) {
    try {
      const siblings = await db.task.findMany({
        where: { parentTaskId: taskParentId, archivedAt: null },
        select: { id: true, status: true },
      });
      if (siblings.length > 0) {
        const newStatus = normalizeTaskStatus(status);
        const allStatuses = siblings.map((s: any) =>
          s.id === id ? newStatus : s.status
        );
        const allDone      = allStatuses.every((s: string) => ['completed','approved'].includes(s));
        const allReview    = allStatuses.every((s: string) => ['internal_review','client_review','completed','approved'].includes(s));
        const anyChanges   = allStatuses.some((s: string) => s === 'changes_requested');
        const anyProgress  = allStatuses.some((s: string) => !['pending','draft'].includes(s));

        const parentTask = await db.task.findUnique({
          where: { id: taskParentId },
          select: { status: true },
        });
        if (parentTask && !['approved'].includes(parentTask.status)) {
          let newParentStatus: string | null = null;
          if (allDone)                                              newParentStatus = 'internal_review';
          else if (allReview && !allDone)                           newParentStatus = 'internal_review';
          else if (anyChanges)                                      newParentStatus = 'changes_requested';
          else if (anyProgress && parentTask.status === 'pending')  newParentStatus = 'in_progress';

          if (newParentStatus && newParentStatus !== parentTask.status) {
            await db.task.update({
              where: { id: taskParentId },
              data: { status: newParentStatus },
            });
          }
        }
      }
    } catch (e) {
      console.error('[SUBTASK PROGRESS]', e);
    }
  }

  await logAction({
    userId, workspaceId,
    action: (task as any).parentTaskId ? "SUBTASK_UPDATED" : "TASK_UPDATED",
    entity: "task",
    entityId: task.id,
    details: { status: task.status, title: task.title },
  });
  // Broadcast para toasts en tiempo real (non-blocking)
  broadcastRealtime('task.updated', { task: flattenTask(task) }).catch(() => {});
  return NextResponse.json({ task: flattenTask(task) });
}

export async function DELETE(req: NextRequest) {
  const result = await requireWorkspace();
  if (!result.ok) return result.response;

  const isManager = hasRole(result.ctx.role as string, MANAGER_ROLES);
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
  await logAction({ userId: result.ctx.userId, workspaceId: result.ctx.workspaceId, action: "TASK_DELETED", entity: "task", entityId: id });
  return NextResponse.json({ success: true });
}
