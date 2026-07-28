import { AxiosError } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/env', () => ({ env: { VITE_API_BASE_URL: 'http://localhost:3333' } }))

import { onResponseError } from './api-client'
import { ApiError } from './api-error'

describe('api (baseURL)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('usa baseURL vazia em modo DEV (proxy Vite)', async () => {
    // DEV já é true em vitest por padrão; apenas confirmamos o módulo atual
    const { api } = await import('./api-client')
    expect((api.defaults as { baseURL?: string }).baseURL).toBe('')
  })

  it('usa VITE_API_BASE_URL em modo produção (DEV=false)', async () => {
    vi.stubEnv('DEV', false)
    vi.resetModules()
    vi.doMock('@/env', () => ({ env: { VITE_API_BASE_URL: 'http://localhost:3333' } }))
    const { api } = await import('./api-client')
    expect((api.defaults as { baseURL?: string }).baseURL).toBe('http://localhost:3333')
  })

  it('o interceptor de sucesso retorna a resposta sem modificação', async () => {
    const { api } = await import('./api-client')
    // Acessa o handler de sucesso registrado no interceptor (índice 0)
    const manager = api.interceptors.response as unknown as {
      handlers: ({ fulfilled: (res: unknown) => unknown } | null)[]
    }
    const successFn = manager.handlers[0]?.fulfilled
    const fakeResponse = { status: 200, data: { ok: true } }
    expect(successFn?.(fakeResponse)).toBe(fakeResponse)
  })
})

function makeAxiosError(status: number): AxiosError {
  return new AxiosError(
    'request failed',
    'ERR_BAD_RESPONSE',
    undefined,
    undefined,
    { status, data: {}, statusText: '', headers: {}, config: {} } as never,
  )
}

const assign = vi.fn()
const originalLocation = window.location

function stubLocation(pathname: string, search = ''): void {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { pathname, search, assign },
  })
}

describe('onResponseError', () => {
  beforeEach(() => {
    assign.mockReset()
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })

  it('redireciona pro sign-in com next em 401 fora do sign-in', async () => {
    stubLocation('/app/admin/users', '?page=2')
    const err = makeAxiosError(401)

    await expect(onResponseError(err)).rejects.toBeInstanceOf(ApiError)
    expect(assign).toHaveBeenCalledWith('/sign-in?next=%2Fapp%2Fadmin%2Fusers%3Fpage%3D2')
  })

  it('não redireciona em 401 quando já está no sign-in', async () => {
    stubLocation('/sign-in', '')
    const err = makeAxiosError(401)

    await expect(onResponseError(err)).rejects.toBeInstanceOf(ApiError)
    expect(assign).not.toHaveBeenCalled()
  })

  it('não redireciona em erro não-401', async () => {
    stubLocation('/app', '')
    const err = makeAxiosError(500)

    await expect(onResponseError(err)).rejects.toBeInstanceOf(ApiError)
    expect(assign).not.toHaveBeenCalled()
  })
})
