export type TaskStatus =
  | "draft"
  | "pending"
  | "in_progress"
  | "internal_review"
  | "client_review"
  | "changes_requested"
  | "approved"
  | "scheduled"
  | "published"
  | "completed"
  | "cancelled";

const STATUS_MAP: Record<string, TaskStatus> = {
  draft:               "draft",
  pending:             "pending",
  in_progress:         "in_progress",
  internal_review:     "internal_review",
  client_review:       "client_review",
  changes_requested:   "changes_requested",
  approved:            "approved",
  scheduled:           "scheduled",
  published:           "published",
  completed:           "completed",
  cancelled:           "cancelled",
  // aliases legacy
  editing:             "in_progress",
  review:              "client_review",
  // aliases en español
  borrador:            "draft",
  pendiente:           "pending",
  en_progreso:         "in_progress",
  revision_interna:    "internal_review",
  en_revision:         "client_review",
  cambios_pedidos:     "changes_requested",
  aprobado:            "approved",
  programado:          "scheduled",
  publicado:           "published",
  completada:          "completed",
  cancelada:           "cancelled",
};

export function normalizeTaskStatus(raw: string): TaskStatus {
  const key = raw.toLowerCase().trim().replace(/\s+/g, "_");
  return STATUS_MAP[key] ?? "pending";
}

export function statusLabel(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    draft:               "Borrador",
    pending:             "Pendiente",
    in_progress:         "En progreso",
    internal_review:     "Revisión interna",
    client_review:       "En revisión",
    changes_requested:   "Cambios pedidos",
    approved:            "Aprobado",
    scheduled:           "Programado",
    published:           "Publicado",
    completed:           "Completado",
    cancelled:           "Cancelado",
  };
  return labels[status] ?? status;
}

/** Estados visibles al cliente en el portal */
export const CLIENT_VISIBLE_STATUSES: TaskStatus[] = [
  "in_progress",
  "client_review",
  "changes_requested",
  "approved",
  "scheduled",
  "published",
  "completed",
];

/** Estados que indican que la tarea está activa (no terminada) */
export const ACTIVE_STATUSES: TaskStatus[] = [
  "draft",
  "pending",
  "in_progress",
  "internal_review",
  "client_review",
  "changes_requested",
  "approved",
  "scheduled",
];
