import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeTaskStatus } from "@/lib/task-status";
import {
  sendMail,
  templateNuevaTarea,
  templateCambioEstado,
  templateTareaEditada,
} from "@/lib/mailer";

const MANAGER_ROLES = ["ADMIN", "PROJECT_MANAGER"];

const userInclude = {
  select: { id: true, name: true, email: true, color: true, image: true },
};

const clientInclude = {
  select: { id: true, name: true, company: true },
};

// â”€â”€â”€ GET â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userId    = (session.user as any).id;
  const isManager = MANAGER_ROLES.includes(session.user.role as string);

  const isClient = (session.user.role as string) === "CLIENT";

  const tasks = await db.task.findMany({
    where: isManager ? {} : {
      OR: [
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

  // CLIENT solo ve sus tareas, sin datos internos del equipo
  const filtered = isClient
    ? tasks.map((t: any) => ({ ...t, assignedUsers: undefined }))
    : tasks;

  return NextResponse.json({ tasks: isClient ? filtered : tasks });
}

// â”€â”€â”€ helper: recopilar emails de todos los asignados â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ POST â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userId    = (session.user as any).id;
  const isManager = MANAGER_ROLES.includes(session.user.role as string);
  const body      = await req.json();
  const { title, description, priority, dueDate, assignedUserId: _assignedUserId, assignedUserIds, clientId } = body;
  const assignedUserId = _assignedUserId || (Array.isArray(assignedUserIds) && assignedUserIds[0]) || null;

  if (!title) return NextResponse.json({ error: "TÃ­tulo requerido" }, { status: 400 });

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

  // Notificar a TODOS los asignados
  const dueDateStr = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString("es-MX")
    : undefined;

  const emails = await getAssignedEmails(task.id);
  for (const email of emails) {
    await sendMail(
      email,
      "Nueva tarea asignada",
      templateNuevaTarea(task.title, task.description ?? "", dueDateStr)
    );
  }

  return NextResponse.json({ task }, { status: 201 });
}

// â”€â”€â”€ PUT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Notificaciones â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // 1. Cambio de estado
  if (status && existing.status !== task.status) {
    const notifyIds = new Set<string>();
    if (task.assignedUser?.id) notifyIds.add(task.assignedUser.id);
    existing.assignedUsers?.forEach((au: any) => notifyIds.add(au.user.id));
    notifyIds.delete(userId);

    for (const uid of notifyIds) {
      await db.notification.create({
        data: {
          userId:  uid,
          message: `"${task.title}" cambio a estado: ${task.status}`,
          type:    "task",
          link:    "/dashboard/tasks",
        },
      });
    }

    // Email a TODOS los asignados
    const emails = await getAssignedEmails(task.id);
    for (const email of emails) {
      await sendMail(
        email,
        "Estado de tarea actualizado",
        templateCambioEstado(task.title, existing.status ?? "pending", task.status ?? "pending")
      );
    }
    return NextResponse.json({ task });
  }

  // 2. Nuevo usuario asignado
  if (isManager && assignedUserId && assignedUserId !== existing.assignedUserId) {
    const newAssignee = await db.user.findUnique({
      where: { id: assignedUserId },
      select: { id: true, email: true, name: true },
    });
    if (newAssignee && newAssignee.id !== userId) {
      await db.notification.create({
        data: {
          userId:  newAssignee.id,
          message: `${userName} te asigno la tarea: "${task.title}"`,
          type:    "task",
          link:    "/dashboard/tasks",
        },
      });
      if (newAssignee.email) {
        sendMail(
          newAssignee.email,
          "Nueva tarea asignada",
          templateNuevaTarea(task.title, task.description ?? "", task.dueDate
            ? new Date(task.dueDate).toLocaleDateString("es-MX") : undefined)
        ).catch(console.error);
      }
    }
  }

  // 3. Edicion de campos â€” notificar a asignados
  const cambios: Array<{campo: string, antes: string, despues: string}> = [];
  if (title && title !== existing.title) {
    cambios.push({ campo: "Titulo", antes: existing.title, despues: title });
  }
  if (priority && priority !== existing.priority) {
    cambios.push({ campo: "Prioridad", antes: existing.priority ?? "", despues: priority });
  }
  if (dueDate !== undefined) {
    const antesStr   = existing.dueDate ? new Date(existing.dueDate).toLocaleDateString("es-MX") : "Sin fecha";
    const despuesStr = dueDate          ? new Date(dueDate).toLocaleDateString("es-MX")          : "Sin fecha";
    if (antesStr !== despuesStr) {
      cambios.push({ campo: "Fecha limite", antes: antesStr, despues: despuesStr });
    }
  }
  if (description && description !== existing.description) {
    cambios.push({ campo: "Descripcion", antes: existing.description ?? "", despues: description });
  }

  if (cambios.length > 0) {
    const notifyIds = new Set<string>();
    if (task.assignedUser?.id && task.assignedUser.id !== userId) notifyIds.add(task.assignedUser.id);
    existing.assignedUsers?.forEach((au: any) => { if (au.user.id !== userId) notifyIds.add(au.user.id); });

    for (const uid of notifyIds) {
      await db.notification.create({
        data: {
          userId:  uid,
          message: `"${task.title}" fue editada por ${userName}`,
          type:    "task",
          link:    "/dashboard/tasks",
        },
      });
    }

    // Email a TODOS los asignados
    const emails = await getAssignedEmails(task.id);
    for (const email of emails) {
      sendMail(
        email,
        "Tu tarea fue editada",
        templateTareaEditada(task.title, cambios)
      ).catch(console.error);
    }
  }

  return NextResponse.json({ task });
}

// â”€â”€â”€ DELETE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
