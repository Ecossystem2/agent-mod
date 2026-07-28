import { UseCaseError } from '@/core/errors/use-case-error'

export class RoleIsSystemError extends UseCaseError<'RoleIsSystem'> {
  readonly kind = 'RoleIsSystem' as const

  constructor() {
    super('Cargos de sistema não podem ser modificados ou excluídos.')
  }
}
