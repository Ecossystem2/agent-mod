import { Injectable, Logger } from '@nestjs/common'

import { RedisService } from '@/infra/cache/redis/redis.service'
import { EnvService } from '@/infra/env/env.service'

@Injectable()
export class SignInLockoutService {
  private readonly logger = new Logger(SignInLockoutService.name)

  constructor(
    private readonly redis: RedisService,
    private readonly env: EnvService,
  ) {}

  private normalize(email: string): string {
    return email.toLowerCase().trim()
  }

  private key(email: string): string {
    return `auth:lockout:${this.normalize(email)}`
  }

  async isBlocked(email: string): Promise<boolean> {
    const count = await this.redis.get(this.key(email))
    return Number(count ?? 0) >= this.env.get('AUTH_RATE_LIMIT_MAX')
  }

  async registerFailure(email: string): Promise<void> {
    const key = this.key(email)
    const results = await this.redis
      .pipeline()
      .incr(key)
      .expire(key, this.env.get('AUTH_RATE_LIMIT_WINDOW'))
      .exec()

    for (const [err] of results ?? []) {
      if (err) this.logger.error(`lockout pipeline command failed: ${err.message}`)
    }
  }

  async clear(email: string): Promise<void> {
    await this.redis.del(this.key(email))
  }
}
