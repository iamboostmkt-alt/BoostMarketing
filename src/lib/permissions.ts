export type PermissionKey =
  | 'canViewDashboard'
  | 'canEditTasks'
  | 'canAssignTasks'
  | 'canAssignClients'
  | 'canManageUsers'
  | 'canViewFinancials'
  | 'canEditCalendar'
  | 'canViewCRM'
  | 'canManageCRM'
  | 'canViewAnalytics'
  | 'canEditProjects';

export type Permissions = Record<string, boolean>;

// Raw check — does the permission JSON grant this key?
export function hasPermission(
  permissions: Permissions | null | undefined,
  key: PermissionKey | string,
): boolean {
  if (!permissions || typeof permissions !== 'object') return false;
  return permissions[key] === true;
}

// Full check — ADMIN and PROJECT_MANAGER bypass all custom permission gates.
// For everyone else, the custom role permissions JSON is authoritative.
export function canDo(
  role: string | null | undefined,
  permissions: Permissions | null | undefined,
  key: PermissionKey | string,
): boolean {
  if (role === 'ADMIN' || role === 'PROJECT_MANAGER') return true;
  return hasPermission(permissions, key);
}
