import { sendTemplateMail } from "@/lib/mailer";

export async function notifyTaskCreated(email: string, taskTitle: string) {
  return sendTemplateMail(
    email,
    "Nueva tarea",
    "task-created",
    { taskTitle }
  );
}

export async function notifyMeeting(email: string, date: string, link: string) {
  return sendTemplateMail(
    email,
    "Videollamada programada",
    "meeting-scheduled",
    { date, link }
  );
}

export async function notifyCalendarEvent(email: string, title: string, date: string) {
  return sendTemplateMail(
    email,
    "Nuevo evento",
    "calendar-event",
    { title, date }
  );
}

export async function notifyTaskReminder(email: string, taskTitle: string) {
  return sendTemplateMail(
    email,
    "Recordatorio de tarea",
    "task-reminder",
    { taskTitle }
  );
}