import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { api } from '@/lib/api-client'

export function useSignOut(): UseMutationResult<void, unknown, void> {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async (): Promise<void> => {
      await api.post('/api/auth/sign-out')
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] })
      void navigate('/sign-in', { replace: true })
    },
  })
}
