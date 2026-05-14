import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeTaskStatus } from "@/lib/task-status";
import {
  sendMail,
  templateNuevaTarea,
  templateCambioEstado,
  templateTareaCompletada,
  templateTareaEditada,
} from "@/lib/mailer";

const MANAGER_ROLES = ["ADMIN", "PROJECT_MANAGER"];

const userInclude = {
  select: { id: true, name: true, email: true, color: true, image: true },
};
const clientInclude = {
  select: { id: true, name: true, company: true },
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userId    = (session.user as any).id;
  const role      = session.user.role as string;
  const isManager = MANAGER_ROLES.includes(role);
  const isClient  = role === "CLIENT";
  const scope     = req.nextUrl.searchParams.get("scope");

  // ── MY TASKS ──────────────────────────────────────────────
  if (scope === "mine") {
    const tasks = await db.task.findMany({
      where: {
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
    return NextResponse.json({ tasks });
  }

  // ── CLIENTS WITH TASKS ────────────────────────────────────
  if (scope === "clients-with-tasks") {
    // Obtener IDs de clientes accesibles
    let clientIds: string[] | null = null;

    if (!isManager) {
      const assignments = await db.clientAssignedUser.findMany({
        where: { userId },
        select: { clientId: true },
      });
      clientIds = assignments.map((a) => a.clientId);
      if (clientIds.length === 0) return NextResponse.json({ clients: [] });
    }

    // Obtener clientes
    const clients = await db.client.findMany({
      where: clientIds ? { id: { in: clientIds } } : {},
      select: { id: true, name: true, company: true },
      orderBy: { name: "asc" },
    });

    // Para cada cliente obtener sus tareas
    const result = await Promise.all(
      clients.map(async (client) => {
        const taskWhere: any = { clientId: client.id };
        if (!isManager) {
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
        return { ...client, tasks };
      })
    );

    return NextResponse.json({ clients: result.filter((c) => c.tasks.length > 0) });
  }

  // ── ALL TASKS (managers only) ─────────────────────────────
  if (scope === "all" && isManager) {
    const tasks = await db.task.findMany({
      include: {
        assignedUser:  userInclude,
        assignedUsers: { include: { user: userInclude } },
        client:        clientInclude,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ tasks });
  }

  // ── DEFAULT ───────────────────────────────────────────────
  const tasks = await db.task.findMany({
    where: isClient ? { assignedUserId: userId } : {
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

  const filtered = isClient
    ? tasks.map((t: any) => ({ ...t, assignedUsers: undefined }))
    : tasks;

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
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userId    = (session.user as any).id;
  const isManager = MANAGER_ROLES.includes(session.user.role as string);
  const body      = await req.json();
  const { title, description, priority, dueDate, assignedUserId: _assignedUserId, assignedUserIds, clientId } = body;
  const assignedUserId = _assignedUserId || (Array.isArray(assignedUserIds) && assignedUserIds[0]) || null;

  if (!title) return NextResponse.json({ error: "Titulo requerido" }, { status: 400 });

  const task = await db.task.create({
    data: {
      userId,
      title,
      description: description || "",
      priority:    priority    || "medium",
      dueDate:     dueDate     ? new Date(dueDate) : null,
      assignedUserId: isManager ? assignedUserId || null : null,
      clientId:       isManager ? clientId       || null : null,
      ...(isManager && Array.isArray(assignedUserIds) && assignedUserIds.length > 0 && {
        assignedUsers: { create: assignedUserIds.map((uid: string) => ({ userId: uid })) },
      }),
    },
    include: { assignedUser: userInclude, assignedUsers: { include: { user: userInclude } }, client: clientInclude },
  });

  const dueDateStr = task.dueDate ? new Date(task.dueDate).toLocaleDateString("es-MX") : undefined;
  const emails = await getAssignedEmails(task.id);
  for (const email of emails) {
    await sendMail(email, "Nueva tarea asignada", templateNuevaTarea(task.title, task.description ?? "", dueDateStr));
  }

  return NextResponse.json({ task }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userId    = (session.user as any).id;
  const userName  = (session.user as any).name || "Un usuario";
  const isManager = MANAGER_ROLES.includes(session.user.role as string);
  const body      = await req.json();
  const { id, title, description, status, priority, dueDate, assignedUserId, assignedUserIds, clientId } = body;

  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  const existing = await db.task.findUnique({
    where:   { id },
    include: {
      assignedUser:  userInclude,
      assignedUsers: { include: { user: userInclude } },
    },
  });
  if (!existing) return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });

  const task = await db.task.update({
    where: { id },
    data: {
      ...(title       !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(priority    !== undefined && { priority }),
      ...(dueDate     !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(status      !== undefined && { status: normalizeTaskStatus(status) }),
      ...(isManager && assignedUserId !== undefined && { assignedUserId }),
      ...(isManager && clientId       !== undefined && { clientId }),
    },
    include: { assignedUser: userInclude, client: clientInclude },
  });

  if (status && existing.status !== task.status) {
    const notifyIds = new Set<string>();
    if (task.assignedUser?.id) notifyIds.add(task.assignedUser.id);
    existing.assignedUsers?.forEach((au: any) => notifyIds.add(au.user.id));
    notifyIds.delete(userId);
    for (const uid of notifyIds) {
      await db.notification.create({
        data: { userId: uid, message: `"${task.title}" cambio a estado: ${task.status}`, type: "task", link: "/dashboard/tasks" },
      });
    }
    const emails = await getAssignedEmails(task.id);
    for (const email of emails) {
      await sendMail(email, "Estado de tarea actualizado", templateCambioEstado(task.title, existing.status ?? "pending", task.status ?? "pending"));
    }
    if (task.status === "completed") {
      for (const email of emails) {
        sendMail(email, "Tarea completada - BoostMarketing", templateTareaCompletada(task.title, userName)).catch(console.error);
      }
    }
    return NextResponse.json({ task });
  }

  if (isManager && assignedUserId && assignedUserId !== existing.assignedUserId) {
    const newAssignee = await db.user.findUnique({ where: { id: assignedUserId }, select: { id: true, email: true, name: true } });
    if (newAssignee && newAssignee.id !== userId) {
      await db.notification.create({
        data: { userId: newAssignee.id, message: `${userName} te asigno la tarea: "${task.title}"`, type: "task", link: "/dashboard/tasks" },
      });
      if (newAssignee.email) {
        sendMail(newAssignee.email, "Nueva tarea asignada", templateNuevaTarea(task.title, task.description ?? "", task.dueDate ? new Date(task.dueDate).toLocaleDateString("es-MX") : undefined)).catch(console.error);
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
      sendMail(email, "Tu tarea fue editada", templateTareaEditada(task.title, cambios)).catch(console.error);
    }
  }

  return NextResponse.json({ task });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const isManager = MANAGER_ROLES.includes(session.user.role as string);
  if (!isManager) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  await db.taskAssignedUser.deleteMany({ where: { taskId: id } });
  await db.task.delete({ where: { id } });
  return NextResponse.json({ success: true });
}