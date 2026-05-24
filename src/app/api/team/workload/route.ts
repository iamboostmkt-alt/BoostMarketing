import { NextResponse } from "next/server";
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from "@/lib/db";

export async function GET() {
  const result = await requireWorkspace({ roles: ["ADMIN", "PROJECT_MANAGER"] });
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;

  const users = await db.user.findMany({
    where: {
      role: { notIn: ["CLIENT", "UNASSIGNED"] },
      active: true,
      workspaceId,
    },
    select: {
      id: true, name: true, email: true,
      image: true, role: true, color: true,
      customRole: { select: { label: true, color: true } },
      taskAssignments: {
        where: {
          task: {
            status: { notIn: ["completed", "approved"] },
            archivedAt: null,
          },
        },
        select: {
          task: {
            select: {
              id: true, title: true, status: true,
              priority: true, dueDate: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Aplanar taskAssignments -> tasks
  const mapped = users.map(u => ({
    ...u,
    activeTasks: u.taskAssignments.map((ta: any) => ta.task),
    taskAssignments: undefined,
  }));

  return NextResponse.json({ users: mapped });
}
