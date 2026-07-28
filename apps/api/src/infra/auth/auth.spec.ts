import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PrismaClient } from '@prisma/client'

const betterAuthMock = vi.fn().mockReturnValue({ api: {} })
const prismaAdapterMock = vi.fn().mockReturnValue({ __adapter: true })
const customSessionMock = vi.fn().mockReturnValue({ __plugin: 'customSession' })

vi.mock('better-auth', () => ({
  betterAuth: (config: unknown): unknown => betterAuthMock(config),
}))

vi.mock('better-auth/adapters/prisma', () => ({
  prismaAdapter: (...args: unknown[]): unknown => prismaAdapterMock(...args),
}))

vi.mock('better-auth/plugins', () => ({
  customSession: (cb: unknown): unknown => customSessionMock(cb),
}))

const { createAuth } = await import('./auth')

function makeEnv() {
  return {
    AUTH_SECRET: 's'.repeat(32),
    AUTH_BASE_URL: 'http://localhost:3333',
    AUTH_TRUSTED_ORIGINS: ['http://localhost:5173'],
    SECURE_COOKIES: true,
    AUTH_RATE_LIMIT_WINDOW: 60,
    AUTH_RATE_LIMIT_MAX: 5,
    MAIL_ENABLED: false,
    PERMISSIONS_CACHE_TTL_SECONDS: 300,
  }
}

function makeRedis() {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
  }
}

function makeCache() {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
  }
}

describe('createAuth', () => {
  beforeEach(() => {
    betterAuthMock.mockClear()
    prismaAdapterMock.mockClear()
    customSessionMock.mockClear()
  })

  it('configura o betterAuth com adapter, segredo e cookies seguros', () => {
    const prisma = {} as PrismaClient

    createAuth(prisma, makeEnv(), makeRedis(), makeCache())

    expect(prismaAdapterMock).toHaveBeenCalledWith(prisma, { provider: 'postgresql' })
    expect(betterAuthMock).toHaveBeenCalledWith(
      expect.objectContaining({
        secret: 's'.repeat(32),
        baseURL: 'http://localhost:3333',
        trustedOrigins: ['http://localhost:5173'],
        emailAndPassword: expect.objectContaining({ minPasswordLength: 12, maxPasswordLength: 128 }),
        advanced: expect.objectContaining({
          defaultCookieAttributes: { httpOnly: true, secure: true, sameSite: 'lax' },
        }),
        rateLimit: {
          enabled: true,
          window: 60,
          max: 5,
          storage: 'secondary-storage',
          customRules: {
            '/get-session': { window: 60, max: 300 },
            '/sign-in/email': { window: 60, max: 10 },
            '/sign-up/email': { window: 60, max: 10 },
          },
        },
      }),
    )
  })

  it('não habilita crossSubDomainCookies quando AUTH_COOKIE_DOMAIN é ausente', () => {
    const prisma = {} as PrismaClient

    createAuth(prisma, makeEnv(), makeRedis(), makeCache())

    const config = betterAuthMock.mock.calls[0][0] as { advanced: Record<string, unknown> }
    expect(config.advanced.crossSubDomainCookies).toBeUndefined()
  })

  it('habilita crossSubDomainCookies com o domínio quando AUTH_COOKIE_DOMAIN é fornecido', () => {
    const prisma = {} as PrismaClient

    createAuth(prisma, { ...makeEnv(), AUTH_COOKIE_DOMAIN: '.example.com' }, makeRedis(), makeCache())

    const config = betterAuthMock.mock.calls[0][0] as { advanced: Record<string, unknown> }
    expect(config.advanced.crossSubDomainCookies).toEqual({
      enabled: true,
      domain: '.example.com',
    })
  })

  it('registra o plugin customSession cujo callback devolve { user, session, permissions }', async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        role: {
          permissions: [{ permission: 'admin:users' }, { permission: 'admin:roles' }],
        },
      },
    ])
    const prisma = {
      userRoleAssignment: { findMany },
    } as unknown as PrismaClient
    const cache = makeCache()

    createAuth(prisma, makeEnv(), makeRedis(), cache)

    expect(customSessionMock).toHaveBeenCalledOnce()
    const callback = customSessionMock.mock.calls[0][0] as (arg: {
      user: { id: string }
      session: unknown
    }) => Promise<unknown>
    const user = { id: 'u1' }
    const session = { id: 's1' }

    await expect(callback({ user, session })).resolves.toEqual({
      user,
      session,
      permissions: ['admin:users', 'admin:roles'],
    })
    expect(cache.get).toHaveBeenCalledWith('permissions:user:u1')
    expect(cache.set).toHaveBeenCalledWith('permissions:user:u1', ['admin:users', 'admin:roles'], {
      ttlSeconds: 300,
    })
  })

  it('customSession devolve permissions do cache sem consultar o banco em hit', async () => {
    const findMany = vi.fn()
    const prisma = {
      userRoleAssignment: { findMany },
    } as unknown as PrismaClient
    const cache = makeCache()
    cache.get.mockResolvedValue(['cached:perm'])

    createAuth(prisma, makeEnv(), makeRedis(), cache)

    const callback = customSessionMock.mock.calls[0][0] as (arg: {
      user: { id: string }
      session: unknown
    }) => Promise<{ permissions: string[] }>

    const result = await callback({ user: { id: 'u1' }, session: { id: 's1' } })

    expect(result.permissions).toEqual(['cached:perm'])
    expect(findMany).not.toHaveBeenCalled()
    expect(cache.set).not.toHaveBeenCalled()
  })

  it('registra o plugin customSession que deduplica permissões repetidas', async () => {
    const prisma = {
      userRoleAssignment: {
        findMany: vi.fn().mockResolvedValue([
          { role: { permissions: [{ permission: 'admin:users' }] } },
          { role: { permissions: [{ permission: 'admin:users' }, { permission: 'admin:roles' }] } },
        ]),
      },
    } as unknown as PrismaClient

    createAuth(prisma, makeEnv(), makeRedis(), makeCache())

    const callback = customSessionMock.mock.calls[0][0] as (arg: {
      user: { id: string }
      session: unknown
    }) => Promise<{ permissions: string[] }>
    const user = { id: 'u1' }
    const session = { id: 's1' }

    const result = await callback({ user, session })
    expect(result.permissions).toEqual(['admin:users', 'admin:roles'])
  })

  it('customSession degrada pro DB quando a LEITURA de cache falha (blip de Redis)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const findMany = vi.fn().mockResolvedValue([
      { role: { permissions: [{ permission: 'admin:users' }] } },
    ])
    const prisma = { userRoleAssignment: { findMany } } as unknown as PrismaClient
    const cache = makeCache()
    cache.get.mockRejectedValue(new Error('redis down'))

    createAuth(prisma, makeEnv(), makeRedis(), cache)

    const callback = customSessionMock.mock.calls[0][0] as (arg: {
      user: { id: string }
      session: unknown
    }) => Promise<{ permissions: string[] }>

    const result = await callback({ user: { id: 'u1' }, session: { id: 's1' } })

    expect(result.permissions).toEqual(['admin:users'])
    expect(findMany).toHaveBeenCalledOnce()
    expect(errorSpy).toHaveBeenCalledOnce()
    errorSpy.mockRestore()
  })

  it('customSession retorna permissions mesmo quando a ESCRITA de cache falha', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const findMany = vi.fn().mockResolvedValue([
      { role: { permissions: [{ permission: 'admin:roles' }] } },
    ])
    const prisma = { userRoleAssignment: { findMany } } as unknown as PrismaClient
    const cache = makeCache()
    cache.set.mockRejectedValue(new Error('redis down'))

    createAuth(prisma, makeEnv(), makeRedis(), cache)

    const callback = customSessionMock.mock.calls[0][0] as (arg: {
      user: { id: string }
      session: unknown
    }) => Promise<{ permissions: string[] }>

    const result = await callback({ user: { id: 'u1' }, session: { id: 's1' } })

    expect(result.permissions).toEqual(['admin:roles'])
    expect(errorSpy).toHaveBeenCalledOnce()
    errorSpy.mockRestore()
  })

  it('customSession loga e propaga erro ao falhar carregando permissions', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const prisma = {
      userRoleAssignment: {
        findMany: vi.fn().mockRejectedValue(new Error('db down')),
      },
    } as unknown as PrismaClient

    createAuth(prisma, makeEnv(), makeRedis(), makeCache())

    const callback = customSessionMock.mock.calls[0][0] as (arg: {
      user: { id: string }
      session: unknown
    }) => Promise<unknown>

    await expect(callback({ user: { id: 'u1' }, session: { id: 's1' } })).rejects.toThrow('db down')
    expect(errorSpy).toHaveBeenCalledOnce()
    errorSpy.mockRestore()
  })

  it('secondaryStorage delega ao redis (get, set com e sem ttl, delete)', async () => {
    const redis = makeRedis()
    createAuth({}, makeEnv(), redis, makeCache())

    const config = betterAuthMock.mock.calls[0][0] as {
      secondaryStorage: {
        get: (k: string) => Promise<unknown>
        set: (k: string, v: string, ttl?: number) => Promise<void>
        delete: (k: string) => Promise<void>
      }
    }

    await config.secondaryStorage.get('k')
    expect(redis.get).toHaveBeenCalledWith('k')

    await config.secondaryStorage.set('k', 'v', 30)
    expect(redis.set).toHaveBeenCalledWith('k', 'v', 'EX', 30)

    await config.secondaryStorage.set('k', 'v')
    expect(redis.set).toHaveBeenLastCalledWith('k', 'v')

    await config.secondaryStorage.delete('k')
    expect(redis.del).toHaveBeenCalledWith('k')
  })
})
