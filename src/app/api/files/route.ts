import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from '@/core/auth/require-workspace';
import { hasRole } from '@/core/constants/roles';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { workspaceId, role } = result.ctx;
  const isManager = hasRole(role, ['ADMIN', 'PROJECT_MANAGER']);

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const type   = searchParams.get('type') || '';
  const limit  = Math.min(parseInt(searchParams.get('limit') || '100'), 200);

  const typeFilter: Record<string, object> = {
    imagen:  { fileType: { startsWith: 'image/' } },
    video:   { fileType: { startsWith: 'video/' } },
    pdf:     { fileType: { equals: 'application/pdf' } },
    archivo: { AND: [{ NOT: { fileType: { startsWith: 'image/' } } }, { NOT: { fileType: { startsWith: 'video/' } } }, { NOT: { fileType: { equals: 'application/pdf' } } }] },
  };

  const files = await db.taskAttachment.findMany({
    where: {
      status: 'active',
      ...(!isManager && { isInternal: false }),
      ...(type && typeFilter[type] ? typeFilter[type] : {}),
      ...(search ? { fileName: { contains: search, mode: 'insensitive' as const } } : {}),
      task: { workspaceId, deletedAt: null },
    },
    include: {
      task: {
        select: {
          id: true, title: true,
          client: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
      },
      user: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return NextResponse.json({ files });
}
