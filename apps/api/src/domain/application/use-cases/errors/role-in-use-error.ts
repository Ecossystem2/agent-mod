import { UseCaseError } from '@/core/errors/use-case-error'

export class RoleInUseError extends UseCaseError<'RoleInUse'> {
  readonly kind = 'RoleInUse' as const

  constructor(count: number) {
    super(`Este cargo está atribuído a ${count} usuário(s) e não pode ser excluído.`)
  }
}
