import { Logger } from '@nestjs/common'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'

import { RedisCacheRepository } from './redis-cache-repository'

import type { RedisService } from './redis.service'

interface RedisMocks {
  get: Mock
  set: Mock
  del: Mock
  scan: Mock
  incr: Mock
  expire: Mock
}

function makeRedis(overrides: Partial<RedisMocks> = {}): { redis: RedisService; mocks: RedisMocks } {
  const mocks: RedisMocks = {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn().mockResolvedValue(1),
    scan: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn().mockResolvedValue(1),
    ...overrides,
  }
  return { redis: mocks as unknown as RedisService, mocks }
}

describe('RedisCacheRepository', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('get', () => {
    it('retorna o valor parseado quando há hit', async () => {
      const { redis, mocks } = makeRedis({ get: vi.fn().mockResolvedValue(JSON.stringify({ a: 1 })) })
      const sut = new RedisCacheRepository(redis)

      await expect(sut.get('k')).resolves.toEqual({ a: 1 })
      expect(mocks.get).toHaveBeenCalledWith('cache:k')
    })

    it('retorna null quando há miss', async () => {
      const { redis } = makeRedis({ get: vi.fn().mockResolvedValue(null) })
      const sut = new RedisCacheRepository(redis)

      await expect(sut.get('k')).resolves.toBeNull()
    })

    it('retorna null e loga warn quando o get falha', async () => {
      const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
      const { redis } = makeRedis({ get: vi.fn().mockRejectedValue(new Error('down')) })
      const sut = new RedisCacheRepository(redis)

      await expect(sut.get('k')).resolves.toBeNull()
      expect(warnSpy).toHaveBeenCalledOnce()
    })

    it('retorna null por timeout quando o get demora demais', async () => {
      vi.useFakeTimers()
      const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
      const { redis } = makeRedis({
        get: vi.fn().mockReturnValue(new Promise(() => undefined)),
      })
      const sut = new RedisCacheRepository(redis)

      const promise = sut.get('k')
      await vi.advanceTimersByTimeAsync(600)

      await expect(promise).resolves.toBeNull()
      expect(warnSpy).toHaveBeenCalledOnce()
      vi.useRealTimers()
    })
  })

  describe('set', () => {
    it('serializa e seta com EX', async () => {
      const { redis, mocks } = makeRedis()
      const sut = new RedisCacheRepository(redis)

      await sut.set('k', { a: 1 }, { ttlSeconds: 60 })

      expect(mocks.set).toHaveBeenCalledWith('cache:k', JSON.stringify({ a: 1 }), 'EX', 60)
    })
  })

  describe('delete', () => {
    it('deleta com prefixo', async () => {
      const { redis, mocks } = makeRedis()
      const sut = new RedisCacheRepository(redis)

      await sut.delete('k')

      expect(mocks.del).toHaveBeenCalledWith('cache:k')
    })
  })

  describe('invalidateByPattern', () => {
    it('itera o cursor do SCAN e soma as deleções', async () => {
      const { redis, mocks } = makeRedis({
        scan: vi
          .fn()
          .mockResolvedValueOnce(['5', ['cache:a', 'cache:b']])
          .mockResolvedValueOnce(['0', ['cache:c']]),
        del: vi.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(1),
      })
      const sut = new RedisCacheRepository(redis)

      await expect(sut.invalidateByPattern('user:*')).resolves.toBe(3)
      expect(mocks.scan).toHaveBeenCalledTimes(2)
    })

    it('não chama del quando o SCAN não retorna chaves', async () => {
      const { redis, mocks } = makeRedis({ scan: vi.fn().mockResolvedValue(['0', []]) })
      const sut = new RedisCacheRepository(redis)

      await expect(sut.invalidateByPattern('none:*')).resolves.toBe(0)
      expect(mocks.del).not.toHaveBeenCalled()
    })

    it('deleta em chunks de 500 quando o SCAN retorna muitas chaves', async () => {
      const keys = Array.from({ length: 1200 }, (_, i) => `cache:k${i}`)
      const { redis, mocks } = makeRedis({
        scan: vi.fn().mockResolvedValue(['0', keys]),
        del: vi.fn().mockResolvedValueOnce(500).mockResolvedValueOnce(500).mockResolvedValueOnce(200),
      })
      const sut = new RedisCacheRepository(redis)

      await expect(sut.invalidateByPattern('k*')).resolves.toBe(1200)
      expect(mocks.del).toHaveBeenCalledTimes(3)
      expect(mocks.del.mock.calls[0]).toHaveLength(500)
      expect(mocks.del.mock.calls[2]).toHaveLength(200)
    })
  })

  describe('setNX', () => {
    it('retorna true quando o set responde OK', async () => {
      const { redis, mocks } = makeRedis({ set: vi.fn().mockResolvedValue('OK') })
      const sut = new RedisCacheRepository(redis)

      await expect(sut.setNX('lock', 'v', { ttlSeconds: 30 })).resolves.toBe(true)
      expect(mocks.set).toHaveBeenCalledWith('cache:lock', 'v', 'EX', 30, 'NX')
    })

    it('retorna false quando o set não responde OK', async () => {
      const { redis } = makeRedis({ set: vi.fn().mockResolvedValue(null) })
      const sut = new RedisCacheRepository(redis)

      await expect(sut.setNX('lock', 'v', { ttlSeconds: 30 })).resolves.toBe(false)
    })
  })

  describe('increment', () => {
    it('seta expire no primeiro incremento com ttl', async () => {
      const { redis, mocks } = makeRedis({ incr: vi.fn().mockResolvedValue(1) })
      const sut = new RedisCacheRepository(redis)

      await expect(sut.increment('c', { ttlSeconds: 900 })).resolves.toBe(1)
      expect(mocks.expire).toHaveBeenCalledWith('cache:c', 900)
    })

    it('não seta expire em incrementos subsequentes', async () => {
      const { redis, mocks } = makeRedis({ incr: vi.fn().mockResolvedValue(2) })
      const sut = new RedisCacheRepository(redis)

      await expect(sut.increment('c', { ttlSeconds: 900 })).resolves.toBe(2)
      expect(mocks.expire).not.toHaveBeenCalled()
    })

    it('não seta expire quando não há ttl', async () => {
      const { redis, mocks } = makeRedis({ incr: vi.fn().mockResolvedValue(1) })
      const sut = new RedisCacheRepository(redis)

      await expect(sut.increment('c')).resolves.toBe(1)
      expect(mocks.expire).not.toHaveBeenCalled()
    })
  })
})
