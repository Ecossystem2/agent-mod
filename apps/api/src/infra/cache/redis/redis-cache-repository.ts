import { Injectable, Logger } from '@nestjs/common'

import { RedisService } from './redis.service'

import { CacheRepository, type SetOptions } from '@/domain/application/cache/cache-repository'

const DEFAULT_GET_TIMEOUT_MS = 500
const SCAN_COUNT = 200
const CHUNK_SIZE = 500
const PREFIX = 'cache:'

@Injectable()
export class RedisCacheRepository extends CacheRepository {
  private readonly logger = new Logger(RedisCacheRepository.name)

  constructor(private readonly redis: RedisService) {
    super()
  }

  private k(key: string): string {
    return `${PREFIX}${key}`
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.withTimeout(this.redis.get(this.k(key)), DEFAULT_GET_TIMEOUT_MS)
      if (raw === null) return null
      return JSON.parse(raw) as T
    } catch (err) {
      this.logger.warn(`cache GET falhou (${(err as Error).message}) — fallback ao loader`)
      return null
    }
  }

  async set<T>(key: string, value: T, opts: SetOptions): Promise<void> {
    const payload = JSON.stringify(value)
    await this.redis.set(this.k(key), payload, 'EX', opts.ttlSeconds)
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(this.k(key))
  }

  async invalidateByPattern(pattern: string): Promise<number> {
    const fullPattern = this.k(pattern)
    let cursor = '0'
    let total = 0
    do {
      // SCAN (não KEYS): KEYS bloqueia o event loop do Redis em prod.
      const [next, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        fullPattern,
        'COUNT',
        SCAN_COUNT,
      )
      cursor = next
      for (let i = 0; i < keys.length; i += CHUNK_SIZE) {
        total += await this.redis.del(...keys.slice(i, i + CHUNK_SIZE))
      }
    } while (cursor !== '0')
    return total
  }

  async setNX(key: string, value: string, opts: SetOptions): Promise<boolean> {
    const result = await this.redis.set(this.k(key), value, 'EX', opts.ttlSeconds, 'NX')
    return result === 'OK'
  }

  async increment(key: string, opts?: SetOptions): Promise<number> {
    const fullKey = this.k(key)
    const value = await this.redis.incr(fullKey)
    if (value === 1 && opts?.ttlSeconds) {
      await this.redis.expire(fullKey, opts.ttlSeconds)
    }
    return value
  }

  private withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
    let timer: NodeJS.Timeout | undefined
    const timeout = new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`cache timeout (${ms}ms)`)), ms)
    })
    return Promise.race([p, timeout]).finally(() => {
      clearTimeout(timer)
    })
  }
}
