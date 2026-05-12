export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";

const STATUS_MAP: Record<string, TaskStatus> = {
  pending:     "pending",
  in_progress: "in_progress",
  completed:   "completed",
  cancelled:   "cancelled",
  // aliases en español
  pendiente:   "pending",
  en_progreso: "in_progress",
  completada:  "completed",
  cancelada:   "cancelled",
};

export function normalizeTaskStatus(raw: string): TaskStatus {
  const key = raw.toLowerCase().trim().replace(/\s+/g, "_");
  return STATUS_MAP[key] ?? "pending";
}

export function statusLabel(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    pending:     "Pendiente",
    in_progress: "En Progreso",
    completed:   "Completada",
    cancelled:   "Cancelada",
  };
  return labels[status] ?? status;
}
