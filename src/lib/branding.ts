import { db } from '@/lib/db';

export interface Branding {
  logoUrl:    string;
  brandName:  string;
  brandColor: string;
}

const DEFAULT: Branding = {
  logoUrl:    '',
  brandName:  'BoostMarketing',
  brandColor: '#7c3aed',
};

export async function getBranding(): Promise<Branding> {
  try {
    const settings = await db.siteSettings.findFirst();
    if (!settings) return DEFAULT;
    return {
      logoUrl:    settings.logoUrl    || '',
      brandName:  settings.agencyName || DEFAULT.brandName,
      brandColor: DEFAULT.brandColor, // SiteSettings no tiene brandColor aún
    };
  } catch {
    return DEFAULT;
  }
}

export function emailLayout(content: string, branding: Branding): string {
  const { logoUrl, brandName, brandColor } = branding;
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${brandName}</title></head>
<body style="margin:0;padding:0;background:#0f0f13;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f13;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#1a1a24;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
        <tr><td style="background:linear-gradient(135deg,${brandColor},${brandColor}cc);padding:28px 32px;text-align:center;">
          ${logoUrl
            ? `<img src="\${logoUrl}" alt="\${brandName}" style="max-height:48px;max-width:180px;object-fit:contain;margin-bottom:8px;" /><br/>`
            : `<div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:12px;padding:8px 20px;margin-bottom:8px;"><span style="color:white;font-size:20px;font-weight:700;letter-spacing:-0.5px;">\${brandName}</span></div><br/>`
          }
        </td></tr>
        <tr><td style="padding:32px;">
          ${content}
        </td></tr>
        <tr><td style="background:rgba(255,255,255,0.03);border-top:1px solid rgba(255,255,255,0.06);padding:16px 32px;text-align:center;">
          <p style="margin:0;color:rgba(255,255,255,0.3);font-size:12px;">${brandName} &copy; ${new Date().getFullYear()} &middot; Este es un mensaje automático</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
