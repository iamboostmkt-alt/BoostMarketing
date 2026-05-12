import type { Role } from "@prisma/client";

export type { Role };

/** Equipo operativo interno (incluye legado DESIGNER / MARKETING → mismo acceso que TEAM_MEMBER). */
export const INTERNAL_ROLES: Role[] = [
  "ADMIN",
  "PROJECT_MANAGER",
  "TEAM_MEMBER",
  "DESIGNER",
  "MARKETING",
];

export const LIMITED_INTERNAL_ROLES: Role[] = ["TEAM_MEMBER", "DESIGNER", "MARKETING"];

export function isLimitedInternalRole(role: string | Role | undefined | null): boolean {
  return LIMITED_INTERNAL_ROLES.includes(role as Role);
}

/** Roles que usan el portal cliente (no CRM interno). */
export const CLIENT_FACING_ROLES: Role[] = ["CLIENT"];

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

export function isDesignerRole(role: string | Role | undefined | null): boolean {
  return role === "DESIGNER";
}

export function isMarketingRole(role: string | Role | undefined | null): boolean {
  return role === "MARKETING";
}

export function isProjectManagerRole(role: string | Role | undefined | null): boolean {
  return role === "PROJECT_MANAGER";
}

export function isTeamMemberRole(role: string | Role | undefined | null): boolean {
  return role === "TEAM_MEMBER";
}

export function getRoleLabel(role: string | Role | undefined | null): string {
  switch (role) {
    case "ADMIN":
      return "Administrador";
    case "CLIENT":
      return "Cliente";
    case "UNASSIGNED":
      return "Sin asignar";
    case "PROJECT_MANAGER":
      return "Project Manager";
    case "TEAM_MEMBER":
      return "Equipo";
    case "DESIGNER":
      return "Equipo (diseño)";
    case "MARKETING":
      return "Equipo (marketing)";
    default:
      return "Usuario";
  }
}

const INTERNAL_TAB: Role[] = [
  "ADMIN",
  "PROJECT_MANAGER",
  "TEAM_MEMBER",
  "DESIGNER",
  "MARKETING",
];

export const ROUTE_ACCESS: Array<{ pattern: RegExp; allowed: Role[] }> = [
  {
    pattern: /^\/dashboard$/,
    allowed: INTERNAL_TAB,
  },
  {
    pattern: /^\/dashboard\/admin(\/|$)/,
    allowed: ["ADMIN", "PROJECT_MANAGER"],
  },
  {
    pattern: /^\/dashboard\/analytics(\/|$)/,
    allowed: ["ADMIN", "MARKETING", "PROJECT_MANAGER"],
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
    allowed: INTERNAL_TAB,
  },
  {
    pattern: /^\/dashboard\/calendar(\/|$)/,
    allowed: ["ADMIN", "PROJECT_MANAGER", "DESIGNER"],
  },
  {
    pattern: /^\/dashboard\/chat(\/|$)/,
    allowed: INTERNAL_TAB,
  },
  {
    pattern: /^\/dashboard\/client-portal(\/|$)/,
    allowed: ["CLIENT", "PROJECT_MANAGER", "ADMIN"],
  },
  {
    pattern: /^\/dashboard\/waiting-assignment(\/|$)/,
    allowed: ["UNASSIGNED"],
  },
  {
    pattern: /^\/dashboard\/settings(\/|$)/,
    allowed: INTERNAL_TAB,
  },
];

export function canAccessRoute(
  pathname: string,
  role: string | Role | undefined | null
): boolean {
  if (role === "ADMIN") return true;

  const match = ROUTE_ACCESS.find((r) => r.pattern.test(pathname));
  if (!match) return true;

  if (!match.allowed.includes(role as Role)) return false;

  if (isLimitedInternalRole(role)) {
    const restricted = /^\/dashboard\/(admin|analytics|clients|crm|calendar)(\/|$)/;
    if (restricted.test(pathname)) return false;
  }

  return true;
}
