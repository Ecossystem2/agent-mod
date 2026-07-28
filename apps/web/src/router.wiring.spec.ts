import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api-client', () => ({ api: { get: vi.fn() } }))

import { api } from '@/lib/api-client'
import { router } from '@/router'

const mockGet = vi.mocked(api.get)

interface RouteNode {
  lazy?: () => Promise<{ Component?: unknown }>
  loader?: (args: unknown) => unknown
  children?: RouteNode[]
}

function collect(
  routes: RouteNode[],
  acc: { lazy: NonNullable<RouteNode['lazy']>[]; loader: NonNullable<RouteNode['loader']>[] } = {
    lazy: [],
    loader: [],
  },
) {
  for (const route of routes) {
    if (route.lazy) acc.lazy.push(route.lazy)
    if (route.loader) acc.loader.push(route.loader)
    if (route.children) collect(route.children, acc)
  }
  return acc
}

describe('router wiring', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  it('monta a árvore de rotas do createBrowserRouter', () => {
    expect(router.routes.length).toBeGreaterThan(0)
  })

  it('resolve o Component de cada rota lazy', async () => {
    const { lazy } = collect(router.routes as RouteNode[])
    expect(lazy).toHaveLength(5)

    for (const load of lazy) {
      const mod = await load()
      expect(mod.Component).toBeDefined()
    }
  })

  it('invoca os loaders de rota (privateLoader + requirePermission)', async () => {
    mockGet.mockResolvedValue({
      data: { user: { id: 'u1' }, permissions: ['admin:roles', 'admin:users'] },
    })
    const { loader } = collect(router.routes as RouteNode[])
    expect(loader).toHaveLength(3)

    for (const load of loader) {
      await load({})
    }

    expect(mockGet).toHaveBeenCalled()
  })
})
