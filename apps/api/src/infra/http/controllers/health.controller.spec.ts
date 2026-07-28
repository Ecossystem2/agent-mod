import { ServiceUnavailableException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { HealthController } from './health.controller'

import type { INestApplication } from '@nestjs/common'

import { RedisService } from '@/infra/cache/redis/redis.service'
import { PrismaService } from '@/infra/database/prisma/prisma.service'

describe(HealthController.name, () => {
  let app: INestApplication
  let sut: HealthController

  const prisma = { $queryRaw: vi.fn() }
  const redis = { ping: vi.fn() }

  beforeEach(async () => {
    vi.clearAllMocks()
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile()

    sut = module.get(HealthController)
    app = module.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('GET /health', () => {
    it('retorna 200 com { ok: true } quando postgres e redis estão saudáveis', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }])
      redis.ping.mockResolvedValue('PONG')

      const res = await request(app.getHttpServer()).get('/health')

      expect(res.status).toBe(200)
      expect(res.body).toEqual({ ok: true })
    })

    it('retorna 503 com details quando postgres está fora', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('connection refused'))
      redis.ping.mockResolvedValue('PONG')

      const res = await request(app.getHttpServer()).get('/health')

      expect(res.status).toBe(503)
      expect(res.body.ok).toBe(false)
      expect(res.body.details.postgres).toBe(false)
      expect(res.body.details.redis).toBe(true)
    })

    it('retorna 503 com details quando redis está fora', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }])
      redis.ping.mockRejectedValue(new Error('ECONNREFUSED'))

      const res = await request(app.getHttpServer()).get('/health')

      expect(res.status).toBe(503)
      expect(res.body.ok).toBe(false)
      expect(res.body.details.postgres).toBe(true)
      expect(res.body.details.redis).toBe(false)
    })

    it('retorna 503 com details quando ambos estão fora', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('connection refused'))
      redis.ping.mockRejectedValue(new Error('ECONNREFUSED'))

      const res = await request(app.getHttpServer()).get('/health')

      expect(res.status).toBe(503)
      expect(res.body.ok).toBe(false)
      expect(res.body.details.postgres).toBe(false)
      expect(res.body.details.redis).toBe(false)
    })
  })

  describe('check() — unit', () => {
    it('retorna { ok: true } quando ambos os checks passam', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }])
      redis.ping.mockResolvedValue('PONG')

      const result = await sut.check()

      expect(result).toEqual({ ok: true })
    })

    it('lança ServiceUnavailableException quando postgres timeout', async () => {
      vi.useFakeTimers()
      prisma.$queryRaw.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10_000)),
      )
      redis.ping.mockResolvedValue('PONG')

      const promise = sut.check()
      vi.advanceTimersByTime(3_001)

      await expect(promise).rejects.toBeInstanceOf(ServiceUnavailableException)
      vi.useRealTimers()
    })

    it('lança ServiceUnavailableException quando redis timeout', async () => {
      vi.useFakeTimers()
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }])
      redis.ping.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10_000)),
      )

      const promise = sut.check()
      vi.advanceTimersByTime(3_001)

      await expect(promise).rejects.toBeInstanceOf(ServiceUnavailableException)
      vi.useRealTimers()
    })
  })
})
