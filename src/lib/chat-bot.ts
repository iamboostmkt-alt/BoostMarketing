import { db } from "@/lib/db";

/**
 * Room del DM personal con el bot Weeklink para un usuario.
 * Formato: weeklink_{userId}
 * Este room es de solo lectura para el usuario — solo el bot escribe.
 */
export function weeklinkDmRoom(userId: string): string {
  return `weeklink_${userId}`;
}

/**
 * Enrutamiento de mensajes bot Weeklink.
 *
 * Reglas:
 * 1. clientId              → room del cliente (equipo interno)
 * 2. sin clientId + asigs  → DM weeklink_{uid} a cada asignado + canal NOTIFICATIONS
 * 3. sin nada              → canal NOTIFICATIONS
 */
export async function sendChatBotMessage(params: {
  workspaceId: string;
  message: string;
  clientId?: string | null;
  assignedUserIds?: string[];
  clientPortalUserIds?: string[]; // IDs de usuarios CLIENT del portal
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  isInternal?: boolean;
  visibility?: string;
  senderId: string;
  sendDmToAssignees?: boolean;
}) {
  const {
    workspaceId, message, clientId,
    assignedUserIds = [], clientPortalUserIds = [], fileUrl, fileName, fileType,
    senderId, sendDmToAssignees = true,
  } = params;
  const isInternal = params.isInternal ?? true;

  const baseMsg = {
    message, workspaceId, userId: senderId,
    isSystem: true, systemName: "Weeklink",
    ...(fileUrl ? { fileUrl, fileName, fileType } : {}),
  };

  // Caso 1: hay clientId → room del cliente (equipo) + DM weeklink al usuario CLIENT si es visible
  if (clientId) {
    await db.chatMessage.create({
      data: { ...baseMsg, room: clientId, isInternal },
    });
    // Si hay usuarios del portal (CLIENT) y el mensaje no es solo interno, notificar en su DM Weeklink
    if (clientPortalUserIds.length > 0 && !isInternal) {
      await Promise.allSettled(
        clientPortalUserIds.map(uid =>
          db.chatMessage.create({
            data: { ...baseMsg, room: weeklinkDmRoom(uid), isInternal: false },
          })
        )
      );
    }
    return;
  }

  // Caso 2 & 3: sin clientId
  // DM personal Weeklink a cada asignado (room weeklink_{uid})
  if (sendDmToAssignees && assignedUserIds.length > 0) {
    const uniqueIds = [...new Set(assignedUserIds.filter(id => id !== senderId))];
    await Promise.allSettled(
      uniqueIds.map(uid =>
        db.chatMessage.create({
          data: { ...baseMsg, room: weeklinkDmRoom(uid), isInternal: true },
        })
      )
    );
  }

  // También al canal NOTIFICATIONS para registro del equipo
  await db.chatMessage.create({
    data: { ...baseMsg, room: "NOTIFICATIONS", isInternal: true },
  }).catch(() => {});
}

export function buildMentions(
  users: Array<{ name?: string | null; email?: string }>,
  excludeRoles?: string[]
): string {
  let filtered = users;
  if (excludeRoles) {
    filtered = users.filter((u: any) => !excludeRoles.includes(u.role ?? ""));
  }
  return filtered
    .map(u => `@${u.name || u.email?.split("@")[0] || "usuario"}`)
    .filter(Boolean)
    .join(" ");
}
