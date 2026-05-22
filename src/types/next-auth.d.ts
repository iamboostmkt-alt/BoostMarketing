import type { DefaultSession } from "next-auth";
import type { Role, UserLifecycleStatus } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: Role;
      lifecycleStatus?: UserLifecycleStatus | null;
      color?: string;
      customRoleId?: string | null;
      workspaceId?: string | null;
      customRoleLabel?: string | null;
      customRoleColor?: string | null;
      permissions?: Record<string, boolean>;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
    lifecycleStatus?: UserLifecycleStatus | null;
    color?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    lifecycleStatus?: UserLifecycleStatus | null;
    color?: string;
    customRoleId?: string | null;
    workspaceId?: string | null;
    customRoleLabel?: string | null;
    customRoleColor?: string | null;
    permissions?: Record<string, boolean>;
  }
}
