import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import Redis from 'ioredis'

import { EnvService } from '@/infra/env/env.service'

@Injectable()
export class RedisService extends Redis implements OnModuleInit, OnModuleDestroy {
  private readonly internalLogger = new Logger(RedisService.name)
  private logged = false

  constructor(env: EnvService) {
    super(env.get('REDIS_URL'), {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: false,
    })

    this.on('error', (err) => {
      // Loga 1x por janela; ioredis pode emitir muitos errors em sequência.
      if (!this.logged) {
        this.internalLogger.error(`Redis: ${err.message}`)
        this.logged = true
        setTimeout(() => (this.logged = false), 5_000)
      }
    })
  }

  async onModuleInit(): Promise<void> {
    if (this.status === 'wait') await this.connect()
    this.internalLogger.log('Redis conectado')
  }

  async onModuleDestroy(): Promise<void> {
    await this.quit()
    this.internalLogger.log('Redis desconectado')
  }
}
