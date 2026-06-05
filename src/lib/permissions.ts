/**
 * @deprecated Usar @/core/constants/roles en su lugar.
 * Este archivo es un re-export de compatibilidad — se eliminará en BA-02 fase 2.
 */
export {
  ROLES,
  MANAGER_ROLES,
  INTERNAL_ROLES,
  isAdmin,
  isPM,
  isManager,
  isInternal,
  isClient,
  VISIBILITY,
  defaultVisibility,
  type AppRole,
  type Visibility,
} from "@/core/constants/roles";

// canAccessClientPortal re-export desde access-control
export { AccessControl } from "@/core/access/access-control";
