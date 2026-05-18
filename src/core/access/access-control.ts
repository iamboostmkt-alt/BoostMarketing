import { UserContext } from "../auth/user-context";

export class AccessControl {
  static canViewTask(user: UserContext, task: any): boolean {
    if (user.role === "ADMIN") return true;

    if (user.role === "PROJECT_MANAGER") {
      return (
        task.assignedUsers?.some((u: any) => u.id === user.id) ||
        task.userId === user.id ||
        (task.clientId && task.client?.assignedManagerId === user.id)
      );
    }

    if (["TEAM_MEMBER", "DESIGNER", "MARKETING", "SALES_REP"].includes(user.role)) {
      // Asignación directa
      if (
        task.assignedUsers?.some((u: any) => u.id === user.id) ||
        task.assignedUserId === user.id ||
        task.userId === user.id
      ) return true;
      // Acceso por ClientAssignedUser — el cliente tiene al usuario en su equipo
      if (
        task.clientId &&
        task.client?.assignedUsers?.some((au: any) => au.userId === user.id)
      ) return true;
      return false;
    }

    if (user.role === "CLIENT") {
      return (
        task.visibility === "client_visible" &&
        task.clientId === user.clientId
      );
    }

    return false;
  }

  static canAccessClientPortal(
    user: UserContext,
    clientId: string,
    client?: { assignedManagerId?: string | null; assignedUsers?: { userId: string }[] }
  ): boolean {
    if (user.role === "ADMIN") return true;

    if (user.role === "PROJECT_MANAGER") {
      if (client) return client.assignedManagerId === user.id;
      return false;
    }

    if (user.role === "CLIENT") {
      return user.clientId === clientId;
    }

    return false;
  }

  static canAccessScope(user: UserContext, scope: string | null): boolean {
    if (user.role === "ADMIN") return true;
    if (user.role === "PROJECT_MANAGER") return true;
    if (scope === "mine") return true;
    return false;
  }
}
