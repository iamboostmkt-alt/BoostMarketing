export const statusColors: Record<string, string> = {
  pending: 'status-pending',
  editing: 'status-editing',
  review: 'status-review',
  completed: 'status-completed',
  lead: 'status-lead',
  prospect: 'status-prospect',
  negotiation: 'status-negotiation',
  won: 'status-won',
  lost: 'status-lost',
  active: 'status-active',
  inactive: 'status-inactive',
};

export const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  editing: 'Editando',
  review: 'Revisión',
  completed: 'Completado',
  lead: 'Lead',
  prospect: 'Prospecto',
  negotiation: 'Negociación',
  won: 'Ganado',
  lost: 'Perdido',
  active: 'Activo',
  inactive: 'Inactivo',
};

export const dotColors: Record<string, string> = {
  purple: 'dot-purple',
  cyan: 'dot-cyan',
  amber: 'dot-amber',
  green: 'dot-green',
  red: 'dot-red',
  blue: 'dot-blue',
};

export const priorityColors: Record<string, string> = {
  low: 'priority-low',
  medium: 'priority-medium',
  high: 'priority-high',
  urgent: 'priority-urgent',
};

export const priorityLabels: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};

export const crmStages = [
  { id: 'lead', label: 'Leads', color: 'dot-purple' },
  { id: 'prospect', label: 'Prospectos', color: 'dot-cyan' },
  { id: 'negotiation', label: 'Negociación', color: 'dot-amber' },
  { id: 'won', label: 'Ganados', color: 'dot-green' },
] as const;

export const taskStatuses = [
  { id: 'pending', label: 'Pendiente', color: 'status-pending' },
  { id: 'editing', label: 'En Progreso', color: 'status-editing' },
  { id: 'review', label: 'Revisión', color: 'status-review' },
  { id: 'completed', label: 'Completado', color: 'status-completed' },
] as const;

export const activityStatuses = [
  { id: 'pending',     label: 'Pendiente',   color: 'status-pending'   },
  { id: 'in_progress', label: 'En Progreso', color: 'status-editing'   },
  { id: 'completed',   label: 'Completado',  color: 'status-completed' },
] as const;

export const activityStatusColors: Record<string, string> = {
  pending:     'status-pending',
  in_progress: 'status-editing',
  completed:   'status-completed',
};

export const activityStatusLabels: Record<string, string> = {
  pending:     'Pendiente',
  in_progress: 'En Progreso',
  completed:   'Completado',
};
