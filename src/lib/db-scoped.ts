import { db } from "@/lib/db";

/**
 * getScopedDb — Prisma client con workspaceId inyectado automáticamente
 * en findMany, findFirst y create/createMany.
 *
 * Patrón inspirado en Linear (organization-scoped client) y Asana
 * (workspace_gid obligatorio en URL). Aquí lo resolvemos en la capa
 * de datos para que ningún handler pueda olvidar el tenant scope.
 *
 * Reglas de uso:
 * - findMany / findFirst → workspaceId inyectado auto
 * - create / createMany  → workspaceId inyectado auto
 * - update / delete      → usar siempre con findFirst previo para
 *                          validar ownership (Fase 3 pattern)
 * - findUnique           → NO usar en modelos scoped, usar findFirst
 *
 * Modelos globales sin workspaceId (SiteSettings, PortfolioItem,
 * Testimonial, TeamMember, etc.) → acceder via db directo, no sdb.
 */

const SCOPED_MODELS = new Set([
  "user",
  "notification",
  "activityLog",
  "task",
  "contact",
  "client",
  "activity",
  "customRole",
  "chatMessage",
  "appointment",
  "taskTemplate",
  "milestone",
  "analyticsSnapshot",
]);

export function getScopedDb(workspaceId: string) {
  return db.$extends({
    query: {
      $allModels: {
        async findFirst({ model, args, query }: { model: string; args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
          if (SCOPED_MODELS.has(model)) {
            args.where = { ...(args.where as object), workspaceId };
          }
          return query(args);
        },
        async findMany({ model, args, query }: { model: string; args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
          if (SCOPED_MODELS.has(model)) {
            args.where = { ...(args.where as object), workspaceId };
          }
          return query(args);
        },
        async create({ model, args, query }: { model: string; args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
          if (SCOPED_MODELS.has(model)) {
            args.data = { ...(args.data as object), workspaceId };
          }
          return query(args);
        },
        async createMany({ model, args, query }: { model: string; args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
          if (SCOPED_MODELS.has(model)) {
            const data = Array.isArray(args.data)
              ? (args.data as object[]).map((d) => ({ ...d, workspaceId }))
              : { ...(args.data as object), workspaceId };
            args.data = data;
          }
          return query(args);
        },
      },
    },
  });
}

export type ScopedDb = ReturnType<typeof getScopedDb>;
