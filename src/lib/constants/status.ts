/**
 * Status strings centralizados — unica fuente de verdad.
 * Usar estos en lugar de strings hardcoded en todo el codebase.
 */

export const TASK_STATUS = {
  DRAFT:             "draft",
  PENDING:           "pending",
  IN_PROGRESS:       "in_progress",
  CHANGES_REQUESTED: "changes_requested",
  INTERNAL_REVIEW:   "internal_review",
  CLIENT_REVIEW:     "client_review",
  APPROVED:          "approved",
  SCHEDULED:         "scheduled",
  PUBLISHED:         "published",
  COMPLETED:         "completed",
  CANCELLED:         "cancelled",
} as const;

export type TaskStatus = typeof TASK_STATUS[keyof typeof TASK_STATUS];

export const TASK_STATUS_DONE: TaskStatus[] = [
  TASK_STATUS.APPROVED,
  TASK_STATUS.COMPLETED,
  TASK_STATUS.PUBLISHED,
];

export const TASK_STATUS_ACTIVE: TaskStatus[] = [
  TASK_STATUS.PENDING,
  TASK_STATUS.IN_PROGRESS,
  TASK_STATUS.CHANGES_REQUESTED,
  TASK_STATUS.INTERNAL_REVIEW,
  TASK_STATUS.CLIENT_REVIEW,
  TASK_STATUS.SCHEDULED,
];

export const CLIENT_STATUS = {
  ACTIVE:   "active",
  INACTIVE: "inactive",
  PROSPECT: "prospect",
  LEAD:     "lead",
} as const;

export type ClientStatus = typeof CLIENT_STATUS[keyof typeof CLIENT_STATUS];

export const CONTACT_STATUS = {
  LEAD:      "lead",
  PROSPECT:  "prospect",
  ACTIVE:    "active",
  CONVERTED: "converted",
  INACTIVE:  "inactive",
} as const;

export type ContactStatus = typeof CONTACT_STATUS[keyof typeof CONTACT_STATUS];

export const APPOINTMENT_STATUS = {
  PENDING:   "pending",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
} as const;

export type AppointmentStatus = typeof APPOINTMENT_STATUS[keyof typeof APPOINTMENT_STATUS];
