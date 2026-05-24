import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const result = await requireWorkspace();
    if (!result.ok) return result.response;
    const { workspaceId } = result.ctx;

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');
    if (!clientId) return NextResponse.json({ users: [] });

    // Obtener usuarios asignados via ClientAssignedUser
    const assignments = await db.clientAssignedUser.findMany({
      where: { clientId },
      include: {
        user: {
          select: { id: true, name: true, email: true, color: true, image: true, role: true, active: true },
        },
      },
    });

    // Incluir tambien el PM asignado como manager
    const client = await db.client.findUnique({
      where: { id: clientId },
      include: {
        assignedManager: {
          select: { id: true, name: true, email: true, color: true, image: true, role: true, active: true },
        },
      },
    });

    const usersMap = new Map();
    // Agregar PM primero
    if (client?.assignedManager?.active) {
      usersMap.set(client.assignedManager.id, client.assignedManager);
    }
    // Agregar equipo asignado
    assignments.forEach((a) => {
      if (a.user.active && a.user.role !== 'CLIENT' && a.user.role !== 'UNASSIGNED') {
        usersMap.set(a.user.id, a.user);
      }
    });

    return NextResponse.json({ users: [...usersMap.values()] });
  } catch (error) {
    console.error('[clients/team GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}