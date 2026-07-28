import { ErrorBoundary } from 'react-error-boundary'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'

import type { ReactElement } from 'react'

import { ErrorFallback } from '@/components/shared/error-fallback'
import { AuthProvider } from '@/providers/auth-provider'
import { QueryProvider } from '@/providers/query-provider'
import { ThemeProvider } from '@/providers/theme-provider'
import { router } from '@/router'

// Hierarquia de providers — ordem importa:
// ErrorBoundary > Theme > Query > Auth > Router > Toaster
export function App(): ReactElement {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <ThemeProvider defaultTheme="system" storageKey="template-theme">
        <QueryProvider>
          <AuthProvider>
            <RouterProvider router={router} />
            <Toaster position="top-right" richColors closeButton />
          </AuthProvider>
        </QueryProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
