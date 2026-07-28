import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  useCreateAdminUser,
  useDeactivateUser,
  useDeleteUser,
  useReactivateUser,
  useSetUserPassword,
  useUpdateUser,
  useUsers,
} from './users-api'

import { api } from '@/lib/api-client'
import { createWrapper } from '@/test/render-with-providers'


vi.mock('@/lib/api-client', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

describe('users-api hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useUsers busca a primeira página com cursor undefined e limit', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { users: [], nextCursor: null } })

    const { result } = renderHook(() => useUsers(10), { wrapper: createWrapper('/') })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.get).toHaveBeenCalledWith('/api/admin/users', {
      params: { cursor: undefined, limit: 10 },
    })
    expect(result.current.data?.pages).toEqual([{ users: [], nextCursor: null }])
  })

  it('useUsers usa limit=20 como default e expõe hasNextPage quando há nextCursor', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { users: [{ id: 'u1' }], nextCursor: 'u1' },
    })

    const { result } = renderHook(() => useUsers(), { wrapper: createWrapper('/') })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.get).toHaveBeenCalledWith('/api/admin/users', {
      params: { cursor: undefined, limit: 20 },
    })
    expect(result.current.hasNextPage).toBe(true)
  })

  it('useUsers pagina passando o nextCursor recebido como cursor', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { users: [{ id: 'u1' }], nextCursor: 'u1' } })
      .mockResolvedValueOnce({ data: { users: [{ id: 'u2' }], nextCursor: null } })

    const { result } = renderHook(() => useUsers(20), { wrapper: createWrapper('/') })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    act(() => {
      void result.current.fetchNextPage()
    })

    await waitFor(() => expect(result.current.hasNextPage).toBe(false))
    expect(api.get).toHaveBeenLastCalledWith('/api/admin/users', {
      params: { cursor: 'u1', limit: 20 },
    })
    expect(result.current.data?.pages).toHaveLength(2)
  })

  it('useUsers expõe isError quando api.get rejeita (sem engolir o erro)', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('network down'))

    const { result } = renderHook(() => useUsers(10), { wrapper: createWrapper('/') })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error!.message).toBe('network down')
    expect(result.current.data).toBeUndefined()
  })

  it('useCreateAdminUser envia o body e retorna o usuário criado', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { user: { id: 'u1', name: 'X' } } })

    const { result } = renderHook(() => useCreateAdminUser(), { wrapper: createWrapper('/') })

    act(() => {
      result.current.mutate({ name: 'X', email: 'x@y.com', password: 'senha-bem-longa-12' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.post).toHaveBeenCalledWith('/api/admin/users', {
      name: 'X',
      email: 'x@y.com',
      password: 'senha-bem-longa-12',
    })
    expect(result.current.data).toEqual({ id: 'u1', name: 'X' })
  })

  it('useUpdateUser faz PATCH no id com o restante do body', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { user: { id: 'u1' } } })

    const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper('/') })

    act(() => {
      result.current.mutate({ id: 'u1', name: 'Novo', roleIds: ['r1'] })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.patch).toHaveBeenCalledWith('/api/admin/users/u1', { name: 'Novo', roleIds: ['r1'] })
  })

  it('useDeactivateUser e useReactivateUser chamam os endpoints corretos', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} })

    const deactivate = renderHook(() => useDeactivateUser(), { wrapper: createWrapper('/') })
    act(() => {
      deactivate.result.current.mutate('u1')
    })
    await waitFor(() => expect(deactivate.result.current.isSuccess).toBe(true))
    expect(api.patch).toHaveBeenCalledWith('/api/admin/users/u1/deactivate')

    const reactivate = renderHook(() => useReactivateUser(), { wrapper: createWrapper('/') })
    act(() => {
      reactivate.result.current.mutate('u1')
    })
    await waitFor(() => expect(reactivate.result.current.isSuccess).toBe(true))
    expect(api.patch).toHaveBeenCalledWith('/api/admin/users/u1/reactivate')
  })

  it('useSetUserPassword envia a nova senha', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} })

    const { result } = renderHook(() => useSetUserPassword(), { wrapper: createWrapper('/') })

    act(() => {
      result.current.mutate({ userId: 'u1', newPassword: 'nova-senha-longa-123' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.patch).toHaveBeenCalledWith('/api/admin/users/u1/password', {
      newPassword: 'nova-senha-longa-123',
    })
  })

  it('useDeleteUser chama o endpoint de exclusão', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: {} })

    const { result } = renderHook(() => useDeleteUser(), { wrapper: createWrapper('/') })

    act(() => {
      result.current.mutate('u1')
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.delete).toHaveBeenCalledWith('/api/admin/users/u1')
  })
})
