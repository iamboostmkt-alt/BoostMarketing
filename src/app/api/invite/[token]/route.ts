import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const invite = await db.workspaceInvite.findUnique({
    where: { token: params.token },
    select: {
      id: true, email: true, role: true, isClient: true, clientName: true,
      usedAt: true, expiresAt: true,
      workspace: { select: { name: true, id: true } },
      inviter: { select: { name: true } },
    },
  });

  if (!invite) return NextResponse.json({ error: 'Invitación no encontrada.' }, { status: 404 });
  if (invite.usedAt) return NextResponse.json({ error: 'Esta invitación ya fue usada.' }, { status: 410 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'Esta invitación expiró.' }, { status: 410 });

  return NextResponse.json({ invite });
}
