import type { Role } from "@prisma/client";

export type { Role };

export const INTERNAL_ROLES: Role[] = [
  "ADMIN",
  "PROJECT_MANAGER",
  "TEAM_MEMBER",
  "DESIGNER",
  "MARKETING",
  "SALES_REP",
];

export const LIMITED_INTERNAL_ROLES: Role[] = ["TEAM_MEMBER", "DESIGNER", "MARKETING"];
export const SALES_ROLES: Role[] = ["SALES_REP"];

export function isLimitedInternalRole(role: string | Role | undefined | null): boolean {
  return LIMITED_INTERNAL_ROLES.includes(role as Role);
}
export function isSalesRole(role: string | Role | undefined | null): boolean {
  return role === "SALES_REP";
}
export function isAdminRole(role: string | Role | undefined | null): boolean {
  return role === "ADMIN";
}
export function isClientRole(role: string | Role | undefined | null): boolean {
  return role === "CLIENT";
}
export function isUnassignedRole(role: string | Role | undefined | null): boolean {
  return role === "UNASSIGNED";
}
export function isInternalRole(role: string | Role | undefined | null): boolean {
  return INTERNAL_ROLES.includes(role as Role);
}
export function isProjectManagerRole(role: string | Role | undefined | null): boolean {
  return role === "PROJECT_MANAGER";
}

export function getRoleLabel(role: string | Role | undefined | null): string {
  switch (role) {
    case "ADMIN":           return "Administrador";
    case "CLIENT":          return "Cliente";
    case "UNASSIGNED":      return "Sin asignar";
    case "PROJECT_MANAGER": return "Project Manager";
    case "TEAM_MEMBER":     return "Equipo";
    case "DESIGNER":        return "Equipo (Branding)";
    case "MARKETING":       return "Equipo (Marketing)";
    case "SALES_REP":       return "Asesor Comercial";
    default:                return "Usuario";
  }
}

// Sub-roles de equipo (via CustomRole)
export const TEAM_SUBROLES = [
  { name: "BRANDING",    label: "Branding",    color: "#ec4899" },
  { name: "PRODUCCION",  label: "Produccion",  color: "#f59e0b" },
  { name: "MARKETING",   label: "Marketing",   color: "#3b82f6" },
  { name: "VENTAS",      label: "Ventas",      color: "#10b981" },
];

const INTERNAL_TAB: Role[] = [
  "ADMIN", "PROJECT_MANAGER", "TEAM_MEMBER",
  "DESIGNER", "MARKETING", "SALES_REP",
];

export const ROUTE_ACCESS: Array<{ pattern: RegExp; allowed: Role[] }> = [
  { pattern: /^\/dashboard$/, allowed: INTERNAL_TAB },
  { pattern: /^\/dashboard\/admin(\/|$)/, allowed: ["ADMIN", "PROJECT_MANAGER"] },
  { pattern: /^\/dashboard\/analytics(\/|$)/, allowed: ["ADMIN", "MARKETING", "PROJECT_MANAGER"] },
  { pattern: /^\/dashboard\/clients(\/|$)/, allowed: ["ADMIN", "PROJECT_MANAGER"] },
  { pattern: /^\/dashboard\/crm(\/|$)/, allowed: ["ADMIN", "MARKETING", "PROJECT_MANAGER", "SALES_REP"] },
  { pattern: /^\/dashboard\/leads(\/|$)/, allowed: ["ADMIN", "MARKETING", "PROJECT_MANAGER", "SALES_REP"] },
  { pattern: /^\/dashboard\/tasks(\/|$)/, allowed: INTERNAL_TAB },
  { pattern: /^\/dashboard\/calendar(\/|$)/, allowed: ["ADMIN", "PROJECT_MANAGER", "TEAM_MEMBER", "DESIGNER", "MARKETING", "SALES_REP"] },
  { pattern: /^\/dashboard\/chat(\/|$)/, allowed: INTERNAL_TAB },
  { pattern: /^\/dashboard\/client-portal(\/|$)/, allowed: ["CLIENT", "PROJECT_MANAGER", "ADMIN"] },
  { pattern: /^\/dashboard\/team(\/|$)/, allowed: ["ADMIN", "PROJECT_MANAGER"] },
  { pattern: /^\/dashboard\/waiting-assignment(\/|$)/, allowed: ["UNASSIGNED"] },
  { pattern: /^\/dashboard\/settings(\/|$)/, allowed: INTERNAL_TAB },
];

export function canAccessRoute(
  pathname: string,
  role: string | Role | undefined | null
): boolean {
  if (role === "ADMIN") return true;

  const match = ROUTE_ACCESS.find(r => r.pattern.test(pathname));
  if (!match) return true;
  if (!match.allowed.includes(role as Role)) return false;

  if (isLimitedInternalRole(role)) {
    const restricted = /^\/dashboard\/(admin|analytics|clients)(\/|$)/;
    if (restricted.test(pathname)) return false;
  }

  return true;
}
