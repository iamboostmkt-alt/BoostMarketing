/**
 * ClientService — capa de negocio para clientes
 */
import { db } from '@/lib/db';
import { logAction } from '@/lib/audit';

export const clientInclude = {
  assignedManager: {
    select: { id: true, name: true, email: true, color: true, image: true },
  },
  assignedUsers: {
    include: {
      user: { select: { id: true, name: true, email: true, color: true, image: true } },
    },
  },
} as const;

export async function getClientById(id: string, workspaceId: string) {
  return db.client.findFirst({
    where: { id, workspaceId },
    include: clientInclude,
  });
}

export async function getClientsByWorkspace(workspaceId: string) {
  return db.client.findMany({
    where: { workspaceId },
    include: clientInclude,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getClientByEmail(email: string, workspaceId: string) {
  return db.client.findFirst({
    where: { email: { equals: email, mode: 'insensitive' }, workspaceId },
    include: clientInclude,
  });
}

export interface CreateClientInput {
  userId: string;
  workspaceId: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  status?: string;
  assignedManagerId?: string | null;
  assignedUserIds?: string[];
}

export async function createClient(input: CreateClientInput) {
  const {
    userId, workspaceId, name, email,
    company = '', phone = '', status = 'active',
    assignedManagerId, assignedUserIds = [],
  } = input;

  const client = await db.client.create({
    data: {
      userId, workspaceId, name, email, company, phone, status,
      assignedManagerId: assignedManagerId || null,
      assignedUsers: assignedUserIds.length > 0
        ? { create: assignedUserIds.map(uid => ({ userId: uid })) }
        : undefined,
    },
    include: clientInclude,
  });

  await logAction({
    userId, workspaceId,
    action: 'CLIENT_CREATED', entity: 'client',
    entityId: client.id, details: { name: client.name },
  });

  return client;
}

export async function updateClient(
  id: string,
  workspaceId: string,
  userId: string,
  data: Partial<CreateClientInput>,
) {
  const { assignedUserIds, ...rest } = data;

  const client = await db.client.update({
    where: { id },
    data: {
      ...rest,
      ...(assignedUserIds !== undefined && {
        assignedUsers: {
          deleteMany: {},
          create: assignedUserIds.map(uid => ({ userId: uid })),
        },
      }),
    },
    include: clientInclude,
  });

  await logAction({
    userId, workspaceId,
    action: 'CLIENT_UPDATED', entity: 'client',
    entityId: id, details: { name: client.name },
  });

  return client;
}

export async function deleteClient(id: string, workspaceId: string, userId: string) {
  const client = await db.client.delete({ where: { id } });

  await logAction({
    userId, workspaceId,
    action: 'CLIENT_DELETED', entity: 'client',
    entityId: id, details: { name: client.name },
  });

  return client;
}

// Stats para dashboard
export async function getClientStats(clientId: string) {
  const [activeTasks, completedTasks, meetings] = await Promise.all([
    db.task.count({
      where: { clientId, status: { notIn: ['completed', 'approved'] }, deletedAt: null },
    }),
    db.task.count({
      where: { clientId, status: { in: ['completed', 'approved'] }, deletedAt: null },
    }),
    db.appointment.count({
      where: { clientId, date: { gte: new Date() } },
    }),
  ]);

  const total = activeTasks + completedTasks;
  return {
    activeTasks,
    completedTasks,
    meetings,
    progress: total > 0 ? Math.round((completedTasks / total) * 100) : 0,
  };
}
