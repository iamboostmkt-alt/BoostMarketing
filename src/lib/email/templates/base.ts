/**
 * Shared HTML email shell + small primitives reused by every template.
 * Inline styles only — Gmail strips <style> blocks in many clients.
 */

import 'server-only';

const APP_URL = process.env.NEXTAUTH_URL ?? 'https://boostmarketing.vercel.app';

const COLORS = {
  bg:        '#0b0b0f',
  card:      '#15151c',
  border:    '#2a2a3a',
  text:      '#e5e5e5',
  muted:     '#a0a0b0',
  faint:     '#888888',
  brand:     '#7c3aed',
  brandSoft: '#a78bfa',
} as const;

/** Strips HTML tags and decodes a couple of common entities for the plaintext fallback. */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
    .replace(/<li[^>]*>/gi, ' • ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Escape user-provided content before interpolating it into HTML.
 * Templates always pass user content through this — never raw.
 */
export function escapeHtml(input: string | null | undefined): string {
  if (input == null) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface BaseShellOptions {
  preview?: string;          // hidden preheader text shown in inbox previews
  bodyHtml: string;
}

export function baseShell({ preview, bodyHtml }: BaseShellOptions): string {
  const preheader = preview
    ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${COLORS.bg};opacity:0">${escapeHtml(preview)}</div>`
    : '';

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="dark light" />
    <title>Boost Marketing</title>
  </head>
  <body style="margin:0;padding:0;background:${COLORS.bg};color:${COLORS.text};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
    ${preheader}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${COLORS.bg};padding:24px 16px">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;background:${COLORS.card};border:1px solid ${COLORS.border};border-radius:16px;overflow:hidden">
            <tr>
              <td style="background:linear-gradient(135deg,${COLORS.brand} 0%,${COLORS.brandSoft} 100%);padding:24px 32px">
                <div style="display:flex;align-items:center;gap:10px">
                  <span style="font-size:22px;line-height:1">⚡</span>
                  <span style="font-size:18px;font-weight:700;color:#fff;letter-spacing:.2px">Boost Marketing</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 12px 32px;color:${COLORS.text};font-size:15px;line-height:1.55">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 22px 32px;border-top:1px solid ${COLORS.border};color:${COLORS.faint};font-size:11px;line-height:1.5">
                Recibiste este correo porque tienes una cuenta en Boost Marketing.<br/>
                Si no esperabas este mensaje, puedes ignorarlo con seguridad.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Pill-style status/priority badge. */
export function badge(label: string, accent: 'brand' | 'green' | 'amber' | 'red' = 'brand'): string {
  const map = {
    brand: { bg: 'rgba(124,58,237,.15)', text: COLORS.brandSoft },
    green: { bg: 'rgba(16,185,129,.15)', text: '#34d399' },
    amber: { bg: 'rgba(245,158,11,.15)', text: '#fbbf24' },
    red:   { bg: 'rgba(239,68,68,.15)',  text: '#f87171' },
  };
  const c = map[accent];
  return `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${c.bg};color:${c.text};font-size:11px;font-weight:600;letter-spacing:.3px">${escapeHtml(label)}</span>`;
}

export function ctaButton(label: string, href: string): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:${COLORS.brand};color:#ffffff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">${escapeHtml(label)}</a>`;
}

export function infoCard(innerHtml: string): string {
  return `<div style="background:${COLORS.bg};border:1px solid ${COLORS.border};border-radius:12px;padding:16px 18px;margin:18px 0">${innerHtml}</div>`;
}

export function greeting(name: string | null | undefined): string {
  const who = (name ?? '').trim() || 'Hola';
  return `<p style="margin:0 0 6px 0;color:${COLORS.muted};font-size:14px">Hola, <strong style="color:${COLORS.text}">${escapeHtml(who)}</strong></p>`;
}

export { APP_URL, COLORS };
