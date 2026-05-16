// ─────────────────────────────────────────────────────────────────────────────
// src/lib/client-portal/types.ts
//
// Tipos EXCLUSIVOS del portal cliente.
// Nunca exponen internals del sistema (roles, IDs de equipo, estados técnicos).
// El API transforma Task → PortalDeliverable antes de enviarlo al cliente.
// ─────────────────────────────────────────────────────────────────────────────

// ── PM visible en el portal ──────────────────────────────────────────────────

export interface PortalManager {
  id:    string;
  name:  string | null;
  email: string;
  color: string;
  image: string | null;
}

// ── Cliente (datos mínimos que el portal necesita) ───────────────────────────

export interface PortalClient {
  id:              string;
  name:            string;
  email:           string;
  company:         string;
  assignedManagerId: string | null;
  assignedManager?:  PortalManager | null;
}

// ── Entregable (Task con visibility=client_visible, visto por el cliente) ────

export type DeliverableStatus =
  | 'pending'
  | 'in_progress'
  | 'client_review'   // listo para que el cliente lo revise
  | 'changes_requested'
  | 'approved'
  | 'completed';

export interface PortalDeliverable {
  id:          string;
  title:       string;
  description: string;
  status:      DeliverableStatus;
  priority:    'urgent' | 'high' | 'medium' | 'low';
  dueDate:     string | null;
  startDate:   string | null;
  createdAt:   string;
  updatedAt:   string;
  /** Usuario interno asignado (solo nombre + avatar, sin rol ni email interno) */
  assignedUser?: {
    name:  string | null;
    color: string;
    image: string | null;
  } | null;
  /** Historial de feedback del cliente sobre este entregable */
  feedback?: PortalFeedbackEntry[];
}

// ── Videollamada / reunión visible al cliente ────────────────────────────────

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled';

export interface PortalAppointment {
  id:      string;
  name:    string;
  date:    string;
  status:  AppointmentStatus;
  meetUrl: string | null;
  notes:   string;
}

// ── Actividad informativa (visible al cliente) ───────────────────────────────

export interface PortalActivity {
  id:          string;
  title:       string;
  description: string;
  status:      string;
  startDate:   string;
  endDate:     string | null;
  createdBy?: {
    name:  string | null;
    color: string;
    image: string | null;
  } | null;
}

// ── Feedback del cliente sobre un entregable ─────────────────────────────────

export type FeedbackType = 'approved' | 'rejected' | 'changes_requested';

export interface PortalFeedbackEntry {
  id:        string;
  type:      FeedbackType;
  message:   string;
  createdAt: string;
}

// ── Evento del calendario cliente ────────────────────────────────────────────

export type CalendarEventType = 'deliverable' | 'appointment' | 'milestone';

export interface PortalCalendarEvent {
  id:     string;
  type:   CalendarEventType;
  title:  string;
  date:   string;        // ISO string — siempre en formato YYYY-MM-DD para evitar timezone bugs
  status: string;
  color:  'amber' | 'blue' | 'green' | 'purple';
}

// ── Respuesta completa del API portal ────────────────────────────────────────

export interface ClientPortalResponse {
  client:       PortalClient;
  deliverables: PortalDeliverable[];
  appointments: PortalAppointment[];
  activities:   PortalActivity[];
}

// ── Estado del hook useClientPortal ─────────────────────────────────────────

export interface ClientPortalState {
  client:       PortalClient | null;
  deliverables: PortalDeliverable[];
  appointments: PortalAppointment[];
  activities:   PortalActivity[];
  loading:      boolean;
  error:        string | null;
  noClient:     boolean;
  refetch:         () => void;
  refetchSilent:   () => void;
}
