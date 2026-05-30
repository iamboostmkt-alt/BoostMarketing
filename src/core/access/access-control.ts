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

    if (user.role === "SALES_REP") {
      // SALES_REP ve tareas que creó + tareas asignadas + tareas de clientes que creó
      return (
        task.userId === user.id ||
        task.assignedUserId === user.id ||
        task.assignedUsers?.some((u: any) => u.id === user.id) ||
        (task.clientId && task.client?.userId === user.id)
      );
    }

    if (["TEAM_MEMBER", "DESIGNER", "MARKETING"].includes(user.role)) {
      // Solo asignación directa a la tarea
      if (
        task.assignedUsers?.some((u: any) => u.id === user.id) ||
        task.assignedUserId === user.id
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
