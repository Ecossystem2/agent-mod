import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ForgotPasswordPage } from './forgot-password-page'

import { api } from '@/lib/api-client'
import { ApiError } from '@/lib/api-error'
import { renderWithProviders } from '@/test/render-with-providers'


vi.mock('@/lib/api-client', () => ({
  api: { post: vi.fn() },
}))

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza o formulário de recuperação', () => {
    renderWithProviders(<ForgotPasswordPage />)

    expect(screen.getByRole('heading', { name: 'Esqueceu a senha?' })).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
  })

  it('valida o e-mail antes de enviar', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ForgotPasswordPage />)

    await user.type(screen.getByLabelText('E-mail'), 'invalido')
    await user.click(screen.getByRole('button', { name: 'Enviar link de redefinição' }))

    expect(await screen.findByText('E-mail inválido')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('envia o e-mail com redirectTo e exibe a confirmação no sucesso', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })
    const user = userEvent.setup()
    renderWithProviders(<ForgotPasswordPage />)

    await user.type(screen.getByLabelText('E-mail'), 'user@example.com')
    await user.click(screen.getByRole('button', { name: 'Enviar link de redefinição' }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/auth/forget-password', {
        email: 'user@example.com',
        redirectTo: `${window.location.origin}/reset-password`,
      })
    })
    expect(await screen.findByRole('heading', { name: 'E-mail enviado!' })).toBeInTheDocument()
  })

  it('mostra a mensagem do ApiError quando o envio falha', async () => {
    vi.mocked(api.post).mockRejectedValue(new ApiError('rate-limited', 'Muitas tentativas.', 429))
    const user = userEvent.setup()
    renderWithProviders(<ForgotPasswordPage />)

    await user.type(screen.getByLabelText('E-mail'), 'user@example.com')
    await user.click(screen.getByRole('button', { name: 'Enviar link de redefinição' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Muitas tentativas.')
  })

  it('mostra mensagem genérica quando o erro não é um ApiError', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    renderWithProviders(<ForgotPasswordPage />)

    await user.type(screen.getByLabelText('E-mail'), 'user@example.com')
    await user.click(screen.getByRole('button', { name: 'Enviar link de redefinição' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Erro ao enviar o e-mail. Tente novamente.',
    )
  })

  it('exibe "Enviando…" no botão enquanto a mutação está pendente', async () => {
    vi.mocked(api.post).mockReturnValue(new Promise(() => undefined))
    const user = userEvent.setup()
    renderWithProviders(<ForgotPasswordPage />)

    await user.type(screen.getByLabelText('E-mail'), 'user@example.com')
    await user.click(screen.getByRole('button', { name: 'Enviar link de redefinição' }))

    expect(await screen.findByRole('button', { name: 'Enviando…' })).toBeDisabled()
  })
})
