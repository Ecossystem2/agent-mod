import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from '@nestjs/common'

import { RedisService } from '@/infra/cache/redis/redis.service'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { Public } from '@/infra/http/decorators/public.decorator'

@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get('health')
  @HttpCode(HttpStatus.OK)
  async check() {
    const [postgres, redis] = await Promise.allSettled([
      this.checkPostgres(),
      this.checkRedis(),
    ])

    const details = {
      postgres: postgres.status === 'fulfilled',
      redis: redis.status === 'fulfilled',
    }

    if (!details.postgres || !details.redis) {
      throw new ServiceUnavailableException({ ok: false, details })
    }

    return { ok: true }
  }

  private async checkPostgres(): Promise<void> {
    await Promise.race([
      this.prisma.$queryRaw`SELECT 1`,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('postgres timeout')), 3_000),
      ),
    ])
  }

  private async checkRedis(): Promise<void> {
    await Promise.race([
      this.redis.ping(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('redis timeout')), 3_000),
      ),
    ])
  }
}
