import 'server-only';
import { APP_URL, baseShell, badge, ctaButton, escapeHtml, greeting, htmlToText, infoCard } from './base';
import type { RenderedEmail } from './taskAssigned';

export interface ProjectUpdateTemplateOptions {
  userName:    string | null | undefined;
  projectName: string;
  /** "status_changed" | "manager_assigned" | "task_completed" | "general" */
  kind:        'status_changed' | 'manager_assigned' | 'task_completed' | 'general';
  detail:      string;          // human-readable description of the change
  oldValue?:   string;
  newValue?:   string;
  link?:       string;
}

const KIND_HEADLINE: Record<ProjectUpdateTemplateOptions['kind'], string> = {
  status_changed:   '🔄 Cambio de estado',
  manager_assigned: '👥 Project Manager asignado',
  task_completed:   '✅ Tarea completada',
  general:          '📣 Actualización del proyecto',
};

export function projectUpdateTemplate(opts: ProjectUpdateTemplateOptions): RenderedEmail {
  const subject  = `${opts.projectName} — ${opts.detail}`;
  const href     = opts.link
    ? (opts.link.startsWith('http') ? opts.link : `${APP_URL}${opts.link}`)
    : `${APP_URL}/dashboard`;

  const transition = opts.oldValue && opts.newValue
    ? `<div style="margin-top:10px;font-size:13px;color:#a0a0b0">
         ${badge(opts.oldValue, 'amber')}
         <span style="display:inline-block;padding:0 8px;color:#666">→</span>
         ${badge(opts.newValue, 'green')}
       </div>`
    : '';

  const html = baseShell({
    preview: `${opts.projectName}: ${opts.detail}`,
    bodyHtml: `
      ${greeting(opts.userName)}
      <h2 style="margin:6px 0 14px 0;font-size:20px;color:#fff;font-weight:700">${KIND_HEADLINE[opts.kind]}</h2>
      <p style="margin:0 0 14px 0;color:#a0a0b0;font-size:14px">
        Novedad en <strong style="color:#e5e5e5">${escapeHtml(opts.projectName)}</strong>.
      </p>
      ${infoCard(`
        <p style="margin:0;font-size:14px;color:#e5e5e5;line-height:1.6">${escapeHtml(opts.detail)}</p>
        ${transition}
      `)}
      <p style="margin:14px 0">${ctaButton('Ver detalles', href)}</p>
    `,
  });

  return { subject, html, text: htmlToText(html) };
}
