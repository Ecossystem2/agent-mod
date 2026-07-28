import { UseCaseError } from '@/core/errors/use-case-error'

export class RoleNameTakenError extends UseCaseError<'RoleNameTaken'> {
  readonly kind = 'RoleNameTaken' as const

  constructor(name: string) {
    super(`Já existe um cargo com o nome "${name}".`)
  }
}
