/** Canonical task workflow statuses */
export const TASK_STATUSES = ['pending', 'in_progress', 'completed'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export function normalizeTaskStatus(status: string | undefined | null): TaskStatus {
  if (!status) return 'pending';
  const s = status.trim();
  if (s === 'completed') return 'completed';
  if (s === 'pending') return 'pending';
  if (s === 'in_progress') return 'in_progress';
  if (s === 'editing' || s === 'review') return 'in_progress';
  return 'pending';
}
