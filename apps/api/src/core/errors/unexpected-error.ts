import { UseCaseError } from '@/core/errors/use-case-error'

export class UnexpectedError extends UseCaseError<'UnexpectedError'> {
  readonly kind = 'UnexpectedError' as const
  readonly originalCause: unknown

  constructor(cause?: unknown) {
    super('Ocorreu um erro inesperado.')
    this.originalCause = cause
  }
}
