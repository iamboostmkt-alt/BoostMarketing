/**
 * Gmail SMTP transporter (Nodemailer).
 *
 * SERVER-ONLY. Never import this from a client component.
 * Reads credentials from environment variables and lazily builds a singleton
 * transporter so we don't open an SMTP socket pool on every cold start.
 *
 * Required env (set in Vercel):
 *   EMAIL_USER          — Gmail address used as the SMTP login
 *   EMAIL_PASS          — Gmail App Password (16-char, no spaces)
 *   EMAIL_FROM          — optional "From:" header; falls back to EMAIL_USER
 */

import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';

const SMTP_HOST   = 'smtp.gmail.com';
const SMTP_PORT   = 465;          // SSL
const SMTP_SECURE = true;

function resolveUser(): string | null {
  return (
    process.env.EMAIL_USER ??
    process.env.GMAIL_USER ??
    process.env.SMTP_USER ??
    null
  );
}

function resolvePassword(): string | null {
  return (
    process.env.EMAIL_PASS ??
    process.env.GMAIL_APP_PASSWORD ??
    process.env.GMAIL_PASSWORD ??
    process.env.SMTP_PASS ??
    null
  );
}

export function resolveFrom(): string {
  const branded = process.env.EMAIL_FROM;
  if (branded) return branded;
  const user = resolveUser();
  return user ? `Boost Marketing <${user}>` : 'Boost Marketing <no-reply@boostmarketing.app>';
}

let cached: Transporter | null = null;
let cachedError = false;

export function getTransporter(): Transporter | null {
  if (cached)      return cached;
  if (cachedError) return null;

  const user = resolveUser();
  const pass = resolvePassword();

  if (!user || !pass) {
    cachedError = true;
    if (process.env.NODE_ENV === 'development') {
      console.warn('[email] Gmail SMTP credentials missing — emails are disabled.');
    }
    return null;
  }

  cached = nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   SMTP_PORT,
    secure: SMTP_SECURE,
    auth:   { user, pass },
    pool:   true,
    maxConnections: 3,
    maxMessages:    50,
  });

  return cached;
}

/** Returns true if SMTP credentials are present. Useful for triggers to bail early. */
export function isEmailConfigured(): boolean {
  return !!(resolveUser() && resolvePassword());
}
