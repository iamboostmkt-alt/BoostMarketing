import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Supabase pgBouncer (port 6543) runs in transaction mode and does not support
// prepared statements. Adding pgbouncer=true switches Prisma to the simple query
// protocol, which is compatible with pgBouncer.
function buildUrl(url: string | undefined): string | undefined {
  if (!url) return url
  if (url.includes('pgbouncer=true')) return url
  return url + (url.includes('?') ? '&' : '?') + 'pgbouncer=true'
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: { url: buildUrl(process.env.DATABASE_URL) },
    },
    log: ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
