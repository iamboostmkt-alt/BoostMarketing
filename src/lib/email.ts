import { sendMail, templateResetPassword } from "@/lib/mailer";
import { getBranding } from "@/lib/branding";

const isDev = process.env.NODE_ENV === "development";

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  // Usar templateResetPassword con branding del workspace
  const branding = await getBranding().catch(() => undefined);
  const html = templateResetPassword('', resetUrl, branding);

  await sendMail(email, "Restablecer contraseña - BoostMarketing", html);

  if (isDev) {
    console.log("\n========== Password reset (dev) ==========");
    console.log("To:", email);
    console.log("URL:", resetUrl);
    console.log("==========================================\n");
  }
}
