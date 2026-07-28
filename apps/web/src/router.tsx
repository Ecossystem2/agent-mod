import { createBrowserRouter, Navigate, redirect } from 'react-router-dom'

import { AppShell } from '@/components/layout/app-shell'
import { api } from '@/lib/api-client'
import { AuthLayout } from '@/routes/_auth/auth-layout'

export async function privateLoader() {
  try {
    const { data } = await api.get<{ user?: unknown } | null>('/api/auth/get-session')
    if (!data?.user) {
      const next = encodeURIComponent(window.location.pathname + window.location.search)
      // React Router loaders sinalizam redirect via `throw new Response(...)` — pattern oficial.
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect(`/sign-in?next=${next}`)
    }
    return data.user
  } catch (err) {
    if (err instanceof Response) throw err
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect('/sign-in')
  }
}

export async function requirePermission(permission: string) {
  try {
    const { data } = await api.get<{ user?: { id: string }; permissions?: string[] } | null>(
      '/api/auth/get-session',
    )
    if (!data?.user) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect('/sign-in')
    }
    if (!data.permissions?.includes(permission)) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect('/app')
    }
    return null
  } catch (err) {
    if (err instanceof Response) throw err
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect('/sign-in')
  }
}

export const router = createBrowserRouter([
  {
    path: '/',
    children: [
      { index: true, element: <Navigate to="/sign-in" replace /> },
    ],
  },

  {
    element: <AuthLayout />,
    children: [
      {
        path: '/sign-in',
        lazy: () =>
          import('@/features/auth/pages/sign-in-page').then((m) => ({ Component: m.SignInPage })),
      },
      {
        path: '/forgot-password',
        lazy: () =>
          import('@/features/auth/pages/forgot-password-page').then((m) => ({
            Component: m.ForgotPasswordPage,
          })),
      },
      {
        path: '/reset-password',
        lazy: () =>
          import('@/features/auth/pages/reset-password-page').then((m) => ({
            Component: m.ResetPasswordPage,
          })),
      },
    ],
  },

  {
    path: '/app',
    element: <AppShell />,
    loader: privateLoader,
    children: [
      {
        path: 'admin/roles',
        lazy: () =>
          import('@/features/admin/pages/roles-page').then((m) => ({ Component: m.RolesPage })),
        loader: () => requirePermission('admin:roles'),
      },
      {
        path: 'admin/users',
        lazy: () =>
          import('@/features/admin/pages/users-page').then((m) => ({ Component: m.UsersPage })),
        loader: () => requirePermission('admin:users'),
      },
    ],
  },

  { path: '*', element: <Navigate to="/" replace /> },
])
