import type { PrismaClient } from '@prisma/client'

export interface SeedDefinition {
  name: string
  description: string
  run: (prisma: PrismaClient) => Promise<void>
}
