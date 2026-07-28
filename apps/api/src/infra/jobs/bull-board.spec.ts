import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import type { INestApplication } from '@nestjs/common'

const createBullBoardMock = vi.fn()
const setBasePathMock = vi.fn()
const getRouterMock = vi.fn().mockReturnValue('router-fn')
const bullMQAdapterMock = vi.fn()

vi.mock('@bull-board/api', () => ({
  createBullBoard: (...args: unknown[]): void => {
    createBullBoardMock(...args)
  },
}))

vi.mock('@bull-board/api/bullMQAdapter', () => ({
  BullMQAdapter: class {
    constructor(queue: unknown) {
      bullMQAdapterMock(queue)
    }
  },
}))

vi.mock('@bull-board/express', () => ({
  ExpressAdapter: class {
    setBasePath = setBasePathMock
    getRouter = getRouterMock
  },
}))

// QUEUE_NAMES é {} no template (early-return). Para alcançar o bloco de montagem,
// stubbamos um nome de fila — comprova que a montagem funciona quando há filas.
const queueNamesStub: Record<string, string> = {}

vi.mock('@/infra/queue/queue.tokens', () => ({
  get QUEUE_NAMES() {
    return queueNamesStub
  },
  queueToken: (name: string) => Symbol.for(`Queue:${name}`),
}))

const { mountBullBoard } = await import('./bull-board')

function makeApp(): { app: INestApplication; get: Mock; use: Mock } {
  const use = vi.fn()
  const get = vi.fn().mockReturnValue({ name: 'fake-queue' })
  const app = {
    get,
    getHttpAdapter: () => ({ getInstance: () => ({ use }) }),
  } as unknown as INestApplication
  return { app, get, use }
}

describe('mountBullBoard', () => {
  beforeEach(() => {
    createBullBoardMock.mockReset()
    setBasePathMock.mockReset()
    getRouterMock.mockReset().mockReturnValue('router-fn')
    bullMQAdapterMock.mockReset()
    for (const key of Object.keys(queueNamesStub)) delete queueNamesStub[key]
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const creds = { user: 'admin', pass: 'supersecretpass1' }

  it('lança erro quando credenciais de Basic Auth não são fornecidas', () => {
    const { app } = makeApp()

    expect(() => {
      mountBullBoard(app, '/admin/queues')
    }).toThrow('Bull Board requires Basic Auth credentials to mount')
    expect(createBullBoardMock).not.toHaveBeenCalled()
  })

  it('retorna cedo quando não há filas registradas', () => {
    const { app } = makeApp()

    mountBullBoard(app, '/admin/queues', creds)

    expect(createBullBoardMock).not.toHaveBeenCalled()
  })

  it('monta o board e registra a rota com Basic Auth quando há filas', () => {
    queueNamesStub.emails = 'emails'
    const { app, get, use } = makeApp()

    mountBullBoard(app, '/admin/queues', creds)

    expect(get).toHaveBeenCalledWith(Symbol.for('Queue:emails'), { strict: false })
    expect(setBasePathMock).toHaveBeenCalledWith('/admin/queues')
    expect(bullMQAdapterMock).toHaveBeenCalledOnce()
    expect(createBullBoardMock).toHaveBeenCalledOnce()
    expect(use).toHaveBeenCalledWith('/admin/queues', expect.any(Function), 'router-fn')
  })

  it('insere middleware Basic Auth quando credenciais são fornecidas', () => {
    queueNamesStub.emails = 'emails'
    const { app, use } = makeApp()

    mountBullBoard(app, '/admin/queues', { user: 'admin', pass: 'supersecretpass1' })

    expect(use).toHaveBeenCalledWith('/admin/queues', expect.any(Function), 'router-fn')
  })

  it('middleware Basic Auth retorna 401 sem header Authorization', () => {
    queueNamesStub.emails = 'emails'
    const { app, use } = makeApp()

    mountBullBoard(app, '/admin/queues', { user: 'admin', pass: 'supersecretpass1' })

    const middleware = (use.mock.calls[0] as unknown[])[1] as (
      req: unknown,
      res: { setHeader: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn> },
      next: ReturnType<typeof vi.fn>,
    ) => void
    const res = { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), send: vi.fn() }
    const next = vi.fn()

    middleware({ headers: {} }, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('middleware Basic Auth chama next com credenciais corretas', () => {
    queueNamesStub.emails = 'emails'
    const { app, use } = makeApp()

    mountBullBoard(app, '/admin/queues', { user: 'admin', pass: 'supersecretpass1' })

    const middleware = (use.mock.calls[0] as unknown[])[1] as (
      req: unknown,
      res: unknown,
      next: ReturnType<typeof vi.fn>,
    ) => void
    const next = vi.fn()
    const encoded = Buffer.from('admin:supersecretpass1').toString('base64')

    middleware({ headers: { authorization: `Basic ${encoded}` } }, {}, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('middleware Basic Auth retorna 401 com usuário errado de mesmo tamanho', () => {
    queueNamesStub.emails = 'emails'
    const { app, use } = makeApp()

    mountBullBoard(app, '/admin/queues', { user: 'admin', pass: 'supersecretpass1' })

    const middleware = (use.mock.calls[0] as unknown[])[1] as (
      req: unknown,
      res: { setHeader: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn> },
      next: ReturnType<typeof vi.fn>,
    ) => void
    const res = { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), send: vi.fn() }
    const next = vi.fn()
    const encoded = Buffer.from('admon:supersecretpass1').toString('base64')

    middleware({ headers: { authorization: `Basic ${encoded}` } }, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('middleware Basic Auth retorna 401 com credenciais erradas', () => {
    queueNamesStub.emails = 'emails'
    const { app, use } = makeApp()

    mountBullBoard(app, '/admin/queues', { user: 'admin', pass: 'supersecretpass1' })

    const middleware = (use.mock.calls[0] as unknown[])[1] as (
      req: unknown,
      res: { setHeader: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn> },
      next: ReturnType<typeof vi.fn>,
    ) => void
    const res = { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), send: vi.fn() }
    const next = vi.fn()
    const encoded = Buffer.from('admin:wrongpassword').toString('base64')

    middleware({ headers: { authorization: `Basic ${encoded}` } }, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })
})
