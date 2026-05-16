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
      return (
        task.assignedUsers?.some((u: any) => u.id === user.id) ||
        task.assignedUserId === user.id ||
        task.userId === user.id
      );
    }

    if (user.role === "CLIENT") {
      return (
        task.visibility === "client_visible" &&
        task.clientId === user.clientId
      );
    }

    return false;
  }

  static canAccessClientPortal(user: UserContext, clientId: string): boolean {
    if (user.role === "ADMIN") return true;

    if (user.role === "PROJECT_MANAGER") {
      return user.assignedManagerId === clientId || user.id === clientId;
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
