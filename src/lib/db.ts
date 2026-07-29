import { PrismaClient } from '@prisma/client'

// Surface a clear error early if DATABASE_URL is missing at runtime
// (e.g. forgot to create .env, or running in an environment without it).
if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Create a .env file in the project root with:\n' +
      '  DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres\n' +
      'See .env.example for details.'
  )
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db