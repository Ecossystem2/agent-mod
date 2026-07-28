import { UseCaseError } from '@/core/errors/use-case-error'

export class ProtectedUserError extends UseCaseError<'ProtectedUser'> {
  readonly kind = 'ProtectedUser' as const

  constructor(userId: string) {
    super(`Usuário "${userId}" é protegido e não pode ser excluído ou desativado.`)
  }
}
