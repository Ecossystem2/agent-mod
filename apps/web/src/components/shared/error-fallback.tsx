import type { ReactElement } from 'react'
import type { FallbackProps } from 'react-error-boundary'

import { Button } from '@/components/ui/button'

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps): ReactElement {
  const message = error instanceof Error ? error.message : String(error)

  return (
    <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Algo deu errado</h1>
        <p className="text-sm text-muted-foreground">
          Tente recarregar. Se persistir, contate o suporte.
        </p>
        {import.meta.env.DEV && (
          <pre className="mt-4 max-w-2xl overflow-auto rounded bg-muted p-3 text-left text-xs">
            {message}
          </pre>
        )}
      </div>
      <Button onClick={resetErrorBoundary}>Tentar novamente</Button>
    </div>
  )
}
