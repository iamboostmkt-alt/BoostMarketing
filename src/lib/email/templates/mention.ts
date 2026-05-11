import 'server-only';
import { APP_URL, baseShell, ctaButton, escapeHtml, greeting, htmlToText, infoCard } from './base';
import type { RenderedEmail } from './taskAssigned';

export interface MentionTemplateOptions {
  userName:        string | null | undefined;
  actorName?:      string | null;
  contextSnippet:  string;
  channelLabel?:   string;     // "# general", "Actividad …", "Cliente …"
  link:            string;     // app-relative path or absolute URL
}

export function mentionTemplate(opts: MentionTemplateOptions): RenderedEmail {
  const who      = (opts.actorName ?? '').trim() || 'Alguien';
  const subject  = `${who} te mencionó${opts.channelLabel ? ` en ${opts.channelLabel}` : ''}`;
  const href     = opts.link.startsWith('http') ? opts.link : `${APP_URL}${opts.link}`;

  const html = baseShell({
    preview: `${who}: ${opts.contextSnippet}`,
    bodyHtml: `
      ${greeting(opts.userName)}
      <h2 style="margin:6px 0 14px 0;font-size:20px;color:#fff;font-weight:700">💬 Te mencionaron</h2>
      <p style="margin:0 0 14px 0;color:#a0a0b0;font-size:14px">
        <strong style="color:#e5e5e5">${escapeHtml(who)}</strong> te mencionó
        ${opts.channelLabel ? `en <strong style="color:#e5e5e5">${escapeHtml(opts.channelLabel)}</strong>` : ''}.
      </p>
      ${infoCard(`
        <p style="margin:0;font-size:14px;color:#e5e5e5;font-style:italic;line-height:1.6">
          "${escapeHtml(opts.contextSnippet)}"
        </p>
      `)}
      <p style="margin:14px 0">${ctaButton('Ir a la conversación', href)}</p>
    `,
  });

  return { subject, html, text: htmlToText(html) };
}
