import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'

// Prisma 7 exige driver adapter — `new PrismaClient()` cru quebra com
// `needs valid PrismaClientOptions`. Scripts standalone (seed/backfill) montam
// o client igual ao `PrismaService` do app.
export function makeSeedPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required')
  }
  const schema = new URL(databaseUrl).searchParams.get('schema')
  const pool = new Pool({ connectionString: databaseUrl })
  return new PrismaClient({
    adapter: schema ? new PrismaPg(pool, { schema }) : new PrismaPg(pool),
  })
}
