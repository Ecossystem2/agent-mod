import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api-client', () => ({ api: { get: vi.fn() } }))

import { api } from '@/lib/api-client'
import { privateLoader, requirePermission } from '@/router'

const mockGet = vi.mocked(api.get)

async function caught(p: Promise<unknown>): Promise<Response> {
  return p.then(
    () => {
      throw new Error('esperava um redirect')
    },
    (e: unknown) => {
      if (!(e instanceof Response)) throw new Error('esperava um Response de redirect')
      return e
    },
  )
}

describe('privateLoader', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  it('retorna o user quando a sessão é válida', async () => {
    mockGet.mockResolvedValue({ data: { user: { id: 'u1' } } })

    await expect(privateLoader()).resolves.toEqual({ id: 'u1' })
  })

  it('redireciona pro sign-in com next quando não há user', async () => {
    mockGet.mockResolvedValue({ data: { user: null } })

    const res = await caught(privateLoader())
    expect(res).toBeInstanceOf(Response)
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toContain('/sign-in?next=')
  })

  it('redireciona pro sign-in quando a requisição falha', async () => {
    mockGet.mockRejectedValue(new Error('network'))

    const res = await caught(privateLoader())
    expect(res.headers.get('Location')).toBe('/sign-in')
  })
})

describe('requirePermission', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  it('retorna null quando o user tem a permissão', async () => {
    mockGet.mockResolvedValue({ data: { user: { id: 'u1' }, permissions: ['admin:roles'] } })

    await expect(requirePermission('admin:roles')).resolves.toBeNull()
  })

  it('redireciona pro sign-in quando não há user', async () => {
    mockGet.mockResolvedValue({ data: { user: null } })

    const res = await caught(requirePermission('admin:roles'))
    expect(res.headers.get('Location')).toBe('/sign-in')
  })

  it('redireciona pro /app quando falta a permissão', async () => {
    mockGet.mockResolvedValue({ data: { user: { id: 'u1' }, permissions: ['view:dashboard'] } })

    const res = await caught(requirePermission('admin:roles'))
    expect(res.headers.get('Location')).toBe('/app')
  })

  it('redireciona pro /app quando a sessão não traz permissões', async () => {
    mockGet.mockResolvedValue({ data: { user: { id: 'u1' } } })

    const res = await caught(requirePermission('admin:roles'))
    expect(res.headers.get('Location')).toBe('/app')
  })

  it('redireciona pro sign-in quando a requisição falha', async () => {
    mockGet.mockRejectedValue(new Error('network'))

    const res = await caught(requirePermission('admin:roles'))
    expect(res.headers.get('Location')).toBe('/sign-in')
  })
})
