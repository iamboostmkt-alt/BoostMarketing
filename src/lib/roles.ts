import type { Role } from "@prisma/client";

export type { Role };

export function isAdminRole(role: string | Role | undefined | null): boolean {
  return role === "ADMIN";
}

export function isClientRole(role: string | Role | undefined | null): boolean {
  return role === "CLIENT" || role == null;
}
