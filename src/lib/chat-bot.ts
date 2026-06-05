import { db } from "@/lib/db";

/**
 * Enrutamiento de mensajes bot Weeklink en el chat.
 *
 * Reglas:
 * 1. clientId              → room del cliente (canal equipo sobre esa cuenta)
 * 2. sin clientId + asignados → DM individual a cada asignado + canal NOTIFICATIONS
 * 3. sin nada              → canal NOTIFICATIONS
 */
export async function sendChatBotMessage(params: {
  workspaceId: string;
  message: string;
  clientId?: string | null;
  assignedUserIds?: string[];
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
    assignedUserIds = [], fileUrl, fileName, fileType,
    senderId, sendDmToAssignees = true,
  } = params;
  const isInternal = params.isInternal ?? true;

  const baseMsg = {
    message, workspaceId, userId: senderId,
    isSystem: true, systemName: "Weeklink",
    ...(fileUrl ? { fileUrl, fileName, fileType } : {}),
  };

  // Caso 1: hay clientId → solo al room del cliente
  if (clientId) {
    await db.chatMessage.create({
      data: { ...baseMsg, room: clientId, isInternal },
    });
    return;
  }

  // Caso 2 & 3: sin clientId
  // 2a — DM individual a cada asignado (mensaje personal)
  if (sendDmToAssignees && assignedUserIds.length > 0) {
    const uniqueIds = [...new Set(assignedUserIds.filter(id => id !== senderId))];
    await Promise.allSettled(
      uniqueIds.map(uid => {
        const dmRoom = [senderId, uid].sort().join("_DM_");
        return db.chatMessage.create({
          data: { ...baseMsg, room: dmRoom, isInternal: true },
        });
      })
    );
  }

  // 2b — También al canal NOTIFICATIONS para registro del equipo
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
