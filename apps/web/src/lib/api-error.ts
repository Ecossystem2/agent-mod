import type { AxiosError } from 'axios'

export interface ApiErrorDetail {
  path: string
  message: string
}

interface ApiErrorBody {
  kind: string
  message: string
  details?: ApiErrorDetail[]
}

export class ApiError extends Error {
  readonly kind: string
  readonly status: number
  readonly details: ApiErrorDetail[]

  constructor(kind: string, message: string, status: number, details: ApiErrorDetail[] = []) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.details = details
  }

  static fromAxiosError(err: AxiosError): ApiError {
    const data = err.response?.data as { error?: ApiErrorBody } | undefined
    const status = err.response?.status ?? 0

    if (data?.error) {
      return new ApiError(data.error.kind, data.error.message, status, data.error.details ?? [])
    }

    if (!err.response) {
      return new ApiError('network-error', 'Sem conexão. Verifique sua internet.', 0)
    }
    if (status === 429) {
      return new ApiError('rate-limited', 'Muitas tentativas. Aguarde um momento.', status)
    }
    if (status >= 500) {
      return new ApiError('internal-error', 'Erro interno. Tente novamente em instantes.', status)
    }

    return new ApiError('unknown-error', 'Ocorreu um erro. Tente novamente.', status)
  }

  get isRateLimit() {
    return this.status === 429
  }

  get isServerError() {
    return this.status >= 500
  }

  get isNetworkError() {
    return this.status === 0
  }

  get isNotFound() {
    return this.status === 404
  }

  get isForbidden() {
    return this.status === 403
  }

  get isConflict() {
    return this.status === 409
  }

  get isValidation() {
    return this.kind === 'bad-request' && this.details.length > 0
  }
}
