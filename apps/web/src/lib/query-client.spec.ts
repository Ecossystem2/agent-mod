import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from './api-error'

const toastError = vi.fn()

vi.mock('sonner', () => ({
  toast: {
    error: (msg: string) => toastError(msg),
  },
}))

// Import after mocks
const { queryClient } = await import('./query-client')

describe('queryClient — MutationCache onError', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function triggerOnError(error: unknown, suppressGlobalError?: boolean): void {
    const mutationCache = queryClient.getMutationCache()
    // Access the config's onError directly from the cache
    const config = (mutationCache as unknown as { config: { onError?: (error: unknown, variables: unknown, context: unknown, mutation: { meta?: { suppressGlobalError?: boolean } }) => void } }).config
    config.onError?.(
      error,
      undefined,
      undefined,
      { meta: suppressGlobalError !== undefined ? { suppressGlobalError } : undefined },
    )
  }

  it('exibe toast de erro de rede para ApiError de rede', () => {
    const err = new ApiError('network-error', 'Sem conexão.', 0)
    triggerOnError(err)
    expect(toastError).toHaveBeenCalledWith('Sem conexão. Verifique sua internet.')
  })

  it('exibe toast de rate-limit para ApiError 429', () => {
    const err = new ApiError('rate-limited', 'Muitas tentativas.', 429)
    triggerOnError(err)
    expect(toastError).toHaveBeenCalledWith('Muitas tentativas. Aguarde um momento e tente novamente.')
  })

  it('exibe toast de erro de servidor para ApiError 500', () => {
    const err = new ApiError('internal-error', 'Erro interno.', 500)
    triggerOnError(err)
    expect(toastError).toHaveBeenCalledWith('Erro interno. Tente novamente em instantes.')
  })

  it('exibe a mensagem do ApiError para outros erros de API', () => {
    const err = new ApiError('bad-request', 'Dados inválidos.', 400)
    triggerOnError(err)
    expect(toastError).toHaveBeenCalledWith('Dados inválidos.')
  })

  it('exibe toast genérico para erros não-ApiError', () => {
    triggerOnError(new Error('generic'))
    expect(toastError).toHaveBeenCalledWith('Erro inesperado. Verifique sua conexão e tente novamente.')
  })

  it('não exibe toast quando suppressGlobalError é true', () => {
    const err = new ApiError('bad-request', 'Suprimido.', 400)
    triggerOnError(err, true)
    expect(toastError).not.toHaveBeenCalled()
  })
})
