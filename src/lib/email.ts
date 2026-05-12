import { sendMail } from "@/lib/mailer";

const isDev = process.env.NODE_ENV === "development";

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2 style="color:#7c3aed">Restablecer contrasena</h2>
      <p>Haz clic en el boton para crear una nueva contrasena. El enlace es valido por <strong>1 hora</strong>.</p>
      <a href="${resetUrl}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
        Restablecer contrasena
      </a>
      <p style="color:#666;font-size:13px">Si no solicitaste esto, ignora este mensaje.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
      <p style="color:#999;font-size:12px">BoostMarketing</p>
    </div>
  `;

  await sendMail(email, "Restablecer contrasena - BoostMarketing", html);

  if (isDev) {
    console.log("\n========== Password reset (dev) ==========");
    console.log("To:", email);
    console.log("URL:", resetUrl);
    console.log("==========================================\n");
  }
}
