import { UseCaseError } from './use-case-error'

export class NotAllowedError extends UseCaseError<'not-allowed'> {
  readonly kind = 'not-allowed' as const

  constructor(message = 'Operação não permitida.') {
    super(message)
  }
}
