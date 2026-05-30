import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const Schema = z.object({
  token: z.string().min(1),
  name: z.string().min(2),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { token, name, password } = parsed.data;

  const invite = await db.workspaceInvite.findUnique({
    where: { token },
    include: { workspace: { select: { id: true, name: true } } },
  });

  if (!invite) return NextResponse.json({ error: 'Invitación no encontrada.' }, { status: 404 });
  if (invite.usedAt) return NextResponse.json({ error: 'Esta invitación ya fue usada.' }, { status: 410 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'Esta invitación expiró.' }, { status: 410 });

  // Verificar si ya existe usuario
  const existing = await db.user.findFirst({
    where: { email: { equals: invite.email, mode: 'insensitive' } },
  });
  if (existing) return NextResponse.json({ error: 'Ya existe una cuenta con este email.' }, { status: 409 });

  const hashed = await bcrypt.hash(password, 12);
  const colors = ['#7c3aed','#2563eb','#059669','#d97706','#dc2626','#7c3aed'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  await db.user.create({
    data: {
      name,
      email: invite.email.toLowerCase(),
      password: hashed,
      role: invite.role,
      workspaceId: invite.workspaceId,
      color,
      active: true,
    },
  });

  // Marcar invitación como usada
  await db.workspaceInvite.update({
    where: { token },
    data: { usedAt: new Date() },
  });

  return NextResponse.json({ ok: true, email: invite.email });
}
