import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import type { AdminUser } from '@/features/admin/types'

import { api } from '@/lib/api-client'


interface ListUsersResponse {
  users: AdminUser[]
  nextCursor: string | null
}

export function useUsers(limit = 20) {
  return useInfiniteQuery({
    queryKey: ['admin', 'users', { limit }],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const { data } = await api.get<ListUsersResponse>('/api/admin/users', {
        params: { cursor: pageParam, limit },
      })
      return data
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useCreateAdminUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      name: string
      email: string
      password: string
      roleIds?: string[]
    }) => {
      const { data } = await api.post<{ user: AdminUser }>('/api/admin/users', body)
      return data.user
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string
      name?: string
      email?: string
      roleIds?: string[]
    }) => {
      const { data } = await api.patch<{ user: AdminUser }>(`/api/admin/users/${id}`, body)
      return data.user
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useDeactivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => api.patch(`/api/admin/users/${userId}/deactivate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useReactivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => api.patch(`/api/admin/users/${userId}/reactivate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useSetUserPassword() {
  const qc = useQueryClient()
  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: ({ userId, newPassword }: { userId: string; newPassword: string }) =>
      api.patch(`/api/admin/users/${userId}/password`, { newPassword }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/admin/users/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}
