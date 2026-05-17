import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

const milestones = await db.milestone.findMany({ take: 10 })
console.log('MILESTONES:', JSON.stringify(milestones, null, 2))

const clients = await db.client.findMany({ select: { id: true, name: true, email: true }, take: 10 })
console.log('CLIENTS:', JSON.stringify(clients, null, 2))

await db.$disconnect()
