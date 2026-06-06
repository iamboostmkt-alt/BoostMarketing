import { db } from "@/lib/db";

type AuditAction =
  | "TASK_CREATED"    | "TASK_UPDATED"    | "TASK_DELETED"
  | "SUBTASK_CREATED" | "SUBTASK_UPDATED"
  | "CLIENT_CREATED"  | "CLIENT_UPDATED"  | "CLIENT_DELETED"
  | "USER_LOGIN"      | "USER_LOGOUT"
  | "ROLE_CHANGED"    | "USER_CREATED"    | "USER_UPDATED"
  | "APPOINTMENT_CREATED" | "APPOINTMENT_UPDATED" | "APPOINTMENT_DELETED";

interface LogOptions {
  userId:      string | null;
  workspaceId: string;
  action:      AuditAction;
  entity:      string;
  entityId:    string;
  details?:    Record<string, unknown>;
}

export async function logAction(opts: LogOptions): Promise<void> {
  try {
    await db.activityLog.create({
      data: {
        userId:      opts.userId,
        workspaceId: opts.workspaceId,
        action:      opts.action,
        entity:      opts.entity,
        entityId:    opts.entityId,
        details:     JSON.stringify(opts.details ?? {}),
      },
    });
  } catch (e) {
    // Audit log nunca debe romper el flujo principal
    console.error("[AUDIT]", e);
  }
}
