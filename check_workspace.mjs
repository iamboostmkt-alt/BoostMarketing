import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const ws = await db.workspace.findFirst({ select: { id: true, name: true } })
console.log('Workspace:', ws)
const orphanNotif = await db.notification.findMany({
  where: { workspaceId: null },
  select: { id: true, userId: true, message: true },
  take: 5,
})
console.log('Sample notifications sin workspace:', orphanNotif)
const orphanLog = await db.activityLog.findMany({
  where: { workspaceId: null },
  select: { id: true, userId: true, action: true },
  take: 5,
})
console.log('Sample activityLogs sin workspace:', orphanLog)
await db.$disconnect()
