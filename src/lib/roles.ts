/**
 * @deprecated Usar @/core/constants/roles en su lugar.
 * Este archivo es un re-export de compatibilidad — se eliminará en BA-02 fase 2.
 */
export {
  INTERNAL_ROLES,
  isAdmin as isAdminRole,
  isPM as isProjectManagerRole,
  isClient as isClientRole,
  isUnassigned as isUnassignedRole,
  isLimitedInternalRole,
  isInternal as isInternalRole,
  getRoleLabel,
  canAccessRoute,
} from "@/core/constants/roles";

export type Role = string;

// Re-exports específicos para compatibilidad
export const LIMITED_INTERNAL_ROLES = ["TEAM_MEMBER", "DESIGNER", "MARKETING"] as const;
export const SALES_ROLES = ["SALES_REP"] as const;
export function isSalesRole(role: string | null | undefined): boolean {
  return role === "SALES_REP";
}
