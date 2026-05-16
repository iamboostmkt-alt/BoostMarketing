import { UserContext } from "../auth/user-context";

export function assertRole(
  user: UserContext,
  allowedRoles: readonly string[]
): boolean {
  return allowedRoles.includes(user.role);
}
