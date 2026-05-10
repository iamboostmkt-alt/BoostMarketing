import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { BCRYPT_ROUNDS } from '@/lib/password';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, password } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres.' },
        { status: 400 }
      );
    }

    const record = await db.passwordResetToken.findUnique({ where: { token } });

    if (!record) {
      return NextResponse.json({ error: 'El enlace no es válido.' }, { status: 400 });
    }

    if (record.expires < new Date()) {
      await db.passwordResetToken.delete({ where: { token } });
      return NextResponse.json(
        { error: 'El enlace ha expirado. Solicita uno nuevo.' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { email: record.email } });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await db.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    // Delete all tokens for this email
    await db.passwordResetToken.deleteMany({ where: { email: record.email } });

    await db.activityLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_RESET',
        entity: 'User',
        entityId: user.id,
        details: JSON.stringify({ email: user.email }),
      },
    });

    return NextResponse.json({ message: 'Contraseña actualizada.' });
  } catch (error) {
    console.error('[reset-password]', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
