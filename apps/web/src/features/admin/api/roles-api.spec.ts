import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCreateRole, useDeleteRole, useRoles, useUpdateRole } from './roles-api'

import { api } from '@/lib/api-client'
import { createWrapper } from '@/test/render-with-providers'


vi.mock('@/lib/api-client', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

describe('roles-api hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useRoles busca a primeira página com cursor undefined e limit', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { roles: [], nextCursor: null } })

    const { result } = renderHook(() => useRoles(10), { wrapper: createWrapper('/') })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.get).toHaveBeenCalledWith('/api/admin/roles', {
      params: { cursor: undefined, limit: 10 },
    })
    expect(result.current.data?.pages).toEqual([{ roles: [], nextCursor: null }])
  })

  it('useRoles usa limit=20 como default', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { roles: [], nextCursor: null } })

    const { result } = renderHook(() => useRoles(), { wrapper: createWrapper('/') })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.get).toHaveBeenCalledWith('/api/admin/roles', {
      params: { cursor: undefined, limit: 20 },
    })
  })

  it('useRoles pagina passando o nextCursor recebido como cursor', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { roles: [{ id: 'r1' }], nextCursor: 'r1' } })
      .mockResolvedValueOnce({ data: { roles: [{ id: 'r2' }], nextCursor: null } })

    const { result } = renderHook(() => useRoles(20), { wrapper: createWrapper('/') })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.hasNextPage).toBe(true)

    act(() => {
      void result.current.fetchNextPage()
    })

    await waitFor(() => expect(result.current.hasNextPage).toBe(false))
    expect(api.get).toHaveBeenLastCalledWith('/api/admin/roles', {
      params: { cursor: 'r1', limit: 20 },
    })
    expect(result.current.data?.pages).toHaveLength(2)
  })

  it('useCreateRole envia o body e retorna o cargo criado', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { role: { id: 'r1', name: 'Admin' } } })

    const { result } = renderHook(() => useCreateRole(), { wrapper: createWrapper('/') })

    act(() => {
      result.current.mutate({ name: 'Admin', description: 'Administrador', permissions: ['admin:users'] })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.post).toHaveBeenCalledWith('/api/admin/roles', {
      name: 'Admin',
      description: 'Administrador',
      permissions: ['admin:users'],
    })
    expect(result.current.data).toEqual({ id: 'r1', name: 'Admin' })
  })

  it('useUpdateRole faz PATCH no id com o restante do body', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { role: { id: 'r1', name: 'Admin Atualizado' } } })

    const { result } = renderHook(() => useUpdateRole(), { wrapper: createWrapper('/') })

    act(() => {
      result.current.mutate({ id: 'r1', name: 'Admin Atualizado', permissions: ['admin:roles'] })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.patch).toHaveBeenCalledWith('/api/admin/roles/r1', {
      name: 'Admin Atualizado',
      permissions: ['admin:roles'],
    })
    expect(result.current.data).toEqual({ id: 'r1', name: 'Admin Atualizado' })
  })

  it('useDeleteRole chama o endpoint de exclusao', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: {} })

    const { result } = renderHook(() => useDeleteRole(), { wrapper: createWrapper('/') })

    act(() => {
      result.current.mutate('r1')
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.delete).toHaveBeenCalledWith('/api/admin/roles/r1')
  })
})
