import { db } from "@/lib/db";

/**
 * Enrutamiento inteligente de mensajes bot en el chat.
 * 
 * Reglas:
 * 1. Si hay clientId → mensaje al room del cliente (canal compartido del equipo)
 * 2. Si hay assignedUserIds sin clientId → DM individual a cada uno
 * 3. Si es acción interna → canal TEAM
 * 
 * Lógica de deduplicación:
 * - Si el usuario ya ve el room del cliente, NO recibe DM adicional (evita spam)
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
  senderId: string; // quien genera la acción (para crear el mensaje en DB)
}) {
  const { workspaceId, message, clientId, assignedUserIds = [], fileUrl, fileName, fileType, senderId } = params;
  const isInternal = params.isInternal ?? true;

  const baseMsg = {
    message,
    workspaceId,
    userId: senderId,
    isSystem: true,
    systemName: "Weeklink",
    ...(fileUrl ? { fileUrl, fileName, fileType } : {}),
  };

  // Caso 1: hay clientId → mensaje en room del cliente
  if (clientId) {
    await db.chatMessage.create({
      data: { ...baseMsg, room: clientId, isInternal },
    });
    return; // El equipo ve este mensaje en el room del cliente
  }

  // Caso 2: sin clientId → DM individual a cada asignado
  if (assignedUserIds.length > 0) {
    const uniqueIds = [...new Set(assignedUserIds.filter(id => id !== senderId))];
    await Promise.allSettled(
      uniqueIds.map(uid => {
        const dmRoom = [senderId, uid].sort().join("_DM_");
        return db.chatMessage.create({
          data: { ...baseMsg, room: dmRoom, isInternal: true },
        });
      })
    );
    return;
  }

  // Caso 3: sin destinatarios específicos → canal TEAM
  await db.chatMessage.create({
    data: { ...baseMsg, room: "TEAM", isInternal: true },
  });
}

/**
 * Generar texto de mención para múltiples usuarios
 * Agrupa nombres con @ y los une limpiamente
 * Ej: "@Fer @Fabian @Esteban"
 */
export function buildMentions(users: Array<{ name?: string | null; email?: string }>, excludeRoles?: string[]): string {
  let filtered = users;
  if (excludeRoles) {
    filtered = users.filter((u: any) => !excludeRoles.includes(u.role ?? ""));
  }
  return filtered
    .map(u => `@${u.name || u.email?.split("@")[0] || "usuario"}`)
    .filter(Boolean)
    .join(" ");
}
