// ─── PERMISOS CENTRALIZADOS — BoostMarketing CRM ───────────────────────────
// Fuente única de verdad para roles y acceso en todos los endpoints
// Importar desde aquí, nunca redefinir en cada archivo

export const ROLES = {
  ADMIN:           'ADMIN',
  PROJECT_MANAGER: 'PROJECT_MANAGER',
  TEAM_MEMBER:     'TEAM_MEMBER',
  DESIGNER:        'DESIGNER',
  MARKETING:       'MARKETING',
  SALES_REP:       'SALES_REP',
  CLIENT:          'CLIENT',
  UNASSIGNED:      'UNASSIGNED',
} as const;

export type AppRole = typeof ROLES[keyof typeof ROLES];

export const MANAGER_ROLES: AppRole[]          = ['ADMIN', 'PROJECT_MANAGER'];
export const INTERNAL_ROLES: AppRole[]         = ['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER', 'DESIGNER', 'MARKETING', 'SALES_REP'];
export const ACTIVITY_MANAGER_ROLES: AppRole[] = ['ADMIN', 'PROJECT_MANAGER', 'SALES_REP'];

export const isAdmin    = (r: string) => r === 'ADMIN';
export const isPM       = (r: string) => r === 'PROJECT_MANAGER';
export const isManager  = (r: string) => MANAGER_ROLES.includes(r as AppRole);
export const isInternal = (r: string) => INTERNAL_ROLES.includes(r as AppRole);
export const isClient   = (r: string) => r === 'CLIENT';

export const VISIBILITY = {
  INTERNAL:       'internal',
  CLIENT_VISIBLE: 'client_visible',
  TEAM_ONLY:      'team_only',
  MANAGEMENT:     'management',
} as const;

export type Visibility = typeof VISIBILITY[keyof typeof VISIBILITY];

export function defaultVisibility(hasClient: boolean): Visibility {
  return hasClient ? VISIBILITY.CLIENT_VISIBLE : VISIBILITY.INTERNAL;
}

export function canAccessClientPortal(
  role: string, userId: string,
  assignedManagerId: string | null
): boolean {
  if (isAdmin(role)) return true;
  if (isPM(role))    return assignedManagerId === userId;
  return false;
}
