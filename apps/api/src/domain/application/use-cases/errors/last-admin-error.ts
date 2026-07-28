import { UseCaseError } from '@/core/errors/use-case-error'

export class LastAdminError extends UseCaseError<'LastAdmin'> {
  readonly kind = 'LastAdmin' as const

  constructor() {
    super('Não é possível excluir o último administrador do sistema.')
  }
}
