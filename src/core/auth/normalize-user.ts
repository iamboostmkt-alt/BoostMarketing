import { UserContext } from "./user-context";

export function normalizeUser(sessionUser: any): UserContext {
  return {
    id: sessionUser?.id || sessionUser?.user?.id,
    email: sessionUser?.email,
    role: sessionUser?.role,
    workspaceId: sessionUser?.workspaceId ?? null,
    clientId: sessionUser?.clientId ?? null,
    assignedManagerId: sessionUser?.assignedManagerId ?? null,
  };
}
