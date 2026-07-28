import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ResetPasswordPage } from './reset-password-page'

import type * as ReactRouterDom from 'react-router-dom'

import { api } from '@/lib/api-client'
import { ApiError } from '@/lib/api-error'
import { renderWithProviders } from '@/test/render-with-providers'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterDom>()
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('@/lib/api-client', () => ({
  api: { post: vi.fn() },
}))

const VALID_PASSWORD = 'senha-bem-longa-123'

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exibe "Link inválido" quando não há token na URL', () => {
    renderWithProviders(<ResetPasswordPage />, { route: '/reset-password' })

    expect(screen.getByRole('heading', { name: 'Link inválido' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument()
  })

  it('renderiza o formulário quando há token', () => {
    renderWithProviders(<ResetPasswordPage />, { route: '/reset-password?token=abc' })

    expect(screen.getByRole('heading', { name: 'Redefinir senha' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nova senha')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirmar senha')).toBeInTheDocument()
  })

  it('valida o tamanho mínimo da senha', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ResetPasswordPage />, { route: '/reset-password?token=abc' })

    await user.type(screen.getByLabelText('Nova senha'), 'curta')
    await user.type(screen.getByLabelText('Confirmar senha'), 'curta')
    await user.click(screen.getByRole('button', { name: 'Redefinir senha' }))

    expect(await screen.findByText('A senha deve ter ao menos 12 caracteres')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('valida que as senhas coincidem', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ResetPasswordPage />, { route: '/reset-password?token=abc' })

    await user.type(screen.getByLabelText('Nova senha'), VALID_PASSWORD)
    await user.type(screen.getByLabelText('Confirmar senha'), 'outra-senha-longa-123')
    await user.click(screen.getByRole('button', { name: 'Redefinir senha' }))

    expect(await screen.findByText('As senhas não coincidem')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('redefine a senha e navega para /sign-in no sucesso', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })
    const user = userEvent.setup()
    renderWithProviders(<ResetPasswordPage />, { route: '/reset-password?token=abc' })

    await user.type(screen.getByLabelText('Nova senha'), VALID_PASSWORD)
    await user.type(screen.getByLabelText('Confirmar senha'), VALID_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Redefinir senha' }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/auth/reset-password', {
        token: 'abc',
        newPassword: VALID_PASSWORD,
      })
    })
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/sign-in')
    })
  })

  it('mostra a mensagem do ApiError quando a redefinição falha', async () => {
    vi.mocked(api.post).mockRejectedValue(new ApiError('invalid-token', 'Token expirado', 400))
    const user = userEvent.setup()
    renderWithProviders(<ResetPasswordPage />, { route: '/reset-password?token=abc' })

    await user.type(screen.getByLabelText('Nova senha'), VALID_PASSWORD)
    await user.type(screen.getByLabelText('Confirmar senha'), VALID_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Redefinir senha' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Token expirado')
  })

  it('mostra mensagem genérica quando o erro não é um ApiError', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    renderWithProviders(<ResetPasswordPage />, { route: '/reset-password?token=abc' })

    await user.type(screen.getByLabelText('Nova senha'), VALID_PASSWORD)
    await user.type(screen.getByLabelText('Confirmar senha'), VALID_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Redefinir senha' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Erro ao redefinir a senha. O link pode ter expirado.',
    )
  })

  it('exibe "Salvando…" no botão enquanto a mutação está pendente', async () => {
    vi.mocked(api.post).mockReturnValue(new Promise(() => undefined))
    const user = userEvent.setup()
    renderWithProviders(<ResetPasswordPage />, { route: '/reset-password?token=abc' })

    await user.type(screen.getByLabelText('Nova senha'), VALID_PASSWORD)
    await user.type(screen.getByLabelText('Confirmar senha'), VALID_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Redefinir senha' }))

    expect(await screen.findByRole('button', { name: 'Salvando…' })).toBeDisabled()
  })
})
