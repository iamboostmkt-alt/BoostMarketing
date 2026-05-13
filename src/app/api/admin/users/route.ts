import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { Role, UserLifecycleStatus } from '@prisma/client';
import { BCRYPT_ROUNDS } from '@/lib/password';
import { sendEmail, welcomeHtml } from '@/lib/resend';

const VALID_ROLES: Role[] = [
  'UNASSIGNED',
  'ADMIN',
  'CLIENT',
  'PROJECT_MANAGER',
  'TEAM_MEMBER',
  'DESIGNER',
  'MARKETING',
  'SALES_REP',
];

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'ADMIN') return null;
  return session;
}

const userSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  lifecycleStatus: true,
  color: true,
  active: true,
  createdAt: true,
  customRoleId: true,
  customRole: { select: { id: true, label: true, color: true } },
} as const;

// GET — list all users (admin only)
export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search')?.trim() ?? '';
  const roleFilter = searchParams.get('role') ?? '';
  const lifecycleFilter = searchParams.get('lifecycle') ?? '';

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (lifecycleFilter === 'PROSPECT') {
    where.role = 'CLIENT';
    where.lifecycleStatus = 'PROSPECT';
  } else if (roleFilter && VALID_ROLES.includes(roleFilter as Role)) {
    where.role = roleFilter as Role;
  }

  const users = await db.user.findMany({
    where,
    select: userSelect,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ users });
}

// POST — create a new user (admin only)
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const body = await req.json();
  const { name, email, password, role, color } = body;

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Nombre, email y contraseña son requeridos.' }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Email no válido.' }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 });
  }

  const assignedRole: Role = VALID_ROLES.includes(role as Role) ? (role as Role) : 'UNASSIGNED';

  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: 'Ya existe una cuenta con este email.' }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await db.user.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashed,
      role: assignedRole,
      color: color || '#7c3aed',
    },
    select: userSelect,
  });

  await db.notification.create({
    data: {
      userId: user.id,
      message: `¡Bienvenido a BoostMarketing! Tu cuenta ha sido creada por el administrador.`,
      type: 'welcome',
      link: '/dashboard',
    },
  });

  // Welcome email (non-blocking)
  sendEmail({
    to:      user.email,
    subject: '¡Bienvenido a BoostMarketing!',
    html:    welcomeHtml({
      userName: user.name ?? 'Usuario',
      appUrl:   process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? 'https://boostmarketingboost.com',
    }),
  }).catch(() => undefined);

  await db.activityLog.create({
    data: {
      userId: (session.user as { id: string }).id,
      action: 'CREATE_USER',
      entity: 'User',
      entityId: user.id,
      details: JSON.stringify({ name: user.name, email: user.email, role: user.role }),
    },
  });

  return NextResponse.json({ user }, { status: 201 });
}

// PATCH — update user (admin only): role, name, email, active, color
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const body = await req.json();
  const { userId, role, name, email, active, color, customRoleId, image, lifecycleStatus } = body;

  if (!userId) return NextResponse.json({ error: 'userId es requerido.' }, { status: 400 });

  const adminId = (session.user as { id: string }).id;

  const updateData: Record<string, unknown> = {};

  if (lifecycleStatus !== undefined) {
    const allowed: UserLifecycleStatus[] = ['PROSPECT', 'ACTIVE', 'INACTIVE'];
    if (!allowed.includes(lifecycleStatus as UserLifecycleStatus)) {
      return NextResponse.json({ error: 'Estado de ciclo de vida no válido.' }, { status: 400 });
    }
    const target = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (target?.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Solo usuarios CLIENT pueden tener lifecycleStatus.' }, { status: 400 });
    }
    updateData.lifecycleStatus = lifecycleStatus as UserLifecycleStatus;
  }

  if (role !== undefined) {
    if (!VALID_ROLES.includes(role as Role)) {
      return NextResponse.json({ error: 'Rol no válido.' }, { status: 400 });
    }
    if (userId === adminId && role !== 'ADMIN') {
      return NextResponse.json({ error: 'No puedes cambiar tu propio rol.' }, { status: 403 });
    }
    updateData.role = role as Role;
    // Limpiar lifecycleStatus si deja de ser CLIENT
    if (role !== 'CLIENT') {
      (updateData as any).lifecycleStatus = null;
    }
  }

  if (name !== undefined) updateData.name = name.trim();
  if (color !== undefined) updateData.color = color;

  if (email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Email no válido.' }, { status: 400 });
    }
    const conflict = await db.user.findFirst({
      where: { email: email.toLowerCase(), NOT: { id: userId } },
    });
    if (conflict) {
      return NextResponse.json({ error: 'Ese email ya está en uso.' }, { status: 409 });
    }
    updateData.email = email.trim().toLowerCase();
  }

  if (active !== undefined) {
    if (userId === adminId && active === false) {
      return NextResponse.json({ error: 'No puedes desactivar tu propia cuenta.' }, { status: 403 });
    }
    updateData.active = active;
  }

  if (customRoleId !== undefined) {
    updateData.customRoleId = customRoleId || null;
  }

  if (image !== undefined) {
    updateData.image = image || null;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No hay campos para actualizar.' }, { status: 400 });
  }

  const user = await db.user.update({
    where: { id: userId },
    data: updateData,
    select: userSelect,
  });

  await db.activityLog.create({
    data: {
      userId: adminId,
      action: 'UPDATE_USER',
      entity: 'User',
      entityId: userId,
      details: JSON.stringify(updateData),
    },
  });

  return NextResponse.json({ user });
}

// DELETE — remove a user (admin only)
export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('id');

  if (!userId) return NextResponse.json({ error: 'id es requerido.' }, { status: 400 });

  const adminId = (session.user as { id: string }).id;
  if (userId === adminId) {
    return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta.' }, { status: 403 });
  }

  const target = await db.user.findUnique({ where: { id: userId }, select: { role: true, name: true, email: true } });
  if (!target) return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });

  if (target.role === 'ADMIN') {
    const adminCount = await db.user.count({ where: { role: 'ADMIN' } });
    if (adminCount <= 1) {
      return NextResponse.json({ error: 'No puedes eliminar al único administrador.' }, { status: 403 });
    }
  }

  await db.user.delete({ where: { id: userId } });

  await db.activityLog.create({
    data: {
      userId: adminId,
      action: 'DELETE_USER',
      entity: 'User',
      entityId: userId,
      details: JSON.stringify({ name: target.name, email: target.email }),
    },
  });

  return NextResponse.json({ message: 'Usuario eliminado.' });
}

