# DOCUMENTO MAESTRO — Mayo 2026 v25.0
## Weeklink / BoostMarketing CRM/PM Tool
Stack: Next.js 14 · TypeScript · Prisma v6.19.3 · Supabase · Tailwind v4 · NextAuth · Vercel · UploadThing · Nodemailer/Resend

> **Auditoría completa — S-01 a S-120 cerrados**
> **Tenant isolation nivel Linear · Error boundaries 11 rutas · Roles centralizados**

---

# PARTE 0 — SCRIPT DE GUARDADO

\`\`\`bash
DEST="C:/Users/Esteb/Desktop/Pagina web/Descargas/files/Plan Maestro"
mkdir -p "$DEST"
cp DOCUMENTO_MAESTRO_V25.md "$DEST/DOCUMENTO_MAESTRO_V25.md"
echo "✅ Plan Maestro V25 guardado"
\`\`\`

---

# PARTE 1 — REGLAS DE FLUJO

## Comandos obligatorios
- **Git Bash siempre**, NUNCA PowerShell
- **\`npx tsc --noEmit\`** sin errores antes de cada commit
- **Python para edits** — scripts en /tmp/fix_*.py, nunca sed en Windows
- **\`.gitignore\` tiene \`*.py\`** — scripts nunca al repo
- **\`npx prisma db push\`** después de cambios al schema
- **\`rm -rf .next\`** si hay errores de caché TypeScript
- **Backend = única fuente de verdad** — nunca filtrar por rol solo en React
- **UploadThing**: usar \`file.ufsUrl ?? file.url\`
- **Settings**: siempre \`/api/cms/settings\`, nunca \`/api/settings\`

## ══════════════════════════════════════════
## PATRÓN OBLIGATORIO — TODA API NUEVA
## ══════════════════════════════════════════

\`\`\`typescript
import { requireWorkspace } from "@/core/auth/require-workspace";
import { getScopedDb } from "@/lib/db-scoped";
import { rateLimit } from "@/lib/security/rate-limit";
import { hasRole, MANAGER_ROLES } from "@/core/constants/roles";
import { logAction } from "@/lib/audit";
import { z } from "zod";

export async function POST(req: NextRequest) {
  // 1. Rate limit PRIMERO
  const rl = await rateLimit(req, { limit: 30, windowMs: 60_000, identifier: 'endpoint-name' });
  if (!rl.success) return rl.response;

  // 2. Auth — única fuente de verdad
  const result = await requireWorkspace({ roles: ["ADMIN"] });
  if (!result.ok) return result.response;
  const { userId, workspaceId } = result.ctx;
  // CRÍTICO: usar userId (NO .id)

  // 3. Validación Zod
  const body = await req.json();
  const validation = Schema.safeParse(body);
  if (!validation.success)
    return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });

  // 4. DB con scope automático
  const sdb = getScopedDb(workspaceId);

  // 5. findFirst SIEMPRE (nunca findUnique en recursos tenant)
  const item = await sdb.task.findFirst({ where: { id } });
  if (!item) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // 6. Roles con hasRole (nunca .includes() directo)
  if (!hasRole(role, MANAGER_ROLES))
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  // 7. Audit log en mutaciones importantes (fire and forget)
  logAction({ userId, workspaceId, action: "TASK_CREATED", entity: "task", entityId: item.id })
    .catch(() => undefined);
}
\`\`\`

## REGLAS CRÍTICAS — NUNCA VIOLAR
\`\`\`
✅ requireWorkspace en TODA API nueva — cero getServerSession
✅ findFirst + workspaceId — nunca findUnique en recursos tenant
✅ hasRole(role, ROLES) de @/core/constants/roles — nunca .includes() directo
✅ TASK_STATUS enums — nunca strings hardcoded
✅ workspaceId siempre obligatorio — nunca condicional ni ?? ''
✅ onDelete: Cascade en relaciones workspace
✅ getScopedDb para nuevas APIs
✅ WorkspaceContext usa .userId (NO .id)
✅ Vercel Hobby: max 2 crons (daily + weekly)
✅ error.tsx en cada nueva ruta de dashboard
✅ Zod validation en todo POST/PUT/PATCH con body
✅ Rate limit en endpoints de escritura y auth
\`\`\`

## REGLAS DE EMAILS (bloque pendiente)
\`\`\`
✅ Siempre pasar branding al template
✅ getBranding(workspaceId) — cuando esté implementado
✅ Doble logo: Weeklink (plataforma) + workspace (agencia)
✅ Subject lines con brandName dinámico — nunca "BoostMarketing" hardcoded
✅ Dominio de envío: noreply@weeklink.app (pendiente DNS/SPF/DKIM)
\`\`\`

## REGLAS PARA NUEVOS ROLES/PERMISOS
\`\`\`
✅ Definir SOLO en src/core/constants/roles.ts
✅ Nunca definir arrays de roles localmente en handlers
✅ Usar hasRole() para comparaciones
✅ Agregar la nueva ruta en src/lib/roles.ts ROUTE_ACCESS
✅ Verificar AccessControl si afecta visibilidad de tareas
\`\`\`

---

# PARTE 2 — ARQUITECTURA DEL SISTEMA

## Stack técnico
- **Frontend**: Next.js 14 App Router · TypeScript · Tailwind CSS v4 · shadcn/ui
- **Auth**: NextAuth.js JWT — refresh horario via lastRefresh
- **DB**: PostgreSQL vía Supabase + Prisma ORM v6.19.3
- **Storage**: UploadThing (ufsUrl ?? url)
- **Email**: Nodemailer (SMTP Gmail) con fallback a Resend API
- **Deploy**: Vercel Hobby — máximo 2 crons
- **Realtime**: Supabase Realtime broadcast (notifications, presence, comments)
- **Rate Limit**: Upstash Redis sliding window — fail open si Redis caído
- **Motion**: framer-motion v12.39.0
- **DnD**: @hello-pangea/dnd
- **Validación**: zod v4.4.3

## WorkspaceContext — tipo completo
\`\`\`typescript
// src/core/auth/require-workspace.ts
export type WorkspaceContext = {
  userId:        string;   // SIEMPRE usar userId, nunca .id
  workspaceId:   string;
  role:          Role;
  email:         string;
  name:          string;
  workspaceName: string | null;
};
\`\`\`

## getScopedDb — scope automático
\`\`\`typescript
// Inyecta workspaceId automáticamente en findMany, findFirst, create
// Imposible olvidar el tenant scope
const sdb = getScopedDb(workspaceId);
const tasks = await sdb.task.findMany({ where: { status } });
// workspaceId inyectado — sin riesgo de cross-tenant
\`\`\`

## Roles centralizados
\`\`\`typescript
// src/core/constants/roles.ts — ÚNICA fuente de verdad
export const MANAGER_ROLES     = ["ADMIN", "PROJECT_MANAGER"] as const;
export const MANAGER_ROLES_EXT = ["ADMIN", "PROJECT_MANAGER", "SALES_REP"] as const;
export const INTERNAL_ROLES    = ["ADMIN","PROJECT_MANAGER","TEAM_MEMBER","DESIGNER","MARKETING","SALES_REP"] as const;
export function hasRole(role: string | undefined | null, roles: readonly string[]): boolean;
// NUNCA usar .includes() directo — siempre hasRole()
\`\`\`

## Error boundaries — cobertura completa
\`\`\`
src/app/(dashboard)/dashboard/error.tsx          ← fallback global
src/app/(dashboard)/dashboard/admin/error.tsx
src/app/(dashboard)/dashboard/analytics/error.tsx
src/app/(dashboard)/dashboard/calendar/error.tsx
src/app/(dashboard)/dashboard/chat/error.tsx
src/app/(dashboard)/dashboard/client-portal/error.tsx
src/app/(dashboard)/dashboard/clients/error.tsx
src/app/(dashboard)/dashboard/crm/error.tsx
src/app/(dashboard)/dashboard/settings/error.tsx
src/app/(dashboard)/dashboard/tasks/error.tsx
src/app/(dashboard)/dashboard/team/error.tsx
// Para nueva ruta: crear error.tsx automáticamente
\`\`\`

## Crons Vercel Hobby (máximo 2)
\`\`\`
daily:  0 9 * * *  — prioridades, overdue, review reminders,
                     cleanup citas +30d, soft-delete tasks +7d,
                     presence cleanup +15min, filtro @boostmkt.com
weekly: 0 8 * * 1  — snapshots, archivar completadas
\`\`\`

## Modelos scoped (workspaceId + onDelete: Cascade)
User, Notification, ActivityLog, Task, Contact, Client, Activity,
CustomRole, ChatMessage, Appointment, TaskTemplate, Milestone, AnalyticsSnapshot

## Modelos globales (sin workspaceId — acceder via db, no sdb)
SiteSettings, PortfolioItem, Testimonial, TeamMember, TaskAttachment,
TaskFeedback, DeliverableLog, ChatReaction, ActivityComment, UserPresence

---

# PARTE 3 — ESTADO DE MIGRACIONES

## ✅ Fase 1 — requireWorkspace (100% — 50/50 APIs)
## ✅ Fase 3 — Ownership validation (completa)
## ⏳ Fase 2 — Capa de servicio (pendiente — PRÓXIMO BLOQUE)
## ⏳ Fase 4 — ApiResponse<T> uniforme (pendiente)
## ⏳ Fase 5 — deliverableStatus legacy (pendiente)

---

# PARTE 4 — SEGURIDAD (AUDITADA v25)

## ✅ Resuelto completamente
- requireWorkspace 100% APIs
- JWT refresh horario via lastRefresh
- Rate limit: register (3/min), forgot-password (3/5min), reset-password (5/5min),
  tasks/clients/meetings/chat/milestones/stats/reports GETs
- Rate limit fail open si Redis caído
- Ownership: findFirst+workspaceId en todos los recursos críticos
- workspaceId non-nullable + onDelete Cascade
- 0 workspaceId condicionales (cero ?? '')
- open mail relay eliminado
- CRON_SECRET guard correcto (undefined ya no permite acceso)
- CSP header + reactStrictMode:true + remotePatterns restringidos
- Código muerto eliminado (4 archivos)
- appointments POST público con workspaceId guard
- tasks/archive POST con workspaceId en taskIds where
- Error boundaries 11 rutas
- Audit log USER_LOGIN en JWT callback

## ⚠️ Deuda pendiente
- BA-07: getBranding(workspaceId) — bloque emails
- Workspace delete doble confirmación

---

# PARTE 5 — BUGS Y ERRORES PENDIENTES POR BLOQUE

## 🔴 BLOQUE CRÍTICO — Atacar primero

### BC-01: deliverableStatus legacy (S-16 / Fase 5)
**Archivos**: tasks/route.ts, archive, feedback, weekly cron, +8 más
**Problema**: dos fuentes de verdad — status y deliverableStatus
**Impacto**: milestone progress incorrecto, estado inconsistente
**Fix**: migración + unificar en status solamente

### BC-02: lifecycleStatus JWT consistencia
**Archivo**: src/lib/auth.ts
**Problema**: lifecycleStatus puede ser inconsistente tras refresh
**Fix**: verificar que auth.ts lo incluya correctamente en refresh

### BC-03: UserContext vs WorkspaceContext — dos tipos para el mismo concepto
**Archivos**: src/core/auth/user-context.ts, access-control.ts
**Problema**: UserContext usa .id, WorkspaceContext usa .userId — confuso
**Fix (Fase 2)**: unificar en un solo tipo al crear capa de servicio

## 🟡 BLOQUE ARQUITECTURA

### BA-01: Capa de servicio (Fase 2) — PRÓXIMO BLOQUE
**Problema**: lógica de negocio en handlers — ClientService, TaskService faltantes
**Impacto**: contacts/convert y clients/route crean clientes con lógica diferente
**Sub-items**:
- ClientService.create() — única implementación
- TaskService.create() — única implementación
- NotificationService — centralizar 16 notification.create() dispersos
- Adoptar getScopedDb en APIs activas
- Adoptar dispatchEvent — solo 2 usos vs 16 directos
- logAction en appointments, contacts, users (faltan)

### BA-02: Permission matrix centralizada
**Problema**: lógica de permisos dispersa en AccessControl, ROUTE_ACCESS, cada API
**Fix**: src/lib/constants/permissions.ts con canManageClients, canViewAnalytics, etc.

### BA-03: Paginación consistente
**Problema**: contacts/clients/meetings sin take/skip — timeout con volumen real
**Fix**: cursor-based igual que tasks

### BA-04: ApiResponse<T> uniforme (Fase 4)
**Problema**: APIs devuelven { task }, { tasks }, { data } — inconsistente
**Fix**: wrapper ApiResponse<T> en todos los handlers

### BA-05: Optimistic updates ✅ ya implementado en tasks

### BA-06: Error boundaries ✅ completo — 11 rutas

### BA-07: Emails con branding por workspace
**Problema**: getBranding() global — todos los workspaces reciben mismo branding
**Fix**: getBranding(workspaceId) + doble logo Weeklink/workspace
**Requiere**: assets Weeklink + dominio weeklink.app

### BA-08: strings status hardcoded en componentes
**Problema**: 25 strings 'completed'/'pending'/etc en .tsx sin usar enums
**Fix**: migrar a TASK_STATUS progresivamente

### BA-09: Task.status como string en tipos frontend
**Problema**: src/lib/types.ts usa status: string — pierde type safety
**Fix**: cambiar a TaskStatus union type

### BA-10: NotificationService faltante
**Problema**: 16 notification.create() con formato inconsistente (algunos sin read: false, sin link)
**Fix**: createNotification() helper centralizado como parte de Fase 2

## 🟢 BLOQUE ROADMAP

### BR-01: Redis cache — workspace/me, stats, /api/tasks
### BR-02: Stripe billing FREE/PRO
### BR-03: Subdominios agency.weeklink.app
### BR-04: Branding dinámico por workspace (conecta BA-07)
### BR-05: Workspace delete con doble confirmación (escribir nombre)
### BR-06: Timezone por usuario (para equipos distribuidos)
### BR-07: /dashboard/team completo
### BR-08: Portal cliente — separar ClientPortalContent (991 líneas)
### BR-09: TaskCard v2 (prompt en v0.dev listo)
### BR-10: Calendario rediseño (prompt en v0.dev listo)

---

# PARTE 6 — CHECKLIST MVP

## Semana 1 — Capa de servicio (BA-01)
- [ ] ClientService.create() — unificar contacts/convert y clients/route
- [ ] TaskService.create() — extraer lógica del handler
- [ ] NotificationService.create() — centralizar 16 calls
- [ ] logAction en appointments, contacts, users
- [ ] Adoptar getScopedDb en tasks, clients, contacts

## Semana 2 — Features visuales
- [ ] TaskCard v2
- [ ] Calendario rediseño
- [ ] /dashboard/team lista equipo
- [ ] Portal cliente separar ClientPortalContent

## Semana 3 — Arquitectura
- [ ] BA-03: Paginación contacts/clients/meetings
- [ ] BA-02: Permission matrix centralizada
- [ ] BA-04: ApiResponse<T> uniforme

## Semana 4 — Monetización
- [ ] Stripe billing FREE/PRO
- [ ] Branding por workspace
- [ ] Workspace delete doble confirmación
- [ ] Redis cache

---

# PARTE 7 — COMPARATIVA CON REFERENTES (v25)

| Característica | Trello | Asana | Linear | Weeklink v25 |
|----------------|--------|-------|--------|--------------|
| Tenant isolation | ✅ | ✅ | ✅ | ✅ nivel Linear |
| Auth unificado | ✅ | ✅ | ✅ | ✅ requireWorkspace |
| Scope automático DB | ❌ | ❌ | ✅ | ✅ getScopedDb |
| Rate limiting | ✅ | ✅ | ✅ | ✅ completo |
| Ownership validation | ✅ | ✅ | ✅ | ✅ completo |
| Error boundaries | ✅ | ✅ | ✅ | ✅ 11 rutas |
| Roles centralizados | ✅ | ✅ | ✅ | ✅ hasRole helper |
| Capa de servicio | ✅ | ✅ | ✅ | ❌ Fase 2 |
| Permission matrix | ✅ | ✅ | ✅ | ❌ BA-02 |
| Paginación consistente | ✅ | ✅ | ✅ | ⚠️ solo tasks |
| ApiResponse uniforme | ✅ | ✅ | ✅ | ❌ Fase 4 |
| Audit log completo | ✅ | ✅ | ✅ | ⚠️ parcial |
| Branding por workspace | ✅ | ✅ | ✅ | ❌ bloque emails |
| Portal de cliente | ❌ | ✅ | ❌ | ✅ funcional |
| F1 flujo revisión | ❌ | ⚠️ | ✅ | ✅ implementado |
| Notificaciones realtime | ✅ | ✅ | ✅ | ✅ Supabase |
| Presence online | ⚠️ | ✅ | ✅ | ✅ con cleanup |

---

# PARTE 8 — CHECKLIST NUEVO CHAT

\`\`\`
Sistema: Weeklink / BoostMarketing CRM/PM Tool v25.0
Stack: Next.js 14 · TypeScript · Prisma v6.19.3 · Supabase · Tailwind v4 · NextAuth · Vercel Hobby

═══════════════════════════════════════
REGLAS CRÍTICAS — NUNCA VIOLAR
═══════════════════════════════════════
- requireWorkspace en TODA API nueva
- findFirst + workspaceId (nunca findUnique en recursos tenant)
- hasRole(role, ROLES) de @/core/constants/roles (nunca .includes())
- workspaceId siempre obligatorio (nunca ?? '' ni condicional)
- WorkspaceContext usa .userId (NO .id)
- TASK_STATUS enums (no strings hardcoded)
- getScopedDb para nuevas APIs
- onDelete: Cascade en relaciones workspace
- error.tsx en cada nueva ruta dashboard
- Zod en todo POST/PUT con body
- Rate limit en escritura y auth
- Vercel Hobby: max 2 crons
- Git Bash siempre · tsc antes de commit

═══════════════════════════════════════
COMPLETADO v25
═══════════════════════════════════════
✅ requireWorkspace 50/50 APIs
✅ Ownership validation completa
✅ getScopedDb implementado
✅ workspaceId non-nullable + Cascade
✅ Rate limiting completo + fail open
✅ Índices DB 7 modelos + clientId+workspaceId
✅ JWT refresh correcto (lastRefresh)
✅ S-01 a S-120 cerrados
✅ open mail relay eliminado
✅ 0 workspaceId condicionales/vacíos
✅ CSP + security headers
✅ WorkspaceContext con workspaceName
✅ Error boundaries 11 rutas (error.tsx)
✅ Roles centralizados + hasRole helper
✅ ROUTE_ACCESS completo (team, leads)
✅ Presence cleanup en cron daily
✅ Audit log USER_LOGIN
✅ tasks clients-with-tasks solo activas
✅ appointments POST workspaceId guard
✅ tasks/archive workspaceId en taskIds
✅ workspaceId ?? '' eliminados

═══════════════════════════════════════
PENDIENTE POR PRIORIDAD
═══════════════════════════════════════
1. BA-01: Capa de servicio (ClientService, TaskService, NotificationService)
2. TaskCard v2 + Calendario rediseño
3. /dashboard/team completo
4. BA-03: Paginación contacts/clients/meetings
5. BA-02: Permission matrix centralizada
6. BC-01: deliverableStatus legacy (Fase 5)
7. Stripe billing FREE/PRO
8. Bloque emails (logo Weeklink, getBranding(workspaceId), dominio)
9. Redis cache
10. Workspace delete doble confirmación

═══════════════════════════════════════
ARCHIVOS CLAVE
═══════════════════════════════════════
src/core/auth/require-workspace.ts   — auth helper
src/core/auth/user-context.ts        — UserContext type (usa .id)
src/core/constants/roles.ts          — MANAGER_ROLES, hasRole
src/core/access/access-control.ts    — canViewTask, canAccessScope
src/lib/db-scoped.ts                 — getScopedDb
src/lib/constants/status.ts          — TASK_STATUS enums
src/lib/roles.ts                     — canAccessRoute, ROUTE_ACCESS
src/lib/audit.ts                     — logAction
src/lib/events.ts                    — dispatchEvent (subutilizado)
src/lib/branding.ts                  — getBranding (global aún)
src/lib/security/rate-limit.ts       — rateLimit + fail open
\`\`\`

---

# PARTE 9 — HISTORIAL S-01 a S-120

## S-01 a S-111 — ver DOCUMENTO_MAESTRO_V24.md

## S-112 a S-120 (V25)
- S-112 ✅: tasks clients-with-tasks incluía completadas
- S-113 ✅: índice clientId+workspaceId faltante
- S-114 ✅: presence cleanup en cron daily
- S-115 ✅: roles locales en 10 APIs eliminados
- S-116 ✅: ROUTE_ACCESS incompleto (team, leads faltaban)
- S-117 ✅: error.tsx en 11 rutas
- S-118 ✅: appointments POST workspaceId ?? '' y guard faltante
- S-119 ✅: tasks/archive taskIds sin workspaceId
- S-120 ✅: workspaceId ?? '' en reset-password, contacts/convert, leads/[id]

---

# PARTE 10 — BLOQUE EMAILS (pendiente assets)

## Estado actual
- getBranding() — global, SiteSettings, brandName='BoostMarketing' hardcoded
- Envío desde: SMTP Gmail (BoostMarketing)
- Templates: mailer.ts (Nodemailer) + resend.ts (Resend API)

## Plan cuando lleguen assets Weeklink
1. Agregar logoWeeklink en SiteSettings o variable de entorno
2. Modificar getBranding(workspaceId?) — workspace branding con Weeklink fallback
3. Actualizar emailLayout() — header con doble logo
4. Cambiar dominio envío a noreply@weeklink.app (DNS/SPF/DKIM)
5. Reemplazar "BoostMarketing" en todos los subject lines
6. getBranding(workspaceId) en cron daily/weekly por workspace

## Subject lines hardcodeados a cambiar
- meetings/route.ts: "Nueva reunion asignada - BoostMarketing"
- meetings/route.ts: "Reunion actualizada - BoostMarketing"
- workspace/invite: ya usa workspaceName ✅
