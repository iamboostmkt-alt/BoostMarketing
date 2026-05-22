import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function main() {
  const ws = await db.workspace.upsert({
    where: { slug: 'boostmarketing' },
    update: {},
    create: {
      name: 'BoostMarketing',
      slug: 'boostmarketing',
      plan: 'PRO',
    },
  })
  console.log('Workspace creado:', ws.id)

  const [users, clients, tasks, appointments, activities, milestones, notifications, activityLogs, contacts, chatMessages, taskTemplates, customRoles] = await Promise.all([
    db.user.updateMany({ where: { workspaceId: null }, data: { workspaceId: ws.id } }),
    db.client.updateMany({ where: { workspaceId: null }, data: { workspaceId: ws.id } }),
    db.task.updateMany({ where: { workspaceId: null }, data: { workspaceId: ws.id } }),
    db.appointment.updateMany({ where: { workspaceId: null }, data: { workspaceId: ws.id } }),
    db.activity.updateMany({ where: { workspaceId: null }, data: { workspaceId: ws.id } }),
    db.milestone.updateMany({ where: { workspaceId: null }, data: { workspaceId: ws.id } }),
    db.notification.updateMany({ where: { workspaceId: null }, data: { workspaceId: ws.id } }),
    db.activityLog.updateMany({ where: { workspaceId: null }, data: { workspaceId: ws.id } }),
    db.contact.updateMany({ where: { workspaceId: null }, data: { workspaceId: ws.id } }),
    db.chatMessage.updateMany({ where: { workspaceId: null }, data: { workspaceId: ws.id } }),
    db.taskTemplate.updateMany({ where: { workspaceId: null }, data: { workspaceId: ws.id } }),
    db.customRole.updateMany({ where: { workspaceId: null }, data: { workspaceId: ws.id } }),
  ])

  console.log('Migrados:')
  console.log(' users:', users.count)
  console.log(' clients:', clients.count)
  console.log(' tasks:', tasks.count)
  console.log(' appointments:', appointments.count)
  console.log(' activities:', activities.count)
  console.log(' milestones:', milestones.count)
  console.log(' notifications:', notifications.count)
  console.log(' activityLogs:', activityLogs.count)
  console.log(' contacts:', contacts.count)
  console.log(' chatMessages:', chatMessages.count)
  console.log(' taskTemplates:', taskTemplates.count)
  console.log(' customRoles:', customRoles.count)
  console.log('DONE')
}

main().catch(console.error).finally(() => db.$disconnect())
