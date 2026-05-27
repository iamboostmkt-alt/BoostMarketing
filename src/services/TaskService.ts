/**
 * TaskService — capa de negocio para tareas
 * Las rutas API delegan aquí la lógica, quedando solo como thin controllers.
 */
import { db } from '@/lib/db';
import { logAction } from '@/lib/audit';
import { normalizeTaskStatus } from '@/lib/task-status';
import { AccessControl } from '@/core/access/access-control';

export const userInclude = {
  select: { id: true, name: true, email: true, color: true, image: true },
} as const;

export const clientInclude = {
  select: {
    id: true, name: true, company: true,
    assignedManagerId: true,
    assignedUsers: { select: { userId: true } },
  },
} as const;

export const taskInclude = {
  user:          userInclude,
  assignedUser:  userInclude,
  assignedUsers: { include: { user: userInclude } },
  client:        clientInclude,
  subtasks:      { select: { id: true, title: true, status: true, dueDate: true } },
  milestone:     { select: { id: true, title: true, status: true } },
} as const;

export function flattenTask(task: any) {
  if (!task) return task;
  return {
    ...task,
    status: normalizeTaskStatus(task.status),
    assignedUsers: (task.assignedUsers ?? []).map((au: any) =>
      au.user ? { ...au.user } : au
    ),
  };
}

export function flattenTasks(tasks: any[]) {
  return tasks.map(flattenTask);
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getTaskById(id: string, workspaceId: string) {
  const task = await db.task.findFirst({
    where: { id, workspaceId, deletedAt: null },
    include: taskInclude,
  });
  return task ? flattenTask(task) : null;
}

export async function getTasksByUser(userId: string, workspaceId: string) {
  const tasks = await db.task.findMany({
    where: {
      workspaceId,
      deletedAt: null,
      archivedAt: null,
      parentTaskId: null,
      OR: [
        { userId },
        { assignedUserId: userId },
        { assignedUsers: { some: { userId } } },
      ],
    },
    include: taskInclude,
    orderBy: { createdAt: 'desc' },
  });
  return flattenTasks(tasks);
}

export async function getTasksByWorkspace(workspaceId: string, limit?: number) {
  const tasks = await db.task.findMany({
    where: { workspaceId, deletedAt: null, archivedAt: null, parentTaskId: null },
    include: taskInclude,
    orderBy: { createdAt: 'desc' },
    ...(limit ? { take: limit } : {}),
  });
  return flattenTasks(tasks);
}

export async function getSubtasks(parentTaskId: string) {
  const tasks = await db.task.findMany({
    where: { parentTaskId, archivedAt: null },
    include: taskInclude,
    orderBy: { createdAt: 'asc' },
  });
  return flattenTasks(tasks);
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export interface CreateTaskInput {
  userId: string;
  workspaceId: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  visibility?: string;
  dueDate?: string | null;
  startDate?: string | null;
  clientId?: string | null;
  assignedUserId?: string | null;
  assignedUserIds?: string[];
  parentTaskId?: string | null;
  milestoneId?: string | null;
  type?: string | null;
  references?: { title: string; url: string; type: string }[];
}

export async function createTask(input: CreateTaskInput) {
  const {
    userId, workspaceId, title, description = '', status = 'pending',
    priority = 'medium', visibility = 'internal', dueDate, startDate,
    clientId, assignedUserId, assignedUserIds = [], parentTaskId,
    milestoneId, type, references = [],
  } = input;

  // Resolver workspaceId desde tarea madre si existe
  let resolvedWorkspaceId = workspaceId;
  let resolvedClientId = clientId;

  if (parentTaskId) {
    const parent = await db.task.findUnique({
      where: { id: parentTaskId },
      select: { clientId: true, workspaceId: true },
    });
    if (parent?.clientId && !resolvedClientId) resolvedClientId = parent.clientId;
    if (parent?.workspaceId) resolvedWorkspaceId = parent.workspaceId;
  }

  const task = await db.task.create({
    data: {
      userId,
      workspaceId: resolvedWorkspaceId,
      title,
      description,
      status,
      priority,
      visibility: parentTaskId ? 'internal' : visibility,
      dueDate:    dueDate    ? new Date(dueDate)    : null,
      startDate:  startDate  ? new Date(startDate)  : null,
      clientId:   resolvedClientId,
      assignedUserId: assignedUserId || null,
      parentTaskId:   parentTaskId   || null,
      milestoneId:    milestoneId    || null,
      type:           type || (parentTaskId ? 'internal_task' : undefined),
      isDeliverable:  !parentTaskId && !!resolvedClientId,
      references:     references as any,
      assignedUsers: assignedUserIds.length > 0
        ? { create: assignedUserIds.map(uid => ({ userId: uid })) }
        : undefined,
    },
    include: taskInclude,
  });

  await logAction({
    userId, workspaceId: resolvedWorkspaceId,
    action: 'TASK_CREATED', entity: 'task',
    entityId: task.id, details: { title: task.title },
  });

  return flattenTask(task);
}

export async function updateTaskStatus(
  taskId: string,
  workspaceId: string,
  userId: string,
  newStatus: string,
) {
  const task = await db.task.update({
    where: { id: taskId },
    data:  { status: newStatus, updatedAt: new Date() },
    include: taskInclude,
  });

  // Propagar a subtareas si se completa
  if (newStatus === 'completed' || newStatus === 'approved') {
    await db.task.updateMany({
      where: { parentTaskId: taskId, archivedAt: null },
      data:  { status: newStatus },
    });
  }

  await logAction({
    userId, workspaceId,
    action: 'TASK_UPDATED', entity: 'task',
    entityId: taskId, details: { status: newStatus, title: task.title },
  });

  return flattenTask(task);
}

export async function deleteTask(taskId: string, workspaceId: string, userId: string) {
  await db.task.update({
    where: { id: taskId },
    data:  { deletedAt: new Date() },
  });

  await logAction({
    userId, workspaceId,
    action: 'TASK_DELETED', entity: 'task', entityId: taskId,
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export async function getAssignedEmails(taskId: string): Promise<Set<string>> {
  const pivots = await db.taskAssignedUser.findMany({
    where: { taskId },
    include: { user: { select: { email: true } } },
  });
  return new Set(pivots.map((p: any) => p.user.email));
}
