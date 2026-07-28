import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { createSignInLockoutMiddleware } from './sign-in-lockout.middleware'

import type { SignInLockoutService } from './sign-in-lockout.service'
import type { Request, Response } from 'express'

function makeReq(body: unknown = {}): Request {
  return { body } as Request
}

function makeRes(): { res: Response; status: Mock; json: Mock; once: Mock; setStatus: (c: number) => void } {
  let statusCode = 200
  const status = vi.fn()
  const json = vi.fn()
  const once = vi.fn()
  const res = {
    status,
    json,
    once,
    get statusCode() {
      return statusCode
    },
  } as unknown as Response
  status.mockReturnValue(res)
  return { res, status, json, once, setStatus: (c) => (statusCode = c) }
}

function makeLockout(blocked = false): {
  lockout: SignInLockoutService
  isBlocked: Mock
  registerFailure: Mock
  clear: Mock
} {
  const isBlocked = vi.fn().mockResolvedValue(blocked)
  const registerFailure = vi.fn().mockResolvedValue(undefined)
  const clear = vi.fn().mockResolvedValue(undefined)
  return {
    lockout: { isBlocked, registerFailure, clear } as unknown as SignInLockoutService,
    isBlocked,
    registerFailure,
    clear,
  }
}

describe('createSignInLockoutMiddleware', () => {
  let next: Mock

  beforeEach(() => {
    next = vi.fn()
  })

  it('chama next() quando não há email no body', async () => {
    const { lockout, isBlocked } = makeLockout()
    const { res } = makeRes()

    await createSignInLockoutMiddleware(lockout)(makeReq({}), res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(isBlocked).not.toHaveBeenCalled()
  })

  it('retorna 400 quando o parse do body falha', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { lockout } = makeLockout()
    const { res, status, json } = makeRes()

    await createSignInLockoutMiddleware(lockout)(makeReq('not-json'), res, next)

    expect(status).toHaveBeenCalledWith(400)
    expect(json).toHaveBeenCalledWith({ error: 'invalid_request_body' })
    expect(next).not.toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalledOnce()
    errorSpy.mockRestore()
  })

  it('retorna 429 sem chamar next() quando o email está bloqueado', async () => {
    const { lockout } = makeLockout(true)
    const { res, status, json } = makeRes()

    await createSignInLockoutMiddleware(lockout)(makeReq({ email: 'u@e.com' }), res, next)

    expect(status).toHaveBeenCalledWith(429)
    expect(json).toHaveBeenCalledWith({ error: 'too_many_attempts' })
    expect(next).not.toHaveBeenCalled()
  })

  it('normaliza o email antes de checar bloqueio', async () => {
    const { lockout, isBlocked } = makeLockout()
    const { res } = makeRes()

    await createSignInLockoutMiddleware(lockout)(makeReq({ email: '  U@E.COM ' }), res, next)

    expect(isBlocked).toHaveBeenCalledWith('u@e.com')
    expect(next).toHaveBeenCalledOnce()
  })

  it('limpa o lockout quando a resposta é 2xx', async () => {
    const { lockout, clear, registerFailure } = makeLockout()
    const { res, once, setStatus } = makeRes()

    await createSignInLockoutMiddleware(lockout)(makeReq({ email: 'u@e.com' }), res, next)

    expect(next).toHaveBeenCalledOnce()
    const settle = once.mock.calls[0][1] as () => void
    setStatus(200)
    settle()

    expect(clear).toHaveBeenCalledWith('u@e.com')
    expect(registerFailure).not.toHaveBeenCalled()
  })

  it('registra falha somente quando a resposta é 401 (credencial inválida)', async () => {
    const { lockout, clear, registerFailure } = makeLockout()
    const { res, once, setStatus } = makeRes()

    await createSignInLockoutMiddleware(lockout)(makeReq({ email: 'u@e.com' }), res, next)

    const settle = once.mock.calls[0][1] as () => void
    setStatus(401)
    settle()

    expect(registerFailure).toHaveBeenCalledWith('u@e.com')
    expect(clear).not.toHaveBeenCalled()
  })

  it.each([400, 422, 429, 500])(
    'NÃO registra falha em %d (evita DoS de conta e realimentação do 429)',
    async (statusCode) => {
      const { lockout, clear, registerFailure } = makeLockout()
      const { res, once, setStatus } = makeRes()

      await createSignInLockoutMiddleware(lockout)(makeReq({ email: 'u@e.com' }), res, next)

      const settle = once.mock.calls[0][1] as () => void
      setStatus(statusCode)
      settle()

      expect(registerFailure).not.toHaveBeenCalled()
      expect(clear).not.toHaveBeenCalled()
    },
  )

  it('chama next() quando o body é null', async () => {
    const { lockout, isBlocked } = makeLockout()
    const { res } = makeRes()

    await createSignInLockoutMiddleware(lockout)(makeReq(null), res, next)

    expect(isBlocked).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledOnce()
  })

  it('aceita body como Buffer JSON', async () => {
    const { lockout, isBlocked } = makeLockout()
    const { res } = makeRes()
    const body = Buffer.from(JSON.stringify({ email: 'buf@e.com' }))

    await createSignInLockoutMiddleware(lockout)(makeReq(body), res, next)

    expect(isBlocked).toHaveBeenCalledWith('buf@e.com')
    expect(next).toHaveBeenCalledOnce()
  })
})
