import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createDeactivatedUserMiddleware } from './deactivated-user.middleware'

import type { PrismaService } from '@/infra/database/prisma/prisma.service'
import type { Request, Response } from 'express'

function makeReq(body: unknown = {}): Request {
  return { body } as Request
}

function makeRes(): Response {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  } as unknown as Response
  ;(res.status as ReturnType<typeof vi.fn>).mockReturnValue(res)
  return res
}

describe('createDeactivatedUserMiddleware', () => {
  let next: ReturnType<typeof vi.fn>

  beforeEach(() => {
    next = vi.fn()
  })

  it('chama next() quando não há email no body', async () => {
    const findUnique = vi.fn().mockResolvedValue(null)
    const prisma = { user: { findUnique } } as unknown as PrismaService
    const middleware = createDeactivatedUserMiddleware(prisma)

    await middleware(makeReq({}), makeRes(), next)

    expect(next).toHaveBeenCalledOnce()
    expect(findUnique).not.toHaveBeenCalled()
  })

  it('chama next() quando usuário está ativo', async () => {
    const findUnique = vi.fn().mockResolvedValue({ isActive: true })
    const prisma = { user: { findUnique } } as unknown as PrismaService
    const middleware = createDeactivatedUserMiddleware(prisma)

    await middleware(makeReq({ email: 'active@example.com' }), makeRes(), next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('retorna 403 com account_disabled quando usuário está inativo', async () => {
    const findUnique = vi.fn().mockResolvedValue({ isActive: false })
    const prisma = { user: { findUnique } } as unknown as PrismaService
    const middleware = createDeactivatedUserMiddleware(prisma)
    const statusMock = vi.fn()
    const jsonMock = vi.fn()
    statusMock.mockReturnValue({ status: statusMock, json: jsonMock })
    const res = { status: statusMock, json: jsonMock } as unknown as Response

    await middleware(makeReq({ email: 'inactive@example.com' }), res, next)

    expect(statusMock).toHaveBeenCalledWith(403)
    expect(jsonMock).toHaveBeenCalledWith({ error: 'account_disabled' })
    expect(next).not.toHaveBeenCalled()
  })

  it('chama next() quando usuário não existe no banco', async () => {
    const findUnique = vi.fn().mockResolvedValue(null)
    const prisma = { user: { findUnique } } as unknown as PrismaService
    const middleware = createDeactivatedUserMiddleware(prisma)

    await middleware(makeReq({ email: 'unknown@example.com' }), makeRes(), next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('normaliza o email (lowercase + trim) antes de consultar o banco', async () => {
    const findUnique = vi.fn().mockResolvedValue({ isActive: true })
    const prisma = { user: { findUnique } } as unknown as PrismaService
    const middleware = createDeactivatedUserMiddleware(prisma)

    await middleware(makeReq({ email: '  Active@Example.COM  ' }), makeRes(), next)

    expect(findUnique).toHaveBeenCalledWith({
      where: { email: 'active@example.com' },
      select: { isActive: true },
    })
    expect(next).toHaveBeenCalledOnce()
  })

  it('chama next() quando body é string JSON válido', async () => {
    const findUnique = vi.fn().mockResolvedValue({ isActive: true })
    const prisma = { user: { findUnique } } as unknown as PrismaService
    const middleware = createDeactivatedUserMiddleware(prisma)

    await middleware(makeReq(JSON.stringify({ email: 'active@example.com' })), makeRes(), next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('chama next() quando body é Buffer JSON válido', async () => {
    const findUnique = vi.fn().mockResolvedValue({ isActive: true })
    const prisma = { user: { findUnique } } as unknown as PrismaService
    const middleware = createDeactivatedUserMiddleware(prisma)
    const bufferBody = Buffer.from(JSON.stringify({ email: 'active@example.com' }))

    await middleware(makeReq(bufferBody), makeRes(), next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('retorna 400 e não prossegue quando o parse do body falha (JSON inválido)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const findUnique = vi.fn().mockResolvedValue(null)
    const prisma = { user: { findUnique } } as unknown as PrismaService
    const middleware = createDeactivatedUserMiddleware(prisma)
    const statusMock = vi.fn()
    const jsonMock = vi.fn()
    statusMock.mockReturnValue({ status: statusMock, json: jsonMock })
    const res = { status: statusMock, json: jsonMock } as unknown as Response

    await middleware(makeReq('not-valid-json'), res, next)

    expect(statusMock).toHaveBeenCalledWith(400)
    expect(jsonMock).toHaveBeenCalledWith({ error: 'invalid_request_body' })
    expect(next).not.toHaveBeenCalled()
    expect(findUnique).not.toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalledOnce()
    errorSpy.mockRestore()
  })

  it('chama next() quando body é null', async () => {
    const findUnique = vi.fn().mockResolvedValue(null)
    const prisma = { user: { findUnique } } as unknown as PrismaService
    const middleware = createDeactivatedUserMiddleware(prisma)

    await middleware(makeReq(null), makeRes(), next)

    expect(next).toHaveBeenCalledOnce()
  })
})
