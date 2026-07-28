import { UseCaseError } from '@/core/errors/use-case-error'

export class UserNotFoundError extends UseCaseError<'UserNotFound'> {
  readonly kind = 'UserNotFound' as const

  constructor() {
    super('Usuário não encontrado.')
  }
}
