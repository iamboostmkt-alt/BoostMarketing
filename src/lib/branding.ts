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
  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${brandName}" width="150" style="max-height:48px;width:auto;max-width:180px;display:block;margin:0 auto 8px;" />`
    : `<div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:10px;padding:8px 20px;margin-bottom:8px;"><span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">${brandName}</span></div>`;

  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light" />
  <title>${brandName}</title>
  <style>:root{color-scheme:light only}body{margin:0;padding:0;background-color:#f4f4f7!important}</style>
</head>
<body bgcolor="#f4f4f7" style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f7" style="background-color:#f4f4f7;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">
        <tr>
          <td bgcolor="${brandColor}" style="background:linear-gradient(135deg,${brandColor},#9333ea);padding:28px 32px;text-align:center;">
            ${logoHtml}
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">${brandName}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;background-color:#ffffff;color:#18181b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;">
            ${content}
          </td>
        </tr>
        <tr>
          <td bgcolor="#f9fafb" style="background-color:#f9fafb;border-top:1px solid #e4e4e7;padding:16px 32px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">${brandName} &copy; ${new Date().getFullYear()} &middot; Mensaje automático</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}