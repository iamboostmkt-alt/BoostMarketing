import { welcomeEmail } from "./templates/welcome";
import { resetPasswordEmail } from "./templates/reset-password";

export type EmailTemplate = "welcome" | "reset-password";

export function renderEmail(
  template: EmailTemplate,
  data: any
): string {
  switch (template) {
    case "welcome":
      return welcomeEmail(data.name);

    case "reset-password":
      return resetPasswordEmail(data.url);

    default:
      return "<p>Email no encontrado</p>";
  }
}