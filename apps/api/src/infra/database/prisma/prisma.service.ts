import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required')
    }
    const schema = new URL(databaseUrl).searchParams.get('schema')
    const pool = new Pool({
      connectionString: databaseUrl,
      max: Number(process.env.DB_POOL_MAX ?? 10),
    })
    super({ adapter: schema ? new PrismaPg(pool, { schema }) : new PrismaPg(pool) })
  }

  async onModuleInit(): Promise<void> {
    await this.$connect()
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect()
  }
}
