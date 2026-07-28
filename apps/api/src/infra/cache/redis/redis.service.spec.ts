import { Logger } from '@nestjs/common'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import type { EnvService } from '@/infra/env/env.service'
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common'

type ErrorListener = (err: Error) => void

// Mock da superclasse ioredis: captura o listener de 'error' e expõe connect/quit.
class FakeRedis {
  status = 'wait'
  connect: Mock = vi.fn().mockResolvedValue(undefined)
  quit: Mock = vi.fn().mockResolvedValue(undefined)
  private listeners = new Map<string, ErrorListener>()

  constructor(
    public url: string,
    public options: unknown,
  ) {}

  on(event: string, listener: ErrorListener): this {
    this.listeners.set(event, listener)
    return this
  }

  emitError(err: Error): void {
    this.listeners.get('error')?.(err)
  }
}

vi.mock('ioredis', () => ({ default: FakeRedis }))

const { RedisService } = await import('./redis.service')

type TestRedis = FakeRedis & OnModuleInit & OnModuleDestroy

function makeEnv(): EnvService {
  return { get: () => 'redis://localhost:6379' } as unknown as EnvService
}

function makeSut(): TestRedis {
  return new RedisService(makeEnv()) as TestRedis
}

describe('RedisService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('configura a conexão com as opções BullMQ-friendly', () => {
    const sut = makeSut()

    expect(sut.url).toBe('redis://localhost:6379')
    expect(sut.options).toEqual({
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: false,
    })
  })

  it('loga o erro apenas uma vez por janela', () => {
    const errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    const sut = makeSut()

    sut.emitError(new Error('boom'))
    sut.emitError(new Error('boom again'))

    expect(errorSpy).toHaveBeenCalledOnce()
    expect(errorSpy).toHaveBeenCalledWith('Redis: boom')

    vi.advanceTimersByTime(5_000)
    sut.emitError(new Error('boom later'))

    expect(errorSpy).toHaveBeenCalledTimes(2)
  })

  it('onModuleInit conecta quando o status é wait', async () => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined)
    const sut = makeSut()
    sut.status = 'wait'

    await sut.onModuleInit()

    expect(sut.connect).toHaveBeenCalledOnce()
  })

  it('onModuleInit não reconecta quando já está pronto', async () => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined)
    const sut = makeSut()
    sut.status = 'ready'

    await sut.onModuleInit()

    expect(sut.connect).not.toHaveBeenCalled()
  })

  it('onModuleDestroy encerra a conexão', async () => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined)
    const sut = makeSut()

    await sut.onModuleDestroy()

    expect(sut.quit).toHaveBeenCalledOnce()
  })
})
