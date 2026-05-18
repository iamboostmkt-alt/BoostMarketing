export const statusColors: Record<string, string> = {
  // Task workflow
  draft:               'status-draft',
  pending:             'status-pending',
  in_progress:         'status-editing',
  editing:             'status-editing',
  internal_review:     'status-internal-review',
  client_review:       'status-client-review',
  changes_requested:   'status-changes',
  approved:            'status-approved',
  scheduled:           'status-scheduled',
  published:           'status-published',
  review:              'status-review',
  completed:           'status-completed',
  // CRM
  lead:                'status-lead',
  prospect:            'status-prospect',
  negotiation:         'status-negotiation',
  won:                 'status-won',
  lost:                'status-lost',
  active:              'status-active',
  inactive:            'status-inactive',
  cliente:             'status-won',
  activo:              'status-active',
};

export const statusLabels: Record<string, string> = {
  // Task workflow
  draft:               'Borrador',
  pending:             'Pendiente',
  in_progress:         'En progreso',
  editing:             'En progreso',
  internal_review:     'Revisión interna',
  client_review:       'En revisión',
  changes_requested:   'Cambios pedidos',
  approved:            'Aprobado',
  scheduled:           'Programado',
  published:           'Publicado',
  review:              'En progreso',
  completed:           'Completado',
  // CRM
  lead:                'Lead',
  prospect:            'Prospecto',
  negotiation:         'Negociación',
  won:                 'Ganado',
  lost:                'Perdido',
  active:              'Activo',
  inactive:            'Inactivo',
  cliente:             'Cliente',
  activo:              'Activo',
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
  { id: 'prospect', label: 'Prospectos', color: 'dot-cyan',   description: 'Registro inicial' },
  { id: 'lead',     label: 'Leads',      color: 'dot-purple', description: 'Videollamada agendada' },
  { id: 'cliente',  label: 'Clientes',   color: 'dot-green',  description: 'Con PM asignado' },
  { id: 'activo',   label: 'Activos',    color: 'dot-amber',  description: 'Onboarding completo' },
] as const;

/** Map legacy stage IDs to the new pipeline */
export const legacyStageMigration: Record<string, string> = {
  negotiation: 'cliente',
  won:         'activo',
  lost:        'prospect',
};

export const taskStatuses = [
  { id: 'draft',              label: 'Borrador',          color: 'status-draft'             },
  { id: 'pending',            label: 'Pendiente',         color: 'status-pending'           },
  { id: 'in_progress',        label: 'En progreso',       color: 'status-editing'           },
  { id: 'internal_review',    label: 'Revisión interna',  color: 'status-internal-review'   },
  { id: 'client_review',      label: 'En revisión',       color: 'status-client-review'     },
  { id: 'changes_requested',  label: 'Cambios pedidos',   color: 'status-changes'           },
  { id: 'approved',           label: 'Aprobado',          color: 'status-approved'          },
  { id: 'scheduled',          label: 'Programado',        color: 'status-scheduled'         },
  { id: 'published',          label: 'Publicado',         color: 'status-published'         },
  { id: 'completed',          label: 'Completado',        color: 'status-completed'         },
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
