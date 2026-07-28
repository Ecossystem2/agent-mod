import { UseCaseError } from './use-case-error'

export class ResourceNotFoundError extends UseCaseError<'resource-not-found'> {
  readonly kind = 'resource-not-found' as const

  constructor(message = 'Recurso não encontrado.') {
    super(message)
  }
}
