import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SignInPage } from './sign-in-page'

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

describe('SignInPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza o título e os campos de e-mail e senha', () => {
    renderWithProviders(<SignInPage />)

    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
  })

  it('exibe erros de validação e não chama a API ao enviar vazio', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SignInPage />)

    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('E-mail inválido')).toBeInTheDocument()
    expect(screen.getByText('Senha obrigatória')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('faz login e navega para /app no sucesso', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })
    const user = userEvent.setup()
    renderWithProviders(<SignInPage />)

    await user.type(screen.getByLabelText('E-mail'), 'user@example.com')
    await user.type(screen.getByLabelText('Senha'), 'secret-password')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/auth/sign-in/email', {
        email: 'user@example.com',
        password: 'secret-password',
      })
    })
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/app')
    })
  })

  it('mostra a mensagem do ApiError quando o login falha', async () => {
    vi.mocked(api.post).mockRejectedValue(new ApiError('unauthorized', 'Credenciais inválidas', 401))
    const user = userEvent.setup()
    renderWithProviders(<SignInPage />)

    await user.type(screen.getByLabelText('E-mail'), 'user@example.com')
    await user.type(screen.getByLabelText('Senha'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciais inválidas')
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('mostra mensagem genérica quando o erro não é um ApiError', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    renderWithProviders(<SignInPage />)

    await user.type(screen.getByLabelText('E-mail'), 'user@example.com')
    await user.type(screen.getByLabelText('Senha'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Erro ao fazer login. Tente novamente.',
    )
  })

  it('exibe "Entrando…" no botão enquanto a mutação está pendente', async () => {
    vi.mocked(api.post).mockReturnValue(new Promise(() => undefined))
    const user = userEvent.setup()
    renderWithProviders(<SignInPage />)

    await user.type(screen.getByLabelText('E-mail'), 'user@example.com')
    await user.type(screen.getByLabelText('Senha'), 'secret-password')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('button', { name: 'Entrando…' })).toBeDisabled()
  })
})
