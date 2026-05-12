export function calendarEventEmail(title: string, date: string) {
  return `
    <h2>📆 Nuevo evento en tu calendario</h2>
    <p>${title}</p>
    <p>${date}</p>
  `;
}