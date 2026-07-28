import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { App } from './App'

import type * as ReactRouterDom from 'react-router-dom'

vi.mock('@/env', () => ({
  env: { VITE_API_BASE_URL: 'http://localhost:3333' },
}))

vi.mock('@/lib/api-client', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

vi.mock('@/providers/theme-provider', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/router', () => ({
  router: {
    subscribe: vi.fn(() => vi.fn()),
    navigate: vi.fn(),
    state: {
      location: { pathname: '/', search: '', hash: '', state: null, key: 'default' },
      matches: [],
      loaderData: {},
      actionData: null,
      errors: null,
      initialized: true,
      navigation: {
        state: 'idle',
        location: undefined,
        formMethod: undefined,
        formAction: undefined,
        formEncType: undefined,
        formData: undefined,
      },
      restoreScrollPosition: null,
      preventScrollReset: false,
      revalidation: 'idle',
      fetchers: new Map(),
      blockers: new Map(),
    },
    routes: [],
    window: undefined,
  },
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterDom>()
  return {
    ...actual,
    RouterProvider: () => <div data-testid="router-provider" />,
  }
})

vi.mock('sonner', () => ({
  Toaster: () => <div data-testid="toaster" />,
  toast: { error: vi.fn() },
}))

describe('App', () => {
  it('renderiza a hierarquia de providers e o router', () => {
    render(<App />)

    expect(screen.getByTestId('router-provider')).toBeInTheDocument()
    expect(screen.getByTestId('toaster')).toBeInTheDocument()
  })
})
