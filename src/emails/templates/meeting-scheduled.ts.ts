export function meetingScheduledEmail(date: string, link: string) {
  return `
    <h2>📅 Videollamada programada</h2>
    <p>Fecha: ${date}</p>

    <a href="${link}" style="padding:10px;background:#000;color:#fff;">
      Unirse a la reunión
    </a>
  `;
}