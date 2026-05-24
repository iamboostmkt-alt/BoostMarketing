import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/security/rate-limit';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';

const EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// Always return 200 — never reveal whether an email is registered
const OK = NextResponse.json({ message: 'Si el email existe, recibirás un enlace.' });

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 3, windowMs: 300_000, identifier: 'forgot-password' });
  if (!rl.success) return rl.response;
  try {
    const body = await req.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email no válido.' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email } });

    if (!user?.password) {
      // No account, or OAuth-only account — silently succeed
      return OK;
    }

    // Delete any existing tokens for this email
    await db.passwordResetToken.deleteMany({ where: { email } });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + EXPIRY_MS);

    await db.passwordResetToken.create({ data: { email, token, expires } });

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    await sendPasswordResetEmail(email, resetUrl);

    return OK;
  } catch (error) {
    console.error('[forgot-password]', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
