import 'server-only';
import { APP_URL, baseShell, ctaButton, escapeHtml, greeting, htmlToText, infoCard } from './base';
import type { RenderedEmail } from './taskAssigned';

export interface ClientMessageTemplateOptions {
  recipientName: string | null | undefined;
  senderName:    string | null | undefined;
  senderRole?:   string;     // shown to the recipient ("Project Manager", "Cliente", …)
  clientName:    string;
  snippet:       string;
  /** Where the CTA points — defaults to client portal for clients, chat for staff. */
  link?:         string;
  /** Audience determines the CTA copy. */
  audience:      'client' | 'staff';
}

export function clientMessageTemplate(opts: ClientMessageTemplateOptions): RenderedEmail {
  const sender   = (opts.senderName ?? '').trim() || (opts.audience === 'client' ? 'Tu equipo' : 'Un cliente');
  const role     = opts.senderRole ? ` · ${opts.senderRole}` : '';

  const subject  = opts.audience === 'client'
    ? `Nuevo mensaje de ${sender}`
    : `Nuevo mensaje en ${opts.clientName}`;

  const fallbackLink = opts.audience === 'client'
    ? `${APP_URL}/dashboard/client-portal`
    : `${APP_URL}/dashboard/chat`;
  const href = opts.link
    ? (opts.link.startsWith('http') ? opts.link : `${APP_URL}${opts.link}`)
    : fallbackLink;

  const headline = opts.audience === 'client'
    ? '📨 Tu equipo te escribió'
    : `📨 Mensaje de ${escapeHtml(opts.clientName)}`;

  const html = baseShell({
    preview: `${sender}: ${opts.snippet}`,
    bodyHtml: `
      ${greeting(opts.recipientName)}
      <h2 style="margin:6px 0 14px 0;font-size:20px;color:#fff;font-weight:700">${headline}</h2>
      <p style="margin:0 0 14px 0;color:#a0a0b0;font-size:14px">
        <strong style="color:#e5e5e5">${escapeHtml(sender)}</strong>${escapeHtml(role)} envió un mensaje
        ${opts.audience === 'staff' ? `en el canal del cliente <strong style="color:#e5e5e5">${escapeHtml(opts.clientName)}</strong>` : ''}.
      </p>
      ${infoCard(`
        <p style="margin:0;font-size:14px;color:#e5e5e5;line-height:1.6">
          "${escapeHtml(opts.snippet)}"
        </p>
      `)}
      <p style="margin:14px 0">${ctaButton('Abrir conversación', href)}</p>
    `,
  });

  return { subject, html, text: htmlToText(html) };
}
