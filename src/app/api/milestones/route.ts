import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from "@/core/auth/require-workspace";
import { rateLimit } from "@/lib/security/rate-limit";
import { db } from '@/lib/db';
import { MANAGER_ROLES } from '@/core/constants/roles';
import { sendMail, templateMilestoneCompletado } from '@/lib/mailer';
import { getBranding } from '@/lib/branding';

const milestoneInclude = {
  responsible: { select: { id: true, name: true, email: true, color: true, image: true } },
  client:      { select: { id: true, name: true, company: true } },
};

export async function GET(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 60, windowMs: 60_000, identifier: 'milestones-get' });
  if (!rl.success) return rl.response;
  try {
    const result = await requireWorkspace();
    if (!result.ok) return result.response;
    const { userId, workspaceId, role } = result.ctx;
    const user = { ...result.ctx, id: result.ctx.userId };
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');
    if (!clientId) return NextResponse.json({ error: 'clientId requerido' }, { status: 400 });
    const isManager = (MANAGER_ROLES as readonly string[]).includes(user.role);
    const milestones = await db.milestone.findMany({
      where: {
        clientId,
        workspaceId,
        ...(!isManager && { visibleToClient: true }),
      },
      include: milestoneInclude,
      orderBy: { date: 'asc' },
    });
    return NextResponse.json({ milestones });
  } catch (error) {
    console.error('[milestones GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const resultPost = await requireWorkspace({ roles: ['ADMIN', 'PROJECT_MANAGER'] });
    if (!resultPost.ok) return resultPost.response;
    const { userId: _userId, workspaceId } = resultPost.ctx;
    const {
      clientId, title, description, date, status, type,
      progress, responsibleId, visibleToClient, comments,
    } = await req.json();
    if (!clientId || !title || !date)
      return NextResponse.json({ error: 'clientId, title y date requeridos' }, { status: 400 });
    const milestone = await db.milestone.create({
      data: {
        clientId,
        workspaceId,
        title,
        description:     description     ?? '',
        date:            new Date(date),
        status:          status          ?? 'upcoming',
        type:            type            ?? 'other',
        progress:        progress        ?? 0,
        responsibleId:   responsibleId   ?? null,
        visibleToClient: visibleToClient ?? true,
        comments:        comments        ?? '',
      },
      include: milestoneInclude,
    });
    return NextResponse.json({ milestone }, { status: 201 });
  } catch (error) {
    console.error('[milestones POST]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const resultPut = await requireWorkspace({ roles: ['ADMIN', 'PROJECT_MANAGER'] });
    if (!resultPut.ok) return resultPut.response;
    const {
      id, title, description, date, status, type,
      progress, responsibleId, visibleToClient, comments,
    } = await req.json();
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    const milestone = await db.milestone.update({
      where: { id },
      data: {
        ...(title            !== undefined && { title }),
        ...(description      !== undefined && { description }),
        ...(date             !== undefined && { date: new Date(date) }),
        ...(status           !== undefined && { status }),
        ...(type             !== undefined && { type }),
        ...(progress         !== undefined && { progress }),
        ...(responsibleId    !== undefined && { responsibleId }),
        ...(visibleToClient  !== undefined && { visibleToClient }),
        ...(comments         !== undefined && { comments }),
      },
      include: milestoneInclude,
    });
    // Email al PM/cliente si se completa el milestone
      if (status === 'completed') {
        try {
          const full = await db.milestone.findUnique({
            where: { id },
            include: { client: { select: { name: true, assignedManager: { select: { email: true } } } } },
          });
          if (full?.client?.assignedManager?.email) {
            const branding = await getBranding();
            await sendMail(
              full.client.assignedManager.email,
              `Milestone completado: ${full.title}`,
              templateMilestoneCompletado(full.title, full.client.name, branding)
            );
          }
        } catch(e) { console.error('[EMAIL] milestone completed:', e); }
      }
      return NextResponse.json({ milestone });
  } catch (error) {
    console.error('[milestones PUT]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const resultDel = await requireWorkspace({ roles: ['ADMIN', 'PROJECT_MANAGER'] });
    if (!resultDel.ok) return resultDel.response;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    await db.milestone.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[milestones DELETE]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
