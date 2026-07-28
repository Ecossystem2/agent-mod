import { UseCaseError } from '@/core/errors/use-case-error'

export class RoleNotFoundError extends UseCaseError<'RoleNotFound'> {
  readonly kind = 'RoleNotFound' as const

  constructor() {
    super('Cargo não encontrado.')
  }
}
