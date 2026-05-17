import { PrismaClient } from '@prisma/client'

// Carga el .env de produccion
import { readFileSync } from 'fs'
const envFile = readFileSync('.env', 'utf8')
const dbUrl = envFile.split('\n').find(l => l.startsWith('DATABASE_URL'))
console.log('DB URL:', dbUrl?.substring(0, 60) + '...')

const db = new PrismaClient()
const milestones = await db.milestone.findMany({ take: 10 })
console.log('Total milestones en DB:', milestones.length)
console.log(JSON.stringify(milestones, null, 2))
await db.$disconnect()
