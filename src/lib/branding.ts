import { db } from '@/lib/db';

export interface Branding {
  logoUrl:    string;
  brandName:  string;
  brandColor: string;
}

const DEFAULT: Branding = {
  logoUrl:    '',
  brandName:  '',    // Se toma de la DB (agencyName del workspace)
  brandColor: '#7c3aed',
};

// ── Cache en memoria — por workspaceId ───────────────────────────────────────
const TTL_MS = 5 * 60 * 1000; // 5 minutos
const _cache = new Map<string, { data: Branding; ts: number }>();

export function clearBrandingCache(workspaceId?: string) {
  if (workspaceId) _cache.delete(workspaceId);
  else _cache.clear();
}

export async function getBranding(workspaceId?: string): Promise<Branding> {
  const key = workspaceId ?? '__global__';
  const cached = _cache.get(key);
  if (cached && Date.now() - cached.ts < TTL_MS) return cached.data;

  try {
    // Filtrar por workspaceId si se proporciona, sino tomar el primero (emails del sistema)
    const settings = workspaceId
      ? await db.siteSettings.findFirst({ where: { workspaceId } })
      : await db.siteSettings.findFirst();

    const data: Branding = !settings ? DEFAULT : {
      logoUrl:    settings.logoUrl    || '',
      brandName:  settings.agencyName || DEFAULT.brandName,
      brandColor: (settings as any).brandColor || DEFAULT.brandColor,
    };
    _cache.set(key, { data, ts: Date.now() });
    return data;
  } catch {
    return DEFAULT;
  }
}

export function emailLayout(content: string, branding: Branding): string {
  const { logoUrl, brandColor } = branding;
  const brandName = branding.brandName || 'Mi Agencia';

  // Header: Weeklink arriba + logo/nombre del workspace abajo
  const weekinkLogoUrl = 'https://weeklink.com.mx/weeklink-logo.png';

  const workspaceLogoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${brandName}" style="max-height:36px;width:auto;max-width:140px;display:block;margin:0 auto;" />`
    : `<span style="color:rgba(255,255,255,0.9);font-size:15px;font-weight:700;">${brandName}</span>`;

  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light" />
  <title>${brandName}</title>
  <style>
    :root{color-scheme:light only}
    body{margin:0;padding:0;background-color:#f4f4f7!important;color:#18181b!important}
    * {color-scheme:light only!important}
    @media (prefers-color-scheme:dark){
      body{background-color:#f4f4f7!important;color:#18181b!important}
      table{background-color:#f4f4f7!important}
      td{color:#18181b!important}
      .content-td{background-color:#ffffff!important;color:#18181b!important}
      .footer-td{background-color:#f9fafb!important}
    }
  </style>
</head>
<body bgcolor="#f4f4f7" style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f7" style="background-color:#f4f4f7;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">

        <!-- Header morado con logo Weeklink -->
        <tr>
          <td bgcolor="${brandColor}" style="background:linear-gradient(135deg,${brandColor},#9333ea);padding:20px 32px 0;text-align:center;">
            <!-- Logo Weeklink (plataforma) -->
            <img src="${weekinkLogoUrl}" alt="Weeklink" width="120"
              style="max-height:28px;width:auto;display:block;margin:0 auto;filter:brightness(0) invert(1);" />
          </td>
        </tr>

        <!-- Franja del workspace -->
        <tr>
          <td bgcolor="${brandColor}" style="background:linear-gradient(135deg,${brandColor},#9333ea);padding:12px 32px 24px;text-align:center;">
            <div style="display:inline-block;background:rgba(0,0,0,0.15);border-radius:10px;padding:8px 20px;">
              ${workspaceLogoHtml}
            </div>
          </td>
        </tr>

        <!-- Contenido -->
        <tr>
          <td class="content-td" style="padding:32px;background-color:#ffffff!important;color:#18181b!important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td class="footer-td" bgcolor="#f9fafb" style="background-color:#f9fafb!important;border-top:1px solid #e4e4e7;padding:16px 32px;text-align:center;">
            <p style="margin:0 0 4px;color:#6b7280;font-size:12px;font-weight:600;">${brandName}</p>
            <p style="margin:0;color:#9ca3af;font-size:11px;">Enviado desde Weeklink &middot; weeklink.com.mx &middot; ${new Date().getFullYear()}</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
