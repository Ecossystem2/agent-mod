import type { SetOptions } from '@/domain/application/cache/cache-repository'

import { CacheRepository } from '@/domain/application/cache/cache-repository'

export class InMemoryCacheRepository extends CacheRepository {
  store = new Map<string, unknown>()
  deletedKeys: string[] = []
  invalidatedPatterns: string[] = []

  async get<T>(key: string): Promise<T | null> {
    return (this.store.get(key) as T | undefined) ?? null
  }

  async set<T>(key: string, value: T, _opts: SetOptions): Promise<void> {
    this.store.set(key, value)
  }

  async delete(key: string): Promise<void> {
    this.deletedKeys.push(key)
    this.store.delete(key)
  }

  async invalidateByPattern(pattern: string): Promise<number> {
    this.invalidatedPatterns.push(pattern)
    const prefix = pattern.endsWith('*') ? pattern.slice(0, -1) : pattern
    let count = 0
    for (const key of [...this.store.keys()]) {
      if (key.startsWith(prefix)) {
        this.store.delete(key)
        count++
      }
    }
    return count
  }

  async setNX(key: string, value: string, _opts: SetOptions): Promise<boolean> {
    if (this.store.has(key)) return false
    this.store.set(key, value)
    return true
  }

  async increment(key: string, _opts?: SetOptions): Promise<number> {
    const next = Number(this.store.get(key) ?? 0) + 1
    this.store.set(key, next)
    return next
  }
}
