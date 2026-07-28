import { Logger } from '@nestjs/common'
import { of, throwError } from 'rxjs'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SecurityAuditInterceptor } from './security-audit.interceptor'

import type { CallHandler, ExecutionContext } from '@nestjs/common'
import type { Reflector } from '@nestjs/core'

function makeContext(req: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext
}

function makeReflector(required: unknown): Reflector {
  return { getAllAndOverride: vi.fn().mockReturnValue(required) } as unknown as Reflector
}

describe('SecurityAuditInterceptor', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('passa direto quando não há permissões requeridas', () => {
    const sut = new SecurityAuditInterceptor(makeReflector(undefined))
    const handle = vi.fn().mockReturnValue(of('payload'))
    const next = { handle } as unknown as CallHandler

    const result = sut.intercept(makeContext({}), next)

    expect(result).toBeDefined()
    expect(handle).toHaveBeenCalledOnce()
  })

  it('audita sucesso usando authUserId quando não há actorUserId', () =>
    new Promise<void>((resolve) => {
      const logSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined)
      const sut = new SecurityAuditInterceptor(makeReflector(['billing:write']))
      const req = {
        method: 'POST',
        originalUrl: '/refund',
        user: { id: 'u1' },
      }
      const next = { handle: () => of('ok') } as unknown as CallHandler

      sut.intercept(makeContext(req), next).subscribe(() => {
        expect(logSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            outcome: 'ok',
            authUserId: 'u1',
            actorUserId: 'u1',
            requiredPerms: ['billing:write'],
          }),
        )
        resolve()
      })
    }))

  it('usa actorUserId distinto quando presente', () =>
    new Promise<void>((resolve) => {
      const logSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined)
      const sut = new SecurityAuditInterceptor(makeReflector(['admin:any']))
      const req = {
        method: 'GET',
        originalUrl: '/x',
        user: { id: 'auth-1' },
        actorUserId: 'actor-9',
      }
      const next = { handle: () => of('ok') } as unknown as CallHandler

      sut.intercept(makeContext(req), next).subscribe(() => {
        expect(logSpy).toHaveBeenCalledWith(
          expect.objectContaining({ authUserId: 'auth-1', actorUserId: 'actor-9' }),
        )
        resolve()
      })
    }))

  it('audita erro com a mensagem da exceção', () =>
    new Promise<void>((resolve) => {
      const logSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined)
      const sut = new SecurityAuditInterceptor(makeReflector(['billing:write']))
      const req = { method: 'POST', originalUrl: '/refund', user: { id: 'u1' } }
      const next = {
        handle: () => throwError(() => new Error('boom')),
      } as unknown as CallHandler

      sut.intercept(makeContext(req), next).subscribe({
        error: () => {
          expect(logSpy).toHaveBeenCalledWith(
            expect.objectContaining({ outcome: 'error', errMessage: 'boom' }),
          )
          resolve()
        },
      })
    }))
})
