import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const models = [
  { name: 'User',         table: db.user         },
  { name: 'Task',         table: db.task         },
  { name: 'Client',       table: db.client       },
  { name: 'Contact',      table: db.contact      },
  { name: 'Appointment',  table: db.appointment  },
  { name: 'Activity',     table: db.activity     },
  { name: 'ChatMessage',  table: db.chatMessage  },
  { name: 'Notification', table: db.notification },
  { name: 'CustomRole',   table: db.customRole   },
  { name: 'TaskTemplate', table: db.taskTemplate },
  { name: 'Milestone',    table: db.milestone    },
  { name: 'ActivityLog',  table: db.activityLog  },
]
for (const { name, table } of models) {
  const count = await table.count({ where: { workspaceId: null } })
  console.log(`${name.padEnd(15)} sin workspaceId: ${count}`)
}
await db.$disconnect()
