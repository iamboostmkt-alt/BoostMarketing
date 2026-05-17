import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const settings = await db.siteSettings.findFirst()
console.log('Settings:', JSON.stringify(settings, null, 2))
await db.$disconnect()
