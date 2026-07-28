import { Global, Module } from '@nestjs/common'


import { RedisCacheRepository } from './redis/redis-cache-repository'
import { RedisService } from './redis/redis.service'

import { CacheRepository } from '@/domain/application/cache/cache-repository'

// @Global pra que cache esteja disponível em qualquer feature module sem reimportar.
// Bind do port → impl Redis.
@Global()
@Module({
  providers: [RedisService, { provide: CacheRepository, useClass: RedisCacheRepository }],
  exports: [RedisService, CacheRepository],
})
export class CacheModule {}
