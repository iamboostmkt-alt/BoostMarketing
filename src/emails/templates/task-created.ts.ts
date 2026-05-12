export function taskCreatedEmail(taskTitle: string) {
  return `
    <h2>📌 Nueva tarea asignada</h2>
    <p>Se creó una nueva tarea:</p>

    <h3>${taskTitle}</h3>

    <p>Revisa tu dashboard para más detalles.</p>
  `;
}