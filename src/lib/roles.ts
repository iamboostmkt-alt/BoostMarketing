import type { Role } from "@prisma/client";

export type { Role };

// ── Role checks ───────────────────────────────────────────────────────────────

export function isAdminRole(role: string | Role | undefined | null): boolean {
  return role === "ADMIN";
}

export function isClientRole(role: string | Role | undefined | null): boolean {
  return role === "CLIENT" || role == null;
}

export function isDesignerRole(role: string | Role | undefined | null): boolean {
  return role === "DESIGNER";
}

export function isMarketingRole(role: string | Role | undefined | null): boolean {
  return role === "MARKETING";
}

export function isProjectManagerRole(role: string | Role | undefined | null): boolean {
  return role === "PROJECT_MANAGER";
}

// ── Display labels ────────────────────────────────────────────────────────────

export function getRoleLabel(role: string | Role | undefined | null): string {
  switch (role) {
    case "ADMIN":           return "Administrador";
    case "CLIENT":          return "Cliente";
    case "DESIGNER":        return "Diseñador";
    case "MARKETING":       return "Marketing";
    case "PROJECT_MANAGER": return "Project Manager";
    default:                return "Usuario";
  }
}

// ── RBAC route access ─────────────────────────────────────────────────────────
// Maps route prefixes to the roles that may access them.
// ADMIN always has full access and is handled separately in middleware.

export const INTERNAL_ROLES: Role[] = ["ADMIN", "DESIGNER", "MARKETING", "PROJECT_MANAGER"];

export function isInternalRole(role: string | Role | undefined | null): boolean {
  return INTERNAL_ROLES.includes(role as Role);
}

export const ROUTE_ACCESS: Array<{ pattern: RegExp; allowed: Role[] }> = [
  {
    pattern: /^\/dashboard\/admin(\/|$)/,
    allowed: ["ADMIN", "PROJECT_MANAGER"],
  },
  {
    pattern: /^\/dashboard\/analytics(\/|$)/,
    allowed: ["ADMIN", "MARKETING"],
  },
  {
    pattern: /^\/dashboard\/clients(\/|$)/,
    allowed: ["ADMIN", "PROJECT_MANAGER"],
  },
  {
    pattern: /^\/dashboard\/crm(\/|$)/,
    allowed: ["ADMIN", "MARKETING", "PROJECT_MANAGER"],
  },
  {
    pattern: /^\/dashboard\/tasks(\/|$)/,
    allowed: ["ADMIN", "DESIGNER", "MARKETING", "PROJECT_MANAGER"],
  },
  {
    pattern: /^\/dashboard\/calendar(\/|$)/,
    allowed: ["ADMIN", "DESIGNER", "PROJECT_MANAGER"],
  },
  {
    pattern: /^\/dashboard\/chat(\/|$)/,
    allowed: ["ADMIN", "DESIGNER", "MARKETING", "PROJECT_MANAGER"],
  },
  {
    pattern: /^\/dashboard\/client-portal(\/|$)/,
    allowed: ["CLIENT"],
  },
];

export function canAccessRoute(
  pathname: string,
  role: string | Role | undefined | null
): boolean {
  if (role === "ADMIN") return true;

  const match = ROUTE_ACCESS.find((r) => r.pattern.test(pathname));
  if (!match) return true; // no restriction defined → allow

  return match.allowed.includes(role as Role);
}
