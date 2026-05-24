import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Role } from "@/core/auth/user-context";

export type WorkspaceContext = {
  userId:        string;
  workspaceId:   string;
  role:          Role;
  email:         string;
  name:          string;
  workspaceName: string | null;
};

type RequireWorkspaceResult =
  | { ok: true;  ctx: WorkspaceContext }
  | { ok: false; response: NextResponse };

/**
 * Helper unificado para todos los API handlers.
 * - Verifica sesion activa
 * - Garantiza workspaceId — si el JWT no lo tiene, lo busca en DB
 * - Devuelve contexto tipado listo para usar
 *
 * Uso:
 *   const result = await requireWorkspace();
 *   if (!result.ok) return result.response;
 *   const { userId, workspaceId, role } = result.ctx;
 */
export async function requireWorkspace(
  options: { roles?: Role[] } = {}
): Promise<RequireWorkspaceResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }

  const role = session.user.role as Role;

  // Verificar roles si se especifican
  if (options.roles && !options.roles.includes(role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Sin permisos" }, { status: 403 }),
    };
  }

  let workspaceId = session.user.workspaceId ?? null;

  // Si el JWT no tiene workspaceId, buscarlo en DB (sesiones legacy)
  if (!workspaceId && session.user.id) {
    try {
      const dbUser = await db.user.findUnique({
        where: { id: session.user.id },
        select: { workspaceId: true },
      });
      workspaceId = dbUser?.workspaceId ?? null;
    } catch {
      // no bloquear si falla el lookup
    }
  }

  if (!workspaceId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Workspace no encontrado" },
        { status: 400 }
      ),
    };
  }

  return {
    ok: true,
    ctx: {
      userId:        session.user.id,
      workspaceId,
      role,
      email:         session.user.email ?? "",
      name:          session.user.name  ?? "",
      workspaceName: (session.user as { workspaceName?: string | null }).workspaceName ?? null,
    },
  };
}

/**
 * Version publica — solo verifica sesion, no requiere workspaceId.
 * Para endpoints como leads POST que son publicos.
 */
export async function requireAuth(
  options: { roles?: Role[] } = {}
): Promise<{ ok: true; ctx: Omit<WorkspaceContext, "workspaceId"> & { workspaceId: string | null } } | { ok: false; response: NextResponse }> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }

  const role = session.user.role as Role;
  if (options.roles && !options.roles.includes(role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Sin permisos" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    ctx: {
      userId:        session.user.id,
      workspaceId:   session.user.workspaceId ?? null,
      role,
      email:         session.user.email ?? "",
      name:          session.user.name  ?? "",
      workspaceName: (session.user as { workspaceName?: string | null }).workspaceName ?? null,
    },
  };
}
