export interface SetOptions {
  ttlSeconds: number
}

export abstract class CacheRepository {
  abstract get<T>(key: string): Promise<T | null>
  abstract set<T>(key: string, value: T, opts: SetOptions): Promise<void>
  abstract delete(key: string): Promise<void>
  abstract invalidateByPattern(pattern: string): Promise<number>
  abstract setNX(key: string, value: string, opts: SetOptions): Promise<boolean>
  abstract increment(key: string, opts?: SetOptions): Promise<number>
}
