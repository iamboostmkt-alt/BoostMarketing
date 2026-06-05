import type { Role } from "@prisma/client";

// ─── Constantes de roles ──────────────────────────────────────────────────────

export const ROLES = {
  ADMIN:           "ADMIN",
  PM:              "PROJECT_MANAGER",
  PROJECT_MANAGER: "PROJECT_MANAGER",
  TEAM:            "TEAM_MEMBER",
  TEAM_MEMBER:     "TEAM_MEMBER",
  DESIGNER:        "DESIGNER",
  MARKETING:       "MARKETING",
  SALES_REP:       "SALES_REP",
  CLIENT:          "CLIENT",
  UNASSIGNED:      "UNASSIGNED",
} as const;

export type AppRole = Role;

export const MANAGER_ROLES      = ["ADMIN", "PROJECT_MANAGER"] as const;
export const MANAGER_ROLES_EXT  = ["ADMIN", "PROJECT_MANAGER", "SALES_REP"] as const;
export const INTERNAL_ROLES     = ["ADMIN", "PROJECT_MANAGER", "TEAM_MEMBER", "DESIGNER", "MARKETING", "SALES_REP"] as const;
export const LIMITED_ROLES      = ["TEAM_MEMBER", "DESIGNER", "MARKETING"] as const;

// ─── Helper de verificación ───────────────────────────────────────────────────

/** Verifica si un rol pertenece a un grupo (type-safe) */
export function hasRole(role: string | undefined | null, roles: readonly string[]): boolean {
  return !!role && (roles as string[]).includes(role);
}

// ─── Helpers individuales (migrados desde permissions.ts y roles.ts) ──────────

export const isAdmin      = (r: string | null | undefined) => r === "ADMIN";
export const isPM         = (r: string | null | undefined) => r === "PROJECT_MANAGER";
export const isManager    = (r: string | null | undefined) => hasRole(r, MANAGER_ROLES);
export const isInternal   = (r: string | null | undefined) => hasRole(r, INTERNAL_ROLES);
export const isClient     = (r: string | null | undefined) => r === "CLIENT";
export const isUnassigned = (r: string | null | undefined) => r === "UNASSIGNED";
export const isLimitedInternalRole = (r: string | Role | null | undefined) => hasRole(r as string, LIMITED_ROLES);

// ─── Labels de roles ──────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  ADMIN:           "Administrador",
  PROJECT_MANAGER: "Project Manager",
  TEAM_MEMBER:     "Team Member",
  DESIGNER:        "Diseñador",
  MARKETING:       "Marketing",
  SALES_REP:       "Ventas",
  CLIENT:          "Cliente",
  UNASSIGNED:      "Sin asignar",
};

export function getRoleLabel(role: string | Role | null | undefined): string {
  return ROLE_LABELS[role as string] ?? String(role ?? "");
}

// ─── Visibilidad ──────────────────────────────────────────────────────────────

export const VISIBILITY = {
  INTERNAL:       "internal",
  CLIENT_VISIBLE: "client_visible",
  TEAM_ONLY:      "team_only",
  MANAGEMENT:     "management",
} as const;

export type Visibility = typeof VISIBILITY[keyof typeof VISIBILITY];

export function defaultVisibility(hasClient: boolean): Visibility {
  return hasClient ? VISIBILITY.CLIENT_VISIBLE : VISIBILITY.INTERNAL;
}

// ─── Acceso a rutas (migrado desde lib/roles.ts) ─────────────────────────────

const INTERNAL_TAB = ["ADMIN", "PROJECT_MANAGER", "TEAM_MEMBER", "DESIGNER", "MARKETING", "SALES_REP"] as const;

const ROUTE_ACCESS: { pattern: RegExp; allowed: readonly string[] }[] = [
  { pattern: /^\/dashboard\/admin(\/|$)/,        allowed: ["ADMIN"] },
  { pattern: /^\/dashboard\/analytics(\/|$)/,    allowed: ["ADMIN", "MARKETING", "PROJECT_MANAGER"] },
  { pattern: /^\/dashboard\/clients(\/|$)/,      allowed: ["ADMIN", "PROJECT_MANAGER"] },
  { pattern: /^\/dashboard\/crm(\/|$)/,          allowed: ["ADMIN", "MARKETING", "PROJECT_MANAGER", "SALES_REP"] },
  { pattern: /^\/dashboard\/leads(\/|$)/,        allowed: ["ADMIN", "MARKETING", "PROJECT_MANAGER", "SALES_REP"] },
  { pattern: /^\/dashboard\/tasks(\/|$)/,        allowed: INTERNAL_TAB },
  { pattern: /^\/dashboard\/calendar(\/|$)/,     allowed: ["ADMIN", "PROJECT_MANAGER", "TEAM_MEMBER", "DESIGNER", "MARKETING", "SALES_REP"] },
  { pattern: /^\/dashboard\/chat(\/|$)/,         allowed: INTERNAL_TAB },
  { pattern: /^\/dashboard\/client-portal(\/|$)/,allowed: ["CLIENT", "PROJECT_MANAGER", "ADMIN"] },
  { pattern: /^\/dashboard\/team(\/|$)/,         allowed: ["ADMIN", "PROJECT_MANAGER"] },
  { pattern: /^\/dashboard\/waiting-assignment(\/|$)/, allowed: ["UNASSIGNED"] },
  { pattern: /^\/dashboard\/settings(\/|$)/,     allowed: INTERNAL_TAB },
];

export function canAccessRoute(pathname: string, role: string | Role | null | undefined): boolean {
  if (role === "ADMIN") return true;

  const match = ROUTE_ACCESS.find(r => r.pattern.test(pathname));
  if (!match) return true;
  if (!match.allowed.includes(role as string)) return false;

  if (isLimitedInternalRole(role)) {
    const restricted = /^\/dashboard\/(admin|analytics|clients)(\/|$)/;
    if (restricted.test(pathname)) return false;
  }

  return true;
}
