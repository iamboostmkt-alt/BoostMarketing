export const ROLES = {
  ADMIN: "ADMIN",
  PM: "PROJECT_MANAGER",
  TEAM: "TEAM_MEMBER",
  DESIGNER: "DESIGNER",
  MARKETING: "MARKETING",
  SALES_REP: "SALES_REP",
  CLIENT: "CLIENT",
  UNASSIGNED: "UNASSIGNED",
} as const;

export const MANAGER_ROLES = ["ADMIN", "PROJECT_MANAGER"] as const;
export const MANAGER_ROLES_EXT = ["ADMIN", "PROJECT_MANAGER", "SALES_REP"] as const;

/** Helper — verifica si un rol pertenece a un grupo sin problemas de tipo readonly */
export function hasRole(role: string | undefined | null, roles: readonly string[]): boolean {
  return !!role && (roles as string[]).includes(role);
}

export const INTERNAL_ROLES = [
  "ADMIN",
  "PROJECT_MANAGER",
  "TEAM_MEMBER",
  "DESIGNER",
  "MARKETING",
  "SALES_REP",
] as const;
