import { db } from "@/lib/db";
import { broadcastRealtime } from "@/lib/realtime-server";
import { sendPushToUser } from "@/lib/push-notifications";
import { weeklinkDmRoom } from "@/lib/chat-bot";

export type NotificationType =
  | "task" | "activity" | "meeting" | "appointment"
  | "lead" | "welcome" | "info" | "mention" | "file"
  | "message" | "invite";

interface CreateNotificationParams {
  userId:      string;
  workspaceId: string;
  message:     string;
  type:        NotificationType;
  link?:       string;
  broadcast?:  boolean; // default true — emite realtime al receptor
  // Actor: quien generó la acción (omitir para notificaciones de sistema/cron)
  actorId?:    string;
  actorName?:  string;
  actorImage?: string;
}

const DEFAULT_LINKS: Record<NotificationType, string> = {
  task:        "/dashboard/tasks",
  activity:    "/dashboard/calendar",
  meeting:     "/dashboard/calendar",
  appointment: "/dashboard/calendar",
  lead:        "/dashboard/contacts",
  welcome:     "/dashboard",
  info:        "/dashboard",
  mention:     "/dashboard/chat",
  file:        "/dashboard/tasks",
  message:     "/dashboard/chat",
  invite:      "/dashboard",
};

// Deduplicación: evita crear la misma notificación dos veces en 5 minutos
async function isDuplicate(userId: string, workspaceId: string, message: string): Promise<boolean> {
  const since = new Date(Date.now() - 5 * 60 * 1000);
  const existing = await db.notification.findFirst({
    where: { userId, workspaceId, message, createdAt: { gte: since } },
    select: { id: true },
  });
  return !!existing;
}

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  const { userId, workspaceId, message, type, link, broadcast = true } = params;
  const resolvedLink = link ?? DEFAULT_LINKS[type] ?? "/dashboard";

  try {
    const dup = await isDuplicate(userId, workspaceId, message);
    if (dup) return;

    await db.notification.create({
      data: {
        userId,
        workspaceId,
        message,
        type,
        read:       false,
        link:       resolvedLink,
        actorId:    params.actorId    ?? null,
        actorName:  params.actorName  ?? null,
        actorImage: params.actorImage ?? null,
      },
    });

    if (broadcast) {
      broadcastRealtime("notification.created", { userId }).catch(() => undefined);
    }

    // Enviar Web Push notification al dispositivo del usuario
    const PUSH_TYPES: NotificationType[] = ['task', 'meeting', 'appointment', 'mention', 'message', 'invite'];
    if (PUSH_TYPES.includes(type)) {
      sendPushToUser(userId, {
        title: type === 'task'        ? '📋 Nueva tarea'
              : type === 'meeting'    ? '📅 Reunión'
              : type === 'mention'    ? '@ Te mencionaron'
              : type === 'message'    ? '💬 Nuevo mensaje'
              : type === 'invite'     ? '✉️ Invitación'
              : '🔔 Weeklink',
        body:  message.length > 100 ? message.slice(0, 97) + '...' : message,
        url:   link ?? '/dashboard',
        tag:   type,
        icon:  '/icons/icon-192.png',
      }).catch(() => undefined);
    }

    // También enviar al chat Weeklink del usuario (DM personal con el bot)
    // Solo para tipos importantes, no para todos los eventos de sistema
    const WEEKLINK_TYPES: NotificationType[] = ['task', 'meeting', 'appointment', 'mention', 'message', 'invite'];
    if (WEEKLINK_TYPES.includes(type)) {
      const wkRoom = weeklinkDmRoom(userId);
      // Verificar que no exista ya un mensaje idéntico en los últimos 30s
      const existingWk = await db.chatMessage.findFirst({
        where: { room: wkRoom, message, createdAt: { gte: new Date(Date.now() - 30_000) }, isSystem: true },
        select: { id: true },
      }).catch(() => null);
      if (!existingWk) {
        db.chatMessage.create({
          data: {
            userId,
            workspaceId,
            message,
            room: wkRoom,
            isSystem: true,
            systemName: 'Weeklink',
            isInternal: true,
          },
        }).catch(() => undefined);
      }
    }
  } catch {
    // Non-critical — never throw
  }
}

// Helper para notificar a múltiples usuarios a la vez
export async function createNotifications(
  userIds: string[],
  params: Omit<CreateNotificationParams, "userId">
): Promise<void> {
  const uniqueIds = [...new Set(userIds)];
  await Promise.allSettled(
    uniqueIds.map((userId) => createNotification({ ...params, userId }))
  );
}
