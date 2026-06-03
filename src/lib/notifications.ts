import { db } from "@/lib/db";
import { broadcastRealtime } from "@/lib/realtime-server";

export type NotificationType =
  | "task" | "activity" | "meeting" | "appointment"
  | "lead" | "welcome" | "info" | "mention" | "file";

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
