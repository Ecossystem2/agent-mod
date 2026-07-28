import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { afterAll, beforeAll } from 'vitest'

// Setup E2E — schema Postgres único por run.
// Executado antes de cada arquivo de teste E2E (ver vitest.config.e2e.ts).
//
// Padrão:
//   1. gera nome de schema aleatório (e2e_<uuid>)
//   2. seta DATABASE_URL com ?schema=<novo>
//   3. roda `prisma migrate deploy` pra criar todas as tabelas
//   4. ao final do arquivo, dropa o schema
//
// Por que: isolamento entre arquivos sem precisar de truncate/transactions awkward.

declare global {
  var __E2E_PRISMA__: PrismaClient | undefined
  var __E2E_POOL__: Pool | undefined
  var __E2E_SCHEMA__: string | undefined
}

function buildSchemaUrl(baseUrl: string, schema: string): string {
  const url = new URL(baseUrl)
  url.searchParams.set('schema', schema)
  return url.toString()
}

beforeAll(async () => {
  const baseUrl = process.env.DATABASE_URL
  if (!baseUrl) {
    throw new Error('DATABASE_URL não setada — necessária pros testes E2E')
  }

  const schema = `e2e_${randomUUID().replace(/-/g, '')}`
  const url = buildSchemaUrl(baseUrl, schema)

  process.env.DATABASE_URL = url
  globalThis.__E2E_SCHEMA__ = schema

  // Aplica migrações no schema novo.
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  })

  const pool = new Pool({ connectionString: url })
  globalThis.__E2E_POOL__ = pool
  globalThis.__E2E_PRISMA__ = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) })
  await globalThis.__E2E_PRISMA__.$connect()
})

afterAll(async () => {
  const prisma = globalThis.__E2E_PRISMA__
  const schema = globalThis.__E2E_SCHEMA__
  if (prisma && schema) {
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
    await prisma.$disconnect()
  }
  await globalThis.__E2E_POOL__?.end()
})
