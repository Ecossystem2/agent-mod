import { describe, expect, it, vi } from 'vitest'

import { CustomHttpException } from '../exceptions/custom-http.exception'

import { AuthGuard } from './auth.guard'

import type { AuthService } from '@/infra/auth/auth.service'
import type { ExecutionContext } from '@nestjs/common'
import type { Reflector } from '@nestjs/core'

function makeContext(req: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext
}

describe('AuthGuard', () => {
  it('libera rotas públicas sem checar sessão', async () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(true) } as unknown as Reflector
    const getSession = vi.fn()
    const auth = { getSession } as unknown as AuthService
    const sut = new AuthGuard(reflector, auth)

    await expect(sut.canActivate(makeContext({ headers: {} }))).resolves.toBe(true)
    expect(getSession).not.toHaveBeenCalled()
  })

  it('lança unauthorized quando não há sessão', async () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) } as unknown as Reflector
    const auth = { getSession: vi.fn().mockResolvedValue(null) } as unknown as AuthService
    const sut = new AuthGuard(reflector, auth)

    await expect(sut.canActivate(makeContext({ headers: {} }))).rejects.toBeInstanceOf(
      CustomHttpException,
    )
  })

  it('popula req.user e libera quando há sessão', async () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) } as unknown as Reflector
    const user = { id: 'u1', email: 'a@b.com' }
    const auth = {
      getSession: vi.fn().mockResolvedValue({ user }),
    } as unknown as AuthService
    const sut = new AuthGuard(reflector, auth)
    const req: Record<string, unknown> = { headers: { authorization: 'Bearer x' } }

    await expect(sut.canActivate(makeContext(req))).resolves.toBe(true)
    expect(req.user).toMatchObject({ id: 'u1', email: 'a@b.com', permissions: [] })
  })

  it('mescla permissions do customSession no req.user', async () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) } as unknown as Reflector
    const user = { id: 'u1', email: 'a@b.com' }
    const auth = {
      getSession: vi.fn().mockResolvedValue({ user, permissions: ['admin:users', 'admin:roles'] }),
    } as unknown as AuthService
    const sut = new AuthGuard(reflector, auth)
    const req: Record<string, unknown> = { headers: {} }

    await sut.canActivate(makeContext(req))

    expect((req.user as Record<string, unknown>).permissions).toEqual(['admin:users', 'admin:roles'])
  })

  it('define permissions como array vazio quando sessão não tem permissions', async () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) } as unknown as Reflector
    const user = { id: 'u1', email: 'a@b.com' }
    const auth = {
      getSession: vi.fn().mockResolvedValue({ user }),
    } as unknown as AuthService
    const sut = new AuthGuard(reflector, auth)
    const req: Record<string, unknown> = { headers: {} }

    await sut.canActivate(makeContext(req))

    expect((req.user as Record<string, unknown>).permissions).toEqual([])
  })

  it('junta header em array antes de montar a sessão', async () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) } as unknown as Reflector
    const getSession = vi.fn().mockResolvedValue({ user: { id: 'u1' } })
    const auth = { getSession } as unknown as AuthService
    const sut = new AuthGuard(reflector, auth)
    const req = { headers: { cookie: ['a=1', 'b=2'], 'x-skip': undefined } }

    await sut.canActivate(makeContext(req))

    const headers = getSession.mock.calls[0][0] as Headers
    expect(headers.get('cookie')).toBe('a=1, b=2')
    expect(headers.has('x-skip')).toBe(false)
  })
})
