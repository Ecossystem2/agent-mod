import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import type { Role } from '@/features/admin/types'

import { api } from '@/lib/api-client'


interface ListRolesResponse {
  roles: Role[]
  nextCursor: string | null
}

export function useRoles(limit = 20) {
  return useInfiniteQuery({
    queryKey: ['admin', 'roles', { limit }],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const { data } = await api.get<ListRolesResponse>('/api/admin/roles', {
        params: { cursor: pageParam, limit },
      })
      return data
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useCreateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { name: string; description?: string | null; permissions?: string[] }) => {
      const { data } = await api.post<{ role: Role }>('/api/admin/roles', body)
      return data.role
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'roles'] }),
  })
}

export function useUpdateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string
      name?: string
      description?: string | null
      permissions?: string[]
    }) => {
      const { data } = await api.patch<{ role: Role }>(`/api/admin/roles/${id}`, body)
      return data.role
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'roles'] }),
  })
}

export function useDeleteRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/admin/roles/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'roles'] }),
  })
}
