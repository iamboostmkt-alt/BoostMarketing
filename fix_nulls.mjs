import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const workspaceId = 'cmphc4yuy0000kt2scriojr9n'

const notif = await db.notification.updateMany({
  where: { workspaceId: null },
  data: { workspaceId },
})
console.log(`Notifications actualizadas: ${notif.count}`)

const logs = await db.activityLog.updateMany({
  where: { workspaceId: null },
  data: { workspaceId },
})
console.log(`ActivityLogs actualizados: ${logs.count}`)

// Verificar que no quedó nada
const remaining = await db.notification.count({ where: { workspaceId: null } })
const remainingLogs = await db.activityLog.count({ where: { workspaceId: null } })
console.log(`Restantes sin workspace — Notifications: ${remaining}, ActivityLogs: ${remainingLogs}`)

await db.$disconnect()
