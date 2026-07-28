import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useSignOut } from './use-sign-out'

import type { ReactElement, ReactNode } from 'react'
import type * as ReactRouterDom from 'react-router-dom'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterDom>()
  return { ...actual, useNavigate: () => navigateMock }
})

const postMock = vi.fn()

vi.mock('@/lib/api-client', () => ({
  api: { post: (...args: unknown[]) => postMock(...args) as unknown },
}))

function wrapper({ children }: { children: ReactNode }): ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('useSignOut', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('faz POST em /api/auth/sign-out e navega para /sign-in no sucesso', async () => {
    postMock.mockResolvedValue({ data: null })

    const { result } = renderHook(() => useSignOut(), { wrapper })
    result.current.mutate()

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/sign-in', { replace: true })
    })
    expect(postMock).toHaveBeenCalledWith('/api/auth/sign-out')
  })
})
