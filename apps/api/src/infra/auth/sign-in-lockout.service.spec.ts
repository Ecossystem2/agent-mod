import { Logger } from '@nestjs/common'
import { describe, expect, it, vi, type Mock } from 'vitest'

import { SignInLockoutService } from './sign-in-lockout.service'

import type { RedisService } from '@/infra/cache/redis/redis.service'
import type { EnvService } from '@/infra/env/env.service'

function makeRedis(execResult: unknown[] = []): {
  redis: RedisService
  get: Mock
  del: Mock
  incr: Mock
  expire: Mock
  exec: Mock
} {
  const incr = vi.fn().mockReturnThis()
  const expire = vi.fn().mockReturnThis()
  const exec = vi.fn().mockResolvedValue(execResult)
  const pipeline = vi.fn().mockReturnValue({ incr, expire, exec })
  const get = vi.fn().mockResolvedValue(null)
  const del = vi.fn().mockResolvedValue(1)
  return {
    redis: { get, del, pipeline } as unknown as RedisService,
    get,
    del,
    incr,
    expire,
    exec,
  }
}

function makeEnv(max = 5, window = 60): EnvService {
  return {
    get: vi.fn((key: string) => {
      if (key === 'AUTH_RATE_LIMIT_MAX') return max
      if (key === 'AUTH_RATE_LIMIT_WINDOW') return window
    }),
  } as unknown as EnvService
}

describe(SignInLockoutService.name, () => {
  describe('isBlocked', () => {
    it('retorna false quando não há registro de falhas', async () => {
      const { redis } = makeRedis()
      const sut = new SignInLockoutService(redis, makeEnv())
      await expect(sut.isBlocked('u@e.com')).resolves.toBe(false)
    })

    it('retorna false quando falhas estão abaixo do limite', async () => {
      const { redis, get } = makeRedis()
      get.mockResolvedValue('3')
      const sut = new SignInLockoutService(redis, makeEnv(5))
      await expect(sut.isBlocked('u@e.com')).resolves.toBe(false)
    })

    it('retorna true quando falhas atingem o limite', async () => {
      const { redis, get } = makeRedis()
      get.mockResolvedValue('5')
      const sut = new SignInLockoutService(redis, makeEnv(5))
      await expect(sut.isBlocked('u@e.com')).resolves.toBe(true)
    })

    it('usa a chave prefixada com o email', async () => {
      const { redis, get } = makeRedis()
      const sut = new SignInLockoutService(redis, makeEnv())
      await sut.isBlocked('test@example.com')
      expect(get).toHaveBeenCalledWith('auth:lockout:test@example.com')
    })
  })

  describe('registerFailure', () => {
    it('executa pipeline incr + expire com a chave e o TTL corretos', async () => {
      const { redis, incr, expire } = makeRedis()
      const sut = new SignInLockoutService(redis, makeEnv(5, 60))
      await sut.registerFailure('u@e.com')
      expect(incr).toHaveBeenCalledWith('auth:lockout:u@e.com')
      expect(expire).toHaveBeenCalledWith('auth:lockout:u@e.com', 60)
    })

    it('loga quando algum comando do pipeline retorna erro', async () => {
      const errorSpy = vi
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined)
      const { redis } = makeRedis([[new Error('NOSCRIPT')], [null, 1]])
      const sut = new SignInLockoutService(redis, makeEnv())

      await sut.registerFailure('u@e.com')

      expect(errorSpy).toHaveBeenCalledOnce()
      expect(errorSpy.mock.calls[0][0]).toContain('NOSCRIPT')
      errorSpy.mockRestore()
    })

    it('não loga quando o exec retorna null', async () => {
      const errorSpy = vi
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined)
      const { redis, exec } = makeRedis()
      exec.mockResolvedValue(null)
      const sut = new SignInLockoutService(redis, makeEnv())

      await sut.registerFailure('u@e.com')

      expect(errorSpy).not.toHaveBeenCalled()
      errorSpy.mockRestore()
    })
  })

  describe('clear', () => {
    it('apaga a chave de lockout', async () => {
      const { redis, del } = makeRedis()
      const sut = new SignInLockoutService(redis, makeEnv())
      await sut.clear('u@e.com')
      expect(del).toHaveBeenCalledWith('auth:lockout:u@e.com')
    })
  })
})
