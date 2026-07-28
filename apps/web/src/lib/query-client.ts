import { MutationCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '@/lib/api-error'

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      suppressGlobalError?: boolean
    }
  }
}

function toastApiError(error: unknown): void {
  if (error instanceof ApiError) {
    if (error.isNetworkError) {
      toast.error('Sem conexão. Verifique sua internet.')
      return
    }
    if (error.isRateLimit) {
      toast.error('Muitas tentativas. Aguarde um momento e tente novamente.')
      return
    }
    if (error.isServerError) {
      toast.error('Erro interno. Tente novamente em instantes.')
      return
    }
    toast.error(error.message)
    return
  }
  toast.error('Erro inesperado. Verifique sua conexão e tente novamente.')
}

// QueryClient único do app. Defaults conservadores; override por hook quando precisar.
// Mutations com meta: { suppressGlobalError: true } gerenciam o próprio toast de erro.
export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.suppressGlobalError) return
      toastApiError(error)
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})
