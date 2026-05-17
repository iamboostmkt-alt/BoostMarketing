import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

const clients = await db.client.findMany({ take: 10 })
console.log('Clientes:', clients.length)

const tasks = await db.task.findMany({ take: 5 })
console.log('Tareas:', tasks.length)

const users = await db.user.findMany({ select: { id: true, email: true, role: true }, take: 10 })
console.log('Usuarios:', JSON.stringify(users, null, 2))

await db.$disconnect()
