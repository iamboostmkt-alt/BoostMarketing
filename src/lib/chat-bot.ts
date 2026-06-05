import { db } from "@/lib/db";

/**
 * Enrutamiento inteligente de mensajes bot (Weeklink) en el chat.
 *
 * Reglas de enrutamiento:
 * 1. clientId + visibleToClient  → room del cliente (canal del equipo sobre esa cuenta)
 * 2. clientId + internal         → room del cliente (isInternal=true, solo equipo)
 * 3. Sin clientId + assignees    → canal NOTIFICATIONS (mención) + DM individual a cada uno
 * 4. Sin destinatarios           → canal NOTIFICATIONS
 *
 * El remitente siempre es el bot Weeklink (isSystem=true, systemName="Weeklink").
 * senderId se usa para firmar el room DM cuando aplica.
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
  /** Si true, también manda DM individual a cada assignee (además del canal NOTIFICATIONS) */
  sendDmToAssignees?: boolean;
}) {
  const {
    workspaceId, message, clientId,
    assignedUserIds = [], fileUrl, fileName, fileType,
    senderId, sendDmToAssignees = true,
  } = params;
  const isInternal      = params.isInternal ?? true;
  const isVisibleToClient = params.visibility !== 'internal';

  const baseMsg = {
    message,
    workspaceId,
    userId:     senderId,
    isSystem:   true,
    systemName: "Weeklink",
    ...(fileUrl ? { fileUrl, fileName, fileType } : {}),
  };

  // ── Caso 1 & 2: hay clientId → room del cliente ──────────────────────────
  if (clientId) {
    await db.chatMessage.create({
      data: { ...baseMsg, room: clientId, isInternal },
    });
    return;
  }

  // ── Caso 3 & 4: sin clientId → canal NOTIFICATIONS + DM opcional ─────────
  // Siempre publicar en NOTIFICATIONS (canal de avisos del sistema)
  await db.chatMessage.create({
    data: { ...baseMsg, room: "NOTIFICATIONS", isInternal: true },
  }).catch(() => {});

  // DM individual a cada asignado (para que llegue también al buzón personal)
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
}

/**
 * Generar texto de mención para múltiples usuarios
 * Ej: "@Fer @Fabian @Esteban"
 */
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
