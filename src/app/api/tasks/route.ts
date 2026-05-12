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

// ─── GET ──────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userId    = (session.user as any).id;
  const isManager = MANAGER_ROLES.includes(session.user.role as string);

  const tasks = await db.task.findMany({
    where:   isManager ? {} : { assignedUserId: userId },
    include: { assignedUser: userInclude, client: clientInclude },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ tasks });
}

// ─── POST ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userId    = (session.user as any).id;
  const isManager = MANAGER_ROLES.includes(session.user.role as string);
  const body      = await req.json();
  const { title, description, priority, dueDate, assignedUserId, clientId } = body;

  if (!title) return NextResponse.json({ error: "Título requerido" }, { status: 400 });

  const task = await db.task.create({
    data: {
      userId,
      title,
      description: description || "",
      priority:    priority    || "medium",
      dueDate:     dueDate     ? new Date(dueDate) : null,
      assignedUserId: isManager ? assignedUserId || null : null,
      clientId:       isManager ? clientId       || null : null,
    },
    include: { assignedUser: userInclude, client: clientInclude },
  });

  if (task.assignedUser?.email) {
    const dueDateStr = task.dueDate
      ? new Date(task.dueDate).toLocaleDateString("es-MX")
      : undefined;
    sendMail(
      task.assignedUser.email,
      "📌 Nueva tarea asignada",
      templateNuevaTarea(task.title, task.description ?? "", dueDateStr)
    ).catch(console.error);
  }

  return NextResponse.json({ task }, { status: 201 });
}

// ─── PUT ──────────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const isManager = MANAGER_ROLES.includes(session.user.role as string);
  const body      = await req.json();
  const { id, title, description, status, priority, dueDate, assignedUserId, clientId } = body;

  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  const existing = await db.task.findUnique({
    where:   { id },
    include: { assignedUser: userInclude },
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

  const email = task.assignedUser?.email;
  if (!email) return NextResponse.json({ task });

  // Email cambio de estado
  if (status && existing.status !== task.status) {
    sendMail(
      email,
      "🔄 Estado de tarea actualizado",
      templateCambioEstado(task.title, existing.status ?? "pending", task.status ?? "pending")
    ).catch(console.error);
    return NextResponse.json({ task });
  }

  // Email edicion de campos
  const cambios: Array<{campo: string, antes: string, despues: string}> = [];

  if (title && title !== existing.title) {
    cambios.push({ campo: "Título", antes: existing.title, despues: title });
  }
  if (priority && priority !== existing.priority) {
    cambios.push({ campo: "Prioridad", antes: existing.priority ?? "", despues: priority });
  }
  if (dueDate !== undefined) {
    const antesStr = existing.dueDate
      ? new Date(existing.dueDate).toLocaleDateString("es-MX") : "Sin fecha";
    const despuesStr = dueDate
      ? new Date(dueDate).toLocaleDateString("es-MX") : "Sin fecha";
    if (antesStr !== despuesStr) {
      cambios.push({ campo: "Fecha límite", antes: antesStr, despues: despuesStr });
    }
  }
  if (description && description !== existing.description) {
    cambios.push({ campo: "Descripción", antes: existing.description ?? "", despues: description });
  }

  if (cambios.length > 0) {
    sendMail(
      email,
      "✏️ Tu tarea fue editada",
      templateTareaEditada(task.title, cambios)
    ).catch(console.error);
  }

  return NextResponse.json({ task });
}

// ─── DELETE ───────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const isManager = MANAGER_ROLES.includes(session.user.role as string);
  if (!isManager) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  await db.task.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
