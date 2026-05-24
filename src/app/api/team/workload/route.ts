import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const role = session.user.role;
  if (!["ADMIN", "PROJECT_MANAGER"].includes(role as string))
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const workspaceId = (session.user as any).workspaceId as string | null;

  const users = await db.user.findMany({
    where: {
      role: { notIn: ["CLIENT", "UNASSIGNED"] },
      active: true,
      ...(workspaceId && { workspaceId }),
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
  const result = users.map(u => ({
    ...u,
    activeTasks: u.taskAssignments.map((ta: any) => ta.task),
    taskAssignments: undefined,
  }));

  return NextResponse.json({ users: result });
}
