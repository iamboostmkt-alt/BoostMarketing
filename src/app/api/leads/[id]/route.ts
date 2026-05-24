import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireWorkspace } from '@/core/auth/require-workspace';
import { MANAGER_ROLES } from '@/core/constants/roles';

// POST /api/leads/[id]/convert — convierte lead a CLIENT o USER
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await requireWorkspace({ roles: ['ADMIN', 'PROJECT_MANAGER', 'SALES_REP'] });
    if (!result.ok) return result.response;
    const { userId: uid, workspaceId } = result.ctx;
    const user = { ...result.ctx, id: result.ctx.userId };

    const lead = await db.contact.findFirst({ where: { id: params.id, workspaceId } });
    if (!lead) {
      return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });
    }

    const body = await req.json();
    const { action, assignedManagerId } = body;
    // action: "client" | "reject"

    if (action === 'reject') {
      await db.contact.update({
        where: { id: params.id },
        data:  { status: 'rejected' },
      });
      return NextResponse.json({ message: 'Lead rechazado' });
    }

    if (action === 'client') {
      // Verificar que no exista ya un cliente con ese email
      const existing = await db.client.findFirst({
        where: { email: { equals: lead.email, mode: 'insensitive' } },
      });
      if (existing) {
        return NextResponse.json({ error: 'Ya existe un cliente con ese email' }, { status: 409 });
      }

      const client = await db.client.create({
        data: {
          userId:            user.id,
          name:              lead.name,
          email:             lead.email,
          company:           lead.company || '',
          phone:             lead.phone   || '',
          assignedManagerId: assignedManagerId || user.id,
          workspaceId,
        },
      });

      // Marcar lead como convertido
      await db.contact.update({
        where: { id: params.id },
        data:  { status: 'converted' },
      });

      await db.activityLog.create({
        data: {
          userId:      user.id,
          workspaceId,
          action:      'CONVERT_LEAD_TO_CLIENT',
          entity:      'Client',
          entityId:    client.id,
          details:     JSON.stringify({ leadId: lead.id, name: lead.name }),
        },
      }).catch(() => undefined);

      return NextResponse.json({ message: 'Lead convertido a cliente', client });
    }

    return NextResponse.json({ error: 'Acción no válida. Usa: client | reject' }, { status: 400 });
  } catch (error) {
    console.error('[leads convert]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// DELETE /api/leads/[id] — eliminar lead manualmente
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await requireWorkspace({ roles: ['ADMIN', 'PROJECT_MANAGER', 'SALES_REP'] });
    if (!result.ok) return result.response;
    const { workspaceId } = result.ctx;

    const existing = await db.contact.findFirst({ where: { id: params.id, workspaceId } });
    if (!existing) return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });
    await db.contact.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Lead eliminado' });
  } catch (error) {
    console.error('[leads DELETE]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
