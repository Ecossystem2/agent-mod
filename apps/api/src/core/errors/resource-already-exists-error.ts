import { UseCaseError } from './use-case-error'

export class ResourceAlreadyExistsError extends UseCaseError<'resource-already-exists'> {
  readonly kind = 'resource-already-exists' as const

  constructor(message = 'Recurso já existe.') {
    super(message)
  }
}
