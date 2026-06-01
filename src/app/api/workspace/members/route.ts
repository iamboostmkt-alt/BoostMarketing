import { NextResponse } from 'next/server';
import { requireWorkspace } from '@/core/auth/require-workspace';
import { getScopedDb } from '@/lib/db-scoped';

export async function GET() {
  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { workspaceId, role } = result.ctx;
  const sdb = getScopedDb(workspaceId);
  const isManager = ['ADMIN', 'PROJECT_MANAGER'].includes(role as string);
  const members = await sdb.user.findMany({
    where: { workspaceId, active: true, ...(isManager ? {} : { role: { not: 'CLIENT' } }) },
    select: { id: true, name: true, email: true, color: true, image: true, role: true, presence: { select: { status: true, lastSeen: true } } },
    take: 30,
  });
  return NextResponse.json({ members });
}
