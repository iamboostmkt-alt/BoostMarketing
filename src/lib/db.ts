import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Supabase pgBouncer (port 6543) runs in transaction mode and does not support
// prepared statements. pgbouncer=true switches Prisma to the simple query protocol.
// connection_limit=1 prevents serverless functions (Vercel) from exhausting the pool.
function buildUrl(url: string | undefined): string | undefined {
  if (!url) return url
  let result = url
  if (!result.includes('pgbouncer=true')) {
    result += (result.includes('?') ? '&' : '?') + 'pgbouncer=true'
  }
  if (!result.includes('connection_limit=')) {
    result += '&connection_limit=1'
  }
  return result
}

const isDev = process.env.NODE_ENV === 'development';

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: { url: buildUrl(process.env.DATABASE_URL) },
    },
    log: isDev
      ? [
          { emit: 'stdout', level: 'query' },
          { emit: 'stdout', level: 'warn'  },
          { emit: 'stdout', level: 'error' },
        ]
      : [{ emit: 'stdout', level: 'error' }],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
