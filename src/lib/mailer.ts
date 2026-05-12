import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

const isDev = process.env.NODE_ENV === "development";

/**
 * =========================
 * ENV VARIABLES REQUIRED
 * =========================
 * EMAIL_SERVER_HOST
 * EMAIL_SERVER_PORT
 * EMAIL_SERVER_USER
 * EMAIL_SERVER_PASSWORD
 * EMAIL_FROM
 */

function logSmtpCheck() {
  console.log("SMTP CHECK:", {
    host: process.env.EMAIL_SERVER_HOST,
    port: process.env.EMAIL_SERVER_PORT,
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD ? "OK" : "MISSING",
    from: process.env.EMAIL_FROM,
  });
}

logSmtpCheck();

function resolveHost(): string {
  return process.env.EMAIL_SERVER_HOST?.trim() || "smtp.gmail.com";
}

function resolvePort(): number {
  const p = Number(process.env.EMAIL_SERVER_PORT);
  return Number.isFinite(p) ? p : 587;
}

function resolveSecure(port: number): boolean {
  const env = process.env.EMAIL_SERVER_SECURE;
  if (env === "true") return true;
  if (env === "false") return false;
  return port === 465;
}

function resolveUser(): string | undefined {
  return process.env.EMAIL_SERVER_USER?.trim();
}

function resolvePass(): string | undefined {
  return process.env.EMAIL_SERVER_PASSWORD?.trim();
}

function resolveFrom(): string | undefined {
  return process.env.EMAIL_FROM?.trim();
}

let transporter: Transporter | null = null;
let cacheKey = "";

function getTransporter(): Transporter | null {
  const host = resolveHost();
  const port = resolvePort();
  const secure = resolveSecure(port);
  const user = resolveUser();
  const pass = resolvePass();

  if (!host || !user || !pass) {
    console.error("❌ SMTP missing config:", { host, user, pass: !!pass });
    return null;
  }

  const key = `${host}:${port}:${secure}:${user}`;

  if (transporter && cacheKey === key) return transporter;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },

    pool: true,
    maxConnections: 3,
    maxMessages: 50,

    requireTLS: true,
    tls: {
      rejectUnauthorized: false,
    },
  });

  cacheKey = key;

  return transporter;
}

/**
 * SEND EMAIL
 */
export async function sendMail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  const from = resolveFrom();

  if (!from) {
    console.error("❌ EMAIL_FROM missing");
    return false;
  }

  const transporter = getTransporter();

  if (!transporter) {
    console.error("❌ Transporter not created");
    return false;
  }

  try {
    console.log("📨 Sending email to:", to);

    const result = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    console.log("✅ Email sent:", result.messageId);

    return true;
  } catch (err: any) {
    console.error("🔥 SMTP ERROR FULL (DEBUG MODE):");
    console.error(JSON.stringify(err, null, 2));

    if (err?.code) console.error("CODE:", err.code);
    if (err?.response) console.error("RESPONSE:", err.response);

    // 🔥 IMPORTANTE: ahora sí vemos el error real arriba en API
    throw err;
  }
}

/**
 * CHECK CONFIG
 */
export function isSmtpConfigured(): boolean {
  return Boolean(resolveUser() && resolvePass() && resolveFrom());
}