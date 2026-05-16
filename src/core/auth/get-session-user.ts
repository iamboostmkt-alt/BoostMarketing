import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { normalizeUser } from "./normalize-user";
import { UserContext } from "./user-context";

export async function getSessionUser(): Promise<UserContext | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return normalizeUser(session.user);
}
