export type Role =
  | "ADMIN"
  | "PROJECT_MANAGER"
  | "TEAM_MEMBER"
  | "DESIGNER"
  | "MARKETING"
  | "SALES_REP"
  | "CLIENT"
  | "UNASSIGNED";

export type UserContext = {
  id: string;
  email: string;
  role: Role;
  workspaceId?: string | null;
  clientId?: string | null;
  assignedManagerId?: string | null;
  organizationId?: string;
};
