import 'server-only';
import { APP_URL, baseShell, badge, ctaButton, escapeHtml, greeting, htmlToText, infoCard } from './base';

export interface TaskAssignedTemplateOptions {
  userName:         string | null | undefined;
  taskTitle:        string;
  taskDescription?: string;
  priority:         string;
  dueDate?:         string;
  assignedBy?:      string | null;
  coAssigneesCount?: number;   // when multi-assigned, surface that 1+N teammates were assigned together
}

const PRIORITY_TONE: Record<string, 'brand' | 'green' | 'amber' | 'red'> = {
  low:    'green',
  medium: 'amber',
  high:   'red',
  urgent: 'red',
};

const PRIORITY_LABEL: Record<string, string> = {
  low:    'Prioridad baja',
  medium: 'Prioridad media',
  high:   'Prioridad alta',
  urgent: 'Urgente',
};

export interface RenderedEmail {
  subject: string;
  html:    string;
  text:    string;
}

export function taskAssignedTemplate(opts: TaskAssignedTemplateOptions): RenderedEmail {
  const tone     = PRIORITY_TONE[opts.priority] ?? 'brand';
  const prioLbl  = PRIORITY_LABEL[opts.priority] ?? opts.priority;
  const subject  = `Nueva tarea asignada: ${opts.taskTitle}`;

  const coAssigned = (opts.coAssigneesCount ?? 0) > 0
    ? `<p style="margin:6px 0 0 0;color:#888;font-size:12px">+ ${opts.coAssigneesCount} compañero${opts.coAssigneesCount === 1 ? '' : 's'} de equipo asignado${opts.coAssigneesCount === 1 ? '' : 's'} también.</p>`
    : '';

  const html = baseShell({
    preview: opts.assignedBy
      ? `${opts.assignedBy} te asignó "${opts.taskTitle}"`
      : `Nueva tarea: ${opts.taskTitle}`,
    bodyHtml: `
      ${greeting(opts.userName)}
      <h2 style="margin:6px 0 14px 0;font-size:20px;color:#fff;font-weight:700">📋 Nueva tarea asignada</h2>
      <p style="margin:0 0 14px 0;color:#a0a0b0;font-size:14px">
        ${opts.assignedBy
          ? `<strong style="color:#e5e5e5">${escapeHtml(opts.assignedBy)}</strong> te asignó una nueva tarea.`
          : 'Tienes una nueva tarea asignada.'}
      </p>
      ${infoCard(`
        <p style="margin:0 0 8px 0;font-size:16px;font-weight:600;color:#fff">${escapeHtml(opts.taskTitle)}</p>
        ${opts.taskDescription ? `<p style="margin:0 0 12px 0;font-size:13px;color:#a0a0b0;line-height:1.6">${escapeHtml(opts.taskDescription)}</p>` : ''}
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${badge(prioLbl, tone)}
          ${opts.dueDate ? badge(`Vence ${opts.dueDate}`, 'brand') : ''}
        </div>
        ${coAssigned}
      `)}
      <p style="margin:14px 0">${ctaButton('Ver mis tareas', `${APP_URL}/dashboard/tasks`)}</p>
    `,
  });

  return { subject, html, text: htmlToText(html) };
}
