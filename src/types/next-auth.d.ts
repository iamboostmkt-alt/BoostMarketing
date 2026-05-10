import type { DefaultSession } from "next-auth";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: Role;
      color?: string;
      customRoleId?: string | null;
      customRoleLabel?: string | null;
      customRoleColor?: string | null;
      permissions?: Record<string, boolean>;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
    color?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    color?: string;
    customRoleId?: string | null;
    customRoleLabel?: string | null;
    customRoleColor?: string | null;
    permissions?: Record<string, boolean>;
  }
}
