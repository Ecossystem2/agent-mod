import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ErrorFallback } from './error-fallback'

import { renderWithProviders } from '@/test/render-with-providers'

describe('ErrorFallback', () => {
  it('renderiza a mensagem de erro quando o erro é um Error', () => {
    const error = new Error('algo explodiu')
    const resetErrorBoundary = vi.fn()

    renderWithProviders(<ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Algo deu errado')).toBeInTheDocument()
    expect(screen.getByText('Tente recarregar. Se persistir, contate o suporte.')).toBeInTheDocument()
  })

  it('chama resetErrorBoundary ao clicar em "Tentar novamente"', async () => {
    const user = userEvent.setup({ delay: null })
    const resetErrorBoundary = vi.fn()
    const error = new Error('erro qualquer')

    renderWithProviders(<ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />)

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(resetErrorBoundary).toHaveBeenCalledOnce()
  })

  it('renderiza a mensagem quando o erro não é uma instância de Error', () => {
    const resetErrorBoundary = vi.fn()

    renderWithProviders(
      <ErrorFallback error="string de erro" resetErrorBoundary={resetErrorBoundary} />,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
