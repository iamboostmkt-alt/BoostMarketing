// Tutorial steps por rol — spotlight + tooltip flotante
export type TutorialStep = {
  id: string;
  target: string;          // data-tutorial="id" en el elemento
  title: string;
  description: string;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  spotlightRadius?: number; // px de padding alrededor del elemento
};

export type ChecklistItem = {
  id: string;
  label: string;
  description: string;
  icon: string;
  path?: string;           // navegar al hacer clic
};

// ─── ADMIN ────────────────────────────────────────────────
export const ADMIN_STEPS: TutorialStep[] = [
  {
    id: 'sidebar',
    target: 'sidebar-nav',
    title: 'Tu panel de control',
    description: 'Desde aquí accedes a todas las secciones: cuentas, tareas, chat, calendario y más.',
    placement: 'right',
  },
  {
    id: 'clients',
    target: 'nav-clients',
    title: 'Cuentas / Clientes',
    description: 'Aquí viven todos tus clientes. Puedes crearlos, asignar PMs y enviarles invitación al portal.',
    placement: 'right',
  },
  {
    id: 'tasks',
    target: 'nav-tasks',
    title: 'Tareas',
    description: 'Tablero kanban con todas las tareas del workspace. Arrastra para cambiar estado o usa el picker en móvil.',
    placement: 'right',
  },
  {
    id: 'chat',
    target: 'nav-chat',
    title: 'Chat del equipo',
    description: 'Canales de equipo, mensajes directos y chat por cuenta. Todo en un solo lugar.',
    placement: 'right',
  },
  {
    id: 'team',
    target: 'nav-team',
    title: 'Equipo',
    description: 'Invita miembros, asigna roles y gestiona accesos desde aquí.',
    placement: 'right',
  },
  {
    id: 'settings',
    target: 'nav-settings',
    title: 'Configuración',
    description: 'Personaliza tu workspace, gestiona tu suscripción y configura el branding de tu agencia.',
    placement: 'right',
  },
];

export const ADMIN_CHECKLIST: ChecklistItem[] = [
  { id: 'create_client',  label: 'Crear tu primer cliente',   description: 'Agrega una cuenta y empieza a gestionar.', icon: '🏢', path: '/dashboard/clients' },
  { id: 'invite_team',    label: 'Invitar a tu equipo',       description: 'Agrega miembros y asigna roles.',           icon: '👥', path: '/dashboard/team' },
  { id: 'create_task',    label: 'Crear una tarea',           description: 'Asigna trabajo a tu equipo.',              icon: '✅', path: '/dashboard/tasks' },
  { id: 'send_portal',    label: 'Activar portal de cliente', description: 'Invita a un cliente a ver su portal.',     icon: '🔗', path: '/dashboard/clients' },
  { id: 'setup_billing',  label: 'Ver mi suscripción',        description: 'Revisa tu plan en Ajustes → Empresa.', icon: '💳', path: '/dashboard/settings' },
];

// ─── PROJECT MANAGER ──────────────────────────────────────
export const PM_STEPS: TutorialStep[] = [
  {
    id: 'clients-pm',
    target: 'nav-clients',
    title: 'Tus cuentas',
    description: 'Aquí están los clientes que tienes asignados. Puedes ver su progreso, tareas y portal.',
    placement: 'right',
  },
  {
    id: 'tasks-pm',
    target: 'nav-tasks',
    title: 'Gestión de tareas',
    description: 'Crea tareas, asígnalas al equipo y revisa entregas. El tab "Revisiones" es tu área de aprobación.',
    placement: 'right',
  },
  {
    id: 'chat-pm',
    target: 'nav-chat',
    title: 'Chat con el equipo',
    description: 'Cada cliente tiene su propio canal. Los mensajes internos no son visibles para el cliente.',
    placement: 'right',
  },
  {
    id: 'calendar-pm',
    target: 'nav-calendar',
    title: 'Calendario',
    description: 'Agenda reuniones con clientes. Puedes enviarles el link de videollamada desde aquí.',
    placement: 'right',
  },
];

export const PM_CHECKLIST: ChecklistItem[] = [
  { id: 'view_clients',   label: 'Ver tus cuentas asignadas', description: 'Revisa los clientes que gestionas.',   icon: '👁️', path: '/dashboard/clients' },
  { id: 'create_task',    label: 'Crear primera tarea',       description: 'Asigna trabajo al equipo.',            icon: '✅', path: '/dashboard/tasks' },
  { id: 'review_tasks',   label: 'Revisar entregas',          description: 'Aprueba o pide correcciones.',         icon: '🔍', path: '/dashboard/tasks' },
  { id: 'schedule_meet',  label: 'Agendar reunión',           description: 'Crea una reunión con un cliente.',     icon: '📅', path: '/dashboard/calendar' },
  { id: 'chat_client',    label: 'Escribir en chat',          description: 'Manda un mensaje al canal del equipo.', icon: '💬', path: '/dashboard/chat' },
];

// ─── TEAM MEMBER / DESIGNER / MARKETING ──────────────────
export const TEAM_STEPS: TutorialStep[] = [
  {
    id: 'tasks-team',
    target: 'nav-tasks',
    title: 'Tus tareas',
    description: 'Aquí aparecen las tareas asignadas a ti. Cambia el estado al avanzar en cada una.',
    placement: 'right',
  },
  {
    id: 'chat-team',
    target: 'nav-chat',
    title: 'Chat',
    description: 'Comunícate con tu equipo en los canales y mensajes directos.',
    placement: 'right',
  },
  {
    id: 'status-change',
    target: 'task-status-badge',
    title: 'Cambiar estado de tarea',
    description: 'Toca el badge de estado para moverla entre "En progreso", "Revisión" y más. En móvil puedes arrastrarlo también.',
    placement: 'top',
  },
];

export const TEAM_CHECKLIST: ChecklistItem[] = [
  { id: 'view_tasks',   label: 'Ver mis tareas',          description: 'Revisa lo que tienes asignado.',      icon: '📋', path: '/dashboard/tasks' },
  { id: 'update_task',  label: 'Actualizar estado',       description: 'Mueve una tarea a "En progreso".',    icon: '▶️', path: '/dashboard/tasks' },
  { id: 'chat_msg',     label: 'Enviar un mensaje',       description: 'Escribe algo en el chat del equipo.', icon: '💬', path: '/dashboard/chat' },
  { id: 'upload_file',  label: 'Subir un archivo',        description: 'Adjunta un entregable a una tarea.',  icon: '📎', path: '/dashboard/tasks' },
];

// ─── CLIENT ───────────────────────────────────────────────
export const CLIENT_STEPS: TutorialStep[] = [
  {
    id: 'portal-overview',
    target: 'portal-header',
    title: '¡Bienvenido a tu portal!',
    description: 'Aquí puedes ver el avance de tus proyectos, tareas entregadas y reuniones agendadas.',
    placement: 'bottom',
  },
  {
    id: 'portal-tasks',
    target: 'portal-tasks-section',
    title: 'Tus entregables',
    description: 'Cada tarea marcada como entregable aparece aquí. Puedes aprobarla o pedir cambios.',
    placement: 'top',
  },
  {
    id: 'portal-chat',
    target: 'portal-chat-section',
    title: 'Chat con tu agencia',
    description: 'Comunícate directamente con tu Project Manager desde aquí.',
    placement: 'top',
  },
];

export const CLIENT_CHECKLIST: ChecklistItem[] = [
  { id: 'view_progress', label: 'Ver el avance de tu proyecto', description: 'Revisa qué tareas están listas.',    icon: '📊' },
  { id: 'review_task',   label: 'Revisar un entregable',        description: 'Aprueba o pide cambios.',            icon: '✍️' },
  { id: 'chat_pm',       label: 'Escribirle a tu agencia',      description: 'Manda un mensaje a tu PM.',          icon: '💬' },
];

// ─── Helper: steps por rol ─────────────────────────────────
export function getStepsForRole(role: string): TutorialStep[] {
  if (role === 'ADMIN') return ADMIN_STEPS;
  if (role === 'PROJECT_MANAGER') return PM_STEPS;
  if (role === 'CLIENT') return CLIENT_STEPS;
  return TEAM_STEPS; // TEAM_MEMBER, DESIGNER, MARKETING
}

export function getChecklistForRole(role: string): ChecklistItem[] {
  if (role === 'ADMIN') return ADMIN_CHECKLIST;
  if (role === 'PROJECT_MANAGER') return PM_CHECKLIST;
  if (role === 'CLIENT') return CLIENT_CHECKLIST;
  return TEAM_CHECKLIST;
}
