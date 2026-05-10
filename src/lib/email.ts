import nodemailer from 'nodemailer';

const isDev = process.env.NODE_ENV === 'development';

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  if (isDev) {
    console.log('\n========== Password reset (dev) ==========');
    console.log('To:', email);
    console.log('URL:', resetUrl);
    console.log('==========================================\n');
    return;
  }

  const server = process.env.EMAIL_SERVER;
  const from = process.env.EMAIL_FROM ?? 'BoostMarketing <noreply@localhost>';

  if (!server) {
    throw new Error('EMAIL_SERVER no configurado.');
  }

  const transport = nodemailer.createTransport(server);
  await transport.sendMail({
    to: email,
    from,
    subject: 'Restablecer contraseña — BoostMarketing',
    text: `Restablece tu contraseña con este enlace (válido por 1 hora):\n${resetUrl}\n\nSi no solicitaste esto, ignora este mensaje.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#7c3aed">Restablecer contraseña</h2>
        <p>Haz clic en el botón para crear una nueva contraseña. El enlace es válido por <strong>1 hora</strong>.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Restablecer contraseña
        </a>
        <p style="color:#666;font-size:13px">Si no solicitaste esto, ignora este mensaje.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#999;font-size:12px">BoostMarketing</p>
      </div>
    `,
  });
}
