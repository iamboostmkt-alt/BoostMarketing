export function taskReminderEmail(taskTitle: string) {
  return `
    <h2>⏰ Recordatorio de tarea</h2>
    <p>No olvides completar:</p>
    <strong>${taskTitle}</strong>
  `;
}