import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from '@/core/auth/require-workspace';
import { db } from '@/lib/db';

// GET /api/chat/inbox
// Devuelve el inbox del usuario: DMs privados + últimos mensajes de canales de clientes
// Ordenado por más reciente, deduplicado por "conversación"

export async function GET(req: NextRequest) {
  const result = await requireWorkspace();
  if (!result.ok) return result.response;

  const { userId, workspaceId, role } = result.ctx;
  const limit = 8;

  try {
    // ── 1. DMs donde el usuario es participante ───────────────
    // Los rooms DM tienen formato: id1_DM_id2
    const dmMessages = await db.chatMessage.findMany({
      where: {
        workspaceId,
        room: { contains: '_DM_' },
        isSystem: false,
        OR: [
          { room: { contains: `${userId}_DM_` } },
          { room: { contains: `_DM_${userId}` } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        message: true,
        room: true,
        createdAt: true,
        userId: true,
        fileUrl: true,
        fileName: true,
        user: { select: { id: true, name: true, email: true, color: true, image: true, role: true } },
      },
    });

    // Deduplicar: 1 entrada por room DM (el más reciente)
    const dmByRoom = new Map<string, typeof dmMessages[0]>();
    for (const msg of dmMessages) {
      if (!dmByRoom.has(msg.room)) {
        dmByRoom.set(msg.room, msg);
      }
    }

    // Para cada DM, obtener info del otro participante
    const dmEntries = await Promise.all(
      Array.from(dmByRoom.values()).map(async (msg) => {
        const parts = msg.room.split('_DM_');
        const otherId = parts.find((p) => p !== userId) || '';
        let otherUser: { id: string; name: string | null; email: string; color: string; image: string | null; role: string } | null = null;
        if (otherId && otherId !== 'weeklink') {
          const found = await db.user.findFirst({
            where: { id: otherId, workspaceId },
            select: { id: true, name: true, email: true, color: true, image: true, role: true },
          });
          if (found) otherUser = { ...found, role: found.role as string };
        }
        const isMine = msg.userId === userId;
        return {
          id: msg.id,
          type: 'dm' as const,
          room: msg.room,
          // El "sender" para mostrar: si el mensaje es mío, mostrar al otro; si es del otro, mostrar al otro
          participant: otherUser || msg.user,
          preview: msg.fileUrl
            ? `📎 ${msg.fileName || 'Archivo'}`
            : (isMine ? `Tú: ${msg.message?.slice(0, 50) || ''}` : msg.message?.slice(0, 60) || ''),
          createdAt: msg.createdAt,
          isMine,
          sender: msg.user,
          href: '/dashboard/chat',
        };
      })
    );

    // ── 2. Últimos mensajes de canales de clientes ─────────────
    // Buscar clientes accesibles según el rol
    let clientIds: string[] = [];
    if (role === 'ADMIN') {
      const allClients = await db.client.findMany({
        where: { workspaceId },
        select: { id: true },
        take: 20,
      });
      clientIds = allClients.map((c) => c.id);
    } else if (role === 'PROJECT_MANAGER') {
      const myClients = await db.client.findMany({
        where: {
          workspaceId,
          OR: [
            { assignedManagerId: userId },
            { assignedUsers: { some: { userId } } },
          ],
        },
        select: { id: true },
        take: 20,
      });
      clientIds = myClients.map((c) => c.id);
    } else {
      // Team members: clientes donde están asignados
      const assigned = await db.clientAssignedUser.findMany({
        where: { userId },
        select: { clientId: true },
      });
      clientIds = assigned.map((a) => a.clientId);
    }

    // Obtener el último mensaje de cada canal de cliente
    const channelEntries: any[] = [];
    if (clientIds.length > 0) {
      // Un query para traer el último mensaje de cada room de cliente
      const latestPerRoom = await db.chatMessage.findMany({
        where: {
          workspaceId,
          room: { in: clientIds },
          isSystem: false,
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: {
          id: true,
          message: true,
          room: true,
          createdAt: true,
          userId: true,
          fileUrl: true,
          fileName: true,
          user: { select: { id: true, name: true, email: true, color: true, image: true, role: true } },
        },
      });

      // Deduplicar: 1 entrada por room de cliente
      const seenRooms = new Set<string>();
      for (const msg of latestPerRoom) {
        if (!seenRooms.has(msg.room)) {
          seenRooms.add(msg.room);
          // Buscar info del cliente
          const client = await db.client.findFirst({
            where: { id: msg.room, workspaceId },
            select: { id: true, name: true },
          });
          if (client) {
            channelEntries.push({
              id: msg.id,
              type: 'channel' as const,
              room: msg.room,
              client,
              sender: msg.user,
              preview: msg.fileUrl
                ? `📎 ${msg.fileName || 'Archivo'}`
                : msg.message?.slice(0, 60) || '',
              createdAt: msg.createdAt,
              isMine: msg.userId === userId,
              href: '/dashboard/chat',
            });
          }
        }
      }
    }

    // ── 3. Combinar, ordenar por más reciente y limitar ────────
    const all = [...dmEntries, ...channelEntries]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    return NextResponse.json({ inbox: all });
  } catch (error) {
    console.error('Chat inbox error:', error);
    return NextResponse.json({ inbox: [] });
  }
}
