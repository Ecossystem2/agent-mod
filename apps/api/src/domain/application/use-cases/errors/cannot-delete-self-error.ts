import { UseCaseError } from '@/core/errors/use-case-error'

export class CannotDeleteSelfError extends UseCaseError<'CannotDeleteSelf'> {
  readonly kind = 'CannotDeleteSelf' as const

  constructor() {
    super('Você não pode excluir sua própria conta.')
  }
}
