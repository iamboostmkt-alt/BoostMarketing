import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

const milestone = await db.milestone.create({
  data: {
    clientId: 'cmp0ayf010001l804yj6h1mtp',
    title: 'Test milestone',
    description: 'prueba',
    date: new Date('2026-06-01'),
    status: 'pending'
  }
})
console.log('Creado:', JSON.stringify(milestone, null, 2))
await db.$disconnect()
