import { UseCaseError } from '@/core/errors/use-case-error'

export class EmailAlreadyInUseError extends UseCaseError<'EmailAlreadyInUse'> {
  readonly kind = 'EmailAlreadyInUse' as const

  constructor(email: string) {
    super(`O e-mail "${email}" já está em uso.`)
  }
}
