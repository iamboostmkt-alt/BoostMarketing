/**
 * Toasts enriquecidos al estilo "Invite resent" — con título, subtítulo y acciones.
 * Usar en lugar de toast.success() para eventos importantes.
 */
'use client';
import { toast } from 'sonner';

interface RichToastOptions {
  title:     string;
  message?:  string;
  icon?:     string;
  actions?:  { label: string; href?: string; onClick?: () => void; style?: 'primary' | 'ghost' }[];
  duration?: number;
}

export function toastRich({ title, message, icon = '✓', actions, duration = 4500 }: RichToastOptions) {
  return toast.custom((toastId) => (
    <div
      style={{
        background: '#0F1117',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        padding: '12px 14px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        minWidth: 300,
        maxWidth: 380,
      }}
    >
      {/* Icono */}
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: 'rgba(139,92,246,0.15)',
        border: '1px solid rgba(139,92,246,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, flexShrink: 0,
      }}>
        {icon}
      </div>
      {/* Contenido */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#F5F7FA', margin: 0, lineHeight: 1.3 }}>
          {title}
        </p>
        {message && (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '3px 0 0', lineHeight: 1.4 }}>
            {message}
          </p>
        )}
        {actions && actions.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {actions.map((a, i) => (
              a.href ? (
                <a key={i} href={a.href} target="_blank" rel="noopener noreferrer"
                  style={{
                    fontSize: 12, fontWeight: 500, color: a.style === 'primary' ? '#a78bfa' : 'rgba(255,255,255,0.5)',
                    textDecoration: 'none', padding: '3px 0',
                  }}>
                  {a.label} {a.style === 'primary' ? '→' : ''}
                </a>
              ) : (
                <button key={i} onClick={() => { a.onClick?.(); toast.dismiss(toastId); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 500, color: a.style === 'primary' ? '#a78bfa' : 'rgba(255,255,255,0.5)',
                    padding: '3px 0',
                  }}>
                  {a.label}
                </button>
              )
            ))}
          </div>
        )}
      </div>
      {/* X cerrar */}
      <button onClick={() => toast.dismiss(toastId)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', padding: 2, flexShrink: 0 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  ), { duration });
}

// Helpers específicos para eventos comunes
export const toasts = {
  meetingCreated: (title: string, url?: string) =>
    toastRich({
      title: '📅 Reunión agendada',
      message: title,
      icon: '📅',
      actions: url ? [
        { label: 'Unirse ahora', href: url, style: 'primary' },
        { label: 'Copiar link', onClick: () => navigator.clipboard.writeText(url) },
      ] : [],
    }),

  taskAssigned: (taskTitle: string, link?: string) =>
    toastRich({
      title: '✅ Tarea asignada',
      message: taskTitle,
      icon: '✅',
      actions: link ? [{ label: 'Ver tarea', href: link, style: 'primary' }] : [],
    }),

  inviteSent: (email: string, inviteUrl?: string) =>
    toastRich({
      title: '✉️ Invitación enviada',
      message: `Correo enviado a ${email}`,
      icon: '✉️',
      actions: inviteUrl ? [
        { label: 'Copiar link de invitación', onClick: () => navigator.clipboard.writeText(inviteUrl) },
        { label: 'Ver en navegador', href: inviteUrl, style: 'primary' },
      ] : [],
    }),

  fileSaved: (fileName: string) =>
    toastRich({
      title: '📎 Archivo subido',
      message: fileName,
      icon: '📎',
    }),

  clientSaved: (clientName: string) =>
    toastRich({
      title: '🏢 Cuenta guardada',
      message: clientName,
      icon: '🏢',
    }),

  linkSaved: (url: string) =>
    toastRich({
      title: '🔗 Link guardado',
      message: url.replace(/^https?:\/\//, '').slice(0, 50),
      icon: '🔗',
      actions: [{ label: 'Abrir', href: url, style: 'primary' }],
    }),
};
