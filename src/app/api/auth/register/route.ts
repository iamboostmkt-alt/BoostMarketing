import { sendMail, templateBienvenida } from "@/lib/mailer";
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { BCRYPT_ROUNDS } from '@/lib/password';
import { sendEmail, welcomeHtml } from '@/lib/resend';

const isDev = process.env.NODE_ENV === 'development';

export async function POST(req: NextRequest) {
  try {
    // â”€â”€ Parse body â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'El cuerpo de la solicitud no es JSON vÃ¡lido' },
        { status: 400 }
      );
    }

    const { name, email, password } = body as {
      name?: unknown;
      email?: unknown;
      password?: unknown;
    };

    // â”€â”€ Validate fields â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { success: false, error: 'El email es requerido' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: 'La contraseÃ±a es requerida' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'La contraseÃ±a debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { success: false, error: 'Email no vÃ¡lido' },
        { status: 400 }
      );
    }

    // â”€â”€ Check for existing account â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Ya existe una cuenta con este email' },
        { status: 409 }
      );
    }

    // â”€â”€ Hash password â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // â”€â”€ Create user â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (isDev) console.log('[register] creating user:', normalizedEmail);

    const user = await db.user.create({
      data: {
        name:     name.trim(),
        email:    normalizedEmail,
        password: hashedPassword,
        role:     'UNASSIGNED',
        color:    '#7c3aed',
        active:   true,
      },
    });

    if (isDev) console.log('[register] user created:', user.id);

    // â”€â”€ Welcome notification (non-blocking â€” failure is acceptable) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    db.notification
      .create({
        data: {
          userId:  user.id,
          message: 'Â¡Bienvenido! Un administrador asignarÃ¡ tu rol en breve.',
          type:    'welcome',
          link:    '/dashboard/waiting-assignment',
        },
      })
      .catch((err) => console.error('[register] notification error (non-fatal):', err));

    // â”€â”€ Welcome email (non-blocking) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    sendEmail({
      to:      user.email,
      subject: 'Â¡Bienvenido a BoostMarketing!',
      html:    welcomeHtml({
        userName: user.name ?? 'Usuario',
        appUrl:   process.env.NEXTAUTH_URL ?? 'https://boostmarketing.vercel.app',
      }),
    }).catch(() => undefined);

    // â”€â”€ Activity log (non-blocking) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    db.activityLog
      .create({
        data: {
          userId:   user.id,
          action:   'REGISTER',
          entity:   'User',
          entityId: user.id,
          details:  JSON.stringify({ name: user.name, email: user.email }),
        },
      })
      .catch((err) => console.error('[register] activityLog error (non-fatal):', err));

    // Return user without password
    const { password: _pw, ...userWithoutPassword } = user;

    return NextResponse.json(
      {
        success: true,
        message: 'Cuenta creada exitosamente',
        user: userWithoutPassword,
      },
      { status: 201 }
    );

  } catch (error) {
    // â”€â”€ Structured error logging â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const err = error as { code?: string; message?: string; meta?: unknown };

    console.error('[register] FATAL ERROR', {
      code:    err.code,
      message: err.message,
      meta:    err.meta,
    });

    // Prisma unique constraint (race condition â€” two requests with same email)
    if (err.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Ya existe una cuenta con este email' },
        { status: 409 }
      );
    }

    // Database connectivity / Prisma client init errors
    if (err.code === 'P1001' || err.code === 'P1002' || err.code === 'P1008') {
      return NextResponse.json(
        { success: false, error: 'No se pudo conectar a la base de datos. Intenta de nuevo.' },
        { status: 503 }
      );
    }

    // In development, surface the real error message so you can diagnose
    const publicMsg = isDev
      ? `Error del servidor: ${err.message ?? 'Error desconocido'}`
      : 'Error interno del servidor';

    return NextResponse.json(
      { success: false, error: publicMsg },
      { status: 500 }
    );
  }
}


