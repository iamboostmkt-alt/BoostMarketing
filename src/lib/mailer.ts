import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

const isDev = process.env.NODE_ENV === "development";

function resolveHost(): string {
  return process.env.EMAIL_SERVER_HOST?.trim() || "smtp.gmail.com";
}

function resolvePort(): number {
  const p = Number(process.env.EMAIL_SERVER_PORT);
  return Number.isFinite(p) && p > 0 ? p : 587;
}

function resolveSecure(port: number): boolean {
  if (process.env.EMAIL_SERVER_SECURE === "true") return true;
  if (process.env.EMAIL_SERVER_SECURE === "false") return false;
  return port === 465;
}

function resolveUser(): string | undefined {
  return process.env.EMAIL_SERVER_USER?.trim() || undefined;
}

function resolvePassword(): string | undefined {
  return process.env.EMAIL_SERVER_PASSWORD?.trim() || undefined;
}

let cached: Transporter | null = null;
let cachedKey = "";

function getTransporter(): Transporter | null {
  const host = resolveHost();
  const port = resolvePort();
  const secure = resolveSecure(port);
  const user = resolveUser();
  const pass = resolvePassword();
  const key = `${host}:${port}:${secure}:${user ?? ""}`;
  if (!user || !pass) {
    return null;
  }
  if (cached && cachedKey === key) return cached;
  cached = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
    tls: {
      rejectUnauthorized: process.env.EMAIL_TLS_REJECT_UNAUTHORIZED !== "false",
    },
  });
  cachedKey = key;
  return cached;
}

/**
 * Production mail entrypoint. Uses ONLY:
 * EMAIL_SERVER_HOST, EMAIL_SERVER_PORT, EMAIL_SERVER_SECURE (optional),
 * EMAIL_SERVER_USER, EMAIL_SERVER_PASSWORD, EMAIL_FROM
 */
export async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  const from = process.env.EMAIL_FROM?.trim();
  if (!from) {
    if (isDev) console.warn("[sendMail] EMAIL_FROM no configurado.");
    return false;
  }

  const transport = getTransporter();
  if (!transport) {
    if (isDev) {
      console.warn("[sendMail] SMTP no configurado (EMAIL_SERVER_USER / EMAIL_SERVER_PASSWORD).");
      console.log("  To:", to, "Subject:", subject);
    }
    return false;
  }

  try {
    await transport.sendMail({ from, to, subject, html });
    if (isDev) console.log("[sendMail] sent →", to);
    return true;
  } catch (e) {
    console.error("[sendMail]", e);
    return false;
  }
}

export function isSmtpConfigured(): boolean {
  return !!(resolveUser() && resolvePassword() && process.env.EMAIL_FROM?.trim());
}
